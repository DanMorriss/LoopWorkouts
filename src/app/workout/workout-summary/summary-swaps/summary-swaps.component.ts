import { afterNextRender, Component, computed, inject, Injector, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActiveRunService } from '../../../shared/run/active-run.service';
import { WorkoutStore } from '../../../shared/state/workout-store.service';

/**
 * The exercises swapped mid-workout (RUN-11), on the summary: "Swapped Smith machine squat for
 * Goblet squat", and whether to use it next time. Yes puts it on the saved workout's step;
 * No leaves the saved workout as it was, as the machine's likely free next time. Only asked of
 * a workout still in the library. Focus moves to the answer, as the buttons go.
 */
@Component({
    selector: 'app-summary-swaps',
    imports: [MatIconModule],
    template: `
        @if (lines().length) {
            <section class="swaps" aria-labelledby="summary-swaps">
                <h3 id="summary-swaps">Swapped</h3>
                <ul class="swaps__list">
                    @for (line of lines(); track line.step) {
                        <li>
                            <p class="swaps__what">
                                <mat-icon aria-hidden="true">swap_horiz</mat-icon>
                                {{ line.was }} for {{ line.now }}
                            </p>
                            @switch (line.answer) {
                                @case ('yes') {
                                    <p
                                        class="swaps__answer"
                                        [id]="answerId(line.step)"
                                        tabindex="-1"
                                    >
                                        Saved: next time it's {{ line.now }}.
                                    </p>
                                }
                                @case ('no') {
                                    <p
                                        class="swaps__answer"
                                        [id]="answerId(line.step)"
                                        tabindex="-1"
                                    >
                                        Next time it's {{ line.was }} again.
                                    </p>
                                }
                                @default {
                                    @if (canKeep()) {
                                        <p class="swaps__ask">Use {{ line.now }} next time?</p>
                                        <div class="swaps__actions">
                                            <button
                                                type="button"
                                                class="btn-pill"
                                                (click)="answer(line.step, false)"
                                            >
                                                No, just this time
                                            </button>
                                            <button
                                                type="button"
                                                class="btn-pill swaps__keep"
                                                (click)="answer(line.step, true)"
                                            >
                                                Yes, use next time
                                            </button>
                                        </div>
                                    }
                                }
                            }
                        </li>
                    }
                </ul>
            </section>
        }
    `,
    styleUrl: './summary-swaps.component.scss',
})
export class SummarySwapsComponent {
    private readonly run = inject(ActiveRunService);
    private readonly store = inject(WorkoutStore);
    private readonly injector = inject(Injector);

    private readonly answers = signal<ReadonlyMap<number, 'yes' | 'no'>>(new Map());

    /** Only a workout still in the library has a step to put it on. */
    protected readonly canKeep = computed(() => {
        const id = this.run.workout()?.id;
        return id !== undefined && this.store.workouts().some((workout) => workout.id === id);
    });

    protected readonly lines = computed(() =>
        this.run.swaps().map((swap) => ({
            step: swap.step,
            was: swap.was.name,
            now: swap.now.name,
            answer: this.answers().get(swap.step),
        }))
    );

    protected answerId(step: number): string {
        return `swap-answer-${step}`;
    }

    protected answer(step: number, keep: boolean) {
        if (keep) {
            this.run.keepSwap(step);
        }
        this.answers.update((answers) => new Map([...answers, [step, keep ? 'yes' : 'no']]));
        afterNextRender(() => document.getElementById(this.answerId(step))?.focus(), {
            injector: this.injector,
        });
    }
}
