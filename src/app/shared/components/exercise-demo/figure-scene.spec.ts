import { BufferGeometry, Mesh } from 'three';
import { BUILT_IN_EXERCISE_MOTION } from '../../../models/built-in-exercise-motion';
import { sharedBody } from './figure-body';
import { FigureScene } from './figure-scene';

describe('FigureScene', () => {
    const geometries = (figure: FigureScene) => {
        const found = new Set<BufferGeometry>();
        figure.scene.traverse((object) => {
            if (object instanceof Mesh) {
                found.add(object.geometry);
            }
        });
        return found;
    };

    it("shares the built body between exercises' figures, each with a torso of its own", () => {
        const pushUp = new FigureScene(BUILT_IN_EXERCISE_MOTION['builtin:push-up']!, 'male');
        const squat = new FigureScene(BUILT_IN_EXERCISE_MOTION['builtin:back-squat']!, 'male');
        const body = sharedBody('male');
        const shared = [body.neck, body.head, ...body.upperArms, ...body.feet];

        for (const figure of [pushUp, squat]) {
            const parts = geometries(figure);
            expect(shared.every((part) => parts.has(part))).toBe(true);
            // The torso's reshaped for each pose, so it's a copy, leaving the shared one as built
            expect(parts.has(body.torso)).toBe(false);
        }

        // Disposing of one exercise's figure keeps the shared parts for the next
        const disposed: BufferGeometry[] = [];
        for (const part of [...geometries(pushUp), body.torso]) {
            part.addEventListener('dispose', () => disposed.push(part));
        }
        pushUp.dispose();
        expect(shared.some((part) => disposed.includes(part))).toBe(false);
        expect(disposed).not.toContain(body.torso);
        expect(disposed.length).toBeGreaterThan(0);
        squat.dispose();
    });
});
