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
    /**
     * Done and Skip tour put focus back where it was as the tour opened, e.g. for a tip that
     * shows up as something's being done, which carries on after it.
     */
    returnFocus?: true;
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
                text: '+ Step adds an exercise or a rest, and + Heading a title, e.g. Warmup, to split a long workout into parts.',
            },
        ],
        text: '+ Step adds another step, and + Heading a title, e.g. Warmup.',
    },
    {
        // Join with next only shows once a step has one after it, which a new workout's
        // doesn't, so this lights up + Step, the first of the two taps; a tip shows Join with
        // next itself, the first time one appears (JOIN_STOPS)
        title: 'Supersets',
        parts: [
            {
                part: 'add-step',
                text: 'To do exercises back to back, e.g. bench press then rows, then one rest: add the second with + Step, then tap Join with next under the first. Join a third for a giant set.',
            },
        ],
        text: 'To do exercises back to back, add the second with + Step, then tap Join with next under the first.',
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

/**
 * The tour of the workout page (RUN-13), on the first workout run on a device, or from Help on
 * a run going, with its clock held till the tour ends: the bubble, what's next, rep steps, how
 * it's done and swapping, Pause and Skip, and that it carries on on other pages. A part that
 * isn't there for the step it's on, e.g. the reps on a timed step, is said in words instead.
 */
const WORKOUT_STOPS: readonly TourStop[] = [
    {
        title: 'The workout',
        parts: [
            {
                part: 'stage',
                text: "A quick look round: the clock waits till you're done. The bubble is the step you're on, its ring filling as a timed step's time goes.",
            },
        ],
        text: "A quick look round: the clock waits till you're done.",
    },
    {
        title: "What's next",
        parts: [
            {
                part: 'next',
                text: 'What comes after this step. It pulses in its colour as this one nears its end, to get ready.',
            },
        ],
        text: 'Under the bubble is what comes next, to get ready for.',
    },
    {
        title: 'Rep steps',
        parts: [
            {
                part: 'reps',
                text: "On a rep step the clock waits for you. Tap the reps or weight to change them to what you did, then, when you're done, press what's next, under the bubble.",
            },
        ],
        text: "On a rep step the clock waits for you. Tap the reps or weight on the bubble to change them to what you did, then, when you're done, press what's next, under it.",
    },
    {
        title: "How it's done",
        parts: [
            {
                part: 'info',
                text: "Tap ⓘ to see how the exercise is done. Swap exercise there finds another for the same muscles, e.g. if the machine's taken.",
            },
        ],
        text: "On an exercise, ⓘ beside its name shows how it's done, with Swap exercise if, say, the machine's taken.",
    },
    {
        title: 'Pause and skip',
        parts: [
            {
                part: 'controls',
                text: 'Pause stops the clock, with End workout there when you want to finish early. Skip moves on without logging this step.',
            },
        ],
        text: 'Pause stops the clock, and Skip moves on without logging the step.',
    },
    {
        title: 'Off you go',
        parts: [],
        text: 'The workout carries on if you look at another page, with a bar at the bottom to come back. Press Done to carry on.',
    },
];

/**
 * The same tour on a practice run of Bodyweight basics, started from Help with no workout
 * going: its first and last stops say so, and Done goes back to Help.
 */
const WORKOUT_PRACTICE_STOPS: readonly TourStop[] = [
    {
        title: 'A practice run',
        parts: [
            {
                part: 'stage',
                text: "Bodyweight basics, just for the tour: the clock waits, and nothing's logged. The bubble is the step you're on, its ring filling as a timed step's time goes.",
            },
        ],
        text: "Bodyweight basics, just for the tour: the clock waits, and nothing's logged.",
    },
    ...WORKOUT_STOPS.slice(1, -1),
    {
        title: "That's it",
        parts: [],
        text: 'A workout carries on if you look at another page, with a bar at the bottom to come back. Done ends this practice run and goes back to Help.',
    },
];

/**
 * The tour of the Plan page (PLN-8), on its first visit: the week, where each planned workout
 * is this week, the ready-made plans, and what the plan works and misses, at the bottom.
 */
const PLAN_STOPS: readonly TourStop[] = [
    {
        title: 'Your week',
        parts: [
            {
                part: 'plan-today',
                text: 'Which workouts you do on which days, the same every week. Tap Add on a day to plan one, of yours or a ready-made one, and × to take it off.',
            },
        ],
        text: 'Which workouts you do on which days, the same every week. Tap Add on a day to plan one.',
    },
    {
        title: 'This week',
        parts: [
            {
                part: 'plan-workout',
                text: "Each planned workout says how it's going this week: Done, Missed if its day went by, or Due today. From next week means it was planned after its day had gone.",
            },
        ],
        text: "Once a workout's planned, it says how it's going this week: Done, Missed if its day went by, or Due today. From next week means it was planned after its day had gone.",
    },
    {
        title: 'Ready-made plans',
        parts: [
            {
                part: 'plan-ready-made',
                text: 'Or start from a ready-made week for your goal and kit, which sets up its workouts and plan in one go.',
            },
        ],
        text: 'Or start from a ready-made week for your goal and kit.',
    },
    {
        title: 'What your plan works',
        parts: [
            {
                part: 'plan-works',
                text: 'The muscles your plan works. Under it, any it misses, with a ready-made workout to plan for them. Pick a muscle to find exercises for it.',
            },
        ],
        text: 'Once workouts are planned, the bottom of the page shows the muscles they work, and any they miss, with a ready-made workout to plan for them.',
    },
];

/**
 * A tip, the first time a Join with next shows in Create (BLD-12), as a second step's added:
 * the tour of Create can only point at + Step for it, as a new workout has one step.
 */
const JOIN_STOPS: readonly TourStop[] = [
    {
        title: 'Supersets',
        parts: [
            {
                part: 'join',
                text: 'Join with next makes this step and the next a superset: done back to back, then one rest. Join a third for a giant set.',
            },
        ],
        text: 'Join with next, under a step, makes it and the next a superset: done back to back, then one rest.',
    },
];

export const TOURS: Record<TourName, Tour> = {
    // Done goes back to Today, its last stop
    app: { stops: APP_STOPS, doneFocus: 'home-title' },
    create: { stops: CREATE_STOPS, doneFocus: 'title', skipFocus: 'title' },
    // Back to what was being done as it showed, e.g. the new step's name
    join: { stops: JOIN_STOPS, doneFocus: 'title', skipFocus: 'title', returnFocus: true },
    // Pause, ready for the clock that starts as it ends
    workout: { stops: WORKOUT_STOPS, doneFocus: 'workout-pause', skipFocus: 'workout-pause' },
    // Back on Help, which the page puts focus on once it's there (`tourWorkoutPage()`)
    'workout-practice': {
        stops: WORKOUT_PRACTICE_STOPS,
        doneFocus: 'help-tour-workout',
        skipFocus: 'help-tour-workout',
    },
    plan: { stops: PLAN_STOPS, doneFocus: 'plan-title', skipFocus: 'plan-title' },
};
