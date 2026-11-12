import { isStretch } from './built-in-stretches';
import { allSteps, Workout } from './workout';

/**
 * Whether a workout is active rest: stretches and nothing else, such as the ready-made plans'
 * mobility days (Mobility flow, Full-body stretch), or one of your own. It trains nothing, so
 * it's there if you fancy it: offered on Today rather than due, never missed, and not counted
 * in a plan's days a week or the week's tally.
 */
export function isActiveRest(workout: Pick<Workout, 'blocks'>): boolean {
    const steps = allSteps(workout).filter((step) => step.kind !== 'rest');
    return steps.length > 0 && steps.every((step) => isStretch(step.exerciseId));
}
