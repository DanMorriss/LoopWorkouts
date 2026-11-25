import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { describeSets } from '../../../../history/history-format';
import { ExerciseSession } from '../../../../models/progress';
import { SettingsStore } from '../../../../shared/state/settings-store.service';
import { dateFormatFor } from '../../../progress-format';

/** How many show before Show all. */
const RECENT = 5;

/**
 * An exercise's recent workouts (PRG-4), newest first, with their sets as in the history, each
 * linking to its workout there. The last few show, and the rest on Show all.
 */
@Component({
    selector: 'app-recent-sessions',
    imports: [DatePipe, RouterLink],
    templateUrl: './recent-sessions.component.html',
    styleUrl: './recent-sessions.component.scss',
})
export class RecentSessionsComponent {
    private readonly settings = inject(SettingsStore);

    /** Newest first. */
    readonly sessions = input.required<readonly ExerciseSession[]>();
    /** For ids that are unique on the page. */
    readonly id = input.required<string>();

    protected readonly recentCount = RECENT;
    protected readonly showAll = signal(false);
    protected readonly shown = computed(() =>
        (this.showAll() ? this.sessions() : this.sessions().slice(0, RECENT)).map((session) => ({
            entryId: session.entryId,
            at: session.startedAt,
            title: session.title.trim() || 'Untitled workout',
            lines: describeSets(session.sets, this.settings.weightUnit()),
        }))
    );
    protected readonly dateFormat = dateFormatFor;
}
