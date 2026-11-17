import { Component, computed, inject, input } from '@angular/core';
import { capitalise, equipmentPhrases, Exercise, isBuiltIn } from '../../../models/exercise';
import { ExerciseStore } from '../../state/exercise-store.service';
import { BodyMapComponent } from '../body-map/body-map.component';
import { ExerciseDemoComponent } from '../exercise-demo/exercise-demo.component';

let nextId = 0;

/**
 * What an exercise is (EXR-7, EXR-8, EXR-13): its animated demo first, where it has one, then
 * its other names, what it needs and how it's measured as chips, its description and your
 * note on it, the muscles it works (listed, and on the body map when there's no demo to show
 * them), how to do it and tips. Everything but its name, which goes in whatever holds it: its
 * page, or the details dialog. Buttons for it (e.g. Edit) can be put inside, and show under
 * the description and note; anything marked `atEnd` (e.g. progress) shows after the tips.
 *
 * `brief`, mid-workout (RUN-9), leaves out the names, chips and muscles, for just how it's
 * done: the demo, the description, your note, the steps and tips.
 */
@Component({
    selector: 'app-exercise-details',
    imports: [BodyMapComponent, ExerciseDemoComponent],
    templateUrl: './exercise-details.component.html',
    styleUrl: './exercise-details.component.scss',
})
export class ExerciseDetailsComponent {
    readonly exercise = input.required<Exercise>();
    /** Said when it has no how-to steps or tips, or nothing for empty. */
    readonly emptyHint = input('');
    /** Just how it's done, mid-workout (RUN-9): no other names, chips or muscles. */
    readonly brief = input(false);

    private readonly exercises = inject(ExerciseStore);
    protected readonly id = `exercise-details-${nextId++}`;

    protected readonly builtIn = computed(() => isBuiltIn(this.exercise()));
    /** Its description, steps and tips: a built-in one's once they've loaded. */
    protected readonly text = computed(() => this.exercises.textOf(this.exercise()));
    /** A built-in one's, once its motion has loaded; your own has none. */
    protected readonly hasDemo = computed(() => !!this.exercises.motionOf(this.exercise()));
    protected readonly note = computed(() => this.exercises.noteFor(this.exercise().id));
    protected readonly hidden = computed(() => this.exercises.isHidden(this.exercise().id));
    protected readonly equipment = computed(() =>
        equipmentPhrases(this.exercise().equipment).map(capitalise)
    );

    constructor() {
        void this.exercises.loadText();
        void this.exercises.loadMotion();
    }
}
