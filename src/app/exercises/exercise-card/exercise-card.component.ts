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
import { PageSlide } from '../../nav/page-slide';

/** One exercise in the list, as its card shows it. */
export interface ExerciseCard {
    exercise: Exercise;
    path: string;
    queryParams: { muscles?: string };
    own: boolean;
    mainMuscles: string[];
    /** e.g. "Barbell, rack", or empty when it lists none. */
    equipment: string;
    /** The other name a search found it by, if not its own. */
    otherName?: string;
    /** Its latest and best (PRG-3); missing until it's been done in a workout. */
    progress?: CardProgress;
}

/** e.g. latest "3 × 10 @ 60 kg" on 18 October, best "80 kg". */
export interface CardProgress {
    latest: string;
    latestSpoken: string;
    latestAt: number;
    /** The date with its year, unless it was this year. */
    dateFormat: string;
    best: string;
}

/** `exercise` as its card shows it, without its latest and best. */
export function exerciseCard(
    exercise: Exercise,
    otherName?: string,
    queryParams: { muscles?: string; from?: string } = {}
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
