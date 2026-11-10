import { computed, inject, Injectable } from '@angular/core';
import { formatWeight, weightIn } from '../models/weight';
import {
    hasSets,
    RepStep,
    repStepsPerRound,
    runPlan,
    runsUntilStopped,
    sideName,
    stepKindName,
    StepKind,
    workoutSeconds,
} from '../models/workout';
import { formatSeconds } from '../shared/format-time';
import { ActiveRunService } from '../shared/run/active-run.service';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { StripStep } from './step-strip/step-strip.component';
import { placeAt, WorkoutState } from '../models/workout-state';
import { roundDots, secondSide, setDots, setOf, setText, startsSet } from './round-progress';

/** Each kind of step's icon by its name, so the kinds aren't told apart by colour alone. */
const KIND_ICONS: Record<StepKind, string> = {
    work: 'timer',
    rest: 'self_improvement',
    reps: 'fitness_center',
};

// The countdown of a timed step pops on each of its last this many seconds
const POP_SECONDS = 3;

/**

/**
 * What the workout page shows, worked out from the run in ActiveRunService: only reading it.
 * One for each workout page, shared with the parts of it.
 */
@Injectable()
export class WorkoutView {
    private readonly run = inject(ActiveRunService);
    private readonly workoutStore = inject(WorkoutStore);
    private readonly settings = inject(SettingsStore);
    private readonly exercises = inject(ExerciseStore);

    readonly workout = this.run.workout;
    /** The workout as it runs, with how it does exercises each side: what its plan is made of. */
    readonly running = this.run.running;
    /** Paused, as shown: not while the run's only held, for the tour of the page (RUN-13). */
    readonly isPaused = computed(() => this.run.isPaused() && !this.run.held());
    /** The summary is open over the page, so its keys are left to it. */
    readonly summaryOpen = this.run.summaryOpen;
    readonly state = this.run.state;
    readonly nextState = this.run.nextState;

    readonly isWorkActive = computed(() => this.state()?.phase === 'work');
    readonly isRestActive = computed(() => this.state()?.phase === 'rest');
    readonly isRepsActive = computed(() => this.state()?.phase === 'reps');
    readonly isComplete = computed(() => this.state()?.phase === 'complete');
    /** The rep step's count, e.g. 20, or 0 when it isn't a rep step. */
    readonly reps = computed(() => {
        const step = this.state()?.step;
        return step?.kind === 'reps' ? step.reps : 0;
    });
    /** The rep step's weight, e.g. "60 kg", or '' when there's none. */
    readonly weight = computed(() => {
        const step = this.state()?.step;
        return step?.kind === 'reps' ? this.weightText(step) : '';
    });

    readonly weightUnit = this.settings.weightUnit;

    /** The rep step's weight as its wheel shows it, or 0 for none. */
    readonly weightValue = computed(() => {
        const step = this.state()?.step;
        return step?.kind === 'reps' && step.weight ? weightIn(step.weight, this.weightUnit()) : 0;
    });
    /** The rep set being waited on, so Done swells once for each. */
    readonly currentSet = computed(() => {
        const state = this.state();
        return state?.phase === 'reps'
            ? `${this.workoutStore.activeRunStartedAt()}-${this.workoutStore.activeRepStepsDone()}`
            : null;
    });

