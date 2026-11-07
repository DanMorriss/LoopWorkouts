import { Service, signal } from '@angular/core';

/** Set once the tour's been taken, or turned down, on this device. */
export const TOUR_KEY = 'tour';

/**
 * The tour of the app (NAV-8): whether Today still offers it on this device, and which stop
 * is showing while it's on. The tour itself, `TourComponent` with its stops, loads only once it
 * starts (`AppComponent`), so none of it is in the first download.
 */
@Service()
export class TourService {
    private readonly _offered = signal(readOffered());
    private readonly _stop = signal<number | null>(null);

    /**
     * Whether Progress shows example workouts in place of an empty history, while the tour is
     * showing it.
     */
    readonly sampleHistory = signal(false);
    /** Whether Today offers the tour: until it's taken or turned down here. */
    readonly offered = this._offered.asReadonly();
    /** The stop showing, from 0, or null with the tour off. */
    readonly stop = this._stop.asReadonly();

    start() {
        this.stopOffering();
        this._stop.set(0);
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

    /** Not now: Today stops offering it. */
    stopOffering() {
        this._offered.set(false);
        try {
            localStorage.setItem(TOUR_KEY, 'seen');
        } catch {
            // Storage full or blocked: it's offered again next time, which is fine
        }
    }
}

function readOffered(): boolean {
    try {
        return localStorage.getItem(TOUR_KEY) === null;
    } catch {
        return false;
    }
}
