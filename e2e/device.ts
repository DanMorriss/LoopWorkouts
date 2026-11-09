import type { Page } from '@playwright/test';

// Stand-ins for the phone's sound, vibration and wake lock, put in place before the app loads
// (page.addInitScript), which record what the app asks of them. Nothing plays: real sound,
// vibration and the screen staying on are checked by hand on a phone.

export interface DeviceOptions {
    /**
     * Web Audio: `allowed` (the default) lets sound start from a tap or key press, as a
     * browser does, so after a reload it's suspended until the page is tapped again; `none` is
     * a browser without it.
     */
    audio: 'allowed' | 'none';
    /** Whether `navigator.vibrate` is there. */
    vibrate: boolean;
    /** Whether `navigator.wakeLock` is there. */
    wakeLock: boolean;
}

/** A note the app played (or scheduled), by when it starts on the page's clock. */
export interface Note {
    frequency: number;
    /** When it starts, in ms since 1970 by the page's (fake) clock. */
    at: number;
    /** When it was cut off before its end (`stop()` with no time), if it was. */
    cancelledAt?: number;
}

/** The sounds' notes, as `AlarmService` plays them, by their first note's frequency. */
export const ALARM = { work: 880, rest: 440, finish: 523.25, countdown: 660 } as const;

interface Recorded {
    notes: Note[];
    vibrations: number[][];
    wakeLock: { requests: number; releases: number; held: boolean };
}

declare global {
    interface Window {
        __device?: Recorded;
    }
}

/** Runs in the page, before anything else. */
function install(options: DeviceOptions) {
    const recorded: Recorded = {
        notes: [],
        vibrations: [],
        wakeLock: { requests: 0, releases: 0, held: false },
    };
    window.__device = recorded;

    if (options.audio === 'none') {
        // @ts-expect-error: a browser without Web Audio
        delete window.AudioContext;
    } else {
        const param = () => ({
            value: 0,
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
            cancelScheduledValues() {},
        });
        class FakeNode {
            connect() {}
            disconnect() {}
        }
        class FakeAudioContext extends EventTarget {
            // Its clock follows Date.now(), so page.clock moves it
            private readonly startedAt = Date.now();
            state: AudioContextState = 'suspended';
            readonly destination = new FakeNode();

            get currentTime() {
                return (Date.now() - this.startedAt) / 1000;
            }

            resume() {
                // As a browser does: only once the page has been tapped or a key pressed on it
                if (this.state !== 'running' && (navigator.userActivation?.hasBeenActive ?? true)) {
                    this.state = 'running';
                    this.dispatchEvent(new Event('statechange'));
                }
                return Promise.resolve();
            }

            suspend() {
                this.state = 'suspended';
                this.dispatchEvent(new Event('statechange'));
                return Promise.resolve();
            }

            close() {
                this.state = 'closed';
                return Promise.resolve();
            }

            createGain() {
                return Object.assign(new FakeNode(), { gain: param() });
            }

            createOscillator() {
                const context = this;
                let note: Note | null = null;
                return Object.assign(new FakeNode(), {
                    type: 'sine',
                    frequency: param(),
                    start(when = 0) {
                        note = {
                            frequency: this.frequency.value,
                            at: Math.round(context.startedAt + when * 1000),
                        };
                        recorded.notes.push(note);
                    },
                    stop(when?: number) {
                        if (when === undefined && note && note.cancelledAt === undefined) {
                            note.cancelledAt = Date.now();
                        }
                    },
                });
            }
        }
        Object.defineProperty(window, 'AudioContext', {
            value: FakeAudioContext,
            configurable: true,
            writable: true,
        });
    }

    if (options.vibrate) {
        Object.defineProperty(navigator, 'vibrate', {
            configurable: true,
            value: (pattern: number | number[]) => {
                recorded.vibrations.push(Array.isArray(pattern) ? pattern : [pattern]);
                return true;
            },
        });
    } else {
        // `'vibrate' in navigator` is how the app tells
        delete (Navigator.prototype as { vibrate?: unknown }).vibrate;
    }

    if (options.wakeLock) {
        Object.defineProperty(navigator, 'wakeLock', {
            configurable: true,
            value: {
                request: () => {
                    recorded.wakeLock.requests++;
                    recorded.wakeLock.held = true;
                    const sentinel = new EventTarget() as EventTarget & {
                        released: boolean;
                        type: string;
                        release(): Promise<void>;
                    };
                    sentinel.released = false;
                    sentinel.type = 'screen';
                    sentinel.release = () => {
                        if (!sentinel.released) {
                            sentinel.released = true;
                            recorded.wakeLock.releases++;
                            recorded.wakeLock.held = false;
                            sentinel.dispatchEvent(new Event('release'));
                        }
                        return Promise.resolve();
                    };
                    return Promise.resolve(sentinel);
                },
            },
        });
    } else {
        delete (Navigator.prototype as { wakeLock?: unknown }).wakeLock;
    }
}

/** What the app has asked of the device's sound, vibration and wake lock. */
export class Device {
    constructor(private readonly page: Page) {}

    static async install(page: Page, options: DeviceOptions) {
        await page.addInitScript(install, options);
    }

    private recorded(): Promise<Recorded> {
        return this.page.evaluate(() => window.__device!);
    }

    /** Every note scheduled so far, played or still to come or cut off. */
    async notes(): Promise<Note[]> {
        return (await this.recorded()).notes;
    }

    /**
     * The alarms that have sounded by now, as their first note's frequency and when it started,
     * in seconds after the first one (a run's work alarm, as it starts): those scheduled and not
     * cut off before they began. `{ frequency: 880, second: 0 }` is the work alarm at the start.
     * Only those of `kinds` (their first notes' frequencies, from `ALARM`), if given.
     */
    async alarms(kinds: number[] = Object.values(ALARM)) {
        const now = await this.page.evaluate(() => Date.now());
        const notes = await this.notes();
        const since = notes[0]?.at ?? now;
        return (
            notes
                .filter(
                    (note) =>
                        kinds.includes(note.frequency) &&
                        note.at <= now &&
                        (note.cancelledAt === undefined || note.cancelledAt > note.at)
                )
                // A sound's later notes (the work alarm's second beep) aren't another alarm
                .filter(
                    (note, i, all) =>
                        !all
                            .slice(0, i)
                            .some((n) => n.frequency === note.frequency && note.at - n.at < 600)
                )
                .map((note) => ({
                    frequency: note.frequency,
                    // In whole seconds, up: the first alarm can play up to a second late (it's due
                    // the moment Start is pressed), so the rest come a little under the second
                    second: Math.max(0, Math.ceil((note.at - since) / 1000 - 0.05)),
                    at: note.at,
                }))
        );
    }

    /** Each vibration pattern asked for, in order. */
    async vibrations(): Promise<number[][]> {
        return (await this.recorded()).vibrations;
    }

    /** How often the screen's been asked to stay on and let go, and whether it's held now. */
    async wakeLock() {
        return (await this.recorded()).wakeLock;
    }
}
