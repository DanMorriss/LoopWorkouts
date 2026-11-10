import { DestroyRef, inject, InjectionToken, Service, signal } from '@angular/core';
import { AlarmEvent, AlarmKind } from '../../models/alarm-schedule';
import { SettingsStore } from '../state/settings-store.service';

/** Makes the audio context, or returns null where the browser has no Web Audio. */
export const AUDIO_CONTEXT_FACTORY = new InjectionToken<() => AudioContext | null>(
    'AUDIO_CONTEXT_FACTORY',
    { factory: () => () => (typeof AudioContext === 'undefined' ? null : new AudioContext()) }
);

/** A note on the audio clock, in seconds. */
interface ScheduledNote {
    oscillator: OscillatorNode;
    /** When the alarm this note belongs to starts. */
    alarmStart: number;
    end: number;
}

interface Note {
    frequency: number;
    /** Seconds after the alarm starts. */
    offset: number;
    /** Seconds. */
    length: number;
}

// Simple beeps for now, until there are proper sound files. Each alarm sounds different:
// two short high beeps for work, one long low tone for rest, three rising notes to finish,
// and one short tick counting down to a time limit.
const SOUNDS: Record<AlarmKind, Note[]> = {
    work: [
        { frequency: 880, offset: 0, length: 0.15 },
        { frequency: 880, offset: 0.25, length: 0.15 },
    ],
    rest: [{ frequency: 440, offset: 0, length: 0.5 }],
    finish: [
        { frequency: 523.25, offset: 0, length: 0.18 },
        { frequency: 659.25, offset: 0.2, length: 0.18 },
        { frequency: 783.99, offset: 0.4, length: 0.6 },
    ],
    countdown: [{ frequency: 660, offset: 0, length: 0.08 }],
};

// Vibration patterns (on, off, on... in ms) to match each sound
const VIBRATIONS: Record<AlarmKind, number[]> = {
    work: [150, 100, 150],
    rest: [500],
    finish: [180, 20, 180, 20, 600],
    countdown: [60],
};

const VOLUME = 0.3;

// An alarm that is due but up to this late still plays (e.g. the first work alarm, which
// is due the moment Start is pressed). Anything older is skipped, e.g. after a refresh.
const LATE_LIMIT_MS = 1000;

// Browsers only allow sound after the user has interacted with the page
const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend', 'click'] as const;

/**
 * Plays the alarms between phases.
 *
 * Alarms are scheduled ahead on the audio clock rather than played from a JS timer,
 * because browsers slow JS timers right down in background tabs but keep audio on time.
 */
@Service()
export class AlarmService {
    private readonly createContext = inject(AUDIO_CONTEXT_FACTORY);
    private readonly settings = inject(SettingsStore);
    private context: AudioContext | null = null;
    /** Everything scheduled goes through this, so it can all be silenced at once. */
    private output: GainNode | null = null;
    private scheduled: ScheduledNote[] = [];
    /** The alarms from the last `schedule()` call. */
    private lastEvents: AlarmEvent[] = [];

    private readonly _unlocked = signal(false);
    /** Whether the browser is allowing sound yet. */
    readonly unlocked = this._unlocked.asReadonly();
    readonly supported = typeof AudioContext !== 'undefined';
    readonly canVibrate = 'vibrate' in navigator;

    constructor() {
        // Any interaction anywhere in the app unlocks sound, e.g. pressing Start in the
        // library, so it's ready before the workout page opens
        const unlock = () => this.unlock();
        for (const type of UNLOCK_EVENTS) {
            document.addEventListener(type, unlock, { capture: true, passive: true });
        }
        inject(DestroyRef).onDestroy(() => {
            for (const type of UNLOCK_EVENTS) {
                document.removeEventListener(type, unlock, { capture: true });
            }
            this.cancel();
            void this.context?.close();
        });
    }

