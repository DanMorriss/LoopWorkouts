import { Injector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { setupChecks, setupErrors } from './setup-checks';
import { SetupRows } from './setup-rows';
import { WorkoutSetupModel } from './step-model';

describe("Create's checks", () => {
    const rows = new SetupRows('kg');

    function check(setup: WorkoutSetupModel) {
        const model = signal(setup);
        const injector = TestBed.inject(Injector);
        const tree = form(model, setupChecks('kg'), { injector });
        const errors = setupErrors(tree, model);
        return {
            valid: () => tree().valid(),
            shown: () =>
                [errors.noTime(), errors.noSetAmount(), errors.noTimeLimit()]
                    .filter((error) => error !== undefined)
                    .map((error) => error.kind),
        };
    }

    it("finds a new workout's empty step not enough, without saying so till it's filled in", () => {
        const empty = check(rows.empty());
        expect(empty.valid()).toBe(false);
        expect(empty.shown()).toEqual([]);

        const named = rows.empty();
        named.steps[0].name = 'Squats';
        expect(check(named).shown()).toEqual(['noTime']);
    });

    it('passes a step with reps, and finds a time limit of 00:00 too short', () => {
        const setup = rows.fromWorkout({
            id: 'w',
            updatedAt: 1,
            title: 'Squats',
            repeats: 1,
            blocks: [
                {
                    kind: 'group',
                    rounds: 1,
                    restSeconds: 0,
                    steps: [{ kind: 'reps', reps: 10, name: 'Squats' }],
                },
            ],
        });
        expect(check(setup).valid()).toBe(true);

        const noTime = check({ ...setup, repeatMode: 'time', limitMinutes: 0, limitSeconds: 0 });
        expect(noTime.valid()).toBe(false);
        expect(noTime.shown()).toEqual(['noTimeLimit']);
    });

    it('finds a set with nothing in it, on a step whose sets vary', () => {
        const setup = rows.fromWorkout({
            id: 'w',
            updatedAt: 1,
            title: 'Pyramid',
            repeats: 1,
            blocks: [
                {
                    kind: 'group',
                    rounds: 2,
                    restSeconds: 60,
                    steps: [
                        {
                            kind: 'reps',
                            reps: 10,
                            name: 'Squats',
                            sets: [{ reps: 10 }, { reps: 0 }],
                        },
                    ],
                },
            ],
        });
        expect(check(setup).shown()).toEqual(['noSetAmount']);
    });
});
