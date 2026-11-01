import type { Mock } from 'vitest';
import { CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
    ActivatedRoute,
    ParamMap,
    Router,
    convertToParamMap,
    provideRouter,
} from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import {
    allSteps,
    asOneGroup,
    Block,
    MAX_HEADINGS,
    MAX_STEPS,
    Step,
    UNTIL_STOPPED,
    Workout,
    WorkoutFields,
} from '../models/workout';
import { fakeReducedMotion } from '../shared/testing/fake-reduced-motion';
import { HistoryStore } from '../shared/state/history-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { UndoService } from '../shared/undo/undo.service';
import {
    eachAGroup,
    reps,
    rest,
    unlinked,
    unlinkedWorkout,
    work,
} from '../shared/testing/make-workout';
import { WorkoutSetupComponent } from './workout-setup.component';

/** The step a new workout starts with, as `shown()` reads it. */
const blankStep = { kind: 'Reps', name: '', time: '0 reps' };

const savedWorkout: WorkoutFields = {
    title: 'Saved workout',
    blocks: asOneGroup([work(135, 'Squats'), rest(45)]),
    repeats: 4,
};

describe('WorkoutSetupComponent', () => {
    let fixture: ComponentFixture<WorkoutSetupComponent>;
    let store: WorkoutStore;
    let navigate: Mock;
    let queryParamMap: BehaviorSubject<ParamMap>;

    async function setup(queryParams: Record<string, string> = {}) {
        // Ids are random; here they're workout-1, workout-2… in the order workouts are made
        let made = 0;
        vi.spyOn(crypto, 'randomUUID').mockImplementation(
            () => `workout-${++made}` as ReturnType<typeof crypto.randomUUID>
        );
        localStorage.clear();
        queryParamMap = new BehaviorSubject(convertToParamMap(queryParams));
        await TestBed.configureTestingModule({
            imports: [WorkoutSetupComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: { queryParamMap },
                },
            ],
        }).compileComponents();

        store = TestBed.inject(WorkoutStore);
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    }

    /**
     * Opens the page. A new workout starts with one empty rep step, so most tests turn it into
     * a timed step and add a rest step, both open, to have something to work on; `empty`
     * leaves it as it opens.
     */
    async function create({ empty = false } = {}) {
        fixture = TestBed.createComponent(WorkoutSetupComponent);
        fixture.detectChanges();
        await fixture.whenStable();
        if (!empty && !submitButton().textContent!.includes('Save')) {
            await changeKind(0, 'Timed');
            await addStep('Rest');
            await press('Step 1, timed, 00:00');
        }
    }

    /** Picks a kind from a step's kind menu, opened from its pill. */
    async function changeKind(step: number, kind: 'Timed' | 'Rest' | 'Reps') {
        el<HTMLButtonElement>('.step__kind-button', steps()[step]).click();
        fixture.detectChanges();
        await press(kind);
    }

    /** "+ Step", which adds a rep step, then changes it to another kind if asked. */
    async function addStep(kind: 'Timed' | 'Rest' | 'Reps' = 'Reps') {
        await press('Add step');
        if (kind !== 'Reps') {
            await changeKind(steps().length - 1, kind);
        }
    }

    function el<T extends HTMLElement>(
        selector: string,
        within: ParentNode = fixture.nativeElement
    ): T {
        return within.querySelector(selector) as T;
    }

    const steps = () =>
        Array.from(fixture.nativeElement.querySelectorAll('.step')) as HTMLElement[];

    /** What the form currently shows, read from the page like a user would see it. */
    function shown() {
        // A wheel picker announces its value through its spin button
        const value = (wheel: Element) =>
            wheel.querySelector('[role="spinbutton"]')!.getAttribute('aria-valuenow');
        return {
            title: el<HTMLInputElement>('#title').value,
            steps: steps().map((step) => {
                const kind = el('.step__kind-label', step).textContent!.trim();
                // A rep step shows its count, e.g. "20 reps", on its one wheel or in one line
                if (kind === 'Reps') {
                    const count = isCollapsed(step)
                        ? el('.step__summary-time', step).textContent!.trim()
                        : `${value(el('app-wheel-picker', step))} reps`;
                    return {
                        kind,
                        name: isCollapsed(step)
                            ? el('.step__summary-name', step).textContent!.trim()
                            : el<HTMLInputElement>('input', step).value,
                        time: count,
                    };
                }
                // A collapsed step shows its name and time in one line, e.g. "Squats 02:15"
                if (isCollapsed(step)) {
                    const [minutes, seconds] = el('.step__summary-time', step)
                        .textContent!.trim()
                        .split(':')
                        .map(Number);
                    return {
                        kind,
                        name: el('.step__summary-name', step).textContent!.trim(),
                        time: `${minutes}:${seconds}`,
                    };
                }
                const [minutes, seconds] = Array.from(step.querySelectorAll('app-wheel-picker'));
                return {
                    kind,
                    name: el<HTMLInputElement>('input', step).value,
                    time: `${value(minutes)}:${value(seconds)}`,
                };
            }),
            repeats: value(el('#repeats')),
        };
    }

    const toggle = (step: number) => el<HTMLButtonElement>('.step__toggle', steps()[step]);
    const isCollapsed = (step: HTMLElement) =>
        el('.step__toggle', step).getAttribute('aria-expanded') === 'false';
    const collapsed = () => steps().map(isCollapsed);

    /** Pick a number in a step's wheel by clicking it, the way a user would. */
    function chooseTime(step: number, wheel: 'minutes' | 'seconds', value: string) {
        const wheels = steps()[step].querySelectorAll('app-wheel-picker');
        el(`[data-value="${value}"]`, wheels[wheel === 'minutes' ? 0 : 1]).click();
        fixture.detectChanges();
    }

    /** Pick a number on a rep step's one wheel. */
    function chooseReps(step: number, value: string) {
        el(`app-wheel-picker [data-value="${value}"]`, steps()[step]).click();
        fixture.detectChanges();
    }

    function chooseRounds(value: string) {
        el(`#repeats [data-value="${value}"]`).click();
        fixture.detectChanges();
    }

    function typeInto(input: HTMLInputElement, value: string) {
        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
    }

    const typeTitle = (value: string) => typeInto(el('#title'), value);
    const typeName = (step: number, value: string) => typeInto(el('input', steps()[step]), value);

    /** A button by its accessible name, e.g. "Add step" or "Move Step 2, rest up". */
    function button(name: string): HTMLButtonElement {
        const all = Array.from(
            fixture.nativeElement.querySelectorAll('button')
        ) as HTMLButtonElement[];
        // Icon fonts put the icon's name in the text ("add"), so leave <mat-icon> out, and
        // the comments Angular leaves where an @if goes
        const accessibleName = (b: HTMLButtonElement) =>
            b.getAttribute('aria-label') ??
            Array.from(b.childNodes)
                .filter(
                    (node) => node.nodeName !== 'MAT-ICON' && node.nodeType !== Node.COMMENT_NODE
                )
                .map((node) => node.textContent)
                .join('')
                .trim();
        const found = all.find((b) => accessibleName(b) === name);
        expect(found, `expected a "${name}" button`).toBeDefined();
        return found!;
    }

    async function press(name: string) {
        button(name).click();
        fixture.detectChanges();
        await fixture.whenStable();
    }

    function submitButton(): HTMLButtonElement {
        return el<HTMLButtonElement>('button[type="submit"]');
    }

    /** Submit the form and wait for the save to finish. */
    async function submit() {
        el<HTMLFormElement>('form').dispatchEvent(new Event('submit', { cancelable: true }));
        await fixture.whenStable();
        fixture.detectChanges();
    }

    afterEach(() => localStorage.clear());

    describe('creating a workout', () => {
        beforeEach(async () => {
            await setup();
            await create();
        });

        it('starts with one open rep step, and nothing to start', async () => {
            await create({ empty: true });

            expect(shown()).toEqual({ title: '', steps: [blankStep], repeats: '1' });
            expect(collapsed()).toEqual([false]);
            expect(fixture.nativeElement.textContent).not.toContain('Add a step to start.');
            // Nothing's been put in yet, so it's too soon to say there's no work
            expect(fixture.nativeElement.textContent).not.toContain('Workout needs');
            expect(button('Add step').disabled).toBe(false);
            expect(submitButton().disabled).toBe(true);
            expect(submitButton().textContent).toContain('Start workout');
            expect(submitButton().textContent).not.toContain('Save');
        });

        describe('the info button by Steps', () => {
            const tip = () => el('#steps-info-tip');
            const isShowing = () => tip().classList.contains('info__tip--open');
            const info = () => el<HTMLButtonElement>('#steps-info');

            function fire(target: Element, type: string, init: EventInit = {}) {
                target.dispatchEvent(new Event(type, init));
                fixture.detectChanges();
            }

            it('is described by the tip, which is hidden to begin with', () => {
                expect(info().getAttribute('aria-label')).toBe('About steps');
                expect(info().getAttribute('aria-describedby')).toBe('steps-info-tip');
                expect(tip().getAttribute('role')).toBe('tooltip');
                expect(tip().textContent).toContain(
                    'Each round runs these in order, each for its sets. Steps left at 00:00 or 0 reps are skipped.'
                );
                expect(isShowing()).toBe(false);
            });

            it('shows the tip on hover, and hides it when the pointer leaves', () => {
                fire(el('.info'), 'mouseenter');
                expect(isShowing()).toBe(true);

                fire(el('.info'), 'mouseleave');
                expect(isShowing()).toBe(false);
            });

            it('shows the tip on focus or a tap, and hides it on Escape or a click elsewhere', () => {
                info().focus();
                fixture.detectChanges();
                expect(isShowing()).toBe(true);

                info().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                fixture.detectChanges();
                expect(isShowing()).toBe(false);

                info().click();
                fixture.detectChanges();
                expect(isShowing()).toBe(true);

                el('#title').click();
                fixture.detectChanges();
                expect(isShowing()).toBe(false);
            });
        });

        it('will not start a workout with no work time', async () => {
            chooseTime(1, 'seconds', '30'); // only rest
            expect(submitButton().disabled).toBe(true);
            expect(fixture.nativeElement.textContent).toContain(
                'Workout needs a timed step or some reps'
            );

            await submit();

            expect(store.workouts()).toEqual([]);
            expect(navigate).not.toHaveBeenCalled();
        });

        it('allows a workout with only seconds, or only minutes', () => {
            chooseTime(0, 'seconds', '5');
            expect(submitButton().disabled).toBe(false);
            expect(fixture.nativeElement.textContent).not.toContain('Workout needs');

            chooseTime(0, 'seconds', '0');
            chooseTime(0, 'minutes', '1');
            expect(submitButton().disabled).toBe(false);
        });

        it('stops the browser reloading the page on submit', async () => {
            chooseTime(0, 'seconds', '5');
            const event = new Event('submit', { cancelable: true });

            el<HTMLFormElement>('form').dispatchEvent(event);
            await fixture.whenStable();

            expect(event.defaultPrevented).toBe(true);
        });

        it('saves the workout as steps, makes it active, and goes to the workout', async () => {
            typeTitle('Sprints');
            typeName(0, '  Hill sprint ');
            chooseTime(0, 'minutes', '1');
            chooseTime(0, 'seconds', '30');
            chooseTime(1, 'seconds', '20');
            chooseRounds('6');

            await submit();

            // "Hill sprint" isn't a built-in exercise, so it becomes your own, which takes an id too
            const expected: Workout = {
                id: expect.any(String),
                updatedAt: expect.any(Number),
                title: 'Sprints',
                blocks: eachAGroup([work(90, 'Hill sprint'), rest(20)]),
                repeats: 6,
            };
            expect(store.workouts().map(unlinkedWorkout)).toEqual([expected]);
            expect(unlinkedWorkout(store.activeWorkout())).toEqual(expected);
            expect(navigate).toHaveBeenCalledWith(['/workout']);
        });

        it('leaves out steps left at 00:00', async () => {
            chooseTime(0, 'seconds', '30');

            await submit();

            expect(unlinked(allSteps(store.workouts()[0]))).toEqual([work(30)]);
        });

        describe('Save, without starting (BLD-15)', () => {
            it('sits beside Start, which stays the main button', () => {
                expect(button('Save').type).toBe('button');
                expect(button('Save').classList).toContain('btn-pill');
                expect(submitButton().classList).toContain('btn-main');
            });

            it('saves the workout without starting it, and goes back to the library with it highlighted', async () => {
                typeTitle('Sprints');
                chooseTime(0, 'seconds', '30');

                await press('Save');

                expect(store.workouts().map((workout) => workout.title)).toEqual(['Sprints']);
                expect(store.activeWorkout()).toBeNull();
                expect(navigate).toHaveBeenCalledWith(['/library'], {
                    queryParams: { saved: store.workouts()[0].id },
                });
                expect(shown()).toEqual({ title: '', steps: [blankStep], repeats: '1' });
            });

            it("can't save a workout with no work time, as Start can't", async () => {
                chooseTime(1, 'seconds', '30'); // only rest

                expect(button('Save').disabled).toBe(true);
                await fixture.componentInstance['saveOnly']();

                expect(store.workouts()).toEqual([]);
                expect(navigate).not.toHaveBeenCalled();
            });
        });

        it('resets the form after saving', async () => {
            typeTitle('Sprints');
            chooseTime(0, 'seconds', '30');

            await submit();

            expect(shown()).toEqual({ title: '', steps: [blankStep], repeats: '1' });
        });
    });

    describe('steps', () => {
        beforeEach(async () => {
            await setup();
            await create();
        });

        const said = () => el('[aria-live="polite"]').textContent!.trim();

        it('adds a rep step at the end with "+ Step", focusing its name box', async () => {
            await press('Add step');

            expect(shown().steps.map((s) => s.kind)).toEqual(['Timed', 'Rest', 'Reps']);
            expect(document.activeElement).toBe(el('input', steps()[2]));
            expect(said()).toBe('Added a rep step, step 3');
        });

        describe('changing kind', () => {
            const pill = (step: number) =>
                el<HTMLButtonElement>('.step__kind-button', steps()[step]);
            const menu = () => el('.step__kind-menu');

            async function openMenu(step: number) {
                pill(step).click();
                fixture.detectChanges();
                await fixture.whenStable();
            }

            it('opens a menu of the kinds from the pill, marking the one it is', async () => {
                expect(pill(1).getAttribute('aria-label')).toBe('Rest, change type of step 2');
                expect(pill(1).getAttribute('aria-expanded')).toBe('false');

                await openMenu(1);

                expect(pill(1).getAttribute('aria-expanded')).toBe('true');
                expect(pill(1).getAttribute('aria-controls')).toBe(menu().id);
                const options = Array.from(menu().querySelectorAll('button'));
                expect(options.map((o) => o.textContent!.replace('check', '').trim())).toEqual([
                    'Reps',
                    'Timed',
                    'Rest',
                ]);
                expect(options.map((o) => o.getAttribute('aria-pressed'))).toEqual([
                    'false',
                    'false',
                    'true',
                ]);
            });

            it('changes the step, says so and goes back to the pill', async () => {
                await changeKind(1, 'Reps');

                expect(shown().steps.map((s) => s.kind)).toEqual(['Timed', 'Reps']);
                expect(steps()[1].classList).toContain('step--reps');
                expect(menu()).toBeNull();
                expect(said()).toBe('Step 2 is now reps');
                expect(document.activeElement).toBe(pill(1));
            });

            it('keeps the name and numbers, so changing back finds them', async () => {
                typeName(0, 'Squats');
                chooseTime(0, 'seconds', '30');

                await changeKind(0, 'Reps');
                expect(shown().steps[0]).toEqual({ kind: 'Reps', name: 'Squats', time: '0 reps' });

                await changeKind(0, 'Timed');
                expect(shown().steps[0]).toEqual({ kind: 'Timed', name: 'Squats', time: '0:30' });
            });

            it('saves only what the new kind uses', async () => {
                chooseTime(0, 'seconds', '30');
                await changeKind(0, 'Reps');
                chooseReps(0, '10');

                await submit();

                expect(unlinked(allSteps(store.workouts()[0]))).toEqual([reps(10)]);
            });

            it('closes on Escape, back on the pill', async () => {
                await openMenu(0);
                el('.step__kind-option', menu()).dispatchEvent(
                    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
                );
                fixture.detectChanges();

                expect(menu()).toBeNull();
                expect(document.activeElement).toBe(pill(0));
            });

            it('closes on a click elsewhere, or on the pill again', async () => {
                await openMenu(0);
                el('#title').click();
                fixture.detectChanges();
                expect(menu()).toBeNull();

                await openMenu(0);
                await openMenu(0);
                expect(menu()).toBeNull();
            });

            it('can change a collapsed step', async () => {
                await press('Step 1, timed, 00:00');

                await changeKind(0, 'Rest');

                expect(shown().steps[0].kind).toBe('Rest');
                expect(collapsed()[0]).toBe(true);
            });
        });

        describe('rep steps', () => {
            it('adds one with Reps and Weight wheels, focusing its name box', async () => {
                await addStep();

                expect(shown().steps[2]).toEqual({ kind: 'Reps', name: '', time: '0 reps' });
                const step = steps()[2];
                expect(step.classList).toContain('step--reps');
                expect(step.querySelectorAll('app-wheel-picker')).toHaveLength(3);
                expect(
                    Array.from(step.querySelectorAll('.picker-row .picker-field__label')).map(
                        (label) => label.textContent!.trim()
                    )
                ).toEqual(['Reps', 'Weight (kg)', 'Sets', 'Each side']);
                expect(el<HTMLInputElement>('input', step).placeholder).toBe('e.g. Push-ups');
                expect(document.activeElement).toBe(el('input', step));
                expect(fixture.nativeElement.textContent).toContain('Added a rep step, step 3');
            });

            it('saves the reps, in order with the other steps', async () => {
                chooseTime(0, 'seconds', '30');
                await addStep();
                typeName(2, 'Push-ups');
                chooseReps(2, '20');

                await submit();

                expect(unlinked(allSteps(store.workouts()[0]))).toEqual([
                    work(30),
                    reps(20, 'Push-ups'),
                ]);
            });

            it('leaves out a rep step left at 0 reps', async () => {
                chooseTime(0, 'seconds', '30');
                await addStep();

                await submit();

                expect(unlinked(allSteps(store.workouts()[0]))).toEqual([work(30)]);
            });

            it('counts reps as work, so a workout of only reps can start', async () => {
                await addStep();
                expect(submitButton().disabled).toBe(true);

                chooseReps(2, '10');

                expect(submitButton().disabled).toBe(false);
                await submit();
                expect(unlinked(allSteps(store.workouts()[0]))).toEqual([reps(10)]);
            });

            describe('weight', () => {
                /** Pick a weight on a rep step's second wheel. */
                function chooseWeight(step: number, value: string) {
                    const wheel = steps()[step].querySelectorAll('app-wheel-picker')[1];
                    el(`[data-value="${value}"]`, wheel).click();
                    fixture.detectChanges();
                }

                it('starts at none, read out as "none", and goes up in halves', async () => {
                    await addStep();
                    const wheel = steps()[2].querySelectorAll('app-wheel-picker')[1];
                    const spin = el('[role="spinbutton"]', wheel);

                    expect(spin.getAttribute('aria-valuetext')).toBe('none');
                    expect(el('[data-value="22.5"]', wheel)).not.toBeNull();
                    expect(spin.getAttribute('aria-valuemax')).toBe('300');
                });

                it('saves the weight in kg, and none for a step left at –', async () => {
                    await addStep();
                    typeName(2, 'Squats');
                    chooseReps(2, '10');
                    chooseWeight(2, '22.5');
                    await addStep();
                    chooseReps(3, '20');

                    await submit();

                    expect(unlinked(allSteps(store.workouts()[0]))).toEqual([
                        { kind: 'reps', reps: 10, name: 'Squats', weight: 22.5 },
                        reps(20),
                    ]);
                });

                it('shows it with the reps once collapsed, and when offering to undo deleting it', async () => {
                    await addStep();
                    chooseReps(2, '10');
                    chooseWeight(2, '60');

                    await press('Step 3, reps, 10 reps @ 60 kg');
                    expect(shown().steps[2].time).toBe('10 reps @ 60 kg');

                    await press('Step 3, reps, 10 reps @ 60 kg');
                    await press('Delete Step 3, reps');
                    expect(TestBed.inject(UndoService).offer()?.message).toBe(
                        'Deleted Step 3, reps, 10 reps @ 60 kg'
                    );
                });

                it('offers to undo deleting a step with only a weight', async () => {
                    await addStep();
                    chooseWeight(2, '20');

                    await press('Delete Step 3, reps');

                    expect(TestBed.inject(UndoService).offer()).not.toBeNull();
                });
            });

            it('names the reps when offering to undo deleting it', async () => {
                await addStep();
                chooseReps(2, '20');

                await press('Delete Step 3, reps');

                expect(TestBed.inject(UndoService).offer()?.message).toBe(
                    'Deleted Step 3, reps, 20 reps'
                );
            });
        });

        it('runs a round of several steps, saved in order with their names', async () => {
            typeName(0, 'Squats');
            chooseTime(0, 'seconds', '30');
            await addStep('Timed');
            typeName(2, 'Plank');
            chooseTime(2, 'seconds', '45');
            await press('Step 2, rest, 00:00');
            chooseTime(1, 'seconds', '15');

            await submit();

            expect(unlinked(allSteps(store.workouts()[0]))).toEqual([
                work(30, 'Squats'),
                rest(15),
                work(45, 'Plank'),
            ]);
        });

        it('moves a step up or down, keeping its name and time, and focus with it', async () => {
            typeName(0, 'Squats');
            chooseTime(0, 'seconds', '30');
            chooseTime(1, 'seconds', '10');

            await press('Move Step 1, Squats down');

            expect(shown().steps).toEqual([
                { kind: 'Rest', name: '', time: '0:10' },
                { kind: 'Timed', name: 'Squats', time: '0:30' },
            ]);
            // It's now last, so its down button is disabled: focus goes to its up button
            expect(document.activeElement).toBe(button('Move Step 2, Squats up'));
            expect(said()).toBe('Moved Squats to step 2');
        });

        it('moves a step dropped by drag and drop, and says so', async () => {
            typeName(0, 'Squats');
            chooseTime(0, 'seconds', '30');
            await addStep('Timed');
            typeName(2, 'Plank');

            // What the CDK reports when Squats is dragged from first to last
            const list = fixture.debugElement
                .query(By.directive(CdkDropList))
                .injector.get(CdkDropList);
            list.dropped.emit({ previousIndex: 0, currentIndex: 2 } as CdkDragDrop<unknown>);
            fixture.detectChanges();

            expect(shown().steps.map((s) => s.name || s.kind)).toEqual(['Rest', 'Plank', 'Squats']);
            expect(shown().steps[2].time).toBe('0:30');
            expect(said()).toBe('Moved Squats to step 3');
        });

        it('gives each step a drag handle, hidden from screen readers (they use the buttons)', () => {
            const handles = steps().map((step) => el('[cdkDragHandle], .step__handle', step));

            expect(handles.every((handle) => handle !== null)).toBe(true);
            expect(handles[0].getAttribute('aria-hidden')).toBe('true');
        });

        it('can not move the first step up or the last step down', () => {
            expect(button('Move Step 1, timed up').disabled).toBe(true);
            expect(button('Move Step 2, rest down').disabled).toBe(true);
            expect(button('Move Step 1, timed down').disabled).toBe(false);
        });

        it('deletes a step, focusing the step that takes its place', async () => {
            await addStep('Timed');
            typeName(2, 'Plank');
            await press('Step 2, rest, 00:00');

            await press('Delete Step 2, rest');

            expect(shown().steps.map((s) => s.name || s.kind)).toEqual(['Timed', 'Plank']);
            expect(document.activeElement).toBe(button('Delete Step 2, Plank'));
            expect(said()).toBe('Deleted step 2');
        });

        it('focuses the open button of a collapsed step that takes a deleted one’s place', async () => {
            await press('Collapse all');
            await press('Step 1, timed, 00:00');

            await press('Delete Step 1, timed');

            expect(document.activeElement).toBe(button('Step 1, rest, 00:00'));
        });

        describe('deleting a step with something in it', () => {
            const dialog = () => el('[role="dialog"]');
            const undo = () => TestBed.inject(UndoService);

            beforeEach(() => {
                typeName(1, 'Breathe');
                chooseTime(1, 'seconds', '20');
            });

            it('deletes an empty step, with nothing to undo', async () => {
                await press('Delete Step 1, timed');

                expect(dialog()).toBeNull();
                expect(steps()).toHaveLength(1);
                expect(undo().offer()).toBeNull();
            });

            it('deletes straight away, without asking, and offers Undo naming the step', async () => {
                await press('Delete Step 2, Breathe');

                expect(dialog()).toBeNull();
                expect(shown().steps.map((s) => s.kind)).toEqual(['Timed']);
                expect(said()).toBe('Deleted step 2');
                expect(undo().offer()?.message).toBe('Deleted Step 2, Breathe, 00:20');
            });

            it('offers Undo for a step with only a name', async () => {
                typeName(0, 'Squats');
                await press('Delete Step 1, Squats');

                expect(undo().offer()?.message).toBe('Deleted Step 1, Squats');
            });

            it('offers Undo for a step with only a time', async () => {
                chooseTime(0, 'seconds', '5');
                await press('Delete Step 1, timed');

                expect(undo().offer()?.message).toBe('Deleted Step 1, timed, 00:05');
            });

            it('puts the step back where it was on Undo, with focus on its delete button', async () => {
                await press('Delete Step 2, Breathe');

                undo().undo();
                fixture.detectChanges();
                await fixture.whenStable();

                expect(shown().steps[1]).toEqual({ kind: 'Rest', name: 'Breathe', time: '0:20' });
                expect(said()).toBe('Step 2 is back');
                expect(document.activeElement).toBe(button('Delete Step 2, Breathe'));
            });

            it('moves focus to the step before when the offer for the last one is closed', async () => {
                await press('Delete Step 2, Breathe');

                undo().dismiss();
                fixture.detectChanges();
                await fixture.whenStable();

                expect(document.activeElement).toBe(button('Delete Step 1, timed'));
            });
        });

        it('deletes every step if asked, then focuses "Add step"', async () => {
            await press('Delete Step 2, rest');
            await press('Delete Step 1, timed');

            expect(steps()).toHaveLength(0);
            expect(fixture.nativeElement.textContent).toContain('Add a step to start.');
            expect(document.activeElement).toBe(button('Add step'));
        });

        it(`stops adding at ${MAX_STEPS} steps, and says why`, async () => {
            for (let i = 2; i < MAX_STEPS; i++) {
                await press('Add step');
            }

            expect(steps()).toHaveLength(MAX_STEPS);
            expect(button('Add step').disabled).toBe(true);
            expect(fixture.nativeElement.textContent).toContain(
                `That's the most steps a workout can have (${MAX_STEPS})`
            );
        });

        describe('collapsing', () => {
            it('opens only the step just added, closing the others', async () => {
                await addStep('Timed');

                expect(collapsed()).toEqual([true, true, false]);
            });

            it('shows a collapsed step in one line: its name and time', async () => {
                typeName(0, 'Squats');
                chooseTime(0, 'minutes', '2');
                chooseTime(0, 'seconds', '15');

                await press('Step 1, Squats, 02:15');

                expect(steps()[0].querySelector('app-wheel-picker')).toBeNull();
                expect(el('.step__summary', steps()[0]).textContent).toContain('Squats');
                expect(el('.step__summary', steps()[0]).textContent).toContain('02:15');
                expect(shown().steps[0]).toEqual({ kind: 'Timed', name: 'Squats', time: '2:15' });
            });

            it('opens and closes a step with its button, which says whether it is open', async () => {
                const body = () =>
                    document.getElementById(toggle(0).getAttribute('aria-controls')!);
                expect(toggle(0).getAttribute('aria-expanded')).toBe('true');
                expect(body()?.querySelector('app-wheel-picker')).not.toBeNull();

                toggle(0).focus();
                await press('Step 1, timed, 00:00');

                expect(toggle(0).getAttribute('aria-expanded')).toBe('false');
                // Nothing to point at while closed
                expect(toggle(0).hasAttribute('aria-controls')).toBe(false);
                expect(document.activeElement).toBe(toggle(0));

                await press('Step 1, timed, 00:00');

                expect(toggle(0).getAttribute('aria-expanded')).toBe('true');
                expect(document.activeElement).toBe(toggle(0));
            });

            it('collapses and expands every step at once', async () => {
                await addStep('Timed');

                await press('Collapse all');
                expect(collapsed()).toEqual([true, true, true]);

                await press('Expand all');
                expect(collapsed()).toEqual([false, false, false]);
            });

            it('keeps a step open or closed as it moves', async () => {
                await press('Step 2, rest, 00:00');

                await press('Move Step 1, timed down');

                expect(shown().steps.map((s) => s.kind)).toEqual(['Rest', 'Timed']);
                expect(collapsed()).toEqual([true, false]);
            });

            it('keeps a collapsed step to one line: its drag handle stays, its buttons wait until it is opened', async () => {
                await press('Collapse all');

                expect(el('.step__handle', steps()[0])).not.toBeNull();
                expect(el('.step__actions', steps()[0])).toBeNull();

                await press('Step 1, timed, 00:00');

                expect(button('Move Step 1, timed down').disabled).toBe(false);
                expect(button('Delete Step 1, timed').disabled).toBe(false);
            });
        });

        it('names each wheel for screen readers by its step, e.g. "Step 2, rest" and "Seconds"', () => {
            const spin = steps()[1].querySelectorAll('[role="spinbutton"]')[1];
            const label = spin
                .getAttribute('aria-labelledby')!
                .split(' ')
                // Screen readers skip the aria-hidden step number, as here
                .map((id) => {
                    const labelEl = document.getElementById(id)!.cloneNode(true) as HTMLElement;
                    labelEl.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove());
                    return labelEl.textContent!.replace(/\s+/g, ' ').trim();
                });

            expect(label).toEqual(['Step 2, rest', 'Seconds']);
        });
    });

    describe('sets', () => {
        /** Picks a number on one of a step's wheels, by the end of its id, e.g. "sets". */
        function choose(step: number, wheel: string, value: string) {
            el(`[id$="-${wheel}"] [data-value="${value}"]`, steps()[step]).click();
            fixture.detectChanges();
        }
        const wheel = (step: number, name: string) =>
            el(`[id$="-${name}"] [role="spinbutton"]`, steps()[step])?.getAttribute(
                'aria-valuenow'
            ) ?? null;

        it('gives a timed or rep step a Sets wheel at 1, with no rest to begin with', async () => {
            await setup();
            await create();

            expect(wheel(0, 'sets')).toBe('1');
            expect(wheel(0, 'rest-minutes')).toBeNull();
            // A rest step is just a time
            expect(steps()[1].querySelectorAll('app-wheel-picker')).toHaveLength(2);
            expect(wheel(1, 'sets')).toBeNull();

            await addStep();
            expect(wheel(2, 'sets')).toBe('1');
        });

        it('shows Rest after each set at 01:00 once there is more than one', async () => {
            await setup();
            await create();

            choose(0, 'sets', '3');

            expect(steps()[0].textContent).toContain('Rest after each set');
            expect(wheel(0, 'rest-minutes')).toBe('1');
            expect(wheel(0, 'rest-seconds')).toBe('0');
        });

        it('saves a group of each step, with its sets and the rest between them', async () => {
            await setup();
            await create({ empty: true });
            typeName(0, 'Leg press');
            chooseReps(0, '10');
            choose(0, 'sets', '3');
            choose(0, 'rest-seconds', '30');

            await submit();

            expect(unlinkedWorkout(store.workouts()[0])!.blocks).toEqual(
                eachAGroup([reps(10, 'Leg press')], 3, 90)
            );
        });

        it('saves no rest for one set, whatever the wheels were left at', async () => {
            await setup();
            await create({ empty: true });
            chooseReps(0, '10');
            choose(0, 'sets', '3');
            choose(0, 'sets', '1');

            await submit();

            expect(unlinkedWorkout(store.workouts()[0])!.blocks).toEqual(
                eachAGroup([reps(10)], 1, 0)
            );
        });

        it('says its sets and rest when collapsed, as the history would', async () => {
            await setup();
            await create();
            chooseTime(0, 'seconds', '45');
            choose(0, 'sets', '3');
            choose(0, 'rest-seconds', '30');
            await press('Step 1, timed, 3 × 00:45 · rest 01:30');

            expect(el('.step__summary-time', steps()[0]).textContent!.trim()).toBe(
                '3 × 00:45 · rest 01:30'
            );
        });

        it('opens a saved workout with its sets and rest', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout({
                ...savedWorkout,
                blocks: [
                    { kind: 'group', rounds: 3, restSeconds: 45, steps: [reps(10, 'Bench')] },
                    { kind: 'group', rounds: 1, restSeconds: 0, steps: [work(60, 'Plank')] },
                ],
            });
            await create();

            expect(el('.step__summary-time', steps()[0]).textContent!.trim()).toBe(
                '3 × 10 · rest 00:45'
            );
            await press('Step 1, Bench, 3 × 10 · rest 00:45');
            expect(wheel(0, 'sets')).toBe('3');
            expect(wheel(0, 'rest-minutes')).toBe('0');
            expect(wheel(0, 'rest-seconds')).toBe('45');
        });
    });

    describe('vary each set (BLD-11)', () => {
        /** Picks a number on one of a step's wheels, by the end of its id, e.g. "sets". */
        function choose(step: number, wheel: string, value: string) {
            el(`[id$="-${wheel}"] [data-value="${value}"]`, steps()[step]).click();
            fixture.detectChanges();
        }
        const vary = (step: number) =>
            el<HTMLElement>('[id$="-vary"] [role="switch"]', steps()[step]);
        async function setVary(step: number) {
            vary(step).click();
            fixture.detectChanges();
            await fixture.whenStable();
        }
        const rows = (step: number) =>
            Array.from(steps()[step].querySelectorAll('.wheel-row__toggle')).map((row) =>
                row.textContent!.replace('expand_more', '').trim()
            );
        async function openRow(step: number, set: number) {
            (steps()[step].querySelectorAll('.wheel-row__toggle')[set] as HTMLElement).click();
            fixture.detectChanges();
            await fixture.whenStable();
        }
        const openRows = (step: number) =>
            Array.from(steps()[step].querySelectorAll('.wheel-row__toggle')).map(
                (row) => row.getAttribute('aria-expanded') === 'true'
            );
        /** 10 reps @ 40 kg, 3 sets. */
        async function legPress() {
            await setup();
            await create({ empty: true });
            typeName(0, 'Leg press');
            chooseReps(0, '10');
            choose(0, 'weight', '40');
            choose(0, 'sets', '3');
        }

        it('offers the switch, off, on a timed or rep step of more than one set', async () => {
            await setup();
            await create();

            expect(vary(0)).toBeNull();
            choose(0, 'sets', '2');
            expect(vary(0).getAttribute('aria-checked')).toBe('false');
            // A rest step has no sets
            expect(vary(1)).toBeNull();
        });

        it('starts a row a set at the step, and a set added copies the last', async () => {
            await legPress();
            await setVary(0);

            expect(rows(0)).toEqual([
                'Set 1 · 10 × 40 kg',
                'Set 2 · 10 × 40 kg',
                'Set 3 · 10 × 40 kg',
            ]);
            // The rows hold them now, so the step's own wheels go
            expect(el('[id$="-0-reps"]', steps()[0])).toBeNull();

            await openRow(0, 2);
            choose(0, 'set-2-reps', '8');
            choose(0, 'sets', '4');
            expect(rows(0)[3]).toBe('Set 4 · 8 × 40 kg');
            choose(0, 'sets', '2');
            expect(rows(0)).toEqual(['Set 1 · 10 × 40 kg', 'Set 2 · 10 × 40 kg']);
        });

        it('opens one row at a time on its wheels', async () => {
            await legPress();
            await setVary(0);

            await openRow(0, 0);
            expect(openRows(0)).toEqual([true, false, false]);
            await openRow(0, 1);
            expect(openRows(0)).toEqual([false, true, false]);
            await openRow(0, 1);
            expect(openRows(0)).toEqual([false, false, false]);
        });

        it("saves each set's own, set 1's as the step's, and says them when collapsed", async () => {
            await legPress();
            await setVary(0);
            await openRow(0, 0);
            choose(0, 'set-0-reps', '12');
            await openRow(0, 1);
            choose(0, 'set-1-weight', '45');
            await openRow(0, 2);
            choose(0, 'set-2-reps', '8');
            choose(0, 'set-2-weight', '50');
            await press('Step 1, Leg press, 12, 10, 8 @ 40–50 kg · rest 01:00');

            expect(el('.step__summary-time', steps()[0]).textContent!.trim()).toBe(
                '12, 10, 8 @ 40–50 kg · rest 01:00'
            );
            await submit();
            expect(allSteps(unlinkedWorkout(store.workouts()[0])!)).toEqual([
                {
                    ...reps(12, 'Leg press'),
                    weight: 40,
                    sets: [
                        { reps: 12, weight: 40 },
                        { reps: 10, weight: 45 },
                        { reps: 8, weight: 50 },
                    ],
                },
            ]);
        });

        it("goes back to set 1's for every set when turned off, or down to one set", async () => {
            await legPress();
            await setVary(0);
            await openRow(0, 0);
            choose(0, 'set-0-reps', '12');
            await openRow(0, 1);
            choose(0, 'set-1-reps', '8');

            await setVary(0);
            expect(rows(0)).toEqual([]);
            expect(el('.step__body', steps()[0]).textContent).toContain('Reps');
            await submit();
            expect(allSteps(unlinkedWorkout(store.workouts()[0])!)).toEqual([
                { ...reps(12, 'Leg press'), weight: 40 },
            ]);
        });

        it('turns off at one set, leaving no sets of its own', async () => {
            await legPress();
            await setVary(0);
            choose(0, 'sets', '1');

            expect(vary(0)).toBeNull();
            await submit();
            expect(unlinkedWorkout(store.workouts()[0])!.blocks).toEqual(
                eachAGroup([{ ...reps(10, 'Leg press'), weight: 40 } as Step], 1, 0)
            );
        });

        it('varies the time of a timed step', async () => {
            await setup();
            await create();
            chooseTime(0, 'seconds', '30');
            choose(0, 'sets', '2');
            await setVary(0);
            await openRow(0, 1);
            choose(0, 'set-1-seconds', '45');

            expect(rows(0)).toEqual(['Set 1 · 00:30', 'Set 2 · 00:45']);
            // Closed, so its wheels have settled before saving empties the form
            await press('Step 1, timed, 00:30, 00:45 · rest 01:00');
            await submit();
            expect(allSteps(unlinkedWorkout(store.workouts()[0])!)[0]).toEqual({
                ...work(30),
                sets: [{ seconds: 30 }, { seconds: 45 }],
            });
        });

        it("won't start with a set left at 0 reps", async () => {
            await legPress();
            await setVary(0);
            await openRow(0, 1);
            choose(0, 'set-1-reps', '0');

            expect(fixture.nativeElement.textContent).toContain('Each set needs some reps or time');
            expect(submitButton().disabled).toBe(true);
        });

        it('opens a saved workout with its sets as rows', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout({
                ...savedWorkout,
                blocks: [
                    {
                        kind: 'group',
                        rounds: 2,
                        restSeconds: 45,
                        steps: [
                            {
                                ...reps(12, 'Bench'),
                                weight: 40,
                                sets: [{ reps: 12, weight: 40 }, { reps: 8 }],
                            } as Step,
                        ],
                    },
                ],
            });
            await create();

            expect(el('.step__summary-time', steps()[0]).textContent!.trim()).toBe(
                '12, 8 @ 40 kg · rest 00:45'
            );
            await press('Step 1, Bench, 12, 8 @ 40 kg · rest 00:45');
            expect(vary(0).getAttribute('aria-checked')).toBe('true');
            expect(rows(0)).toEqual(['Set 1 · 12 × 40 kg', 'Set 2 · 8 reps']);
        });
    });

    describe('each side (BLD-10)', () => {
        const eachSide = (step: number) =>
            el<HTMLElement>('[id$="-each-side"] [role="switch"]', steps()[step]);

        it('gives a timed or rep step an Each side switch, off, and none to a rest step', async () => {
            await setup();
            await create();

            expect(eachSide(0).getAttribute('aria-checked')).toBe('false');
            expect(eachSide(1)).toBeNull();
        });

        it('saves the step done each side, and says so when collapsed', async () => {
            await setup();
            await create({ empty: true });
            chooseReps(0, '10');
            eachSide(0).click();
            fixture.detectChanges();
            await press('Step 1, reps, 10 reps each side');

            expect(el('.step__summary-time', steps()[0]).textContent!.trim()).toBe(
                '10 reps each side'
            );
            await submit();
            expect(unlinkedWorkout(store.workouts()[0])!.blocks).toEqual(
                eachAGroup([{ ...reps(10), eachSide: true }])
            );
        });

        it('leaves it off a step changed to rest', async () => {
            await setup();
            await create();
            chooseTime(0, 'seconds', '30');
            eachSide(0).click();
            fixture.detectChanges();
            await changeKind(0, 'Rest');
            // Some work, so it saves
            await addStep();
            chooseReps(2, '10');

            await submit();
            expect(allSteps(unlinkedWorkout(store.workouts()[0])!)[0]).toEqual(rest(30));
        });
    });

    describe('headings (BLD-13)', () => {
        const headingBox = (step: number) => el<HTMLInputElement>('input', steps()[step]);

        it('adds a heading at the end with "+ Heading", opened with the cursor in its box', async () => {
            await setup();
            await create({ empty: true });

            await press('Add heading');

            expect(steps()).toHaveLength(2);
            expect(steps()[1].classList).toContain('step--heading');
            expect(document.activeElement).toBe(headingBox(1));
            expect(headingBox(1).placeholder).toBe('e.g. Warmup');
            // Only it is open, as for a step just added
            expect(collapsed()).toEqual([true, false]);
            // It has no kind, Sets or wheels: it's only a label
            expect(steps()[1].querySelector('app-step-kind-menu')).toBeNull();
            expect(steps()[1].querySelectorAll('app-wheel-picker')).toHaveLength(0);
        });

        it("saves its text trimmed, in its place, and doesn't number it as a step", async () => {
            await setup();
            await create({ empty: true });
            typeName(0, 'Bike');
            chooseReps(0, '10');
            await press('Add heading');
            typeInto(headingBox(1), '  Knee rehabilitation ');
            await addStep();
            typeName(2, 'Leg press');
            chooseReps(2, '10');

            // The step after it is step 2
            expect(el('.step__number', steps()[2]).textContent).toContain('Step 2, Leg press');
            await submit();

            expect(unlinkedWorkout(store.workouts()[0])!.blocks).toEqual([
                ...eachAGroup([reps(10, 'Bike')]),
                { kind: 'heading', text: 'Knee rehabilitation' },
                ...eachAGroup([reps(10, 'Leg press')]),
            ]);
        });

        it('leaves out a heading left empty', async () => {
            await setup();
            await create({ empty: true });
            chooseReps(0, '10');
            await press('Add heading');
            typeInto(headingBox(1), '   ');

            await submit();

            expect(unlinkedWorkout(store.workouts()[0])!.blocks).toEqual(eachAGroup([reps(10)]));
        });

        it('shows a collapsed heading as its text, as a section title', async () => {
            await setup();
            await create({ empty: true });
            await press('Add heading');
            typeInto(headingBox(1), 'Warmup');

            await press('Heading, Warmup');

            expect(el('.step__summary--heading', steps()[1]).textContent!.trim()).toBe('Warmup');
        });

        it('moves and deletes as a step does, offering Undo', async () => {
            await setup();
            await create({ empty: true });
            await press('Add heading');
            typeInto(headingBox(1), 'Warmup');

            await press('Move Heading, Warmup up');
            expect(steps()[0].classList).toContain('step--heading');
            expect(el('[aria-live]').textContent).toContain(
                'Moved heading, warmup to before step 1'
            );

            await press('Delete Heading, Warmup');
            expect(steps()).toHaveLength(1);
            const undo = TestBed.inject(UndoService);
            expect(undo.offer()?.message).toBe('Deleted Heading, Warmup');
            undo.undo();
            fixture.detectChanges();
            expect(steps()[0].classList).toContain('step--heading');
        });

        it(`stops at ${MAX_HEADINGS} headings, which don't count towards the steps`, async () => {
            await setup();
            await create({ empty: true });
            for (let i = 0; i < MAX_HEADINGS; i++) {
                await press('Add heading');
            }

            expect(button('Add heading').disabled).toBe(true);
            expect(button('Add step').disabled).toBe(false);
            expect(fixture.nativeElement.textContent).toContain(
                `That's the most headings a workout can have (${MAX_HEADINGS})`
            );
        });

        it('opens a saved workout with its headings in their places', async () => {
            // Bike is made an exercise of your own first, as workout-1
            await setup({ editId: 'workout-2' });
            store.addWorkout({
                ...savedWorkout,
                blocks: [
                    { kind: 'heading', text: 'Warmup' },
                    ...eachAGroup([work(300, 'Bike')]),
                    { kind: 'heading', text: 'Legs' },
                    ...eachAGroup([reps(10, 'Leg press')]),
                ],
            });
            await create();

            expect(steps().map((step) => step.classList.contains('step--heading'))).toEqual([
                true,
                false,
                true,
                false,
            ]);
            expect(
                Array.from(
                    fixture.nativeElement.querySelectorAll('.step__summary--heading'),
                    (heading: Element) => heading.textContent!.trim()
                )
            ).toEqual(['Warmup', 'Legs']);
            // Saved again as it was
            await submit();
            expect(unlinkedWorkout(store.workouts()[0])!.blocks[2]).toEqual({
                kind: 'heading',
                text: 'Legs',
            });
        });
    });

    describe('supersets (BLD-12)', () => {
        function choose(step: number, wheel: string, value: string) {
            el(`[id$="-${wheel}"] [data-value="${value}"]`, steps()[step]).click();
            fixture.detectChanges();
        }
        const wheel = (step: number, name: string) =>
            el(`[id$="-${name}"] [role="spinbutton"]`, steps()[step])?.getAttribute(
                'aria-valuenow'
            ) ?? null;
        const badge = (step: number) =>
            el('.step__heading-badge [aria-hidden]', steps()[step]).textContent!.trim();
        const blocks = () => unlinkedWorkout(store.workouts()[0])!.blocks;
        const group = (rounds: number, restSeconds: number, ...groupSteps: Step[]): Block => ({
            kind: 'group',
            rounds,
            restSeconds,
            steps: groupSteps,
        });

        /** Bench (3 × 10, rest 01:00) then Row (10 reps), each open. */
        async function benchAndRow() {
            await create({ empty: true });
            typeName(0, 'Bench');
            chooseReps(0, '10');
            choose(0, 'sets', '3');
            await addStep();
            typeName(1, 'Row');
            chooseReps(1, '10');
            await press('Step 1, Bench, 3 × 10 · rest 01:00');
        }

        it("joins an exercise with the next, with its sets as the superset's rounds", async () => {
            await setup();
            await benchAndRow();

            await press('Join Step 1, Bench with the next step');

            expect(steps()[0].classList).toContain('step--superset');
            expect(badge(0)).toBe('Superset');
            expect(wheel(0, 'sets')).toBe('3');
            expect(wheel(0, 'rest-minutes')).toBe('1');
            expect(steps()[0].textContent).toContain('Rest after each round');
            // Its steps have no Sets of their own
            expect(wheel(1, 'sets')).toBeNull();
            expect(wheel(2, 'sets')).toBeNull();
            expect(document.activeElement).toBe(toggle(0));

            await submit();
            expect(blocks()).toEqual([group(3, 60, reps(10, 'Bench'), reps(10, 'Row'))]);
        });

        it('is a giant set with a third exercise, and a superset again when it goes', async () => {
            await setup();
            await benchAndRow();
            await addStep();
            typeName(2, 'Press');
            chooseReps(2, '8');
            await press('Step 1, Bench, 3 × 10 · rest 01:00');
            await press('Join Step 1, Bench with the next step');

            await press('Join Superset, steps 1 to 2 with the next step');
            expect(badge(0)).toBe('Giant set');
            // A rest step doesn't make it any bigger
            await press('Add a step to the giant set');
            await changeKind(4, 'Rest');
            expect(badge(0)).toBe('Giant set');

            await press('Step 3, Press, in the giant set, 8 reps');
            await press('Take Step 3, Press out');
            expect(badge(0)).toBe('Superset');
            // Just after it, with its rounds as its sets
            expect(steps()[4].classList).not.toContain('step--in-superset');
            expect(el('.step__number', steps()[4]).textContent).toContain('Step 4, Press');
            expect(wheel(4, 'sets')).toBe('3');
            expect(el('[aria-live]').textContent).toContain(
                'Took Press out of the giant set, now step 4'
            );
        });

        it('becomes two exercises again when one of its two steps is taken out', async () => {
            await setup();
            await benchAndRow();
            await press('Join Step 1, Bench with the next step');
            choose(0, 'rest-seconds', '30');

            await press('Take Step 1, Bench out');

            expect(steps()).toHaveLength(2);
            expect(fixture.nativeElement.querySelector('.step--superset')).toBeNull();
            await submit();
            expect(blocks()).toEqual([
                ...eachAGroup([reps(10, 'Row')], 3, 90),
                ...eachAGroup([reps(10, 'Bench')], 3, 90),
            ]);
        });

        it('adds a rep step at its end with its + Step, with its rounds', async () => {
            await setup();
            await benchAndRow();
            await press('Join Step 1, Bench with the next step');
            await addStep();
            typeName(3, 'Plank');
            chooseReps(3, '5');
            await press('Superset, steps 1 to 2, 3 rounds · rest 01:00');

            await press('Add a step to the superset');

            expect(steps()[3].classList).toContain('step--in-superset');
            expect(document.activeElement).toBe(el('input', steps()[3]));
            chooseReps(3, '12');
            await submit();
            expect(blocks()).toEqual([
                group(3, 60, reps(10, 'Bench'), reps(10, 'Row'), reps(12)),
                ...eachAGroup([reps(5, 'Plank')]),
            ]);
        });

        it('changes every step\'s sets with its Rounds, and says "Vary each round"', async () => {
            await setup();
            await benchAndRow();
            await press('Join Step 1, Bench with the next step');

            expect(steps()[1].textContent).toContain('Vary each round');
            el<HTMLElement>('[id$="-vary"] [role="switch"]', steps()[1]).click();
            fixture.detectChanges();
            await fixture.whenStable();
            expect(steps()[1].querySelectorAll('.wheel-row')).toHaveLength(3);
            expect(steps()[1].querySelector('.wheel-row')!.textContent).toContain(
                'Round 1 · 10 reps'
            );

            choose(0, 'sets', '4');
            await fixture.whenStable();
            expect(steps()[1].querySelectorAll('.wheel-row')).toHaveLength(4);
        });

        it('shows collapsed as one line of its steps, its rounds and rest', async () => {
            await setup();
            const saved = store.addWorkout({
                ...savedWorkout,
                blocks: [
                    group(3, 60, reps(10, 'Bench'), rest(15), reps(10, 'Row')),
                    ...eachAGroup([work(60, 'Plank')]),
                ],
            });
            queryParamMap.next(convertToParamMap({ editId: saved.id }));
            await create();

            expect(badge(0)).toBe('Superset');
            expect(el('.step__summary-name', steps()[0]).textContent!.trim()).toBe(
                'Bench, Rest, Row'
            );
            expect(el('.step__summary-time', steps()[0]).textContent!.trim()).toBe(
                '3 rounds · rest 01:00'
            );
            // Its steps are hidden with it
            expect(steps().map((step) => step.classList.contains('step--hidden'))).toEqual([
                false,
                true,
                true,
                true,
                false,
            ]);

            await submit();
            expect(blocks()[0]).toEqual(group(3, 60, reps(10, 'Bench'), rest(15), reps(10, 'Row')));
        });

        it('opens a group of several steps that runs once as its steps', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout(savedWorkout);
            await create();

            expect(fixture.nativeElement.querySelector('.step--superset')).toBeNull();
            expect(steps()).toHaveLength(2);
        });

        it('moves with its steps, and its steps move within it', async () => {
            await setup();
            await benchAndRow();
            await press('Join Step 1, Bench with the next step');
            await addStep();
            typeName(3, 'Plank');
            await press('Collapse all');
            await press('Expand all');

            // Its first step can't go up out of it, nor its last down
            expect(button('Move Step 1, Bench up').disabled).toBe(true);
            expect(button('Move Step 2, Row down').disabled).toBe(true);
            await press('Move Step 1, Bench down');
            expect(el('.step__number', steps()[1]).textContent).toContain('Step 1, Row');

            // A step goes past the whole superset
            await press('Move Step 3, Plank up');
            expect(el('.step__number', steps()[0]).textContent).toContain('Step 1, Plank');
            expect(steps()[1].classList).toContain('step--superset');

            await press('Move Superset, steps 2 to 3 up');
            expect(steps()[0].classList).toContain('step--superset');
            expect(el('[aria-live]').textContent).toContain('Moved superset to before step 3');
            await submit();
            // Plank, left at 0 reps, is left out
            expect(blocks()).toEqual([group(3, 60, reps(10, 'Row'), reps(10, 'Bench'))]);
        });

        it('keeps a dragged step out of a superset, and one of its own in it', async () => {
            await setup();
            await benchAndRow();
            await press('Join Step 1, Bench with the next step');
            await addStep();
            const list = fixture.debugElement
                .query(By.directive(CdkDropList))
                .injector.get(CdkDropList);
            const canDrop = (from: number, to: number) =>
                list.sortPredicate(to, list.getSortedItems()[from], list);

            await press('Collapse all');
            // Collapsed, straight after its row is after it on screen, where it goes
            expect(canDrop(3, 1)).toBe(true);
            await press('Expand all');

            // Plank, at the end, can go before the superset, but not into it
            expect(canDrop(3, 0)).toBe(true);
            expect(canDrop(3, 1)).toBe(false);
            expect(canDrop(3, 2)).toBe(false);
            // Bench can swap with Row, but not leave
            expect(canDrop(1, 2)).toBe(true);
            expect(canDrop(1, 3)).toBe(false);

            // Dropped on a collapsed superset's row, from above, it goes after its steps
            await press('Move Step 3, reps up');
            await press('Collapse all');
            list.dropped.emit({ previousIndex: 0, currentIndex: 1 } as CdkDragDrop<unknown>);
            fixture.detectChanges();
            expect(steps()[0].classList).toContain('step--superset');
            expect(el('.step__summary-name', steps()[3]).textContent!.trim()).toBe('');
            expect(el('[aria-live]').textContent).toContain('Moved reps to step 3');
        });

        it('drags whole by its handle, taking its steps with it', async () => {
            await setup();
            await benchAndRow();
            await press('Join Step 1, Bench with the next step');
            await addStep();
            typeName(3, 'Plank');
            await press('Collapse all');
            await press('Expand all');
            const list = fixture.debugElement
                .query(By.directive(CdkDropList))
                .injector.get(CdkDropList);
            const canDrop = (from: number, to: number) =>
                list.sortPredicate(to, list.getSortedItems()[from], list);
            const hidden = () => steps().map((step) => step.classList.contains('step--hidden'));
            const handle = el('.step__handle', steps()[0]);
            const grab = () => {
                handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
                fixture.detectChanges();
            };

            expect(handle.getAttribute('aria-hidden')).toBe('true');
            // Held, its steps hide, so it drags as one row; let go without dragging, they're back
            grab();
            expect(hidden()).toEqual([false, true, true, false]);
            window.dispatchEvent(new PointerEvent('pointerup'));
            fixture.detectChanges();
            expect(hidden()).toEqual([false, false, false, false]);

            // It can go past Plank, its steps following it
            grab();
            expect(canDrop(0, 3)).toBe(true);
            list.dropped.emit({ previousIndex: 0, currentIndex: 3 } as CdkDragDrop<unknown>);
            fixture.detectChanges();

            expect(hidden()).toEqual([false, false, false, false]);
            expect(el('.step__number', steps()[0]).textContent).toContain('Step 1, Plank');
            expect(steps()[1].classList).toContain('step--superset');
            expect(steps()[2].classList).toContain('step--in-superset');
            expect(steps()[3].classList).toContain('step--in-superset');
            expect(el('[aria-live]').textContent).toContain('Moved superset to the end');
        });

        it('can not drag a superset into another, and goes after one that is collapsed', async () => {
            await setup();
            await benchAndRow();
            await press('Join Step 1, Bench with the next step');
            await addStep();
            typeName(3, 'Curl');
            await addStep();
            typeName(4, 'Dip');
            await press('Collapse all');
            await press('Expand all');
            await press('Join Step 3, Curl with the next step');
            const list = fixture.debugElement
                .query(By.directive(CdkDropList))
                .injector.get(CdkDropList);
            const canDrop = (from: number, to: number) =>
                list.sortPredicate(to, list.getSortedItems()[from], list);

            // Rows: Superset, Bench, Row, Superset, Curl, Dip
            el('.step__handle', steps()[0]).dispatchEvent(
                new PointerEvent('pointerdown', { bubbles: true })
            );
            fixture.detectChanges();
            // Straight after the other's row, or between its steps, is in it; after them isn't
            expect(canDrop(0, 3)).toBe(false);
            expect(canDrop(0, 4)).toBe(false);
            expect(canDrop(0, 5)).toBe(true);
            // Collapsed, straight after its row is after it on screen, where it goes
            await press('Collapse all');
            expect(canDrop(0, 3)).toBe(true);
            list.dropped.emit({ previousIndex: 0, currentIndex: 3 } as CdkDragDrop<unknown>);
            fixture.detectChanges();
            expect(
                steps().map((step) => el('.step__summary-name', step)?.textContent!.trim())
            ).toEqual(['Curl, Dip', 'Curl', 'Dip', 'Bench, Row', 'Bench', 'Row']);
        });

        it('deletes with its steps, and comes back with Undo', async () => {
            await setup();
            await benchAndRow();
            await press('Join Step 1, Bench with the next step');

            await press('Delete Superset, steps 1 to 2');
            expect(steps()).toHaveLength(0);
            const undo = TestBed.inject(UndoService);
            expect(undo.offer()?.message).toBe('Deleted Superset, steps 1 to 2');

            undo.undo();
            fixture.detectChanges();
            expect(steps()).toHaveLength(3);
            expect(steps()[0].classList).toContain('step--superset');
        });

        it('becomes an exercise when a step of two is deleted', async () => {
            await setup();
            await benchAndRow();
            await press('Join Step 1, Bench with the next step');

            await press('Delete Step 2, Row');

            expect(steps()).toHaveLength(1);
            expect(steps()[0].classList).not.toContain('step--in-superset');
            await submit();
            expect(blocks()).toEqual(eachAGroup([reps(10, 'Bench')], 3, 60));
        });
    });

    describe('exercises', () => {
        const status = (step: number) =>
            el('.step__exercise-status', steps()[step])?.textContent!.replace(/\s+/g, ' ').trim();

        function pick(step: number, name: string) {
            const option = Array.from(steps()[step].querySelectorAll('[role="option"]')).find(
                (o) => o.querySelector('.exercise-picker__name')!.textContent!.trim() === name
            ) as HTMLElement;
            expect(option, `expected "${name}" in the list`).toBeDefined();
            option.click();
            fixture.detectChanges();
        }

        it('finds an exercise as a work or rep step is named, and saves the step linked to it', async () => {
            await setup();
            await create();

            typeName(0, 'front sq');
            pick(0, 'Front squat');
            chooseTime(0, 'seconds', '30');
            await submit();

            expect(allSteps(store.workouts()[0])[0]).toEqual({
                kind: 'work',
                seconds: 30,
                name: 'Front squat',
                exerciseId: 'builtin:front-squat',
            });
        });

        it('says which exercise a step is, or that a new one will be made', async () => {
            await setup();
            await create();

            expect(steps()[0].querySelector('[role="combobox"]')).not.toBeNull();
            expect(status(0)).toBeUndefined();
            typeName(0, 'Squats');
            expect(status(0)).toBe('Built-in exercise');
            typeName(0, 'Wall walk');
            expect(status(0)).toBe('A new exercise of your own, made when the workout is saved');
            // A rest isn't an exercise, so it has a plain name box
            expect(steps()[1].querySelector('[role="combobox"]')).toBeNull();
        });

        it('adds a note to a built-in exercise, shown under the step', async () => {
            await setup();
            await create();
            typeName(0, 'Back squat');

            await press('Add a note to Back squat');
            const note = el<HTMLTextAreaElement>('#exercise-editor-note');
            typeInto(note as unknown as HTMLInputElement, 'Pause at the bottom');
            el('.editor__save').click();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(el('app-exercise-editor')).toBeNull();
            expect(status(0)).toBe('Built-in exercise Your note: Pause at the bottom');
            expect(document.activeElement).toBe(button('Edit your note on Back squat'));
        });

        it('renames your own exercise from its step, in the form and in saved workouts', async () => {
            await setup({ editId: 'workout-2' });
            const exercises = TestBed.inject(ExerciseStore);
            const mine = exercises.addOwn('Sled push', 'timed');
            store.addWorkout({
                title: 'Sleds',
                blocks: asOneGroup([work(30, 'Sled push'), rest(30)]),
                repeats: 2,
            });
            await create();
            await press('Step 1, Sled push, 00:30');

            await press('Edit Sled push');
            typeInto(el('#exercise-editor-name'), 'Sled drag');
            el('.editor__save').click();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(exercises.byId(mine.id)?.name).toBe('Sled drag');
            expect(shown().steps[0].name).toBe('Sled drag');
            expect(allSteps(store.workouts()[0])[0]).toEqual({
                ...work(30, 'Sled drag'),
                exerciseId: mine.id,
            });
            expect(status(0)).toBe('Your own exercise');
        });

        it("shows the exercise's details, as its page does, without leaving", async () => {
            await setup();
            await create();
            typeName(0, 'front sq');
            pick(0, 'Front squat');

            await press('Details of Front squat');
            // Its words aren't in the first download
            await TestBed.inject(ExerciseStore).loadText();
            fixture.detectChanges();

            const dialog = el('[role="dialog"]');
            expect(el('#exercise-details-title').textContent!.trim()).toBe('Front squat');
            // At the top, rather than scrolled down to the first button
            expect(document.activeElement).toBe(el('#exercise-details-title'));
            expect(dialog.getAttribute('aria-labelledby')).toBe('exercise-details-title');
            expect(el('.exercise__description', dialog)).not.toBeNull();
            expect(el('app-body-map', dialog)).not.toBeNull();
            expect(el('.exercise__steps', dialog)).not.toBeNull();

            el('.details__done').click();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(el('app-exercise-details-dialog')).toBeNull();
            expect(document.activeElement).toBe(button('Details of Front squat'));
        });

        describe('swapping it for another (BLD-14)', () => {
            const squats: WorkoutFields = {
                ...savedWorkout,
                blocks: asOneGroup([
                    {
                        kind: 'reps',
                        reps: 10,
                        name: 'Back squat',
                        weight: 60,
                        exerciseId: 'builtin:back-squat',
                    },
                    {
                        kind: 'work',
                        seconds: 45,
                        name: 'Plank',
                        exerciseId: 'builtin:plank',
                    },
                ]),
            };
            const swapNames = () =>
                Array.from(fixture.nativeElement.querySelectorAll('.swap__option .swap__name')).map(
                    (name) => (name as HTMLElement).textContent!.trim()
                );

            async function editSquats() {
                await setup({ editId: 'workout-1' });
                // Wheels jump to a new value rather than glide: this test browser can cut a glide short
                // and land a wheel back where it began, which a real one doesn't
                fakeReducedMotion(true);
                // Goblet squats at 24 kg last time
                TestBed.inject(HistoryStore).record({
                    id: `${Date.now() - 1000}-other`,
                    workoutId: 'other',
                    title: 'Other',
                    startedAt: Date.now() - 1000,
                    endedAt: Date.now(),
                    activeSeconds: 60,
                    roundsCompleted: 1,
                    totalRounds: 1,
                    outcome: 'finished',
                    sets: [
                        {
                            round: 0,
                            step: 0,
                            name: 'Goblet squat',
                            reps: 10,
                            weight: 24,
                            exerciseId: 'builtin:goblet-squat',
                        },
                    ],
                });
                store.addWorkout(squats);
                await create();
                await press('Step 1, Back squat, 10 reps @ 60 kg');
            }

            /** Waits for the step's weight wheel to glide to `value` and stay there. */
            async function wheelSettlesOn(value: string) {
                const weight = () =>
                    el('[id$="-weight"] [role="spinbutton"]').getAttribute('aria-valuetext');
                await vi.waitFor(() => expect(weight()).toBe(value), { timeout: 3000 });
                await new Promise((resolve) => setTimeout(resolve, 300));
                fixture.detectChanges();
                expect(weight()).toBe(value);
            }

            function searchAndPick(name: string) {
                typeInto(el('#swap-search'), name);
                const option = Array.from(
                    fixture.nativeElement.querySelectorAll('.swap__option')
                ).find(
                    (o) =>
                        (o as HTMLElement).querySelector('.swap__name')!.textContent!.trim() ===
                        name
                ) as HTMLElement;
                option.click();
                fixture.detectChanges();
            }

            it('offers the closest exercises for the same muscles, then search', async () => {
                await editSquats();

                await press('Swap Back squat');

                expect(el('.swap__title').textContent!.trim()).toBe('Swap Back squat');
                expect(el('.swap__hint').textContent).toContain('Keeps the step');
                expect(swapNames()).toHaveLength(5);
                expect(swapNames()).not.toContain('Back squat');
                expect(document.activeElement).toBe(el('#swap-search'));
            });

            it('makes the step the new exercise, with its reps, at its weight last time', async () => {
                await editSquats();
                await press('Swap Back squat');

                searchAndPick('Goblet squat');
                await fixture.whenStable();

                expect(el('app-swap-exercise-dialog')).toBeNull();
                expect(shown().steps[0].name).toBe('Goblet squat');
                expect(TestBed.inject(UndoService).offer()?.message).toBe(
                    'Swapped to Goblet squat'
                );
                expect(document.activeElement).toBe(button('Swap Goblet squat'));

                // Let the weight wheel glide to its new weight: settling after saving has emptied the
                // form would set a step that's gone (in the app, the page has gone by then)
                await wheelSettlesOn('24');
                await submit();

                expect(allSteps(store.workouts()[0])[0]).toEqual({
                    kind: 'reps',
                    reps: 10,
                    name: 'Goblet squat',
                    weight: 24,
                    exerciseId: 'builtin:goblet-squat',
                });
            });

            it('puts the step back with Undo', async () => {
                await editSquats();
                await press('Swap Back squat');
                searchAndPick('Goblet squat');

                TestBed.inject(UndoService).undo();
                fixture.detectChanges();
                // As above, the weight wheel glides back first
                await wheelSettlesOn('60');
                await submit();

                expect(allSteps(store.workouts()[0])[0]).toMatchObject({
                    name: 'Back squat',
                    weight: 60,
                    exerciseId: 'builtin:back-squat',
                });
            });

            it('offers only timed exercises for a timed step', async () => {
                await editSquats();
                await press('Step 2, Plank, 00:45');

                await press('Swap Plank');
                typeInto(el('#swap-search'), 'squat');

                // The squats are all measured in reps, so none are offered for a timed step
                expect(swapNames().every((name) => !name.includes('squat'))).toBe(true);
            });

            it('closes with ✕, changing nothing, with focus back on Swap', async () => {
                await editSquats();
                await press('Swap Back squat');

                el('.swap__close').click();
                fixture.detectChanges();
                await fixture.whenStable();

                expect(el('app-swap-exercise-dialog')).toBeNull();
                expect(shown().steps[0].name).toBe('Back squat');
                expect(document.activeElement).toBe(button('Swap Back squat'));
            });
        });

        it('goes back to the name box to pick another, ready to type over', async () => {
            await setup();
            await create();
            typeName(0, 'Back squat');

            await press('Details of Back squat');
            el('.details__pick-another').click();
            fixture.detectChanges();
            await fixture.whenStable();

            const box = el<HTMLInputElement>('[role="combobox"]', steps()[0]);
            expect(el('app-exercise-details-dialog')).toBeNull();
            expect(document.activeElement).toBe(box);
            expect([box.selectionStart, box.selectionEnd]).toEqual([0, 'Back squat'.length]);
        });

        describe('browsing for it (BLD-16)', () => {
            const cardNames = () =>
                Array.from(
                    fixture.nativeElement.querySelectorAll(
                        'app-browse-exercises-dialog .exercise-card__name'
                    )
                ).map((name) => (name as HTMLElement).firstChild!.textContent!.trim());

            function pickCard(name: string) {
                const card = Array.from(
                    fixture.nativeElement.querySelectorAll(
                        'app-browse-exercises-dialog .exercise-card'
                    )
                ).find(
                    (c) =>
                        (c as HTMLElement)
                            .querySelector('.exercise-card__name')!
                            .firstChild!.textContent!.trim() === name
                ) as HTMLButtonElement;
                expect(card, `expected a "${name}" card`).toBeDefined();
                card.click();
                fixture.detectChanges();
            }

            it("opens the exercises over Create from a button by a step's name box", async () => {
                await setup();
                await create();

                // Timed and rep steps have it; a rest isn't an exercise
                expect(steps()[1].querySelector('[id$="-browse"]')).toBeNull();
                await press('Browse exercises for step 1');

                expect(el('.browse__title').textContent!.trim()).toBe('Browse exercises');
                expect(el('.browse__hint').textContent!.trim()).toBe('Pick one for step 1.');
                expect(cardNames()).toContain('Back squat');
                expect(document.activeElement).toBe(el('#browse-search'));
            });

            it('fills in the step with the exercise picked, linked to it', async () => {
                await setup();
                await create();
                await press('Browse exercises for step 1');

                typeInto(el('#browse-search'), 'front squat');
                pickCard('Front squat');
                await fixture.whenStable();

                expect(el('app-browse-exercises-dialog')).toBeNull();
                expect(shown().steps[0].name).toBe('Front squat');
                expect(status(0)).toContain('Built-in exercise');
                expect(el('.sr-only[aria-live="polite"]').textContent!.trim()).toBe(
                    'Step 1 is now Front squat'
                );
                expect(document.activeElement).toBe(button('Browse exercises for step 1'));

                chooseTime(0, 'seconds', '30');
                await submit();
                expect(allSteps(store.workouts()[0])[0]).toEqual({
                    kind: 'work',
                    seconds: 30,
                    name: 'Front squat',
                    exerciseId: 'builtin:front-squat',
                });
            });

            it('closes with ✕, leaving the step as it was', async () => {
                await setup();
                await create();
                typeName(0, 'Back squat');
                await press('Browse exercises for step 1');

                el<HTMLButtonElement>('.browse__close').click();
                fixture.detectChanges();
                await fixture.whenStable();

                expect(el('app-browse-exercises-dialog')).toBeNull();
                expect(shown().steps[0].name).toBe('Back squat');
                expect(document.activeElement).toBe(button('Browse exercises for step 1'));
            });
        });
    });

    describe('until stopped', () => {
        beforeEach(async () => {
            await setup();
            await create();
        });

        const toggle = () => el<HTMLButtonElement>('app-infinity-switch [role="switch"]');
        const isOn = () => toggle().getAttribute('aria-checked') === 'true';
        const roundsSaid = () => el('#repeats [role="spinbutton"]').getAttribute('aria-valuetext');

        it('ends the rounds wheel with ∞, read out as "until stopped"', () => {
            const items = Array.from(
                fixture.nativeElement.querySelectorAll('#repeats .wheel-picker__item')
            ) as HTMLElement[];

            expect(items.at(-2)?.textContent?.trim()).toBe('30');
            expect(items.at(-1)?.textContent?.trim()).toBe('∞');
        });

        it('has a labelled switch next to the wheel, off to begin with', () => {
            expect(toggle().getAttribute('aria-labelledby')).toBe('untilStopped-label');
            expect(el('#untilStopped-label').textContent).toBe('Until stopped');
            expect(isOn()).toBe(false);
        });

        it('turns the wheel to ∞ when the switch is turned on', () => {
            toggle().click();
            fixture.detectChanges();

            expect(isOn()).toBe(true);
            expect(roundsSaid()).toBe('until stopped');
        });

        it('goes back to the rounds picked before when the switch is turned off', () => {
            chooseRounds('8');
            toggle().click();
            fixture.detectChanges();

            toggle().click();
            fixture.detectChanges();

            expect(isOn()).toBe(false);
            expect(shown().repeats).toBe('8');
        });

        it('turns the switch on when ∞ is picked on the wheel, and off again when a number is', () => {
            chooseRounds('0'); // ∞
            expect(isOn()).toBe(true);

            chooseRounds('12');
            expect(isOn()).toBe(false);
        });

        it('saves a workout that runs until stopped', async () => {
            chooseTime(0, 'seconds', '30');
            toggle().click();
            fixture.detectChanges();

            await submit();

            expect(store.workouts()[0].repeats).toBe(UNTIL_STOPPED);
        });
    });

    describe('time limit', () => {
        beforeEach(async () => {
            await setup();
            await create();
        });

        const mode = (label: string) =>
            Array.from(
                fixture.nativeElement.querySelectorAll(
                    'input[name="repeatMode"]'
                ) as NodeListOf<HTMLInputElement>
            ).find((input) => input.parentElement!.textContent!.trim() === label)!;
        const chooseMode = (label: string) => {
            mode(label).click();
            fixture.detectChanges();
        };
        const chooseLimit = (wheel: 'minutes' | 'seconds', value: string) => {
            el(`#limit-${wheel} [data-value="${value}"]`).click();
            fixture.detectChanges();
        };
        const limitSaid = (wheel: 'minutes' | 'seconds') =>
            el(`#limit-${wheel} [role="spinbutton"]`).getAttribute('aria-valuenow');

        it('offers Rounds or Time limit, Rounds to begin with', () => {
            expect(mode('Rounds').checked).toBe(true);
            expect(mode('Time limit').checked).toBe(false);
            expect(fixture.nativeElement.querySelector('#limit-minutes')).toBeNull();
        });

        it('swaps the rounds for minutes and seconds wheels, at 20:00 to begin with', () => {
            chooseMode('Time limit');

            expect(fixture.nativeElement.querySelector('#repeats')).toBeNull();
            expect(limitSaid('minutes')).toBe('20');
            expect(limitSaid('seconds')).toBe('0');
        });

        it('saves the time limit, with rounds until stopped', async () => {
            chooseTime(0, 'seconds', '30');
            chooseMode('Time limit');
            chooseLimit('minutes', '12');
            chooseLimit('seconds', '30');

            await submit();

            const saved = store.workouts()[0];
            expect(saved.repeats).toBe(UNTIL_STOPPED);
            expect(saved.timeLimitSeconds).toBe(750);
        });

        it("won't save a time limit of 00:00", () => {
            chooseTime(0, 'seconds', '30');
            chooseMode('Time limit');
            chooseLimit('minutes', '0');

            expect(fixture.nativeElement.textContent).toContain(
                'Time limit needs to be longer than 00:00'
            );
            expect(submitButton().disabled).toBe(true);
        });

        it('saves rounds again, and no time limit, when Rounds is picked back', async () => {
            chooseTime(0, 'seconds', '30');
            chooseRounds('5');
            chooseMode('Time limit');
            chooseMode('Rounds');

            await submit();

            expect(store.workouts()[0].repeats).toBe(5);
            expect('timeLimitSeconds' in store.workouts()[0]).toBe(false);
        });
    });

    describe('editing a workout with a time limit', () => {
        it('opens on Time limit with its time', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout({ ...savedWorkout, repeats: UNTIL_STOPPED, timeLimitSeconds: 1230 });
            await create();

            const timeLimit = el<HTMLInputElement>('input[name="repeatMode"][value="time"]');
            expect(timeLimit.checked).toBe(true);
            expect(el('#limit-minutes [role="spinbutton"]').getAttribute('aria-valuenow')).toBe(
                '20'
            );
            expect(el('#limit-seconds [role="spinbutton"]').getAttribute('aria-valuenow')).toBe(
                '30'
            );
        });
    });

    describe('adding an exercise from its page (EXR-12)', () => {
        const backSquat = {
            kind: 'reps' as const,
            reps: 10,
            name: 'Back squat',
            exerciseId: 'builtin:back-squat',
        };

        it('starts a new workout with it in ?add: 3 sets of 10, with 1:00 rest', async () => {
            await setup({ add: 'builtin:back-squat' });
            await create({ empty: true });

            expect(shown().steps).toEqual([{ kind: 'Reps', name: 'Back squat', time: '10 reps' }]);
            await submit();
            expect(store.workouts()[0].blocks).toEqual([
                { kind: 'group', rounds: 3, restSeconds: 60, steps: [backSquat] },
            ]);
        });

        it('adds a timed exercise as 3 sets of 0:30', async () => {
            await setup({ add: 'builtin:plank' });
            await create({ empty: true });
            await submit();

            expect(store.workouts()[0].blocks).toEqual([
                {
                    kind: 'group',
                    rounds: 3,
                    restSeconds: 60,
                    steps: [
                        { kind: 'work', seconds: 30, name: 'Plank', exerciseId: 'builtin:plank' },
                    ],
                },
            ]);
        });

        it('adds it at the end of the workout in ?editId, the only step open', async () => {
            await setup({ editId: 'workout-1', add: 'builtin:back-squat' });
            store.addWorkout(savedWorkout);
            await create({ empty: true });

            expect(shown().steps.map((step) => step.name)).toEqual(['Squats', '', 'Back squat']);
            expect(steps().map((step) => isCollapsed(step))).toEqual([true, true, false]);
            expect(document.activeElement?.id).toMatch(/^step-\d+-toggle$/);
            expect(steps()[2].contains(document.activeElement)).toBe(true);
            expect(fixture.nativeElement.textContent).toContain('Added Back squat, step 3');
        });

        it('takes ?add off the address, leaving the form as it is', async () => {
            await setup({ editId: 'workout-1', add: 'builtin:back-squat' });
            store.addWorkout(savedWorkout);
            await create({ empty: true });

            expect(navigate).toHaveBeenCalledWith(
                [],
                expect.objectContaining({ queryParams: { add: null }, replaceUrl: true })
            );
            queryParamMap.next(convertToParamMap({ editId: 'workout-1' }));
            fixture.detectChanges();
            expect(shown().steps.map((step) => step.name)).toEqual(['Squats', '', 'Back squat']);
        });

        it("doesn't add to a workout that's already full", async () => {
            await setup({ editId: 'workout-1', add: 'builtin:back-squat' });
            store.addWorkout({
                ...savedWorkout,
                blocks: eachAGroup(Array.from({ length: MAX_STEPS }, () => reps(10, 'Push-ups'))),
            });
            await create({ empty: true });

            expect(steps().length).toBe(MAX_STEPS);
            expect(fixture.nativeElement.textContent).not.toContain('Back squat');
        });
    });

    describe('editing a workout', () => {
        it('fills the form from the workout in ?editId', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout(savedWorkout);
            await create();

            expect(shown()).toEqual({
                title: 'Saved workout',
                steps: [
                    { kind: 'Timed', name: 'Squats', time: '2:15' },
                    { kind: 'Rest', name: '', time: '0:45' },
                ],
                repeats: '4',
            });
            expect(submitButton().textContent).toContain('Save & start workout');
        });

        describe('weights in pounds', () => {
            // 45 lb, saved in kg
            const pressed: WorkoutFields = {
                ...savedWorkout,
                blocks: asOneGroup([{ kind: 'reps', reps: 10, name: 'Bench', weight: 20.412 }]),
            };

            async function editInPounds() {
                await setup({ editId: 'workout-1' });
                TestBed.inject(SettingsStore).update({ weightUnit: 'lb' });
                store.addWorkout(pressed);
                await create();
            }

            it('shows and picks weights in lb, as chosen in settings', async () => {
                await editInPounds();

                expect(shown().steps[0].time).toBe('10 reps @ 45 lb');
                await press('Step 1, Bench, 10 reps @ 45 lb');
                expect(fixture.nativeElement.textContent).toContain('Weight (lb)');
            });

            it('keeps a weight as it was saved when it is left alone', async () => {
                await editInPounds();
                typeTitle('Renamed');

                await submit();

                expect(unlinked(allSteps(store.workouts()[0]))).toEqual(allSteps(pressed));
            });

            it('saves a weight picked in lb in kg', async () => {
                await editInPounds();
                await press('Step 1, Bench, 10 reps @ 45 lb');
                const wheel = steps()[0].querySelectorAll('app-wheel-picker')[1];
                // A frame for the wheel's jump to 45 to land, as it would before a finger could
                await new Promise(requestAnimationFrame);
                await new Promise(requestAnimationFrame);
                el('[data-value="135"]', wheel).click();
                fixture.detectChanges();
                // Let it glide there: settling after saving has emptied the form would set a
                // step that's gone (in the app, the page has gone by then)
                await new Promise((resolve) => setTimeout(resolve, 600));

                await submit();

                expect(unlinked(allSteps(store.workouts()[0]))).toEqual([
                    { kind: 'reps', reps: 10, name: 'Bench', weight: 61.235 },
                ]);
            });
        });

        it('shows a rep step collapsed as its name and count', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout({
                ...savedWorkout,
                blocks: asOneGroup([work(30), reps(1, 'Pull-up'), reps(20)]),
            });
            await create();

            expect(shown().steps).toEqual([
                { kind: 'Timed', name: '', time: '0:30' },
                { kind: 'Reps', name: 'Pull-up', time: '1 rep' },
                { kind: 'Reps', name: '', time: '20 reps' },
            ]);
        });

        it('opens with every step collapsed, so the whole workout is in view', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout(savedWorkout);
            await create();

            expect(collapsed()).toEqual([true, true]);
            expect(button('Expand all')).toBeDefined();
        });

        it('updates the existing workout instead of adding a new one', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout(savedWorkout);
            await create();

            typeTitle('Renamed');
            chooseRounds('2');
            await submit();

            expect(store.workouts()).toHaveLength(1);
            expect(unlinkedWorkout(store.workouts()[0])).toEqual({
                id: 'workout-1',
                updatedAt: expect.any(Number),
                title: 'Renamed',
                blocks: eachAGroup(allSteps(savedWorkout)),
                repeats: 2,
            });
            expect(store.activeWorkout()?.id).toBe('workout-1');
            expect(navigate).toHaveBeenCalledWith(['/workout']);
        });

        it('saves the changes with Save, without starting it, and goes back to the library', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout(savedWorkout);
            await create();

            typeTitle('Renamed');
            await press('Save');

            expect(store.workouts()).toHaveLength(1);
            expect(store.workouts()[0]).toMatchObject({ id: 'workout-1', title: 'Renamed' });
            expect(store.activeWorkout()).toBeNull();
            expect(navigate).toHaveBeenCalledWith(['/library'], {
                queryParams: { saved: 'workout-1' },
            });
        });

        it('empties the form for a new workout when the editId goes, as Create from the menu does', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout(savedWorkout);
            await create();

            queryParamMap.next(convertToParamMap({}));
            fixture.detectChanges();
            await fixture.whenStable();

            expect(shown()).toEqual({ title: '', steps: [blankStep], repeats: '1' });
            expect(submitButton().textContent).not.toContain('Save');
        });

        it('switches to another workout when the editId changes', async () => {
            await setup({ editId: 'workout-1' });
            store.addWorkout(savedWorkout);
            store.addWorkout({ ...savedWorkout, title: 'Other workout' });
            await create();

            queryParamMap.next(convertToParamMap({ editId: 'workout-2' }));
            fixture.detectChanges();
            await fixture.whenStable();

            expect(shown().title).toBe('Other workout');
        });

        for (const editId of ['abc', '0', '-1', '1.5', '99']) {
            it(`ignores an invalid or unknown editId of "${editId}"`, async () => {
                await setup({ editId });
                store.addWorkout(savedWorkout);
                await create();

                expect(shown().title).toBe('');
                expect(submitButton().textContent).not.toContain('Save');
            });
        }
    });
});
