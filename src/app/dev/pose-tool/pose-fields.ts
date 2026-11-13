import { HANDS_APART, MotionView, Pose, STANCE } from '../../models/exercise-motion';

/**
 * The numbers of a pose other than its limbs, for the posing tool's sliders: which field, and
 * which of its numbers if it holds several (the hips' x and y, a foot each).
 */
export interface PoseField {
    readonly key: Exclude<keyof Pose, 'arms' | 'legs'>;
    readonly index?: 0 | 1 | 2;
    readonly label: string;
    readonly min: number;
    readonly max: number;
    readonly step?: number;
    /** Can be left out; then the pose uses `fallback`. */
    readonly optional?: boolean;
    /** Only drawn from this view. */
    readonly view?: MotionView;
}

const ANGLE = { min: -180, max: 360 } as const;
const SHARE = { min: 0, max: 1, step: 0.05, optional: true } as const;

/** Where the hips are, the back and head, a shrug and the feet. */
export const BODY_FIELDS: readonly PoseField[] = [
    { key: 'hips', index: 0, label: 'Hips x', min: -150, max: 150 },
    { key: 'hips', index: 1, label: 'Hips y', min: -260, max: 0 },
    { key: 'torso', label: 'Torso', ...ANGLE },
    { key: 'head', label: 'Head', ...ANGLE, optional: true },
    { key: 'shrug', label: 'Shrug', min: 0, max: 20, optional: true },
    { key: 'feet', index: 0, label: 'Near foot', ...ANGLE, optional: true },
    { key: 'feet', index: 1, label: 'Far foot', ...ANGLE, optional: true },
];

/** What only the 3D figure shows. */
export const SOLID_FIELDS: readonly PoseField[] = [
    { key: 'twist', label: 'Twist', min: -90, max: 90, optional: true },
    { key: 'handsApart', label: 'Hands apart', min: 0, max: 120, optional: true, view: 'side' },
    { key: 'handsOut', index: 0, label: 'Near hand out', min: -40, max: 40, optional: true },
    { key: 'handsOut', index: 1, label: 'Far hand out', min: -40, max: 40, optional: true },
    { key: 'handsForward', index: 0, label: 'Near hand fwd', min: -40, max: 40, optional: true },
    { key: 'handsForward', index: 1, label: 'Far hand fwd', min: -40, max: 40, optional: true },
    { key: 'elbowsOut', label: 'Elbows out', ...SHARE },
    { key: 'elbowsDown', label: 'Elbows down', ...SHARE },
    { key: 'elbowsForward', label: 'Elbows fwd', ...SHARE },
    { key: 'kneesForward', label: 'Knees fwd', ...SHARE, view: 'front' },
    { key: 'stance', label: 'Stance', min: 0, max: 80, optional: true, view: 'side' },
    { key: 'palmsIn', label: 'Palms in', ...SHARE },
    { key: 'heldBy', label: 'Bell held by', ...SHARE },
    { key: 'bellAt', index: 0, label: 'Bell x', min: -150, max: 150, optional: true },
    { key: 'bellAt', index: 1, label: 'Bell y', min: -260, max: 0, optional: true },
    { key: 'bellAt', index: 2, label: 'Bell right', min: -60, max: 60, optional: true },
];

/** Which fields `handsOut` and `handsForward` belong to: each from one view only. */
const ONLY_FROM: Partial<Record<PoseField['key'], MotionView>> = {
    handsOut: 'side',
    handsForward: 'front',
};

/** Whether `field` means anything from `view`. */
export const shownFrom = (field: PoseField, view: MotionView) =>
    (field.view ?? ONLY_FROM[field.key] ?? view) === view;

/** What the pose uses for `field` when it's left out. */
export function fallbackOf(field: PoseField, pose: Pose, view: MotionView): number {
    switch (field.key) {
        case 'head':
            return pose.torso;
        case 'feet':
            return view === 'side' ? 90 : 0;
        case 'handsApart':
            return HANDS_APART;
        case 'stance':
            return STANCE;
        case 'bellAt':
            return [pose.hips[0], 0, 0][field.index ?? 0];
        default:
            return 0;
    }
}

/** The number `field` has in `pose`, or undefined if it's left out. */
export function valueOf(field: PoseField, pose: Pose): number | undefined {
    const value: unknown = pose[field.key];
    if (Array.isArray(value)) {
        return value[field.index ?? 0] as number;
    }
    return typeof value === 'number' ? value : undefined;
}

/**
 * `pose` with `field` set to `value`, or left out if undefined. A number of several is set
 * alone, the others kept (or their fallbacks, if new); hands forward by the same amount are one
 * number, as the motions write them.
 */
export function withField(
    pose: Pose,
    view: MotionView,
    field: PoseField,
    value: number | undefined
): Pose {
    if (value === undefined) {
        // The hips and torso are always given
        if (field.key === 'hips' || field.key === 'torso') {
            return pose;
        }
        const without: Record<string, unknown> = { ...pose };
        delete without[field.key];
        return without as unknown as Pose;
    }
    if (field.index === undefined) {
        return { ...pose, [field.key]: value };
    }
    const size = field.key === 'bellAt' ? 3 : 2;
    const numbers = Array.from({ length: size }, (_, i) => {
        const each = { ...field, index: i as 0 | 1 | 2 };
        return valueOf(each, pose) ?? fallbackOf(each, pose, view);
    });
    numbers[field.index] = value;
    const joined = field.key === 'handsForward' && numbers[0] === numbers[1] ? numbers[0] : numbers;
    return { ...pose, [field.key]: joined };
}