    /** Rounds left, including the one in progress. */
    readonly repeats = computed(() => this.state()?.roundsLeft ?? 0);
    readonly untilStopped = computed(() => {
        const workout = this.workout();
        return workout !== null && runsUntilStopped(workout);
    });
    /** As many rounds as fit in a time limit, rather than a number of them. */
    readonly timeLimited = computed(() => this.workout()?.timeLimitSeconds !== undefined);
    /** Time left of the time limit, e.g. "12:34", or '' without one. */
    readonly timeLeft = computed(() => {
        const ms = this.run.timeLeftMs();
        if (ms === null) {
            return '';
        }
        const seconds = Math.ceil(ms / 1000);
        return formatSeconds(seconds);
    });
    /** The last 10 seconds of a time limit, as the countdown beeps. */
    readonly timeNearlyUp = computed(() => {
        const ms = this.run.timeLeftMs();
        return ms !== null && ms <= 10_000;
    });
    /**
     * Time left of the whole workout, e.g. "12:34", for a set number of rounds of timed steps
     * only: '' with a time limit (which has its own), until stopped, or with rep steps, which
     * take as long as they take.
     */
    readonly totalLeft = computed(() => {
        const workout = this.running();
        const elapsedMs = this.run.elapsedMs();
        if (
            !workout ||
            elapsedMs === null ||
            this.timeLimited() ||
            this.untilStopped() ||
            repStepsPerRound(workout) > 0
        ) {
            return '';
        }
        const seconds = Math.max(0, Math.ceil(workoutSeconds(workout) - elapsedMs / 1000));
        return formatSeconds(seconds);
    });
    /** The round in progress, counting from 1. */
    readonly roundNumber = computed(() => (this.state()?.round ?? 0) + 1);

    /**
     * The set in progress of an exercise with more than one, e.g. set 1 (from 0) of 3, or
     * null. The rest after a set is part of that set.
     */
    readonly groupSet = computed(() => {
        const state = this.state();
        const workout = this.running();
        return state && workout && state.phase !== 'complete'
            ? setOf(workout, state.stepIndex)
            : null;
    });

    /** In the rest that ends a set: done with it, so its last isn't "Last one!" any more. */
    private readonly restingAfterSet = computed(() => {
        const state = this.state();
        const workout = this.running();
        if (!state || !workout || state.phase !== 'rest') {
            return false;
        }
        const { places, sets } = runPlan(workout);
        const i = state.stepIndex;
        return places[i] === null && sets[i + 1] !== sets[i];
    });

    /**
     * Whether to say which step it is (the step strip, and to screen readers). Only for rounds
     * with more than one work or rep step: a plain work-and-rest workout doesn't need
     * "step 1 of 2". Nor does a workout with sets, whose round line says which set it's on.
     */
    readonly showStepCount = computed(() => {
        const workout = this.running();
        return (
            !!workout &&
            !hasSets(workout) &&
            runPlan(workout).steps.filter((step) => step.kind !== 'rest').length > 1
        );
    });
    /**
     * The step's name, or "Rest" or "Reps" for an unnamed one. Unnamed work shows just the
     * time.
     */
    readonly stepLabel = computed(() => {
        const step = this.state()?.step;
        return step?.name || (step && step.kind !== 'work' ? stepKindName(step.kind) : '');
    });
    /** "Left side" or "Right side" for a step done each side (BLD-10), or ''. */
    readonly sideLabel = computed(() => {
        const state = this.state();
        const workout = this.running();
        const side = state && workout ? placeAt(workout, state.stepIndex)?.side : undefined;
        return side ? sideName(side) : '';
    });
    /**
     * Whether the run has a section line (RUN-10): it has headings, or more than one exercise
     * to count. Kept for the whole run, so its room doesn't come and go.
     */
    readonly showSection = computed(() => {
        const workout = this.running();
        return (
            !!workout &&
            (runPlan(workout).exercises > 1 ||
                workout.blocks.some((block) => block.kind === 'heading'))
        );
    });
    /**
     * What the section line says: the heading of the part it's in, if there's one before it,
     * and which exercise it's on of how many, a superset counting as one, e.g. "Knee
     * rehabilitation · 2 of 7". Null once finished.
     */
    readonly section = computed(() => {
        const state = this.state();
        const workout = this.running();
        if (!state || !workout || state.phase === 'complete' || !this.showSection()) {
            return null;
        }
        const plan = runPlan(workout);
        const at = plan.sections[state.stepIndex];
        if (!at) {
            return null;
        }
        return {
            heading: at.heading,
            count: plan.exercises > 1 ? { exercise: at.exercise, of: plan.exercises } : null,
            starts: at.starts,
        };
    });
    /** Your note on the step's exercise (EXR-10), e.g. "Pause at the bottom", or ''. */
    readonly exerciseNote = computed(() => {
        const step = this.state()?.step;
        return step?.exerciseId ? (this.exercises.noteFor(step.exerciseId) ?? '') : '';
    });
    /** The step's exercise, for its details from the (i) beside its name (RUN-9). */
    readonly stepExercise = computed(() => {
        const id = this.state()?.step?.exerciseId;
        return id ? this.exercises.byId(id) : undefined;
    });
    /** During a rest, the exercise after it, for its details and Swap from the face (RUN-11). */
    readonly nextExercise = computed(() => {
        const id = this.state()?.phase === 'rest' ? this.nextState()?.step?.exerciseId : undefined;
        return id ? this.exercises.byId(id) : undefined;
    });

