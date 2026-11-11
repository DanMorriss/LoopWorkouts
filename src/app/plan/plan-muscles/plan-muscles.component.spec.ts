import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { BUILT_IN_WORKOUTS, builtInWorkoutEquipment } from '../../models/built-in-workouts';
import { WorkoutFields } from '../../models/workout';
import { PlanStore } from '../../shared/state/plan-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { makeWorkout as baseWorkout, reps, SimpleWorkout } from '../../shared/testing/make-workout';
import { UndoService } from '../../shared/undo/undo.service';
import { PlanMusclesComponent } from './plan-muscles.component';
import { weekdayOf } from '../../models/plan';

function makeWorkout(overrides: Partial<SimpleWorkout> = {}): WorkoutFields {
    const { id: _id, updatedAt: _updatedAt, ...workout } = baseWorkout(overrides);
    return workout;
}

describe('PlanMusclesComponent (LIB-5, LIB-7)', () => {
    let fixture: ComponentFixture<PlanMusclesComponent>;
    let store: WorkoutStore;
    let plan: PlanStore;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        store = TestBed.inject(WorkoutStore);
        plan = TestBed.inject(PlanStore);
    });

    afterEach(() => localStorage.clear());

    function create() {
        fixture = TestBed.createComponent(PlanMusclesComponent);
        fixture.detectChanges();
    }

    const el = (selector: string): HTMLElement | null =>
        fixture.nativeElement.querySelector(selector);
    const muscles = (list: number) =>
        Array.from(
            fixture.nativeElement
                .querySelectorAll('.plan-muscles__list')
                [list].querySelectorAll('a'),
            (a: Element) => a.textContent!.trim()
        ).join(' ');

    it('says nothing while no planned step is an exercise', () => {
        // Not planned, so it doesn't count
        store.addWorkout(makeWorkout({ title: 'Legs', steps: [reps(10, 'Back squat')] }));
        plan.add(0, store.addWorkout(makeWorkout({ title: 'Sprints' })).id);
        create();

        expect(el('.plan-muscles')).toBeNull();
    });

    describe('with Back squat and Bench press planned', () => {
        beforeEach(() => {
            // Back squat works the quads and glutes, helped by the hamstrings, adductors and
            // lower back; Bench press the chest, helped by the shoulders and triceps
            const legs = store.addWorkout(
                makeWorkout({ title: 'Legs', steps: [reps(10, 'Back squat')] })
            );
            const push = store.addWorkout(
                makeWorkout({ title: 'Push', steps: [reps(10, 'Bench press')] })
            );
            plan.add(0, legs.id);
            plan.add(2, push.id);
            plan.add(4, legs.id);
            // Not planned: its muscles still count as missed
            store.addWorkout(makeWorkout({ title: 'Arms', steps: [reps(10, 'Biceps curl')] }));
            create();
        });

        it('shades what the plan works on the body map, over the muscle groups it misses', () => {
            const titles = Array.from(
                fixture.nativeElement.querySelectorAll('.plan-muscles__title'),
                (h: Element) => h.textContent!.trim()
            );
            expect(titles).toEqual(['What your plan works', 'Missing muscle groups']);
            const map = fixture.debugElement.query(By.directive(BodyMapComponent))!;
            expect(map.componentInstance.main()).toEqual(['chest', 'glutes', 'quads']);
            // Arms isn't planned, so its biceps aren't shaded
            expect(map.componentInstance.main()).not.toContain('biceps');
            expect(map.componentInstance.supporting()).toContain('triceps');
        });

        it('lists the muscle groups no planned workout works, linking to exercises for each', () => {
            expect(el('#plan-muscles-title')?.textContent).toContain('Missing muscle groups');
            expect(muscles(0)).toBe(
                'Biceps Forearms Abs Obliques Traps Upper back Abductors Calves Shins Neck'
            );
            expect(el('.plan-muscles__muscle')?.getAttribute('href')).toBe(
                '/exercises?muscles=biceps&from=plan'
            );
        });

        it("links the map's muscles to exercises for each, and doesn't list the supporting ones again", () => {
            const links = Array.from(
                (fixture.nativeElement as HTMLElement).querySelectorAll('.body-map__link'),
                (a) => [a.textContent!.trim(), a.getAttribute('href')]
            );
            expect(links).toContainEqual(['Chest', '/exercises?muscles=chest&from=plan']);
            expect(links).toContainEqual(['Triceps', '/exercises?muscles=triceps&from=plan']);
            expect(fixture.nativeElement.querySelectorAll('.plan-muscles__list')).toHaveLength(1);
            expect(fixture.nativeElement.textContent).not.toContain('Only lightly');
        });

        describe('a ready-made workout for them', () => {
            const suggested = () => el('.plan-muscles__filler-name')?.textContent!.trim();

            beforeEach(async () => {
                await store.loadReadyMade();
                fixture.detectChanges();
            });

            it('suggests the one that does most for them, saying what it adds', () => {
                expect(el('.plan-muscles__filler-label')?.textContent?.trim()).toBe(
                    'Or plan a ready-made workout for them:'
                );
                expect(suggested()).toBe('Gym extras');
                expect(el('.plan-muscles__filler-fills')?.textContent?.trim()).toBe(
                    'Adds Forearms, Abs, Obliques and 7 more.'
                );
            });

            it('plans it as it is on the days chosen, with Undo, then suggests another', async () => {
                el('.plan-muscles__filler-add')!.click();
                fixture.detectChanges();
                const days = Array.from(
                    document.querySelectorAll<HTMLButtonElement>('.choice__choice')
                );
                // Each day, today marked, with what's on it already and the muscles those work
                const rows = days.map((day) => {
                    const name = day.querySelector('.choice__name')!;
                    const note = name.querySelector('.choice__note')!.textContent!.trim();
                    return [name.textContent!.replace(note, '').trim(), note];
                });
                const today = weekdayOf(Date.now());
                expect(rows[today][0]).toMatch(/\(today\)$/);
                expect(rows.map(([name]) => name.replace(' (today)', ''))).toEqual([
                    'Monday',
                    'Tuesday',
                    'Wednesday',
                    'Thursday',
                    'Friday',
                    'Saturday',
                    'Sunday',
                ]);
                expect(rows.map(([, note]) => note)).toEqual([
                    'Legs: Glutes, Quads',
                    'Nothing planned',
                    'Push: Chest',
                    'Nothing planned',
                    'Legs: Glutes, Quads',
                    'Nothing planned',
                    'Nothing planned',
                ]);
                // Several at once: Thursday and Saturday
                expect(days.map((day) => day.getAttribute('aria-pressed'))).toEqual(
                    Array(7).fill('false')
                );
                days[3].click();
                days[5].click();
                fixture.detectChanges();
                expect(days[3].getAttribute('aria-pressed')).toBe('true');
                expect(plan.plan().days[3]).toEqual([]);
                document.querySelector<HTMLButtonElement>('.choice__done')!.click();
                fixture.detectChanges();
                await fixture.whenStable();

                expect(plan.plan().days[3]).toEqual(['builtin:gym-extras']);
                expect(plan.plan().days[5]).toEqual(['builtin:gym-extras']);
                const undo = TestBed.inject(UndoService);
                expect(undo.offer()?.message).toBe('Gym extras planned on Thursday and Saturday');
                // Not copied: it's planned as it is
                expect(store.workouts().map((w) => w.title)).toEqual(['Legs', 'Push', 'Arms']);
                expect(suggested()).not.toBe('Gym extras');

                undo.undo();
                expect(plan.plan().days.flat()).not.toContain('builtin:gym-extras');
            });

            it('with Only what I have on, suggests only what your equipment allows', () => {
                TestBed.inject(SettingsStore).update({ onlyMyEquipment: true, myEquipment: [] });
                fixture.detectChanges();

                const workout = BUILT_IN_WORKOUTS.find((w) => w.title === suggested())!;
                expect(builtInWorkoutEquipment(workout)).toEqual(['none']);
            });
        });
    });
});
