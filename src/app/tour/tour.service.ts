import { Service, signal } from '@angular/core';

/**
 * The tours: of the app (NAV-8), of making a workout on Create (BLD-17), of the workout page
 * (RUN-13), on the first workout or a run going, or on a practice run from Help, and of the
 * Plan page on its first visit (PLN-8), and of an exercise's page on the first one opened;
 * and a tip of one stop, on Create's first Join with next.
 */
export type TourName =
    | 'app'
    | 'create'
    | 'join'
    | 'workout'
    | 'workout-practice'
    | 'plan'
    | 'exercise';

/** Set once the tour of the app's been taken, or turned down, on this device. */
export const TOUR_KEY = 'tour';
/** Set once the tour of Create has been shown on this device. */
export const CREATE_TOUR_KEY = 'tour-create';
/** Set once the tip on Create's first Join with next has been shown on this device. */
export const JOIN_TIP_KEY = 'tip-join';
/** Set once the tour of the workout page has been shown on this device. */
export const WORKOUT_TOUR_KEY = 'tour-workout';
/** Set once the tour of the Plan page has been shown on this device. */
export const PLAN_TOUR_KEY = 'tour-plan';
/** Set once the tour of an exercise's page has been shown on this device. */
export const EXERCISE_TOUR_KEY = 'tour-exercise';

const KEYS: Record<TourName, string> = {
    app: TOUR_KEY,
    create: CREATE_TOUR_KEY,
    join: JOIN_TIP_KEY,
    workout: WORKOUT_TOUR_KEY,
    // Taken from Help, it counts as seen for the first workout too
    'workout-practice': WORKOUT_TOUR_KEY,
    plan: PLAN_TOUR_KEY,
    exercise: EXERCISE_TOUR_KEY,
};

/**
 * The tours: whether Today still offers the tour of the app on this device, and which tour
 * and stop is showing while one's on. The tours themselves, `TourComponent` with their stops,
 * load only once one starts (`AppComponent`), so none of them is in the first download.
 */
@Service()
export class TourService {
    private readonly _offered = signal(!seen(TOUR_KEY));
    private readonly _tour = signal<TourName>('app');
    private readonly _stop = signal<number | null>(null);

    /**
     * Whether Progress shows example workouts in place of an empty history, while the tour is
     * showing it.
     */
    readonly sampleHistory = signal(false);
    /** Whether Today offers the tour of the app: until it's taken or turned down here. */
    readonly offered = this._offered.asReadonly();
    /** The tour showing, or the last to have shown. */
    readonly tour = this._tour.asReadonly();
    /** The stop showing, from 0, or null with no tour on. */
    readonly stop = this._stop.asReadonly();

    start(tour: TourName = 'app') {
        this.markSeen(tour);
        this._tour.set(tour);
        this._stop.set(0);
    }

    /** Whether startOnce() would start it: it hasn't been shown on this device, and no tour is on. */
    due(tour: TourName): boolean {
        return this._stop() === null && !seen(KEYS[tour]);
    }

    /** Starts the tour if it hasn't been shown on this device, and no tour is on. */
    startOnce(tour: TourName) {
        if (this.due(tour)) {
            this.start(tour);
        }
    }

    /** On to the next stop; the tour knows which is its last, and ends there instead. */
    next() {
        this._stop.update((stop) => (stop === null ? null : stop + 1));
    }

    back() {
        this._stop.update((stop) => (stop === null ? null : Math.max(0, stop - 1)));
    }

    end() {
        this._stop.set(null);
        this.sampleHistory.set(false);
    }

    /** Not now: Today stops offering the tour of the app. */
    stopOffering() {
        this.markSeen('app');
    }

    private markSeen(tour: TourName) {
        if (tour === 'app') {
            this._offered.set(false);
        }
        try {
            localStorage.setItem(KEYS[tour], 'seen');
        } catch {
            // Storage full or blocked: it's shown again next time, which is fine
        }
    }
}

/** Whether it's been seen; with storage blocked, it's counted as seen, so it isn't shown each time. */
function seen(key: string): boolean {
    try {
        return localStorage.getItem(key) !== null;
    } catch {
        return true;
    }
}