    /**
     * What's over the greyed ring while paused: the step's name, with its exercise's (i); or,
     * in a rest before an exercise, "Rest, then Back squat" with that one's, so it can be
     * looked at and swapped while paused too (RUN-11). Null for no name.
     */
    readonly pausedName = computed(() => {
        const text = this.stepLabel();
        if (!text) {
            return null;
        }
        const own = this.stepExercise();
        if (own) {
            return { text, exercise: own, next: false };
        }
        const next = this.nextExercise();
        // As the step's named, as "then …" on the face has it
        const name = this.nextState()?.step?.name || next?.name;
        return next
            ? { text: `${text}, then ${name}`, exercise: next, next: true }
            : { text, exercise: undefined, next: false };
    });

    /** e.g. "Plank · 00:45", "Squats · 10 reps @ 60 kg", or "finish" when the workout ends after this step. */
    readonly upNext = computed(() => {
        const next = this.nextState();
        if (!next) {
            return '';
        }
        if (!next.step) {
            return 'finish';
        }
        const step = next.step;
        const workout = this.running();
        // Which set, as one starts: a superset's other steps are in the round already said
        const set =
            step.kind !== 'rest' && workout && startsSet(workout, next.stepIndex)
                ? setOf(workout, next.stepIndex)
                : null;
        // A step's second side is the same exercise again, so it's only the side
        const side = workout && secondSide(workout, next.stepIndex);
        const name = side
            ? sideName(side)
            : `${step.name || stepKindName(step.kind)}${set ? ` · ${setText(set)}` : ''}`;
        if (step.kind === 'reps') {
            const weight = this.weightText(step);
            return `${name} · ${step.reps} reps${weight ? ` @ ${weight}` : ''}`;
        }
        return `${name} · ${formatSeconds(step.seconds)}`;
    });

    /**
     * A timed step is nearly over, so "Next:" pulses to get ready: its last 5 seconds, or
     * its last 3 for a step under 15 seconds. Not on a rep step (Done is the cue) or paused.
     */
    readonly nextSoon = computed(() => {
        const state = this.state();
        if (!state || this.isPaused() || (state.phase !== 'work' && state.phase !== 'rest')) {
            return false;
        }
        return state.remainingSeconds <= (state.phaseSeconds < 15 ? 3 : 5);
    });
    /** What comes next, for the colour of the "Next:" pulse: a step's kind, or finish. */
    readonly nextKind = computed(() => this.nextState()?.step?.kind ?? 'finish');

