/**
 * The built-in stretches (batch 10 on): easing a muscle, not training it, so one isn't a set
 * for that muscle on Progress, nor offered in Swap for one that trains it. Their movement in
 * BUILT_IN_MOVEMENTS is `'stretch'`, which its test checks against this list. A list of its
 * own, as Today needs it and the movements aren't in the first download.
 */
const BUILT_IN_STRETCHES: ReadonlySet<string> = new Set([
    'builtin:downward-dog',
    'builtin:childs-pose',
    'builtin:cat-cow',
    'builtin:cobra-stretch',
    'builtin:kneeling-hip-flexor-stretch',
    'builtin:standing-quad-stretch',
    'builtin:seated-hamstring-stretch',
    'builtin:pigeon-stretch',
    'builtin:worlds-greatest-stretch',
    'builtin:thread-the-needle',
]);

/** Whether an exercise is a built-in stretch. */
export function isStretch(exerciseId: string | undefined): boolean {
    return exerciseId !== undefined && BUILT_IN_STRETCHES.has(exerciseId);
}
