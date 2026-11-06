import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MovedBannerComponent } from './nav/moved-banner/moved-banner.component';
import { NavComponent } from './nav/nav.component';
import { openNewPagesAtTop } from './nav/open-at-top';
import { RunBarComponent } from './nav/run-bar/run-bar.component';
import { TabBarComponent } from './nav/tab-bar/tab-bar.component';
import { UndoBarComponent } from './nav/undo-bar/undo-bar.component';

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

    constructor() {
        openNewPagesAtTop();
    }
}
