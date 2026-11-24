import { Component, DOCUMENT, effect, inject, viewChild, ViewContainerRef } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MovedBannerComponent } from './nav/moved-banner/moved-banner.component';
import { NavComponent } from './nav/nav.component';
import { openNewPagesAtTop } from './nav/open-at-top';
import { TabBarComponent } from './nav/tab-bar/tab-bar.component';
import { UndoBarComponent } from './nav/undo-bar/undo-bar.component';
import { isStaleCode, reloadForNewCode } from './nav/stale-code';
import { TOUR_LOADER } from './tour/tour-loader';
import { TourService } from './tour/tour.service';
import { lazyComponent } from './shared/lazy-component';
import { SyncStarter } from './sync/sync-starter.service';
import { WorkoutStore } from './shared/state/workout-store.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [RouterOutlet, MovedBannerComponent, NavComponent, TabBarComponent, UndoBarComponent],
})
export class AppComponent {
    title = 'loop-workouts';
    private readonly tour = inject(TourService);
    private readonly loadTour = inject(TOUR_LOADER);
    private readonly router = inject(Router);
    private readonly window = inject(DOCUMENT).defaultView;
    private readonly tourSlot = viewChild('tour', { read: ViewContainerRef });
    private readonly notesAskSlot = viewChild('notesAsk', { read: ViewContainerRef });
    private readonly runBarSlot = viewChild('runBar', { read: ViewContainerRef });

    constructor() {
        openNewPagesAtTop();
        // Asking whether to keep notes with the account (SYN-10), once signed in
        const sync = inject(SyncStarter);
        lazyComponent({
            load: () =>
                import('./account/notes-ask/notes-ask.component').then((m) => m.NotesAskComponent),
            slot: this.notesAskSlot,
            inputs: () => ({}),
            when: sync.started,
        });
        // The workout going, in the bar above the tabs: loaded once there is one, as most
        // visits start none, and kept from then on. One is started on its own page, which the
        // bar isn't on, so it's there by the time the bar's wanted.
        const workouts = inject(WorkoutStore);
        lazyComponent({
            load: () => import('./nav/run-bar/run-bar.component').then((m) => m.RunBarComponent),
            slot: this.runBarSlot,
            inputs: () => ({}),
            when: () => !!workouts.activeWorkout(),
        });
        // The tour, loaded the first time it starts, over everything while it's on
        effect(() => {
            const slot = this.tourSlot();
            if (slot && this.tour.stop() !== null) {
                void this.openTour(slot);
            } else {
                slot?.clear();
            }
        });
    }

    private async openTour(slot: ViewContainerRef) {
        let tour;
        try {
            tour = await this.loadTour();
        } catch (error) {
            // Not left started with nothing showing, so it can be started again; and a tab
            // left open across an update loads afresh, to fetch the tour's current code
            this.tour.end();
            if (this.window && isStaleCode(error)) {
                reloadForNewCode(this.window, this.router.url);
            }
            return;
        }
        if (this.tour.stop() !== null && slot.length === 0) {
            slot.createComponent(tour);
        }
    }
}
