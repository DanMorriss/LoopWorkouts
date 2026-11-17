import { TestBed } from '@angular/core/testing';
import { RepStep } from '../../models/workout';
import { ReadyMadeChanges } from './ready-made-changes.service';

describe('ReadyMadeChanges', () => {
    const swing: RepStep = {
        kind: 'reps',
        reps: 10,
        name: 'Kettlebell swing',
        exerciseId: 'builtin:kettlebell-swing',
    };
    const ladder = {
        blocks: [{ kind: 'group' as const, rounds: 7, restSeconds: 45, steps: [swing] }],
    };
    const id = 'builtin:kettlebell-swing-ladder';
    let changes: ReadyMadeChanges;

    beforeEach(() => {
        localStorage.clear();
        changes = TestBed.inject(ReadyMadeChanges);
    });
    afterEach(() => localStorage.clear());

    it('keeps a rest (PRG-15) through a change of reps, and drops it put back', () => {
        changes.setRest(id, 0, ladder, 40);
        expect(changes.byId().get(id)?.rests).toEqual([
            { step: 0, exerciseId: 'builtin:kettlebell-swing', seconds: 40 },
        ]);

        changes.setStep(id, 0, swing, { ...swing, reps: 12 });
        expect(changes.byId().get(id)?.rests).toHaveLength(1);
        changes.setStep(id, 0, swing, swing);
        expect(changes.byId().get(id)?.steps).toEqual([]);
        expect(changes.byId().get(id)?.rests).toHaveLength(1);

        // Back as it came: nothing's left, so the record goes
        changes.setRest(id, 0, ladder, 45);
        expect(changes.byId().has(id)).toBe(false);
    });

    it('keeps nothing for a step with no rest of its own', () => {
        changes.setRest(id, 0, { blocks: [{ ...ladder.blocks[0], rounds: 1 }] }, 40);
        expect(changes.byId().has(id)).toBe(false);
    });
});
