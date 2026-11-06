import { Component, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { injectCurrentUrl, isOnPage, pathOf } from '../current-url';
import { TABS } from './tabs';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * The tabs along the bottom: Today, Workouts, Exercises, Progress and You, as on an iPhone. A
 * highlight sits behind the chosen one and slides to the next. Not on the workout page,
 * which has the whole screen; the workout shows in the bar above the tabs everywhere else.
 */
@Component({
    selector: 'app-tab-bar',
    imports: [IconComponent, RouterLink],
    templateUrl: './tab-bar.component.html',
    styleUrl: './tab-bar.component.scss',
})
export class TabBarComponent {
    protected readonly tabs = TABS;
    private readonly url = injectCurrentUrl();

    // Not on the workout, nor the welcome screen, which are one thing at a time
    protected readonly shown = computed(
        () => !isOnPage(this.url(), '/workout') && !isOnPage(this.url(), '/welcome')
    );
    /** The chosen tab's index, or -1 when the page isn't one of theirs. */
    protected readonly chosen = computed(() =>
        TABS.findIndex(
            (tab) =>
                isOnPage(this.url(), tab.path) ||
                tab.holds.some((path) => isOnPage(this.url(), path))
        )
    );
    /**
     * "page" on a tab's own page; "true" on a page it holds (setup, under Library) or one
     * under it (an exercise's page), so it's marked as where you are without claiming to be it.
     */
    protected currentFor(index: number): 'page' | 'true' | null {
        if (index !== this.chosen()) {
            return null;
        }
        return pathOf(this.url()) === TABS[index].path ? 'page' : 'true';
    }
}
