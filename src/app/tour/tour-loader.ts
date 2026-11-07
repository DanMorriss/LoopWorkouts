import { InjectionToken, Type } from '@angular/core';

/**
 * Loads the tour (NAV-8) the first time it starts, so none of it is in the first download.
 * A token, so a test can have it fail, as it does in a tab left open across an update.
 */
export const TOUR_LOADER = new InjectionToken<() => Promise<Type<unknown>>>('TOUR_LOADER', {
    factory: () => () => import('./tour.component').then((loaded) => loaded.TourComponent),
});
