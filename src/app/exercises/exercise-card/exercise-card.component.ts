import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import {
    capitalise,
    equipmentPhrases,
    Exercise,
    exercisePath,
    isBuiltIn,
    MUSCLE_LABELS,
} from '../../models/exercise';
import { PageSlide } from '../../shared/navigation/page-slide';
import { LatestAndBest } from '../progress-format';

/** The Exercises list's search, muscles and `from`, as its address keeps them. */
interface ListQueryParams {
    q?: string;
    muscles?: string;
    from?: string;
}

/** One exercise in the list, as its card shows it. */
export interface ExerciseCard {
    exercise: Exercise;
    path: string;
    /** The list's search, muscles and `from`, for its page to go back to. */
    queryParams: ListQueryParams;
    own: boolean;
    mainMuscles: string[];
    /** e.g. "Barbell, rack", or empty when it lists none. */
    equipment: string;
    /** The other name a search found it by, if not its own. */
    otherName?: string;
    /** Its latest and best (PRG-3); missing until it's been done in a workout. */
    progress?: LatestAndBest;
}

/** `exercise` as its card shows it, without its latest and best. */
export function exerciseCard(
    exercise: Exercise,
    otherName?: string,
    queryParams: ListQueryParams = {}
): ExerciseCard {
    return {
        exercise,
        path: exercisePath(exercise),
        queryParams,
        own: !isBuiltIn(exercise),
        mainMuscles: exercise.mainMuscles.map((muscle) => MUSCLE_LABELS[muscle]),
        equipment: capitalise(equipmentPhrases(exercise.equipment).join(', ')),
        otherName,
    };
}

/**
 * One exercise in the Exercises list (EXR-6): a link to its page, which slides in over the list
 * (PageSlide), with its latest and best. With `picks`, a button that picks it instead, as
 * Browse in Create does (BLD-16).
 */
@Component({
    selector: 'app-exercise-card',
    imports: [DatePipe, MatIconModule, NgTemplateOutlet],
    templateUrl: './exercise-card.component.html',
    styleUrl: './exercise-card.component.scss',
})
export class ExerciseCardComponent {
    readonly card = input.required<ExerciseCard>();
    /** A button that emits `picked`, rather than a link to its page. */
    readonly picks = input(false);
    readonly picked = output<Exercise>();

    private readonly router = inject(Router);
    protected readonly slide = inject(PageSlide);
    /** Its page, with the muscles picked, e.g. "/exercises/back-squat?muscles=quads". */
    protected readonly url = computed(() =>
        this.router.serializeUrl(
            this.router.createUrlTree([this.card().path], { queryParams: this.card().queryParams })
        )
    );
}
