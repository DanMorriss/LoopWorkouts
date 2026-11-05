import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { form, FormField, maxLength, validate } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import {
    Equipment,
    EQUIPMENT_CHOICES,
    equipmentLabel,
    Exercise,
    ExerciseText,
    isBuiltIn,
    MAX_EXERCISE_DESCRIPTION_LENGTH,
    MAX_EXERCISE_LINE_LENGTH,
    MAX_EXERCISE_NAME_LENGTH,
    MAX_EXERCISE_NOTE_LENGTH,
    MAX_EXERCISE_STEPS,
    MAX_EXERCISE_TIPS,
    MeasuredBy,
    MUSCLE_LABELS,
    MuscleGroup,
    OwnExercise,
    OwnExerciseDetails,
} from '../../../models/exercise';
import { ExerciseStore } from '../../state/exercise-store.service';
import { WorkoutStore } from '../../state/workout-store.service';
import { BodyMapComponent } from '../body-map/body-map.component';
import { DialogComponent } from '../dialog/dialog.component';

/** What the editor holds: an exercise's details (used only for your own) and your note. */
interface ExerciseEditorModel {
    name: string;
    measuredBy: MeasuredBy;
    description: string;
    equipment: Equipment[];
    mainMuscles: MuscleGroup[];
    supportingMuscles: MuscleGroup[];
    /** One how-to step per line. */
    steps: string;
    /** One tip per line. */
    tips: string;
    note: string;
}

const MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[];
const NO_TEXT: ExerciseText = { description: '', steps: [], tips: [] };

/**
 * An exercise's details and your note on it, in a dialog. Your own exercise can be renamed
 * (EXR-3) and given a description, equipment, muscles, how-to steps and tips (EXR-9); a
 * renamed one's steps take the new name in every workout. Muscles are picked from chips, or
 * by tapping the body map. A built-in one can't change, so it shows its description and only
 * the note can be written (EXR-10). With `isNew`, the exercise is a blank one of your own,
 * made when it's saved. Focus is trapped inside while it's open. ‹ Back at its top, Escape
 * or a click outside close it without saving.
 */
@Component({
    selector: 'app-exercise-editor',
    imports: [DialogComponent, FormField, MatIconModule, BodyMapComponent],
    templateUrl: './exercise-editor.component.html',
    styleUrl: './exercise-editor.component.scss',
})
export class ExerciseEditorComponent {
    readonly exercise = input.required<Exercise>();
    /** The exercise isn't saved yet: saving makes it. */
    readonly isNew = input(false);
    readonly closed = output<void>();
    /** Saved, with the exercise as it now is. */
    readonly saved = output<Exercise>();

    private readonly exercises = inject(ExerciseStore);
    private readonly workouts = inject(WorkoutStore);

    constructor() {
        void this.exercises.loadText();
    }

    protected readonly builtIn = computed(() => isBuiltIn(this.exercise()));
    protected readonly title = computed(() => {
        if (this.builtIn()) {
            return this.exercise().name;
        }
        return this.isNew() ? 'New exercise' : 'Edit exercise';
    });
    protected readonly muscles = MUSCLES;
    protected readonly muscleLabels = MUSCLE_LABELS;
    protected readonly equipmentChoices = EQUIPMENT_CHOICES;
    protected readonly equipmentLabel = equipmentLabel;
    protected readonly maxNote = MAX_EXERCISE_NOTE_LENGTH;
    protected readonly maxSteps = MAX_EXERCISE_STEPS;
    protected readonly maxTips = MAX_EXERCISE_TIPS;
    protected readonly measuredByChoices: { value: MeasuredBy; label: string }[] = [
        { value: 'reps', label: 'Reps' },
        { value: 'timed', label: 'Time' },
    ];

    /** A built-in exercise's description, shown above its note once it's loaded. */
    protected readonly description = computed(
        () => this.exercises.textOf(this.exercise())?.description
    );

    private readonly model = linkedSignal<ExerciseEditorModel>(() => {
        const exercise = this.exercise();
        // Only your own exercise's words are edited here: a built-in one has just a note. Not
        // read from the store, so the form doesn't start again when a built-in one's words load
        const text = isBuiltIn(exercise) ? NO_TEXT : exercise;
        return {
            name: exercise.name,
            measuredBy: exercise.measuredBy,
            description: text.description,
            // Only single pieces can be picked; a choice of them (from a backup) stays as it is
            equipment: exercise.equipment.filter(
                (need): need is Equipment => typeof need === 'string'
            ),
            mainMuscles: [...exercise.mainMuscles],
            supportingMuscles: [...exercise.supportingMuscles],
            steps: text.steps.join('\n'),
            tips: text.tips.join('\n'),
            note: this.exercises.noteFor(exercise.id) ?? '',
        };
    });

    protected readonly editorForm = form(this.model, (editor) => {
        maxLength(editor.description, MAX_EXERCISE_DESCRIPTION_LENGTH);
        maxLength(editor.note, MAX_EXERCISE_NOTE_LENGTH);
        validate(editor.steps, ({ value }) => linesError(value(), MAX_EXERCISE_STEPS, 'steps'));
        validate(editor.tips, ({ value }) => linesError(value(), MAX_EXERCISE_TIPS, 'tips'));
        validate(editor.name, ({ value }) => {
            if (this.builtIn()) {
                return undefined;
            }
            if (value().trim() === '') {
                return { kind: 'required', message: 'Give it a name' };
            }
            if (value().length > MAX_EXERCISE_NAME_LENGTH) {
                return {
                    kind: 'tooLong',
                    message: `Keep it to ${MAX_EXERCISE_NAME_LENGTH} characters`,
                };
            }
            return this.exercises.nameTaken(value(), this.exercise().id || undefined)
                ? {
                      kind: 'taken',
                      message: `There's already an exercise called "${value().trim()}"`,
                  }
                : undefined;
        });
    });