    /** Asks the browser to allow sound. Must be called from a click, tap or key press. */
    unlock() {
        if (this.context?.state === 'running') {
            return;
        }
        if (!this.context) {
            this.context = this.createContext();
            if (!this.context) {
                return;
            }
            const context = this.context;
            context.addEventListener('statechange', () =>
                this._unlocked.set(context.state === 'running')
            );
        }
        // Rejected if the browser still won't allow it; the next interaction tries again
        this.context.resume().catch(() => undefined);
    }

    /**
     * Replaces whatever was scheduled with these alarms. Alarms already past are skipped,
     * and so is any alarm the last call already played; one that has begun plays out.
     * So it's safe to call again at any time, e.g. to add the next rounds of a long workout.
     * Does nothing until sound is unlocked, so schedule again once it is, or while sound is
     * turned off in settings.
     */
    schedule(events: AlarmEvent[]) {
        const context = this.context;
        if (context?.state !== 'running' || !this.settings.sound()) {
            this.cancel();
            return;
        }
        // Let an alarm that has begun play out in full; drop the ones still to come
        this.stopNotes((note) => note.alarmStart > context.currentTime);

        const now = Date.now();
        const key = (event: AlarmEvent) => `${event.kind}@${event.at}`;
        const alreadyPlayed = new Set(this.lastEvents.filter((e) => e.at <= now).map(key));
        this.lastEvents = events;

        if (!this.output) {
            this.output = context.createGain();
            this.output.connect(context.destination);
        }

        for (const event of events) {
            const delayMs = event.at - now;
            if (delayMs < -LATE_LIMIT_MS || alreadyPlayed.has(key(event))) {
                continue;
            }
            const start = context.currentTime + Math.max(0, delayMs) / 1000;
            for (const note of SOUNDS[event.kind]) {
                this.scheduled.push(this.playNote(context, this.output, note, start));
            }
        }
    }

    /** Silences everything scheduled, even a beep that's sounding, e.g. on stop. */
    cancel() {
        this.stopNotes(() => true);
        this.lastEvents = [];
        this.output?.disconnect();
        this.output = null;
    }

    /**
     * Plays one alarm straight away, e.g. to try it out in settings. Plays even with sound
     * turned off, as it's always asked for. Must be called from a click, tap or key press.
     */
    async preview(kind: AlarmKind) {
        this.unlock();
        const context = this.context;
        if (!context) {
            return;
        }
        await context.resume().catch(() => undefined);
        if (context.state === 'running') {
            for (const note of SOUNDS[kind]) {
                this.playNote(context, context.destination, note, context.currentTime);
            }
        }
    }

    /**
     * Vibrates the phone, where supported (not iPhones). Vibration can't be scheduled ahead
     * like sound, so call this as each alarm comes due.
     */
    vibrate(kind: AlarmKind) {
        // Like sound, vibration needs an interaction first; Chrome logs an error otherwise
        const interacted = navigator.userActivation?.hasBeenActive ?? true;
        if (this.canVibrate && interacted && this.settings.vibration()) {
            navigator.vibrate(VIBRATIONS[kind]);
        }
    }

    /** Stops the notes that match, and forgets them along with any that have finished. */
    private stopNotes(matches: (note: ScheduledNote) => boolean) {
        const now = this.context?.currentTime ?? 0;
        this.scheduled = this.scheduled.filter((note) => {
            if (matches(note)) {
                note.oscillator.stop();
                return false;
            }
            return note.end > now;
        });
    }

    private playNote(
        context: AudioContext,
        output: AudioNode,
        note: Note,
        alarmStart: number
    ): ScheduledNote {
        const start = alarmStart + note.offset;
        const end = start + note.length;

        // Fade in and out quickly, so the beep doesn't click
        const envelope = context.createGain();
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(VOLUME, start + 0.01);
        envelope.gain.setValueAtTime(VOLUME, end - 0.03);
        envelope.gain.linearRampToValueAtTime(0, end);
        envelope.connect(output);

        const oscillator = context.createOscillator();
        oscillator.type = 'triangle';
        oscillator.frequency.value = note.frequency;
        oscillator.connect(envelope);
        oscillator.start(start);
        oscillator.stop(end);
        return { oscillator, alarmStart, end };
    }
}
