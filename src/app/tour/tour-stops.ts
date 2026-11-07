/** A part of a page the tour can light up, found by its `data-tour` attribute. */
export interface TourPart {
    /** The `data-tour` value on it, e.g. "get-started": the first on the page is lit up. */
    part: string;
    text: string;
}

/** One stop on the tour (NAV-8): a page, and what's said about it. */
export interface TourStop {
    /** The page it opens, as its tab does. */
    path: string;
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

export const TOUR_STOPS: readonly TourStop[] = [
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
