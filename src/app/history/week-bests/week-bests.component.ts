import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { bestLines } from '../../exercises/progress-format';
import { exercisePath } from '../../models/exercise';
import { newBests, sessionsByExercise } from '../../models/progress';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { ShownHistory } from '../shown-history';
import { injectWeekRows } from '../week-rows';
import { NewBestTilesComponent } from './new-best-tiles/new-best-tiles.component';

/**
 * The first card on Progress: the new bests set in the last 7 days (PRG-13), each with what it
 * beat, as tiles swiped between, since beating your last time is what the app is for. With
 * none this week, the last one ever set, and where it was; with none ever, what sets one.
 */
@Component({
    selector: 'app-week-bests',
    imports: [DatePipe, NewBestTilesComponent, RouterLink],
    template: `
        <section class="week-bests" aria-labelledby="week-bests-title">
            <h3 class="week-bests__title" id="week-bests-title">New bests this week</h3>
            @if (bests().length) {
                <app-new-best-tiles [bests]="bests()" />
            } @else {
                <p class="week-bests__none">
                    None in the last 7 days yet.
                    @if (lastBest(); as last) {
                        Your last:
                        <a
                            class="week-bests__last"
                            [routerLink]="last.path"
                            [queryParams]="{ from: 'progress' }"
                            >{{ last.name }} {{ last.text }}</a
                        >, {{ last.at | date: 'd MMM' }}.
                    } @else {
                        Beat your last time at an exercise and it shows here.
                    }
                </p>
            }
        </section>
    `,
    styleUrl: './week-bests.component.scss',
})
export class WeekBestsComponent {
    private readonly history = inject(ShownHistory);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);

    protected readonly bests = injectWeekRows().bests;

    /** The latest best ever set that beat an earlier session, or null with none. */
    protected readonly lastBest = computed(() => {
        let last: { name: string; path: string; text: string; at: number } | null = null;
        for (const [exerciseId, sessions] of sessionsByExercise(this.history.entries())) {
            const exercise = this.exercises.byId(exerciseId);
            if (!exercise) {
                continue;
            }
            for (const line of bestLines(newBests(sessions), this.settings.weightUnit())) {
                if (!last || line.at > last.at) {
                    last = {
                        name: exercise.name,
                        path: exercisePath(exercise),
                        text: line.text,
                        at: line.at,
                    };
                }
            }
        }
        return last;
    });
}
