/**
 * The way a body moves in an exercise, whatever it's done with: a back squat and a goblet
 * squat are both squats. Swap ranks by it (RUN-11, BLD-14), as muscles alone are rough: a
 * front squat and a burpee both work the quads, but only one of them is a squat.
 */
export type Movement =
    | 'squat'
    /** One leg at a time, the knee bending: lunges, split squats, step-ups. */
    | 'lunge'
    | 'hinge'
    /** Lying, the hips pushed up: hip thrust, glute bridge. */
    | 'bridge'
    | 'horizontal push'
    | 'vertical push'
    | 'dip'
    | 'horizontal pull'
    | 'vertical pull'
    | 'chest fly'
    | 'lateral raise'
    /** The arms pulled out and back, for the rear shoulders. */
    | 'rear delt'
    | 'curl'
    | 'triceps extension'
    | 'shrug'
    | 'leg extension'
    | 'leg curl'
    | 'calf raise'
    | 'hip abduction'
    | 'hip adduction'
    /** Holding the trunk still against being pulled out of line: planks, dead bugs. */
    | 'core brace'
    | 'side brace'
    /** The trunk or legs curled in: crunches, leg raises. */
    | 'core curl'
    | 'core twist'
    /** A weight circled round the head or body. */
    | 'circle'
    | 'hang'
    | 'carry'
    | 'jump'
    /** Up and down on the spot, for the heart and lungs. */
    | 'cardio'
    /** Several movements in one: from the floor to overhead, or a squat into a press. */
    | 'whole body'
    /**
     * Easing a muscle into a stretch, held or flowing: child's pose, cat-cow. Swap only offers
     * a stretch for a stretch.
     */
    | 'stretch';

/**
 * Each built-in exercise's movement, by id. Kept apart, as their words are, so they aren't in
 * the first download: only Swap needs them.
 */
export const BUILT_IN_MOVEMENTS: Readonly<Record<string, Movement>> = {
    'builtin:back-squat': 'squat',
    'builtin:deadlift': 'hinge',
    'builtin:bench-press': 'horizontal push',
    'builtin:overhead-press': 'vertical push',
    'builtin:barbell-row': 'horizontal pull',
    'builtin:pull-up': 'vertical pull',
    'builtin:push-up': 'horizontal push',
    'builtin:romanian-deadlift': 'hinge',
    'builtin:dumbbell-lunge': 'lunge',
    'builtin:plank': 'core brace',
    'builtin:front-squat': 'squat',
    'builtin:goblet-squat': 'squat',
    'builtin:incline-dumbbell-press': 'horizontal push',
    'builtin:dumbbell-shoulder-press': 'vertical push',
    'builtin:lat-pulldown': 'vertical pull',
    'builtin:seated-cable-row': 'horizontal pull',
    'builtin:dumbbell-curl': 'curl',
    'builtin:triceps-pushdown': 'triceps extension',
    'builtin:hip-thrust': 'bridge',
    'builtin:kettlebell-swing': 'hinge',
    'builtin:leg-press': 'squat',
    'builtin:leg-curl': 'leg curl',
    'builtin:leg-extension': 'leg extension',
    'builtin:calf-raise': 'calf raise',
    'builtin:dumbbell-row': 'horizontal pull',
    'builtin:chin-up': 'vertical pull',
    'builtin:dip': 'dip',
    'builtin:lateral-raise': 'lateral raise',
    'builtin:face-pull': 'rear delt',
    'builtin:hanging-leg-raise': 'core curl',
    'builtin:side-plank': 'side brace',
    'builtin:dead-bug': 'core brace',
    'builtin:russian-twist': 'core twist',
    'builtin:farmers-carry': 'carry',
    'builtin:sumo-deadlift': 'hinge',
    'builtin:bulgarian-split-squat': 'lunge',
    'builtin:step-up': 'lunge',
    'builtin:hammer-curl': 'curl',
    'builtin:skull-crusher': 'triceps extension',
    'builtin:glute-bridge': 'bridge',
    'builtin:dumbbell-bench-press': 'horizontal push',
    'builtin:incline-bench-press': 'horizontal push',
    'builtin:close-grip-bench-press': 'horizontal push',
    'builtin:dumbbell-fly': 'chest fly',
    'builtin:cable-crossover': 'chest fly',
    'builtin:arnold-press': 'vertical push',
    'builtin:rear-delt-fly': 'rear delt',
    'builtin:shrug': 'shrug',
    'builtin:preacher-curl': 'curl',
    'builtin:overhead-triceps-extension': 'triceps extension',
    'builtin:hack-squat': 'squat',
    'builtin:walking-lunge': 'lunge',
    'builtin:reverse-lunge': 'lunge',
    'builtin:single-leg-romanian-deadlift': 'hinge',
    'builtin:good-morning': 'hinge',
    'builtin:back-extension': 'hinge',
    'builtin:nordic-curl': 'leg curl',
    'builtin:seated-calf-raise': 'calf raise',
    'builtin:hip-abduction': 'hip abduction',
    'builtin:hip-adduction': 'hip adduction',
    'builtin:inverted-row': 'horizontal pull',
    'builtin:t-bar-row': 'horizontal pull',
    'builtin:straight-arm-pulldown': 'vertical pull',
    'builtin:rack-pull': 'hinge',
    'builtin:band-pull-apart': 'rear delt',
    'builtin:cable-curl': 'curl',
    'builtin:bench-dip': 'dip',
    'builtin:diamond-push-up': 'horizontal push',
    'builtin:pike-push-up': 'vertical push',
    'builtin:dead-hang': 'hang',
    'builtin:burpee': 'cardio',
    'builtin:mountain-climber': 'cardio',
    'builtin:jumping-jack': 'cardio',
    'builtin:jump-squat': 'jump',
    'builtin:box-jump': 'jump',
    'builtin:bodyweight-squat': 'squat',
    'builtin:wall-sit': 'squat',
    'builtin:crunch': 'core curl',
    'builtin:bicycle-crunch': 'core twist',
    'builtin:ab-wheel-rollout': 'core brace',
    'builtin:kettlebell-thruster': 'whole body',
    'builtin:kettlebell-clean-and-press': 'whole body',
    'builtin:kettlebell-snatch': 'whole body',
    'builtin:kettlebell-pistol-squat': 'squat',
    'builtin:kettlebell-floor-press': 'horizontal push',
    'builtin:turkish-get-up': 'whole body',
    'builtin:kettlebell-sumo-high-pull': 'whole body',
    'builtin:chainsaw-row': 'horizontal pull',
    'builtin:kettlebell-reverse-crunch': 'core curl',
    'builtin:plank-pull-through': 'core brace',
    'builtin:half-kneeling-kettlebell-press': 'vertical push',
    'builtin:kettlebell-halo': 'circle',
    'builtin:kettlebell-around-the-world': 'circle',
    'builtin:kettlebell-push-up': 'horizontal push',
    'builtin:kettlebell-lunge': 'lunge',
    'builtin:kettlebell-curl': 'curl',
    'builtin:kettlebell-press': 'vertical push',
    'builtin:downward-dog': 'stretch',
    'builtin:childs-pose': 'stretch',
    'builtin:cat-cow': 'stretch',
    'builtin:cobra-stretch': 'stretch',
    'builtin:kneeling-hip-flexor-stretch': 'stretch',
    'builtin:standing-quad-stretch': 'stretch',
    'builtin:seated-hamstring-stretch': 'stretch',
    'builtin:pigeon-stretch': 'stretch',
    'builtin:worlds-greatest-stretch': 'stretch',
    'builtin:thread-the-needle': 'stretch',
};