    // The face's text is keyed by step, so a new step's text slides in as the last one's
    // slides out; a new round slides right to left, with the round line, rather than up.
    // Each is a snapshot of what it shows, so the text sliding out keeps its last values
    // rather than showing the new step's.
    /** Which step is showing, so each gets its own text on the face: 'complete' at the end. */
    readonly stepKey = computed(() => {
        const state = this.state();
        return !state || state.phase === 'complete' ? 'complete' : this.keyOf(state);
    });
    keyOf(state: Pick<WorkoutState, 'round' | 'stepIndex'>) {
        return `${this.workoutStore.activeRunStartedAt()}-${state.round}-${state.stepIndex}`;
    }
    readonly faceSlides = computed(() => {
        const state = this.state();
        const step = state?.step;
        return [
            {
                key: this.stepKey(),
                complete: !step,
                icon: step ? KIND_ICONS[step.kind] : '',
                label: this.stepLabel(),
                side: this.sideLabel(),
                exercise: this.stepExercise(),
                reps: this.isRepsActive() ? this.reps() : null,
                weight: this.weight(),
                weightValue: this.weightValue(),
                time: this.time(),
                // A timed step's last seconds: each one pops, to hurry the last effort along
                pop:
                    state?.phase === 'work' &&
                    state.phaseSeconds > POP_SECONDS &&
                    state.remainingSeconds <= POP_SECONDS,
                // Rest is for getting ready, so it shows what's coming on the face itself
                then: state?.phase === 'rest' && this.nextState()?.step ? this.upNext() : '',
                nextExercise: this.nextExercise(),
            },
        ];
    });
    readonly roundSlides = computed(() => {
        const set = this.groupSet();
        // Keyed by set too, so each new set's line turns in as a new round's does
        const setKey = set ? `-${this.setStartIndex()}` : '';
        return [
            {
                key: `${this.workoutStore.activeRunStartedAt()}-${this.roundNumber()}${setKey}`,
                round: this.roundNumber(),
                set,
                untilStopped: this.untilStopped(),
                timeLimited: this.timeLimited(),
                timeLeft: this.timeLeft(),
                timeNearlyUp: this.timeNearlyUp(),
                totalRounds: this.totalRounds(),
                totalLeft: this.totalLeft(),
                last: set
                    ? set.set === set.of - 1 && !this.restingAfterSet()
                    : this.repeats() === 1,
                dots: set ? setDots(set) : this.totalRounds() > 1 ? this.roundDots() : [],
                strip: this.stepStrip(),
            },
        ];
    });
    /** The step in progress began a new round, or a new set, so it slides in sideways. */
    readonly newRound = computed(() => {
        const state = this.state();
        const workout = this.running();
        if (!state || !workout || state.phase === 'complete') {
            return false;
        }
        if (state.stepIndex === 0) {
            return state.round > 0;
        }
        // The first step of a set after the first, after the rest that ends the one before
        const { sets } = runPlan(workout);
        const i = state.stepIndex;
        return sets[i].set > 0 && sets[i - 1] !== sets[i];
    });

    /** Where the set in progress begins in the round, which tells one set from the next. */
    private readonly setStartIndex = computed(() => {
        const state = this.state();
        const workout = this.running();
        if (!state || !workout) {
            return 0;
        }
        const { sets } = runPlan(workout);
        return sets.indexOf(sets[state.stepIndex]);
    });

    /**
     * The round's steps as a strip in their kinds' colours: done, the one in progress, and
     * those to go. Only where there's more than one work or rep step, and not once finished.
     * In a workout with sets, a superset's round (BLD-12), with the rest after it.
     */
    readonly stepStrip = computed((): StripStep[] => {
        const state = this.state();
        const workout = this.running();
        if (!workout || !state || state.phase === 'complete') {
            return [];
        }
        const plan = runPlan(workout);
        const set = plan.sets[state.stepIndex];
        const shown = this.showStepCount()
            ? plan.steps.map((_, i) => i)
            : set && set.group !== 'exercise'
              ? plan.sets.flatMap((other, i) => (other === set ? [i] : []))
              : [];
        return shown.map((i) => ({
            kind: plan.steps[i].kind,
            state: i === state.stepIndex ? 'current' : i < state.stepIndex ? 'done' : 'left',
        }));
    });

    private readonly remaining = computed(() => this.state()?.remainingSeconds ?? 0);
    private readonly time = computed(() => formatSeconds(this.remaining()));

    /** How many rounds the workout runs for (0 when it runs until stopped or to a time limit). */
    readonly totalRounds = computed(() =>
        this.untilStopped() ? 0 : (this.workout()?.repeats ?? 0)
    );

    /** One dot per round, for workouts short enough for a row of them to fit on a phone. */
    readonly roundDots = computed(() => roundDots(this.totalRounds(), this.roundNumber() - 1));

