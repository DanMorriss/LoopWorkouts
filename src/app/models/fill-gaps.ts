import { Exercise, MuscleGroup } from './exercise';
import { joinAnd } from './text';
import { Workout } from './workout';
import { ALL_MUSCLES, musclesWorked } from './workout-muscles';

/** What adding a workout would do for the muscles your workouts leave out (LIB-7). */
export interface GapFill<W> {
    workout: W;
    /**
     * The muscles it would take off the lists, in the app's order: missed ones it works at all,
     * and lightly worked ones it works as a main muscle.
     */
    fills: MuscleGroup[];
}

/**
 * Of `candidates`, the workout that does most for the muscles your workouts leave out: a
 * missed muscle it works as a main one counts 3, as a supporting one 1 (it's then only
 * lightly worked); a lightly worked muscle it works as a main one counts 2. Highest wins, the
 * first of them on a tie, so the candidates' order breaks it. Null when none helps at all.
 */
export function workoutToFillGaps<W extends Pick<Workout, 'blocks'>>(
    candidates: readonly W[],
    missed: readonly MuscleGroup[],
    light: readonly MuscleGroup[],
    byId: (id: string) => Exercise | undefined
): GapFill<W> | null {
    let best: (GapFill<W> & { score: number }) | null = null;
    for (const workout of candidates) {
        const worked = musclesWorked([workout], byId);
        let score = 0;
        const fills = new Set<MuscleGroup>();
        for (const muscle of missed) {
            if (worked.main.includes(muscle)) {
                score += 3;
                fills.add(muscle);
            } else if (worked.supporting.includes(muscle)) {
                score += 1;
                fills.add(muscle);
            }
        }
        for (const muscle of light) {
            if (worked.main.includes(muscle)) {
                score += 2;
                fills.add(muscle);
            }
        }
        if (score > 0 && (best === null || score > best.score)) {
            best = { workout, fills: ALL_MUSCLES.filter((m) => fills.has(m)), score };
        }
    }
    return best && { workout: best.workout, fills: best.fills };
}

/** "Obliques", "Obliques and shins", "Obliques, shins and abs", or the first few "and 3 more". */
export function listMuscles(labels: readonly string[], most = 4): string {
    const named = labels.length > most ? labels.slice(0, most - 1) : [...labels];
    const more = labels.length - named.length;
    return joinAnd(more > 0 ? [...named, `${more} more`] : named);
}
