import { Component, effect, inject, viewChild, ViewContainerRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MovedBannerComponent } from './nav/moved-banner/moved-banner.component';
import { NavComponent } from './nav/nav.component';
import { openNewPagesAtTop } from './nav/open-at-top';
import { RunBarComponent } from './nav/run-bar/run-bar.component';
import { TabBarComponent } from './nav/tab-bar/tab-bar.component';
import { UndoBarComponent } from './nav/undo-bar/undo-bar.component';
import { TourService } from './tour/tour.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    imports: [
        RouterOutlet,
        MovedBannerComponent,
        NavComponent,
        RunBarComponent,
        TabBarComponent,
        UndoBarComponent,
    ],
})
export class AppComponent {
    title = 'loop-workouts';
    private readonly tour = inject(TourService);
    private readonly tourSlot = viewChild('tour', { read: ViewContainerRef });

    constructor() {
        openNewPagesAtTop();
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
        const { TourComponent } = await import('./tour/tour.component');
        if (this.tour.stop() !== null && slot.length === 0) {
            slot.createComponent(TourComponent);
        }
    }
}
