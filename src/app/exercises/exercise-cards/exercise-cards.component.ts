import { Component, computed, input, output } from '@angular/core';
import { Exercise } from '../../models/exercise';
import { counted } from '../../shared/format-count';
import { ExerciseCard, ExerciseCardComponent } from '../exercise-card/exercise-card.component';

/**
 * A list of exercise cards, as the Exercises list (EXR-6) and Browse in Create (BLD-16) show
 * them: how many there are ("12 exercises", read out as it changes), "No exercises match."
 * with Clear search and filters when there are none, and the cards. `picks` makes each card
 * pick its exercise (`picked`), as Browse does, rather than open its page. `counted` false
 * leaves out the count and the empty message, e.g. for the hidden ones under the list.
 */
@Component({
    selector: 'app-exercise-cards',
    imports: [ExerciseCardComponent],
    template: `
        @if (counted()) {
            <p class="exercise-cards__count" role="status">{{ count() }}</p>
            @if (cards().length === 0) {
                <div class="exercise-cards__empty">
                    <p>No exercises match.</p>
                    @if (clearable()) {
                        <button type="button" class="btn-pill" (click)="cleared.emit()">
                            Clear search and filters
                        </button>
                    }
                </div>
            }
        }
        <ul class="exercise-cards__list" [attr.id]="listId()" [attr.aria-label]="label()">
            @for (item of cards(); track item.exercise.id) {
                <li>
                    <app-exercise-card
                        [card]="item"
                        [picks]="picks()"
                        [attr.data-tour]="picks() ? null : 'exercise'"
                        (picked)="picked.emit($event)"
                    />
                </li>
            }
        </ul>
    `,
    styleUrl: './exercise-cards.component.scss',
})
export class ExerciseCardsComponent {
    readonly cards = input.required<readonly ExerciseCard[]>();
    readonly picks = input(false);
    /** Whether "No exercises match." offers Clear search and filters (`cleared`). */
    readonly clearable = input(true);
    readonly counted = input(true);
    readonly label = input<string | null>(null);
    readonly listId = input<string | null>(null);
    readonly picked = output<Exercise>();
    readonly cleared = output<void>();

    protected readonly count = computed(() => counted(this.cards().length, 'exercise'));
}
