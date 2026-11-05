import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BUILT_IN_EXERCISE_TEXT } from '../../../models/built-in-exercise-text';
import { BUILT_IN_EXERCISES } from '../../../models/built-in-exercises';
import { Exercise, MAX_EXERCISE_STEPS } from '../../../models/exercise';
import { reps } from '../../testing/make-workout';
import { blankOwnExercise, ExerciseStore } from '../../state/exercise-store.service';
import { WorkoutStore } from '../../state/workout-store.service';
import { BODY_FIGURES } from '../body-map/body-shapes';
import { ExerciseEditorComponent } from './exercise-editor.component';
import { allSteps, asOneGroup } from '../../../models/workout';

const quadsPath = () =>
    BODY_FIGURES.male.front.shapes.find((shape) => shape.muscle === 'quads')!.paths[0];

@Component({
    imports: [ExerciseEditorComponent],
    template: `
        <app-exercise-editor
            [exercise]="exercise()"
            [isNew]="isNew()"
            (closed)="closed = closed + 1"
            (saved)="saved.push($event)"
        />
    `,
})
class HostComponent {
    readonly exercise = signal<Exercise>(BUILT_IN_EXERCISES[0]);
    readonly isNew = signal(false);
    closed = 0;
    saved: Exercise[] = [];
}

