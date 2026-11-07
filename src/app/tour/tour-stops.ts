import { TourName } from './tour.service';

/** A part of a page the tour can light up, found by its `data-tour` attribute. */
export interface TourPart {
    /** The `data-tour` value on it, e.g. "get-started": the first on the page is lit up. */
    part: string;
    text: string;
}

/** One stop on a tour: a page, and what's said about it. */
export interface TourStop {
    /** The page it opens, as its tab does, lighting the tab up; none stays on the page it's on. */
    path?: string;
    title: string;
    /** What it may light up, the first found winning; none for a stop that lights up nothing. */
    parts: readonly TourPart[];
    /** What it says when it lights up nothing, or can't find a part. */
    text: string;
    /** 'all' lights up the whole tab bar, rather than the tab for its page. */
    tab?: 'all';
    /** Whether its page shows example workouts in place of an empty history (Progress). */
    sampleHistory?: boolean;
}

/** A tour: its stops, in order, and where focus goes when it ends. */
export interface Tour {
    stops: readonly TourStop[];
    /** The id of what takes focus after Done, on the last stop's page. */
    doneFocus: string;
    /** The id of what takes focus after Skip tour; none for the page's title. */
    skipFocus?: string;
}

/** The tour of the app (NAV-8): each tab's page, and its main part. */
const APP_STOPS: readonly TourStop[] = [
    {
        path: '/home',
        title: 'Today',
        parts: [
            {
                part: 'get-started',
                text: "Start here: add a few workouts, then plan your week. Once you have, Today shows what's due and how your week's going.",
            },
            {
                part: 'week',
                text: "Your week: what's planned and what's done. Edit plan changes it.",
            },
        ],
        text: "What to do today, and how your week's going.",
    },
    {
        path: '/library',
        title: 'Workouts',
        parts: [{ part: 'workout', text: 'Tap a card for its details, or ▶ to start it.' }],
        text: 'Your workouts, and ready-made ones to use as they are.',
    },
    {
        path: '/library',
        title: 'Your own workouts',
        parts: [
            {
                part: 'new-workout',
                text: 'Tap + New to make your own: its exercises, sets, reps, rests and rounds.',
            },
        ],
        text: 'Make your own workout with + New.',
    },
    {
        path: '/exercises',
        title: 'Exercises',
        parts: [
            {
                part: 'exercise',
                text: "Tap an exercise to see how it's done, a 3D demo and the muscles it works.",
            },
        ],
        text: "Tap an exercise to see how it's done and the muscles it works.",
    },
    {
        path: '/history',
        title: 'Progress',
        parts: [
            {
                part: 'progress-sample',
                text: "Once you've done a few workouts, this shows your time each week, the muscles you've worked and every workout. These are examples.",
            },
            {
                part: 'time-per-week',
                text: "How you're getting on: your time each week, the muscles you've worked, and every workout you've done.",
            },
            {
                part: 'progress-empty',
                text: "Once you've done a workout, your weeks, the muscles you've worked and every session show here.",
            },
        ],
        text: "How you're getting on, and every workout you've done.",
        sampleHistory: true,
    },
    {
        path: '/account',
        title: 'You',
        parts: [
            {
                part: 'sync',
                text: 'Sign in to keep everything safe and on all your devices. Settings and Help are here too.',
            },
        ],
        text: 'Signing in, your profile, Settings and Help.',
    },
    {
        path: '/home',
        title: "That's it",
        parts: [],
        text: 'The tabs take you to each part, wherever you are. Start with a workout, or plan your week.',
        tab: 'all',
    },
];

/**
 * The tour of Create (BLD-17), the first time it opens for a new workout: the parts of a new
 * workout's form, top to bottom, on the page as it is.
 */
const CREATE_STOPS: readonly TourStop[] = [
    {
        title: 'Make a workout',
        parts: [
            {
                part: 'workout-title',
                text: "A quick look at what's here, top to bottom. First, a name for it, e.g. Leg day.",
            },
        ],
        text: "A quick look at what's here, top to bottom.",
    },
    {
        title: 'Steps',
        parts: [
            {
                part: 'step-header',
                text: 'A workout is steps, done in order. Tap Reps to make one timed or a rest, and drag its handle, or use the arrows, to move it.',
            },
        ],
        text: 'A workout is steps, done in order: reps, a time or a rest.',
    },
    {
        title: 'Exercises',
        parts: [
            {
                part: 'step-exercise',
                text: 'Type to find an exercise, or make your own. The button beside it lists them all, by muscle and the kit you have.',
            },
        ],
        text: 'Type to find an exercise, or make your own.',
    },
    {
        title: 'Sets',
        parts: [
            {
                part: 'step-sets',
                text: 'With more than one set, you choose the rest after each, and Vary each set gives each its own reps and weight, e.g. for a pyramid. Each side does the left, then the right.',
            },
        ],
        text: 'Each step can have sets, with a rest after each.',
    },
    {
        title: 'More steps',
        parts: [
            {
                part: 'add-steps',
                text: '+ Step adds an exercise or a rest, and + Heading a title, e.g. Warmup. Join with next, on a step with one after it, makes them a superset.',
            },
        ],
        text: '+ Step adds another step, and + Heading a title, e.g. Warmup.',
    },
    {
        title: 'Rounds',
        parts: [
            {
                part: 'repeat',
                text: 'Repeat the whole workout a number of rounds, until you stop, or as many rounds as fit in a time limit.',
            },
        ],
        text: 'Repeat the whole workout a number of rounds, or for a time.',
    },
    {
        title: 'Save or start',
        parts: [
            {
                part: 'save',
                text: 'Save keeps it in Workouts for another day, and Start workout saves it and starts it now.',
            },
        ],
        text: 'Save keeps it in Workouts; Start workout starts it now.',
    },
];

export const TOURS: Record<TourName, Tour> = {
    // Done goes back to Today, its last stop
    app: { stops: APP_STOPS, doneFocus: 'home-title' },
    create: { stops: CREATE_STOPS, doneFocus: 'title', skipFocus: 'title' },
};
