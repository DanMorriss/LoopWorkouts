import { Pose } from '../../models/exercise-motion';
import {
    BODY_FIELDS,
    fallbackOf,
    shownFrom,
    SOLID_FIELDS,
    valueOf,
    withField,
} from './pose-fields';

const field = (label: string) => [...BODY_FIELDS, ...SOLID_FIELDS].find((f) => f.label === label)!;

const POSE: Pose = {
    hips: [0, -92],
    torso: 170,
    arms: [{ angles: [0, 0] }, { angles: [0, 0] }],
    legs: [{ angles: [0, 0] }, { angles: [0, 0] }],
};

describe('pose fields', () => {
    it('sets one of several numbers, keeping the rest', () => {
        const moved = withField(POSE, 'side', field('Hips y'), -50);
        expect(moved.hips).toEqual([0, -50]);
        expect(valueOf(field('Hips x'), moved)).toBe(0);
    });

    it("starts a new pair from what's used without it", () => {
        const pose = withField(POSE, 'side', field('Far foot'), 30);
        expect(pose.feet).toEqual([90, 30]);
        expect(withField(POSE, 'front', field('Near foot'), 10).feet).toEqual([10, 0]);
    });

    it('leaves out an optional number, but never the hips or torso', () => {
        const withHead = withField(POSE, 'side', field('Head'), 190);
        expect(withHead.head).toBe(190);

        const without = withField(withHead, 'side', field('Head'), undefined);
        expect('head' in without).toBe(false);
        expect(fallbackOf(field('Head'), without, 'side')).toBe(170);
        expect(withField(POSE, 'side', field('Torso'), undefined)).toBe(POSE);
    });

    it('writes hands forward by the same amount as one number', () => {
        const near = withField(POSE, 'front', field('Near hand fwd'), 12);
        expect(near.handsForward).toEqual([12, 0]);
        expect(withField(near, 'front', field('Far hand fwd'), 12).handsForward).toBe(12);
        expect(valueOf(field('Far hand fwd'), { ...POSE, handsForward: 12 })).toBe(12);
    });

    it('shows each 3D-only number from the view it means something from', () => {
        expect(shownFrom(field('Hands apart'), 'front')).toBe(false);
        expect(shownFrom(field('Near hand out'), 'side')).toBe(true);
        expect(shownFrom(field('Near hand fwd'), 'side')).toBe(false);
        expect(shownFrom(field('Twist'), 'front')).toBe(true);
    });
});