describe('ExerciseEditorComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;
    let exercises: ExerciseStore;

    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        exercises = TestBed.inject(ExerciseStore);
    });
    afterEach(() => localStorage.clear());

    async function open(exercise: Exercise, isNew = false) {
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        host.exercise.set(exercise);
        host.isNew.set(isNew);
        fixture.detectChanges();
        await fixture.whenStable();
    }

    function el<T extends HTMLElement>(selector: string): T {
        return fixture.nativeElement.querySelector(selector) as T;
    }

    const button = (name: string, nth = 0) =>
        (
            Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[]
        ).filter((b) => b.textContent!.replace(/check/, '').trim() === name)[nth];

    async function fill(selector: string, value: string) {
        const field = el<HTMLInputElement | HTMLTextAreaElement>(selector);
        field.value = value;
        field.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        await fixture.whenStable();
    }

    async function save() {
        el<HTMLFormElement>('form').dispatchEvent(new Event('submit', { cancelable: true }));
        fixture.detectChanges();
        await fixture.whenStable();
    }

    it('is a modal dialog named after what it edits', async () => {
        await open(exercises.addOwn('Sled push', 'reps'));

        const dialog = el('[role="dialog"]');
        expect(dialog.getAttribute('aria-modal')).toBe('true');
        expect(el(`#${dialog.getAttribute('aria-labelledby')}`).textContent!.trim()).toBe(
            'Edit exercise'
        );
    });

    describe('a built-in exercise', () => {
        const plank = BUILT_IN_EXERCISES.find((e) => e.id === 'builtin:plank')!;

        it('shows its description, and only the note can be changed', async () => {
            await open(plank);
            await TestBed.inject(ExerciseStore).loadText();
            fixture.detectChanges();

            expect(el('#exercise-editor-title').textContent!.trim()).toBe('Plank');
            expect(el('.editor__description').textContent!.trim()).toBe(
                BUILT_IN_EXERCISE_TEXT['builtin:plank'].description
            );
            expect(el('#exercise-editor-name')).toBeNull();
            expect(el('app-body-map')).toBeNull();
            expect(el('#exercise-editor-note')).not.toBeNull();
        });

        it('saves your note on it', async () => {
            await open(plank);

            await fill('#exercise-editor-note', '  Squeeze your glutes ');
            await save();

            expect(exercises.noteFor('builtin:plank')).toBe('Squeeze your glutes');
            expect(host.saved).toEqual([plank]);
        });

        it('starts from your note, and removes it when emptied', async () => {
            exercises.setNote('builtin:plank', 'Old note');
            await open(plank);
            expect(el<HTMLTextAreaElement>('#exercise-editor-note').value).toBe('Old note');

            await fill('#exercise-editor-note', '');
            await save();

            expect(exercises.noteFor('builtin:plank')).toBeUndefined();
        });
    });

    describe('your own exercise', () => {
        it('saves its new name and details, and renames the steps that are it', async () => {
            const mine = exercises.addOwn('Sled push', 'reps');
            const workouts = TestBed.inject(WorkoutStore);
            workouts.addWorkout({
                title: '',
                blocks: asOneGroup([reps(10, 'Sled push')]),
                repeats: 1,
            });
            await open(mine);

            await fill('#exercise-editor-name', 'Sled drag');
            el<HTMLInputElement>('input[type="radio"][value="timed"]').click();
            await fill('#exercise-editor-description', 'Pulled backwards.');
            button('Machine').click();
            button('Quads').click();
            button('Glutes', 1).click();
            fixture.detectChanges();
            await fixture.whenStable();
            await save();

            const saved = exercises.byId(mine.id);
            expect(saved).toEqual(
                expect.objectContaining({
                    name: 'Sled drag',
                    measuredBy: 'timed',
                    description: 'Pulled backwards.',
                    equipment: ['machine'],
                    mainMuscles: ['quads'],
                    supportingMuscles: ['glutes'],
                })
            );
            expect(host.saved).toEqual([saved]);
            expect(allSteps(workouts.workouts()[0])[0].name).toBe('Sled drag');
        });

        it('marks the muscles picked, main or supporting but not both, and shades them', async () => {
            await open(exercises.addOwn('Sled push', 'reps'));

            button('Quads').click();
            fixture.detectChanges();
            await fixture.whenStable();
            expect(button('Quads').getAttribute('aria-pressed')).toBe('true');
            expect(el('.body-map__label--main').textContent!.trim()).toBe('Quads');

            // Supporting instead takes it out of main
            button('Quads', 1).click();
            fixture.detectChanges();
            await fixture.whenStable();
            expect(button('Quads').getAttribute('aria-pressed')).toBe('false');
            expect(button('Quads', 1).getAttribute('aria-pressed')).toBe('true');
            expect(el('.body-map__label--supporting').textContent!.trim()).toBe('Quads');
        });

        it("won't save a name another exercise has, and says so", async () => {
            const mine = exercises.addOwn('Sled push', 'reps');
            await open(mine);

            await fill('#exercise-editor-name', 'bench press');
            await save();

            expect(el('#exercise-editor-name-error').textContent!.trim()).toBe(
                'There\'s already an exercise called "bench press"'
            );
            expect(el('#exercise-editor-name').getAttribute('aria-invalid')).toBe('true');
            expect(document.activeElement).toBe(el('#exercise-editor-name'));
            expect(exercises.byId(mine.id)?.name).toBe('Sled push');
            expect(host.saved).toEqual([]);
        });

        it('saves its how-to steps and tips, one per line', async () => {
            const mine = exercises.addOwn('Sled push', 'reps');
            await open(mine);

            await fill('#exercise-editor-steps', 'Lean in.\n\n  Drive with your legs. ');
            await fill('#exercise-editor-tips', 'Short steps.');
            await save();

            expect(exercises.byId(mine.id)).toEqual(
                expect.objectContaining({
                    steps: ['Lean in.', 'Drive with your legs.'],
                    tips: ['Short steps.'],
                })
            );
        });

        it('starts from its steps and tips, one per line', async () => {
            const mine = exercises.addOwn('Sled push', 'reps');
            exercises.updateOwn(mine.id, { ...mine, steps: ['One.', 'Two.'], tips: ['Tip.'] });
            await open(exercises.byId(mine.id)!);

            expect(el<HTMLTextAreaElement>('#exercise-editor-steps').value).toBe('One.\nTwo.');
            expect(el<HTMLTextAreaElement>('#exercise-editor-tips').value).toBe('Tip.');
        });

        it('says when there are too many steps, and puts the cursor there', async () => {
            const mine = exercises.addOwn('Sled push', 'reps');
            await open(mine);

            const lines = Array.from({ length: MAX_EXERCISE_STEPS + 1 }, (_, i) => `Step ${i}`);
            await fill('#exercise-editor-steps', lines.join('\n'));
            await save();

            expect(el('#exercise-editor-steps-error').textContent!.trim()).toBe(
                `Up to ${MAX_EXERCISE_STEPS} steps, one per line`
            );
            expect(document.activeElement).toBe(el('#exercise-editor-steps'));
            expect(host.saved).toEqual([]);
        });

        it('moves a tapped muscle along: main, supporting, then not worked', async () => {
            await open(exercises.addOwn('Sled push', 'reps'));
            const quads = () => {
                const shapes = Array.from(
                    fixture.nativeElement.querySelectorAll('.body-map__shape--tappable')
                ) as SVGPathElement[];
                // The front figure's shapes come first, and its quads are the first quads
                return shapes.find((shape) => shape.getAttribute('d')!.startsWith(quadsPath()))!;
            };
            const tap = async () => {
                quads().dispatchEvent(new MouseEvent('click', { bubbles: true }));
                fixture.detectChanges();
                await fixture.whenStable();
            };

            await tap();
            expect(button('Quads').getAttribute('aria-pressed')).toBe('true');
            await tap();
            expect(button('Quads').getAttribute('aria-pressed')).toBe('false');
            expect(button('Quads', 1).getAttribute('aria-pressed')).toBe('true');
            await tap();
            expect(button('Quads', 1).getAttribute('aria-pressed')).toBe('false');
        });

        it('needs a name', async () => {
            await open(exercises.addOwn('Sled push', 'reps'));

            await fill('#exercise-editor-name', '   ');

            expect(el('#exercise-editor-name-error').textContent!.trim()).toBe('Give it a name');
        });
    });

    describe('a new exercise', () => {
        it('is made when saved, with its details and your note', async () => {
            await open(blankOwnExercise(), true);
            expect(el('#exercise-editor-title').textContent!.trim()).toBe('New exercise');

            await fill('#exercise-editor-name', 'Sled drag');
            button('Machine').click();
            await fill('#exercise-editor-note', 'Lane 2');
            await save();

            const made = exercises.own()[0];
            expect(made).toEqual(
                expect.objectContaining({ name: 'Sled drag', equipment: ['machine'] })
            );
            expect(exercises.noteFor(made.id)).toBe('Lane 2');
            expect(host.saved).toEqual([made]);
        });

        it("isn't made without a name", async () => {
            await open(blankOwnExercise(), true);

            await save();

            expect(el('#exercise-editor-name-error').textContent!.trim()).toBe('Give it a name');
            expect(exercises.own()).toEqual([]);
        });
    });

    it('closes without saving on ‹ Back or Escape', async () => {
        await open(BUILT_IN_EXERCISES[0]);
        await fill('#exercise-editor-note', 'Not kept');

        el('.dialog-back').click();
        el('.dialog-overlay').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(host.closed).toBe(2);
        expect(exercises.noteFor(BUILT_IN_EXERCISES[0].id)).toBeUndefined();
    });
});