    // The ring sweep is a CSS animation that runs for the whole step, so the browser can
    // animate it without repainting. This only changes when a new step starts, which
    // recreates the ring element and restarts the animation from the right point.
    private readonly ringSweep = computed(
        () => {
            const state = this.state();
            // A rep step has no countdown, so its ring is full and still
            if (!state || state.phase === 'complete' || state.phase === 'reps') {
                return null;
            }
            const halfMs = (state.phaseSeconds * 1000) / 2;
            return {
                key: `${this.workoutStore.activeWorkoutStartedAt()}-${state.round}-${state.stepIndex}`,
                halfDuration: `${halfMs}ms`,
                // Negative delays start part-way through, e.g. when resuming after a refresh
                firstHalfDelay: `${-state.phaseElapsedMs}ms`,
                secondHalfDelay: `${halfMs - state.phaseElapsedMs}ms`,
            };
        },
        { equal: (a, b) => a?.key === b?.key }
    );

    /** What the ring shows: null once the workout's finished. */
    readonly ringPhase = computed(() => {
        const phase = this.state()?.phase;
        return phase === 'complete' || phase === undefined ? null : phase;
    });

    readonly ringSweeps = computed(() => {
        const sweep = this.ringSweep();
        return sweep ? [sweep] : [];
    });

    readonly progress = computed(() => {
        const state = this.state();
        if (!state) {
            return 0;
        }
        if (state.phase === 'complete') {
            return 1;
        }
        // Nothing to measure while it waits for Done
        if (state.phase === 'reps') {
            return 0;
        }
        return 1 - state.remainingSeconds / state.phaseSeconds;
    });

    readonly progressPercent = computed(() => Math.round(this.progress() * 100));

    /**
     * What screen readers announce. It only changes when a step starts, so the live region
     * speaks at the start of each step and at the end, not every second. With several
     * steps it says which one, so back-to-back steps of the same kind are each announced.
     */
    readonly announcement = computed(() => {
        const state = this.state();
        const workout = this.running();
        if (!state || !workout) {
            return '';
        }
        if (this.isPaused() && state.phase !== 'complete') {
            return 'Paused';
        }
        if (!state.step) {
            return 'Finished';
        }
        const parts: string[] = [];
        // Which part of the workout, as each exercise starts
        const section = this.section();
        if (section?.starts && (section.heading || section.count)) {
            const count = section.count
                ? `exercise ${section.count.exercise} of ${section.count.of}`
                : '';
            parts.push([section.heading, count].filter(Boolean).join(', '));
        }
        parts.push(state.step.name || stepKindName(state.step.kind));
        if (this.sideLabel()) {
            parts.push(this.sideLabel().toLowerCase());
        }
        if (state.step.kind === 'reps') {
            const weight = this.weightText(state.step);
            parts.push(`${state.step.reps} reps${weight ? ` at ${weight}` : ''}`);
        }
        if (this.exerciseNote()) {
            parts.push(`your note: ${this.exerciseNote()}`);
        }
        if (this.showStepCount()) {
            parts.push(`step ${state.stepIndex + 1} of ${runPlan(workout).steps.length}`);
        }
        const set = this.groupSet();
        if (set && state.step.kind !== 'rest') {
            const last = set.group === 'exercise' ? 'last set' : `${set.group}, last round`;
            parts.push(set.set === set.of - 1 ? last : setText(set));
        }
        // The round is given as each round starts
        if (state.stepIndex === 0) {
            if (this.timeLimited()) {
                parts.push(`round ${state.round + 1}, ${this.timeLeft()} left`);
            } else if (this.untilStopped()) {
                parts.push(`round ${state.round + 1}`);
            } else if (state.roundsLeft === 1 && workout.repeats > 1) {
                parts.push('last round');
            } else {
                parts.push(`round ${state.round + 1} of ${workout.repeats}`);
            }
        }
        return parts.join(', ');
    });

    /** A rep step's weight in the unit chosen in settings, e.g. "60 kg", or '' for none. */
    private weightText(step: RepStep): string {
        return step.weight ? formatWeight(step.weight, this.settings.weightUnit()) : '';
    }

    /** What was left when paused, e.g. "00:23" or "20 reps". */
    readonly pausedOn = computed(() => (this.isRepsActive() ? `${this.reps()} reps` : this.time()));
}

export type FaceSlide = ReturnType<WorkoutView['faceSlides']>[number];
export type RoundSlide = ReturnType<WorkoutView['roundSlides']>[number];
