import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { injectCurrentUrl, isOnPage } from './current-url';
import { TABS } from './tab-bar/tabs';
import { WorkoutMorph } from './workout-morph';
import { IconComponent } from '../shared/components/icon/icon.component';

/** Where the workout page's back link goes if it was opened straight from an address. */
const FALLBACK = '/library';

/**
 * The header: the Loop Workouts title. Getting about is the tab bar's job (TabBarComponent); on
 * the workout page, which has no tab bar, a ⌄ link at the top left goes back to the page you
 * came from, leaving the workout running in the bar above the tabs (RunBarComponent).
 */
@Component({
    selector: 'app-nav',
    imports: [IconComponent],
    templateUrl: './nav.component.html',
    styleUrl: './nav.component.scss',
})
export class NavComponent {
    private readonly activeWorkout = inject(WorkoutStore).activeWorkout;
    private readonly url = injectCurrentUrl();
    protected readonly morph = inject(WorkoutMorph);

    protected readonly onWorkoutPage = computed(() => isOnPage(this.url(), '/workout'));

    /**
     * The last page other than the workout. Kept from every navigation as it happens, as the
     * back link that reads it is only there once you're on the workout page.
     */
    private readonly lastPage = toSignal(
        inject(Router).events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map((event) => event.urlAfterRedirects),
            filter((url) => !isOnPage(url, '/workout'))
        ),
        // Before the first navigation the address is just "/"
        {
            initialValue:
                this.url() === '/' || isOnPage(this.url(), '/workout') ? FALLBACK : this.url(),
        }
    );
    /** The back link's place and name, e.g. "/history" and "Back to History". */
    protected readonly back = computed(() => {
        const url = this.lastPage();
        const tab = TABS.find(
            (tab) => isOnPage(url, tab.path) || tab.holds.some((path) => isOnPage(url, path))
        );
        return {
            url,
            label: `Back to ${tab?.label ?? 'Library'}`,
        };
    });

    /** On the workout page, the running workout's title (if it has one); otherwise empty. */
    protected readonly workoutTitle = computed(() =>
        this.onWorkoutPage() ? (this.activeWorkout()?.title.trim() ?? '') : ''
    );
}
