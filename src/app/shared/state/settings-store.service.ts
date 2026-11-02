import { computed, inject, Service, signal } from '@angular/core';
import {
    BODY_FIGURE_CHOICES,
    BodyFigure,
    Equipment,
    EQUIPMENT_CHOICES,
} from '../../models/exercise';
import { TRAINING_GOALS, TrainingGoal } from '../../models/muscle-balance';
import { cleanName, Profile, PROFILE_FIELDS } from '../../models/profile';
import { WEIGHT_UNITS, WeightUnit } from '../../models/weight';
import { DEFAULT_RUN_SIDES, MAX_SWITCH_SECONDS, Side } from '../../models/workout';
import { SyncClock } from './sync-clock.service';

export type Theme = 'dark' | 'light' | 'system';
const THEMES: readonly Theme[] = ['dark', 'light', 'system'];

export interface Settings {
    /** Colour theme; 'system' follows the device's light or dark setting. */
    theme: Theme;
    /** Play a sound as each phase starts. */
    sound: boolean;
    /** Vibrate as each phase starts, where the device can. */
    vibration: boolean;
    /** Count down the last seconds of each timed step and rest with a beep. */
    countdownBeeps: boolean;
    /** Stop the screen locking during a workout, where the browser can. */
    keepScreenOn: boolean;
    /** What weights are shown and picked in; they're always saved in kg. */
    weightUnit: WeightUnit;
    /** Which figure the body map draws. */
    bodyFigure: BodyFigure;
    /** What you train for, which sets the sets a week the muscle bars aim at (PRG-8). */
    trainingGoal: TrainingGoal;
    /** The equipment you have, picked on the Exercises page, in the order it's offered. */
    myEquipment: Equipment[];
    /** Show only the exercises you can do with `myEquipment` on the Exercises page. */
    onlyMyEquipment: boolean;
    /** Which side an exercise done each side starts with (BLD-10). */
    eachSideFirst: Side;
    /** The countdown between a timed step's two sides, in seconds; 0 for none. */
    switchSidesSeconds: number;
    /** What Home greets you by (NAV-4); '' if not given. */
    name: string;
    /**
     * When the profile (`PROFILE_FIELDS`), which syncs, last changed; 0 if it never has here,
     * as on a device that's not been set up, or signed out of.
     */
    profileUpdatedAt: number;
}

const DEFAULT_SETTINGS: Settings = {
    theme: 'dark',
    sound: true,
    vibration: true,
    countdownBeeps: true,
    keepScreenOn: true,
    weightUnit: 'kg',
    bodyFigure: 'male',
    trainingGoal: 'muscle',
    myEquipment: [],
    onlyMyEquipment: false,
    eachSideFirst: DEFAULT_RUN_SIDES.first,
    switchSidesSeconds: DEFAULT_RUN_SIDES.switchSeconds,
    name: '',
    profileUpdatedAt: 0,
};
const STORAGE_KEY = 'settings';

/**
 * The user's settings, saved in the browser so they apply every time. Most are a choice for
 * each device; the profile among them syncs, so each change to it is dated by the sync clock.
 */
@Service()
export class SettingsStore {
    private readonly clock = inject(SyncClock);
    private readonly settings = signal<Settings>(loadSettings());

    readonly theme = computed(() => this.settings().theme);
    readonly sound = computed(() => this.settings().sound);
    readonly vibration = computed(() => this.settings().vibration);
    readonly countdownBeeps = computed(() => this.settings().countdownBeeps);
    readonly keepScreenOn = computed(() => this.settings().keepScreenOn);
    readonly weightUnit = computed(() => this.settings().weightUnit);
    readonly bodyFigure = computed(() => this.settings().bodyFigure);
    readonly trainingGoal = computed(() => this.settings().trainingGoal);
    readonly myEquipment = computed(() => this.settings().myEquipment);
    readonly onlyMyEquipment = computed(() => this.settings().onlyMyEquipment);
    readonly eachSideFirst = computed(() => this.settings().eachSideFirst);
    readonly switchSidesSeconds = computed(() => this.settings().switchSidesSeconds);
    readonly name = computed(() => this.settings().name);

    /** The profile, as it syncs. */
    readonly profile = computed(
        (): Profile => {
            const settings = this.settings();
            return {
                name: settings.name,
                bodyFigure: settings.bodyFigure,
                trainingGoal: settings.trainingGoal,
                weightUnit: settings.weightUnit,
                myEquipment: settings.myEquipment,
                updatedAt: settings.profileUpdatedAt,
            };
        },
        { equal: (a, b) => a.updatedAt === b.updatedAt }
    );
    /** Whether the profile's been set on this device, or fetched from the account. */
    readonly hasProfile = computed(() => this.settings().profileUpdatedAt > 0);

