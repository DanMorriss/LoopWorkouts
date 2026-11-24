import { Component, computed, inject, input } from '@angular/core';
import { MOST_SUGGESTIONS } from '../../models/muscle-balance';
import {
    ROUTINE_HOLD_SECONDS,
    setsToStretchToday,
    stretchOffer,
} from '../../models/stretch-routine';
import {
    CarouselComponent,
    SlideDirective,
} from '../../shared/components/carousel/carousel.component';
import { injectStartWorkout } from '../../shared/run/start-workout';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { injectSuggestedWorkouts } from './suggested-workouts';

let nextId = 0;

/**
 * A card with the workouts for the muscles furthest short of their aims in the last seven days
 * (PRG-9), on the history page, the workout summary and Today: the best first, and the next
 * few swiped to (MOST_SUGGESTIONS). Nothing shows with no workout to suggest.
 *
 * On Today (`stretchToday`), after training today, stretches for what it worked come first
 * (PRG-16), until they're done; on a planned day, where the plan says what's next
 * (`suggestWorkouts` off), they're all it shows.
 *
 * On a rest day in a planned week (`restDay`), it's offered, not pressed: resting is fine too.
 * It steers clear of the workout planned next this week and of most of its main muscles, and
 * says so, e.g. "and leaves your Quads and Glutes fresh for Legs day on Thursday".
 *
 * It's only ever a workout you can do with the equipment you've said you have; with none
 * picked yet, any.
 *
 * It says which muscles in words, not their sets and aims; on Today, the muscles worked this
 * week under it link to the bars on Progress for those.
 */
@Component({
    selector: 'app-suggested-workout',
    imports: [CarouselComponent, SlideDirective],
    template: `
        @if (slideCount()) {
            <section class="suggestion" [attr.aria-labelledby]="id">
                <h3 class="suggestion__label" [id]="id">{{ heading() }}</h3>
                @if (restDay() && suggestions().length && !stretch()) {
                    <p class="suggestion__reason">
                        Nothing's planned today, so resting is fine too. If you'd like to train:
                    </p>
                }
                <app-carousel class="suggestion__slides" label="Suggestions" itemName="Suggestion">
                    @if (stretch(); as offer) {
                        <ng-template appSlide>
                            <div class="suggestion__slide">
                                <p class="suggestion__title">Stretch what you worked</p>
                                <p class="suggestion__reason">
                                    {{ offer.time.text }} for your {{ offer.muscles }}, each held
                                    {{ holdSeconds }} seconds.
                                </p>
                                <button
                                    type="button"
                                    class="btn-main"
                                    [attr.aria-label]="'Start stretches, ' + offer.time.spoken"
                                    (click)="start(offer.workout)"
                                >
                                    Start stretches
                                </button>
                            </div>
                        </ng-template>
                    }
                    @for (suggested of suggestions(); track suggested.workout.id) {
                        <ng-template appSlide>
                            <div class="suggestion__slide">
                                <p class="suggestion__title">{{ suggested.workout.title }}</p>
                                <p class="suggestion__reason">{{ suggested.reason }}</p>
                                <button
                                    type="button"
                                    class="btn-main"
                                    [attr.aria-label]="'Start ' + suggested.workout.title"
                                    (click)="start(suggested.workout)"
                                >
                                    Start
                                </button>
                            </div>
                        </ng-template>
                    }
                </app-carousel>
            </section>
        }
    `,
    styleUrl: './suggested-workout.component.scss',
})
export class SuggestedWorkoutComponent {
    /** On Today, on a day of a planned week with nothing planned (PLN-2). */
    readonly restDay = input(false);
    /** Whether to suggest workouts: on Today, not on a planned day, as the plan says what's next. */
    readonly suggestWorkouts = input(true);
    /** On Today: after training today, stretches for what it worked first (PRG-16). */
    readonly stretchToday = input(false);

    private readonly history = inject(HistoryStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);
    protected readonly start = injectStartWorkout();
    private readonly now = Date.now();
    protected readonly id = `suggestion-title-${nextId++}`;

    private readonly suggested = injectSuggestedWorkouts({
        restDay: this.restDay,
        most: computed(() => MOST_SUGGESTIONS),
        now: this.now,
    });
    /** The workouts to suggest, best first, each with why; none where the plan says. */
    protected readonly suggestions = computed(() =>
        this.suggestWorkouts() ? this.suggested() : []
    );

    /** On Today, stretches for what today's training worked, until they're done. */
    protected readonly stretch = computed(() =>
        this.stretchToday()
            ? stretchOffer(
                  setsToStretchToday(this.history.entries(), this.now),
                  (id) => this.exercises.byId(id),
                  {
                      first: this.settings.eachSideFirst(),
                      switchSeconds: this.settings.switchSidesSeconds(),
                  }
              )
            : null
    );

    protected readonly slideCount = computed(
        () => this.suggestions().length + (this.stretch() ? 1 : 0)
    );

    protected readonly holdSeconds = ROUTINE_HOLD_SECONDS;

    /** After training today, for the stretches and what follows them. */
    protected readonly heading = computed(() => {
        if (this.stretch()) {
            return "After today's training";
        }
        return this.restDay() ? 'Fancy a workout today?' : 'Suggested next workout';
    });

    /** Whether anything's been done, for Progress to show: until then, no way there. */
}
