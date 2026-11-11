import { ApplicationRef, inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { isOnPage } from '../shared/navigation/current-url';
import { LeaveCheck } from '../shared/navigation/leave-check';
import { letInputThrough } from '../shared/navigation/let-input-through';
import { FADING_CLASS } from '../shared/navigation/page-slide';
import { prefersReducedMotion } from '../shared/reduced-motion';

/** On <html> while the workout morphs, naming the parts that move. */
export const MORPHING_CLASS = 'workout-morphing';

/**
 * The workout grows out of its bar above the tabs when the bar is pressed, and folds back
 * into it on the workout page's ⌄: the two share a view-transition-name (`workout`), so the
 * browser morphs one into the other, while the tab bar slides away and back. Every other
 * navigation changes page at once, as switching tabs does on a phone, so this starts its own
 * view transition around those two navigations rather than the router making one for all.
 */
@Service()
export class WorkoutMorph {
    private readonly router = inject(Router);
    private readonly leaveCheck = inject(LeaveCheck);
    private readonly appRef = inject(ApplicationRef);

    /**
     * For a link's (click): goes to `url`, morphing. A click that opens a new tab or window
     * instead (a modifier key, or a middle click) is left to the browser and the link's href.
     */
    follow(event: MouseEvent, url: string) {
        if (
            event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }
        event.preventDefault();
        this.navigate(url);
    }

    /**
     * Goes to `url`, morphing between the bar and the workout page. With reduced motion the
     * pages cross-fade instead (FADING_CLASS); in a browser without view transitions, it just
     * goes. The names that pair the bar with the
     * page (styles/_workout-morph.scss) only apply under MORPHING_CLASS, as a named element is
     * drawn on its own, which would keep the summary's blur off the header the rest of the
     * time. Which way it's going (`--open` into the workout, `--close` back to the bar)
     * decides which picture is the bar's.
     */
    navigate(url: string) {
        // Before the morph starts, as the screen is frozen during one
        const asking = this.leaveCheck.confirm();
        if (asking) {
            void asking.then((leave) => {
                if (leave) {
                    this.navigate(url);
                }
            });
            return;
        }
        if (!document.startViewTransition) {
            void this.router.navigateByUrl(url);
            return;
        }
        const reduced = prefersReducedMotion();
        const opening = isOnPage(url, '/workout');
        const classes = reduced
            ? [FADING_CLASS]
            : [MORPHING_CLASS, `${MORPHING_CLASS}--${opening ? 'open' : 'close'}`];
        const root = document.documentElement;
        root.classList.add(...classes);
        const transition = document.startViewTransition(async () => {
            await this.router.navigateByUrl(url);
            // Render now, so the new page is what the browser morphs into
            this.appRef.tick();
        });
        // A tap mid-morph ends it and lands, rather than doing nothing till it's over
        letInputThrough(transition);
        // Interrupted (e.g. another view transition starting) rejects `ready`; nothing waits on it
        transition.ready.catch(() => undefined);
        transition.finished.finally(() => root.classList.remove(...classes));
    }
}
