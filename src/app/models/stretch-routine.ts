import { isStretch, STRETCH_ROUTINE_ID } from './built-in-stretches';
import { Exercise, MuscleGroup } from './exercise';
import { LoggedSet } from './history';
import { ALL_MUSCLES } from './workout-muscles';
import { Block, Workout } from './workout';

/** Where a stretch is done: standing ones come first, so you get down to the floor once. */
type StretchPlace = 'standing' | 'floor';

/**
 * The stretches a routine after a workout is made from: the built-in ones held for a time, at
 * least one for each muscle group (a test checks), with where each is done and whether it's
 * done each side. In the order they're preferred on a tie.
 */
export const ROUTINE_STRETCHES: Readonly<
    Record<string, { readonly place: StretchPlace; readonly eachSide: boolean }>
> = {
    'builtin:doorway-chest-stretch': { place: 'standing', eachSide: true },
    'builtin:cross-body-shoulder-stretch': { place: 'standing', eachSide: true },
    'builtin:standing-biceps-stretch': { place: 'standing', eachSide: false },
    'builtin:overhead-triceps-stretch': { place: 'standing', eachSide: true },
    'builtin:wrist-flexor-stretch': { place: 'standing', eachSide: true },
    'builtin:standing-side-stretch': { place: 'standing', eachSide: true },
    'builtin:upper-trap-stretch': { place: 'standing', eachSide: true },
    'builtin:standing-quad-stretch': { place: 'standing', eachSide: true },
    'builtin:standing-it-band-stretch': { place: 'standing', eachSide: true },
    'builtin:seated-hamstring-stretch': { place: 'floor', eachSide: false },
    'builtin:downward-dog': { place: 'floor', eachSide: false },
    'builtin:pigeon-stretch': { place: 'floor', eachSide: true },
    'builtin:kneeling-hip-flexor-stretch': { place: 'floor', eachSide: true },
    'builtin:butterfly-stretch': { place: 'floor', eachSide: false },
    'builtin:cobra-stretch': { place: 'floor', eachSide: false },
    'builtin:cat-cow': { place: 'floor', eachSide: false },
    'builtin:childs-pose': { place: 'floor', eachSide: false },
};

/** The most stretches a routine has, so it's a few minutes, not another workout. */
export const MAX_ROUTINE_STRETCHES = 5;
/** How long each stretch is held, each side for one done each side. */
export const ROUTINE_HOLD_SECONDS = 30;

export const STRETCH_ROUTINE_TITLE = 'Cool-down stretch';

/** How much a set counts for a muscle it supports, against 1 for one it mainly works. */
const SUPPORTING_WEIGHT = 0.25;

/**
 * How hard some sets worked each muscle: a point for each set it mainly works, a little for
 * each it supports. Stretches, unnamed sets and ones whose exercise has gone count nothing.
 */
function muscleLoad(
    sets: readonly LoggedSet[],
    byId: (id: string) => Exercise | undefined
): Map<MuscleGroup, number> {
    const load = new Map<MuscleGroup, number>();
    const add = (muscle: MuscleGroup, amount: number) =>
        load.set(muscle, (load.get(muscle) ?? 0) + amount);
    for (const set of sets) {
        const exercise = set.exerciseId && !isStretch(set.exerciseId) && byId(set.exerciseId);
        if (exercise) {
            exercise.mainMuscles.forEach((muscle) => add(muscle, 1));
            exercise.supportingMuscles.forEach((muscle) => add(muscle, SUPPORTING_WEIGHT));
        }
    }
    return load;
}

/**
 * The stretches for the muscles some sets worked hardest (a workout's, on its summary): for
 * each of its main muscles, most worked first, the stretch for it that also eases most of
 * the rest it worked, until each is stretched or there are MAX_ROUTINE_STRETCHES. In the
 * order they're done: standing, then on the floor, most worked first in each. Empty when no
 * set mainly worked a muscle.
 */
export function routineStretches(
    sets: readonly LoggedSet[],
    byId: (id: string) => Exercise | undefined
): Exercise[] {
    const load = muscleLoad(sets, byId);
    const loadOf = (muscle: MuscleGroup) => load.get(muscle) ?? 0;
    const stretches = Object.keys(ROUTINE_STRETCHES)
        .map((id) => byId(id))
        .filter((stretch) => stretch !== undefined);
    // Mainly worked by some set, not only supported; most first, then in the app's order
    const toStretch = ALL_MUSCLES.filter((muscle) => loadOf(muscle) >= 1).sort(
        (a, b) => loadOf(b) - loadOf(a)
    );
    const eases = (stretch: Exercise) =>
        stretch.mainMuscles.reduce((sum, muscle) => sum + loadOf(muscle), 0) +
        stretch.supportingMuscles.reduce((sum, muscle) => sum + loadOf(muscle), 0) *
            SUPPORTING_WEIGHT;

    const picked: Exercise[] = [];
    for (const muscle of toStretch) {
        if (picked.length === MAX_ROUTINE_STRETCHES) {
            break;
        }
        if (picked.some((stretch) => stretch.mainMuscles.includes(muscle))) {
            continue;
        }
        const best = stretches
            .filter((stretch) => stretch.mainMuscles.includes(muscle) && !picked.includes(stretch))
            // Stable, so a tie keeps ROUTINE_STRETCHES's order
            .sort((a, b) => eases(b) - eases(a))[0];
        if (best) {
            picked.push(best);
        }
    }
    const placeOf = (stretch: Exercise) => ROUTINE_STRETCHES[stretch.id]?.place;
    return [
        ...picked.filter((stretch) => placeOf(stretch) === 'standing'),
        ...picked.filter((stretch) => placeOf(stretch) === 'floor'),
    ];
}

/**
 * The stretches as a workout to run, each held ROUTINE_HOLD_SECONDS (each side, for one done
 * each side), under Standing and On the floor where it has both. Running straight on, as
 * there's no rest to wait after. Null for no stretches.
 */
export function stretchRoutine(stretches: readonly Exercise[]): Workout | null {
    if (stretches.length === 0) {
        return null;
    }
    const blocks: Block[] = [];
    const places = new Set(stretches.map((stretch) => ROUTINE_STRETCHES[stretch.id]?.place));
    let place: StretchPlace | undefined;
    for (const stretch of stretches) {
        const { place: here, eachSide } = ROUTINE_STRETCHES[stretch.id] ?? {
            place: 'floor',
            eachSide: false,
        };
        if (places.size > 1 && here !== place) {
            blocks.push({
                kind: 'heading',
                text: here === 'standing' ? 'Standing' : 'On the floor',
            });
        }
        place = here;
        blocks.push({
            kind: 'group',
            rounds: 1,
            restSeconds: 0,
            steps: [
                {
                    kind: 'work',
                    seconds: ROUTINE_HOLD_SECONDS,
                    name: stretch.name,
                    exerciseId: stretch.id,
                    ...(eachSide ? { eachSide: true as const } : {}),
                },
            ],
        });
    }
    return {
        id: STRETCH_ROUTINE_ID,
        updatedAt: 0,
        title: STRETCH_ROUTINE_TITLE,
        blocks,
        repeats: 1,
        carryOn: true,
    };
}
