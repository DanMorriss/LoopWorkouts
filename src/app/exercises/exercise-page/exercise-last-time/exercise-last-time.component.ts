import { DatePipe } from '@angular/common';
import { Component, computed, DOCUMENT, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { sessionsByExercise } from '../../../models/progress';
import { prefersReducedMotion } from '../../../shared/reduced-motion';
import { HistoryStore } from '../../../shared/state/history-store.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';
import { latestAndBest } from '../../progress-format';

/**
 * An exercise's latest sets and best (PRG-3) under its name on its page, once it's been done:
 * what there is to beat, at a glance, at rest. "Your progress" goes down to the Progress
 * section at the end (`progressId`), which takes focus. Nothing before it's been done. The
 * details mid-workout (RUN-9) leave it out, to keep how to do it first.
 */
@Component({
    selector: 'app-exercise-last-time',
    imports: [DatePipe, MatIconModule],
    template: `
        @if (summary(); as s) {
            <div class="last-time">
                <dl class="last-time__lines">
                    <div>
                        <dt>Last time</dt>
                        <dd>
                            <span class="last-time__figure" aria-hidden="true">{{ s.latest }}</span>
                            <span class="sr-only">{{ s.latestSpoken }}</span>
                            · {{ s.latestAt | date: s.dateFormat }}
                        </dd>
                    </div>
                    @if (s.best) {
                        <div>
                            <dt>Best</dt>
                            <dd class="last-time__figure">{{ s.best }}</dd>
                        </div>
                    }
                </dl>
                <button type="button" class="last-time__more" (click)="goToProgress()">
                    Your progress
                    <mat-icon aria-hidden="true">expand_more</mat-icon>
                </button>
            </div>
        }
    `,
    styleUrl: './exercise-last-time.component.scss',
})
export class ExerciseLastTimeComponent {
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);
    private readonly document = inject(DOCUMENT);

    readonly exerciseId = input.required<string>();
    /** The id of the Progress section's heading, which "Your progress" goes to. */
    readonly progressId = input.required<string>();

    protected readonly summary = computed(() => {
        const sessions = sessionsByExercise(this.history.entries()).get(this.exerciseId());
        return sessions?.length ? latestAndBest(sessions, this.settings.weightUnit()) : null;
    });

    protected goToProgress() {
        const heading = this.document.getElementById(this.progressId());
        heading?.scrollIntoView({
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
            block: 'start',
        });
        heading?.focus({ preventScroll: true });
    }
}
