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

    it("rounds and dips the back by a pose's arch, its ends staying where they are", () => {
        const catCow = BUILT_IN_EXERCISE_MOTION['builtin:cat-cow']!;
        const figure = new FigureScene(catCow, 'male');
        const shared = sharedBody('male');
        const torso = [...geometries(figure)].find(
            (part) =>
                part !== shared.torso &&
                part.getAttribute('position').count === shared.torso.getAttribute('position').count
        )!;
        const canvas = document.createElement('canvas');
        Object.assign(canvas, { width: 60, height: 60 });
        const shaped = (arch: number) => {
            expect(figure.draw({ ...catCow.frames[0].pose, arch }, 0, canvas)).toBe(true);
            return Array.from(torso.getAttribute('position').array);
        };
        const flat = shaped(0);
        const rounded = shaped(7);
        // Front to back is x, up the back y, in the torso's own frame
        const moved = flat.map((_, i) => (i % 3 === 0 ? rounded[i] - flat[i] : 0));
        const ys = flat.filter((_, i) => i % 3 === 1);
        const [low, high] = [Math.min(...ys), Math.max(...ys)];

        // Its middle moves back, away from the chest, by the arch
        expect(Math.min(...moved)).toBeCloseTo(-7, 0);
        expect(Math.max(...moved)).toBeLessThanOrEqual(1e-6);
        // Its bottom (the seat) and top (the neck) stay put
        const atEnds = moved.filter((_, i) => {
            const y = flat[i + 1];
            return i % 3 === 0 && (y < low + 2 || y > high - 2);
        });
        expect(atEnds.every((change) => Math.abs(change) < 1e-6)).toBe(true);
        figure.dispose();
    });
});