    /** Changes settings; a change to the profile is dated, so it syncs. */
    update(changes: Partial<Omit<Settings, 'profileUpdatedAt'>>) {
        const settings = this.settings();
        const next = { ...settings, ...changes };
        if (changes.name !== undefined) {
            next.name = cleanName(changes.name);
        }
        if (PROFILE_FIELDS.some((field) => !sameValue(next[field], settings[field]))) {
            next.profileUpdatedAt = this.clock.now(settings.profileUpdatedAt);
        }
        this.save(next);
    }

    /** Dates the profile as it is, if it's never been: set up, even if nothing was changed. */
    keepProfile() {
        if (!this.hasProfile()) {
            this.save({ ...this.settings(), profileUpdatedAt: this.clock.now() });
        }
    }

    /**
     * Takes another copy's profile (from another device) if it changed more recently than this
     * one. Returns whether it did.
     */
    mergeProfile(profile: Profile): boolean {
        if (profile.updatedAt <= this.settings().profileUpdatedAt) {
            return false;
        }
        const { updatedAt, ...fields } = profile;
        this.save({
            ...this.settings(),
            ...fields,
            myEquipment: [...fields.myEquipment],
            profileUpdatedAt: updatedAt,
        });
        return true;
    }

    /**
     * Leaving the account: the name goes, as it's the account's, and the rest stays as this
     * device's choice, but undated, so it isn't sent to the next account signed in here.
     */
    forgetProfile() {
        this.save({ ...this.settings(), name: '', profileUpdatedAt: 0 });
    }

    private save(settings: Settings) {
        this.settings.set(settings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }
}

function sameValue(a: unknown, b: unknown): boolean {
    return Array.isArray(a) && Array.isArray(b)
        ? a.length === b.length && a.every((item, i) => item === b[i])
        : a === b;
}

// Anything missing or unreadable falls back to the default, so a bad value can't break the app
function loadSettings(): Settings {
    let saved: Record<string, unknown> = {};
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
        if (typeof parsed === 'object' && parsed !== null) {
            saved = parsed as Record<string, unknown>;
        }
    } catch {
        // Corrupted: use the defaults
    }
    const flag = (
        key: 'sound' | 'vibration' | 'countdownBeeps' | 'keepScreenOn' | 'onlyMyEquipment'
    ) => (typeof saved[key] === 'boolean' ? saved[key] : DEFAULT_SETTINGS[key]);
    const theme = THEMES.find((t) => t === saved['theme']) ?? DEFAULT_SETTINGS.theme;
    const weightUnit =
        WEIGHT_UNITS.find((u) => u === saved['weightUnit']) ?? DEFAULT_SETTINGS.weightUnit;
    return {
        theme,
        sound: flag('sound'),
        vibration: flag('vibration'),
        countdownBeeps: flag('countdownBeeps'),
        keepScreenOn: flag('keepScreenOn'),
        weightUnit,
        bodyFigure:
            BODY_FIGURE_CHOICES.find((f) => f === saved['bodyFigure']) ??
            DEFAULT_SETTINGS.bodyFigure,
        trainingGoal:
            TRAINING_GOALS.find((g) => g === saved['trainingGoal']) ??
            DEFAULT_SETTINGS.trainingGoal,
        // Kept in the order it's offered, so it reads the same however it was picked
        myEquipment: Array.isArray(saved['myEquipment'])
            ? EQUIPMENT_CHOICES.filter((choice) =>
                  (saved['myEquipment'] as unknown[]).includes(choice)
              )
            : DEFAULT_SETTINGS.myEquipment,
        onlyMyEquipment: flag('onlyMyEquipment'),
        eachSideFirst:
            saved['eachSideFirst'] === 'left' || saved['eachSideFirst'] === 'right'
                ? saved['eachSideFirst']
                : DEFAULT_SETTINGS.eachSideFirst,
        switchSidesSeconds:
            Number.isInteger(saved['switchSidesSeconds']) &&
            (saved['switchSidesSeconds'] as number) >= 0 &&
            (saved['switchSidesSeconds'] as number) <= MAX_SWITCH_SECONDS
                ? (saved['switchSidesSeconds'] as number)
                : DEFAULT_SETTINGS.switchSidesSeconds,
        name: typeof saved['name'] === 'string' ? cleanName(saved['name']) : DEFAULT_SETTINGS.name,
        profileUpdatedAt:
            Number.isSafeInteger(saved['profileUpdatedAt']) &&
            (saved['profileUpdatedAt'] as number) >= 0
                ? (saved['profileUpdatedAt'] as number)
                : DEFAULT_SETTINGS.profileUpdatedAt,
    };
}