    protected readonly nameError = computed(() => this.editorForm.name().errors().at(0)?.message);
    protected readonly stepsError = computed(() => this.editorForm.steps().errors().at(0)?.message);
    protected readonly tipsError = computed(() => this.editorForm.tips().errors().at(0)?.message);
    protected readonly mainMuscles = computed(() => this.model().mainMuscles);
    protected readonly supportingMuscles = computed(() => this.model().supportingMuscles);

    protected setMeasuredBy(measuredBy: MeasuredBy) {
        this.model.update((editor) => ({ ...editor, measuredBy }));
    }

    protected hasEquipment(equipment: Equipment): boolean {
        return this.model().equipment.includes(equipment);
    }

    protected toggleEquipment(equipment: Equipment) {
        this.model.update((editor) => ({
            ...editor,
            equipment: this.hasEquipment(equipment)
                ? editor.equipment.filter((e) => e !== equipment)
                : [...editor.equipment, equipment],
        }));
    }

    protected isMain(muscle: MuscleGroup): boolean {
        return this.model().mainMuscles.includes(muscle);
    }

    protected isSupporting(muscle: MuscleGroup): boolean {
        return this.model().supportingMuscles.includes(muscle);
    }

    /** Main or supporting, not both: picking one takes it out of the other. */
    protected toggleMuscle(muscle: MuscleGroup, as: 'main' | 'supporting') {
        const on = as === 'main' ? this.isMain(muscle) : this.isSupporting(muscle);
        const without = (list: MuscleGroup[]) => list.filter((m) => m !== muscle);
        this.model.update((editor) => ({
            ...editor,
            mainMuscles:
                as === 'main' && !on
                    ? [...editor.mainMuscles, muscle]
                    : without(editor.mainMuscles),
            supportingMuscles:
                as === 'supporting' && !on
                    ? [...editor.supportingMuscles, muscle]
                    : without(editor.supportingMuscles),
        }));
    }

    /** A tap on the body map moves a muscle along: not worked, main, supporting, not worked. */
    protected cycleMuscle(muscle: MuscleGroup) {
        // Toggling supporting moves a main muscle there, and takes a supporting one out
        const worked = this.isMain(muscle) || this.isSupporting(muscle);
        this.toggleMuscle(muscle, worked ? 'supporting' : 'main');
    }

    /**
     * Saves and closes. Handled here rather than as a form submission: the dialog closes as
     * it saves, and a form taken away mid-submission stays "submitting".
     */
    protected save(event: Event) {
        event.preventDefault();
        if (this.editorForm().invalid()) {
            // The first field that's wrong, perhaps scrolled out of sight
            const wrong = [
                ['name', this.nameError()],
                ['steps', this.stepsError()],
                ['tips', this.tipsError()],
            ].find(([, error]) => error)?.[0];
            document.getElementById(`exercise-editor-${wrong}`)?.focus();
            return;
        }
        const exercise = this.exercise();
        const result = isBuiltIn(exercise) ? exercise : this.saveOwn(exercise);
        if (!result) {
            return;
        }
        const note = this.model().note;
        if (note.trim() !== (this.exercises.noteFor(result.id) ?? '')) {
            this.exercises.setNote(result.id, note);
        }
        this.saved.emit(result);
    }

    /** Makes or changes your own exercise, or returns null if its name is taken. */
    private saveOwn(exercise: OwnExercise): OwnExercise | null {
        const editor = this.model();
        const details: OwnExerciseDetails = {
            name: editor.name,
            measuredBy: editor.measuredBy,
            description: editor.description,
            mainMuscles: editor.mainMuscles,
            supportingMuscles: editor.supportingMuscles,
            steps: editor.steps.split('\n'),
            tips: editor.tips.split('\n'),
            // A choice of pieces from a backup is kept, as it can't be picked here
            equipment: [
                ...exercise.equipment.filter((need) => typeof need !== 'string'),
                ...editor.equipment,
            ],
        };
        if (this.isNew()) {
            return this.exercises.createOwn(details);
        }
        const updated = this.exercises.updateOwn(exercise.id, details);
        if (updated && updated.name !== exercise.name) {
            this.workouts.renameExerciseSteps(updated.id, updated.name);
        }
        return updated;
    }

    protected cancel() {
        this.closed.emit();
    }
}

/** What's wrong with steps or tips written one per line, if anything. */
function linesError(text: string, max: number, what: 'steps' | 'tips') {
    const lines = text.split('\n').filter((line) => line.trim() !== '');
    if (lines.length > max) {
        return { kind: 'tooMany', message: `Up to ${max} ${what}, one per line` };
    }
    return lines.some((line) => line.trim().length > MAX_EXERCISE_LINE_LENGTH)
        ? {
              kind: 'tooLong',
              message: `Keep each one to ${MAX_EXERCISE_LINE_LENGTH} characters`,
          }
        : undefined;
}
