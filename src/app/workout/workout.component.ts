import {
    afterNextRender,
    AnimationCallbackEvent,
    Component,
    DOCUMENT,
    computed,
    effect,
    ElementRef,
    inject,
    Injector,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
    allSteps,
    GroupSet,
    hasSets,
    MAX_REPS,
    RepStep,
    repStepsPerRound,
    runPlan,
    runsUntilStopped,
    Side,
    sideName,
    Step,
    StepKind,
    Workout,
    workoutSeconds,
} from '../models/workout';
import {
    formatWeight,
    WEIGHT_INCREASE,
    weightIn,
    weightOptions,
    weightToKg,
} from '../models/weight';
import { placeAt } from './workout-state';
import { Exercise } from '../models/exercise';
import { isTimedSet } from '../models/history';
import { canStepUpEachSet, steppedUp, suggestedWeight } from '../models/progress';
import { ExerciseDetailsDialogComponent } from '../shared/components/exercise-details-dialog/exercise-details-dialog.component';
import { WheelPickerComponent } from '../shared/components/wheel-picker/wheel-picker.component';
import { WorkoutSummaryComponent } from './workout-summary/workout-summary.component';
import { ClockDigitsComponent } from './clock-digits/clock-digits.component';
import { AlarmService } from '../shared/alarms/alarm.service';
import { MatIconModule } from '@angular/material/icon';
import { formatTime } from '../shared/format-time';
import { ActiveRunService } from '../shared/run/active-run.service';
import { HistoryStore } from '../shared/state/history-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { describeSets } from '../history/history-format';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { criticallyDampedSpring } from '../shared/spring';
import { fitName } from './fit-name';
import { rollIn, rollOut, RollWay } from './step-roll';
import { RoundDot, RoundDotsComponent } from './round-dots/round-dots.component';
import { StepStripComponent, StripStep } from './step-strip/step-strip.component';
import { WorkoutNoteComponent } from './workout-note/workout-note.component';
import { WorkoutRingComponent } from './workout-ring/workout-ring.component';

// Space on one of these already does something, e.g. presses the focused button
const SPACE_HANDLED_BY =
    'button, a, input, textarea, select, [contenteditable], [role="button"], [role="spinbutton"]';

/** "Timed", "Rest" or "Reps": what an unnamed step is called. */
function kindName(step: Step): string {
    return { work: 'Timed', rest: 'Rest', reps: 'Reps' }[step.kind];
}

/** Which set it is, e.g. "set 2 of 3", or a superset's round, "superset round 2 of 3". */
function setText(set: GroupSet): string {
    const count = `${set.set + 1} of ${set.of}`;
    return set.group === 'exercise' ? `set ${count}` : `${set.group} round ${count}`;
}

/** Each kind of step's icon by its name, so the kinds aren't told apart by colour alone. */
const KIND_ICONS: Record<StepKind, string> = {
    work: 'timer',
    rest: 'self_improvement',
    reps: 'fitness_center',
};

// The countdown of a timed step pops on each of its last this many seconds
const POP_SECONDS = 3;

// Above this many rounds, the dots under "round 2 of 20" would wrap on a phone, so only the line shows
const MAX_ROUND_DOTS = 15;

/**
 * Shows the workout in progress and takes the user's presses. The run itself (its clock,
 * alarms and history) lives in ActiveRunService, so it carries on on any page of the app.
 */
@Component({
    selector: 'app-workout',
    imports: [
        RouterLink,
        MatIconModule,
        WheelPickerComponent,
        WorkoutSummaryComponent,
        ExerciseDetailsDialogComponent,
        ClockDigitsComponent,
        RoundDotsComponent,
        StepStripComponent,
        WorkoutNoteComponent,
        WorkoutRingComponent,
    ],
    templateUrl: './workout.component.html',
    styleUrls: [
        './workout.component.scss',
        './workout-motion.scss',
        './workout-steps.scss',
        './workout-type.scss',
    ],
    host: {
        '(document:keydown.space)': 'onSpace($event)',
        '(document:keydown.escape)': 'onEscape($event)',
        // A phone turned round gives the face a new width to fit the name to
        '(window:resize)': 'fitName(stepKey())',
    },
})
export class WorkoutComponent {
    protected readonly setText = setText;
    workoutStore = inject(WorkoutStore);
    private readonly router = inject(Router);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);
    private readonly run = inject(ActiveRunService);
    workout = this.run.workout;
    /** The workout as it runs, with how it does exercises each side: what its plan is made of. */
    private readonly running = this.run.running;
    isPaused = this.run.isPaused;
    /** The summary is open over the page, so its keys are left to it. */
    summaryOpen = this.run.summaryOpen;
    private readonly state = this.run.state;
    private readonly nextState = this.run.nextState;

    protected readonly alarms = inject(AlarmService);
    private readonly settings = inject(SettingsStore);
    private readonly history = inject(HistoryStore);
    private readonly exercises = inject(ExerciseStore);
    /** Sound is on, but the browser is waiting for a tap before it will play any. */
    soundLocked = computed(
        () => this.alarms.supported && this.settings.sound() && !this.alarms.unlocked()
    );

    isWorkActive = computed(() => this.state()?.phase === 'work');
    isRestActive = computed(() => this.state()?.phase === 'rest');
    isRepsActive = computed(() => this.state()?.phase === 'reps');
    isComplete = computed(() => this.state()?.phase === 'complete');
    /** The rep step's count, e.g. 20, or 0 when it isn't a rep step. */
    reps = computed(() => {
        const step = this.state()?.step;
        return step?.kind === 'reps' ? step.reps : 0;
    });
    /** The rep step's weight, e.g. "60 kg", or '' when there's none. */
    weight = computed(() => {
        const step = this.state()?.step;
        return step?.kind === 'reps' ? this.weightText(step) : '';
    });
    /**
     * The sets from the most recent workout with this exercise, in the same format as history
     * (PRG-1). Not this run's: it's in the history too once it's been ended or the page closed.
     * Where the step's sets vary (BLD-11), just the same set last time, e.g. set 2's.
     */
    lastTime = computed(() => {
        const saved = this.savedStep();
        const lastSets = saved?.varies
            ? this.lastSets().filter((set) => (set.set ?? 0) === saved.set)
            : this.lastSets();
        const summary = describeSets(
            lastSets,
            this.settings.weightUnit(),
            (id) => this.exercises.byId(id)?.name
        )
            .map((line) => line.text)
            .join(' + ');
        return summary ? `Last time: ${summary}` : '';
    });
    /**
     * The weight to try (PRG-5), when every set hit the reps last time: one step up from last
     * time's weight, while the step is still at it. Changed since, it's the user's call.
     */
    nextWeight = computed(() => {
        const step = this.state()?.step;
        if (step?.kind !== 'reps' || this.savedStep()?.varies) {
            return null;
        }
        const suggestion = suggestedWeight(this.lastSets(), step.reps, this.weightUnit());
        return suggestion &&
            suggestion.next > suggestion.last &&
            this.weightValue() === suggestion.last
            ? suggestion.next
            : null;
    });
    /**
     * On set 1 of a step whose sets vary (BLD-11), how much more to try on each set (PRG-5),
     * e.g. 2.5 (kg), where every set got its own reps last time and none has been changed
     * since; otherwise null. Once, on set 1, as it moves the whole step up.
     */
    eachSetStepUp = computed(() => {
        const saved = this.savedStep();
        const unit = this.weightUnit();
        return saved?.varies &&
            saved.set === 0 &&
            saved.step.kind === 'reps' &&
            canStepUpEachSet(this.lastSets(), saved.step, unit)
            ? WEIGHT_INCREASE[unit]
            : null;
    });
    /**
     * The saved step being run (the face's `state.step` being just this set of it), which set
     * of it this is, and whether its sets vary. Null between steps' sets, e.g. on a rest.
     */
    private readonly savedStep = computed(() => {
        const state = this.state();
        const workout = this.running();
        const place = state && workout ? placeAt(workout, state.stepIndex) : null;
        const step = place && workout ? allSteps(workout)[place.step] : undefined;
        return step && place
            ? { step, set: place.set, varies: step.kind !== 'rest' && step.sets !== undefined }
            : null;
    });
    /** The rep sets of the rep step's exercise from the most recent workout with any. */
    private readonly lastSets = computed(() => {
        const step = this.state()?.step;
        if (step?.kind !== 'reps' || step.exerciseId === undefined) {
            return [];
        }
        const runId = this.run.runId();
        for (const entry of this.history.entries()) {
            if (entry.id === runId) {
                continue;
            }
            const sets = (entry.sets ?? []).filter(
                (set) => !isTimedSet(set) && set.exerciseId === step.exerciseId
            );
            if (sets.length > 0) {
                return sets;
            }
        }
        return [];
    });
    // Changing the reps or weight of the rep step being waited on, e.g. going up a weight
    protected readonly repOptions = Array.from({ length: MAX_REPS }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
    }));
    protected readonly weightUnit = this.settings.weightUnit;
    /** The face's weight wheel: as in setup, but no weight shows as "+", to add one. */
    protected readonly faceWeightOptions = computed(() =>
        weightOptions(this.weightUnit()).map((option) =>
            option.value === 0 ? { ...option, label: '+' } : option
        )
    );
    /** The rep step's weight as its wheel shows it, or 0 for none. */
    protected readonly weightValue = computed(() => {
        const step = this.state()?.step;
        return step?.kind === 'reps' && step.weight ? weightIn(step.weight, this.weightUnit()) : 0;
    });
    /** The rep set being waited on, so Done swells once for each. */
    private readonly currentSet = computed(() => {
        const state = this.state();
        return state?.phase === 'reps'
            ? `${this.workoutStore.activeRunStartedAt()}-${this.workoutStore.activeRepStepsDone()}`
            : null;
    });

    /** Rounds left, including the one in progress. */
    repeats = computed(() => this.state()?.roundsLeft ?? 0);
    untilStopped = computed(() => {
        const workout = this.workout();
        return workout !== null && runsUntilStopped(workout);
    });
    /** As many rounds as fit in a time limit, rather than a number of them. */
    timeLimited = computed(() => this.workout()?.timeLimitSeconds !== undefined);
    /** Time left of the time limit, e.g. "12:34", or '' without one. */
    timeLeft = computed(() => {
        const ms = this.run.timeLeftMs();
        if (ms === null) {
            return '';
        }
        const seconds = Math.ceil(ms / 1000);
        return formatTime(Math.floor(seconds / 60), seconds % 60);
    });
    /** The last 10 seconds of a time limit, as the countdown beeps. */
    timeNearlyUp = computed(() => {
        const ms = this.run.timeLeftMs();
        return ms !== null && ms <= 10_000;
    });
    /**
     * Time left of the whole workout, e.g. "12:34", for a set number of rounds of timed steps
     * only: '' with a time limit (which has its own), until stopped, or with rep steps, which
     * take as long as they take.
     */
    totalLeft = computed(() => {
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
        return formatTime(Math.floor(seconds / 60), seconds % 60);
    });
    /** The round in progress, counting from 1. */
    roundNumber = computed(() => (this.state()?.round ?? 0) + 1);

    /**
     * The set in progress of an exercise with more than one, e.g. set 1 (from 0) of 3, or
     * null. The rest after a set is part of that set.
     */
    groupSet = computed(() => {
        const state = this.state();
        const workout = this.running();
        return state && workout && state.phase !== 'complete'
            ? this.setOf(workout, state.stepIndex)
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
    showStepCount = computed(() => {
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
    stepLabel = computed(() => {
        const step = this.state()?.step;
        return step?.name || (step && step.kind !== 'work' ? kindName(step) : '');
    });
    /** "Left side" or "Right side" for a step done each side (BLD-10), or ''. */
    sideLabel = computed(() => {
        const state = this.state();
        const workout = this.running();
        const side = state && workout ? placeAt(workout, state.stepIndex)?.side : undefined;
        return side ? sideName(side) : '';
    });
    /**
     * Whether the run has a section line (RUN-10): it has headings, or more than one exercise
     * to count. Kept for the whole run, so its room doesn't come and go.
     */
    showSection = computed(() => {
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
    section = computed(() => {
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
    exerciseNote = computed(() => {
        const step = this.state()?.step;
        return step?.exerciseId ? (this.exercises.noteFor(step.exerciseId) ?? '') : '';
    });
    /** The step's exercise, for its details from the (i) beside its name (RUN-9). */
    protected readonly stepExercise = computed(() => {
        const id = this.state()?.step?.exerciseId;
        return id ? this.exercises.byId(id) : undefined;
    });
    /** The exercise whose details are open over the workout, which carries on underneath. */
    protected readonly exerciseInDetails = signal<Exercise | null>(null);
    /** e.g. "Plank · 00:45", "Squats · 10 reps @ 60 kg", or "finish" when the workout ends after this step. */
    upNext = computed(() => {
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
            step.kind !== 'rest' && workout && this.startsSet(workout, next.stepIndex)
                ? this.setOf(workout, next.stepIndex)
                : null;
        // A step's second side is the same exercise again, so it's only the side
        const side = workout && this.secondSide(workout, next.stepIndex);
        const name = side
            ? sideName(side)
            : `${step.name || kindName(step)}${set ? ` · ${setText(set)}` : ''}`;
        if (step.kind === 'reps') {
            const weight = this.weightText(step);
            return `${name} · ${step.reps} reps${weight ? ` @ ${weight}` : ''}`;
        }
        return `${name} · ${formatTime(Math.floor(step.seconds / 60), step.seconds % 60)}`;
    });

    /**
     * A timed step is nearly over, so "Next:" pulses to get ready: its last 5 seconds, or
     * its last 3 for a step under 15 seconds. Not on a rep step (Done is the cue) or paused.
     */
    nextSoon = computed(() => {
        const state = this.state();
        if (!state || this.isPaused() || (state.phase !== 'work' && state.phase !== 'rest')) {
            return false;
        }
        return state.remainingSeconds <= (state.phaseSeconds < 15 ? 3 : 5);
    });
    /** What comes next, for the colour of the "Next:" pulse: a step's kind, or finish. */
    nextKind = computed(() => this.nextState()?.step?.kind ?? 'finish');

    // The face's text is keyed by step, so a new step's text slides in as the last one's
    // slides out; a new round slides right to left, with the round line, rather than up.
    // Each is a snapshot of what it shows, so the text sliding out keeps its last values
    // rather than showing the new step's.
    /** Which step is showing, so each gets its own text on the face: 'complete' at the end. */
    protected readonly stepKey = computed(() => {
        const state = this.state();
        return !state || state.phase === 'complete'
            ? 'complete'
            : `${this.workoutStore.activeRunStartedAt()}-${state.round}-${state.stepIndex}`;
    });
    faceSlides = computed(() => {
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
            },
        ];
    });
    roundSlides = computed(() => {
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
                dots: set ? this.setDots(set) : this.totalRounds() > 1 ? this.roundDots() : [],
                strip: this.stepStrip(),
            },
        ];
    });
    /** The step in progress began a new round, or a new set, so it slides in sideways. */
    newRound = computed(() => {
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

    /**
     * How the face's text rolls between steps: up, or sideways for a new round, or settling
     * in for a rest; with reduced motion, a short cross-fade. The round line above the ring
     * always turns sideways, with a new round.
     */
    private faceRoll(): RollWay {
        if (this.reducedMotion()) {
            return 'fade';
        }
        if (this.newRound()) {
            return 'sideways';
        }
        return this.isRestActive() ? 'rest' : 'up';
    }

    protected rollFaceIn(event: AnimationCallbackEvent) {
        rollIn(event, this.faceRoll());
    }

    protected rollFaceOut(event: AnimationCallbackEvent) {
        rollOut(event, this.faceRoll());
    }

    protected rollRoundIn(event: AnimationCallbackEvent) {
        rollIn(event, this.reducedMotion() ? 'fade' : 'sideways');
    }

    protected rollRoundOut(event: AnimationCallbackEvent) {
        rollOut(event, this.reducedMotion() ? 'fade' : 'sideways');
    }

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

    /** One dot per set, as for rounds, when there are few enough to fit. */
    private setDots(set: GroupSet): RoundDot[] {
        if (set.of > MAX_ROUND_DOTS) {
            return [];
        }
        return Array.from({ length: set.of }, (_, i) =>
            i === set.set ? 'current' : i < set.set ? 'done' : 'left'
        );
    }

    /**
     * The side of step `stepIndex` of the round, when it's a step's second side in its set:
     * the side before it, maybe with Switch sides between, is the same step and set.
     */
    private secondSide(workout: Workout, stepIndex: number): Side | null {
        const { places } = runPlan(workout);
        const place = places[stepIndex];
        let i = stepIndex - 1;
        while (i >= 0 && places[i] === null) {
            i--;
        }
        const before = places[i];
        return place?.side && before?.step === place.step && before.set === place.set
            ? place.side
            : null;
    }

    /** Whether step `stepIndex` of the round is the first of its set (or a superset's round). */
    private startsSet(workout: Workout, stepIndex: number): boolean {
        const { places, sets } = runPlan(workout);
        return (
            places.findIndex((place, i) => place !== null && sets[i] === sets[stepIndex]) ===
            stepIndex
        );
    }

    /** The set step `stepIndex` of the round is in, for an exercise of more than one. */

    private setOf(workout: Workout, stepIndex: number): GroupSet | null {
        const set = runPlan(workout).sets[stepIndex];
        return set && set.of > 1 ? set : null;
    }

    /**
     * The round's steps as a strip in their kinds' colours: done, the one in progress, and
     * those to go. Only where there's more than one work or rep step, and not once finished.
     * In a workout with sets, a superset's round (BLD-12), with the rest after it.
     */
    stepStrip = computed((): StripStep[] => {
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
    private readonly time = computed(() =>
        formatTime(Math.floor(this.remaining() / 60), this.remaining() % 60)
    );

    /** How many rounds the workout runs for (0 when it runs until stopped or to a time limit). */
    totalRounds = computed(() => (this.untilStopped() ? 0 : (this.workout()?.repeats ?? 0)));

    /** One dot per round, for workouts short enough for a row of them to fit on a phone. */
    roundDots = computed((): RoundDot[] => {
        const total = this.totalRounds();
        if (total > MAX_ROUND_DOTS) {
            return [];
        }
        const current = this.roundNumber() - 1;
        return Array.from({ length: total }, (_, i) => {
            if (i === current) {
                return 'current';
            }
            return i < current ? 'done' : 'left';
        });
    });

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
    ringPhase = computed(() => {
        const phase = this.state()?.phase;
        return phase === 'complete' || phase === undefined ? null : phase;
    });

    ringSweeps = computed(() => {
        const sweep = this.ringSweep();
        return sweep ? [sweep] : [];
    });

    progress = computed(() => {
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

    progressPercent = computed(() => Math.round(this.progress() * 100));

    /**
     * What screen readers announce. It only changes when a step starts, so the live region
     * speaks at the start of each step and at the end, not every second. With several
     * steps it says which one, so back-to-back steps of the same kind are each announced.
     */
    announcement = computed(() => {
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
        parts.push(state.step.name || kindName(state.step));
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
    pausedOn = computed(() => (this.isRepsActive() ? `${this.reps()} reps` : this.time()));

    private readonly mainButton = viewChild<ElementRef<HTMLButtonElement>>('mainButton');
    private readonly doneButton = viewChild<ElementRef<HTMLButtonElement>>('doneButton');
    private readonly resumeButton = viewChild<ElementRef<HTMLButtonElement>>('resumeButton');
    private readonly ring = viewChild(WorkoutRingComponent);
    private readonly reducedMotion = injectPrefersReducedMotion();
    /** Apple's spring for moving something about: no bounce, a 0.4s response. */
    private readonly glide = criticallyDampedSpring(0.4);

    constructor() {
        // A rep step has come round: Done swells once, as it's the user's move now
        effect(() => {
            if (this.currentSet() === null || untracked(this.reducedMotion)) {
                return;
            }
            afterNextRender(
                () =>
                    this.doneButton()?.nativeElement.animate(
                        [
                            { transform: 'none' },
                            { transform: 'scale(1.15)' },
                            { transform: 'none' },
                        ],
                        { duration: 600, easing: 'ease-in-out' }
                    ),
                { injector: this.injector }
            );
        });

        // Each new step's name is fitted to the face once it's there
        effect(() => {
            const key = this.stepKey();
            afterNextRender(() => this.fitName(key), { injector: this.injector });
        });

        // The display face may arrive after the first fitting, and its letters are wider
        inject(DOCUMENT).fonts?.ready.then(() => this.fitName(this.stepKey()));
    }

    /** The name of step `key` on the face, if it has one. */
    private faceLabel(key: string): HTMLElement | null {
        return this.host.nativeElement.querySelector<HTMLElement>(
            `.workout-face [data-step="${key}"] .workout-face__label`
        );
    }

    /** Fits step `key`'s name to the face: see fitName(). */
    protected fitName(key: string) {
        const label = this.faceLabel(key);
        if (label) {
            fitName(label);
        }
    }

    /**
     * Pausing swaps the controls for Resume and End workout over the ring, and resuming swaps
     * them back, so the button just pressed is gone: focus moves to the one that took its
     * place, and that one glides there from where the pressed one was.
     */
    togglePause() {
        // Where it is on screen now, mid-glide included, so a press mid-glide turns it round
        const pressed = (this.isPaused() ? this.resumeButton() : this.mainButton())?.nativeElement;
        const from = pressed?.getBoundingClientRect();
        this.run.togglePause();
        afterNextRender(
            () => {
                const arrived = (this.isPaused() ? this.resumeButton() : this.mainButton())
                    ?.nativeElement;
                arrived?.focus();
                if (from && arrived) {
                    this.glideFrom(arrived, from);
                }
            },
            { injector: this.injector }
        );
    }

    /**
     * Moves a button that has just appeared from where `from` was to its own place: Pause
     * carries on up into the ring as Resume, and Resume back down as Pause, along the same
     * path. A spring rather than a set curve, and the button is real throughout, so it can be
     * pressed while it moves. With reduced motion it's just there.
     */
    private glideFrom(button: HTMLElement, from: DOMRect) {
        if (this.reducedMotion()) {
            return;
        }
        const to = button.getBoundingClientRect();
        const x = from.left + from.width / 2 - (to.left + to.width / 2);
        const y = from.top + from.height / 2 - (to.top + to.height / 2);
        const scale = to.width ? from.width / to.width : 1;
        button.animate(
            [{ transform: `translate(${x}px, ${y}px) scale(${scale})` }, { transform: 'none' }],
            { duration: this.glide.duration, easing: this.glide.easing }
        );
    }

    /**
     * Escape resumes, as it would close a menu or dialog; not when it's closing a dialog over
     * the workout, e.g. the exercise's details opened while paused, which has already gone by
     * the time it gets here.
     */
    onEscape(event: Event) {
        const target = event.target as Element | null;
        if (
            !target?.closest?.('[role="dialog"]') &&
            this.isPaused() &&
            !this.isComplete() &&
            !this.summaryOpen() &&
            !this.exerciseInDetails()
        ) {
            this.togglePause();
        }
    }

    protected setReps(reps: number) {
        this.run.changeReps({ reps });
    }

    protected setWeight(value: number) {
        this.run.changeReps({
            weight: value > 0 ? weightToKg(value, this.weightUnit()) : undefined,
        });
    }

    /** Try more on each set: one weight step up on every set with a weight, keeping the shape. */
    protected stepUpEachSet() {
        const unit = this.weightUnit();
        this.run.changeEachSet((amount) => steppedUp(amount, unit));
    }

    /**
     * Done on a rep step: on to the next step, from its full time. Done stays put for another
     * rep step; otherwise it's gone, so focus moves to Pause rather than being lost.
     *
     * The ring shows the set finished in the same task as the press, so in the same frame as
     * the next step's beep and vibration, which the run books as it moves on.
     */
    finishReps() {
        const hadFocus = this.doneButton()?.nativeElement === document.activeElement;
        if (this.isRepsActive() && !this.reducedMotion()) {
            this.ring()?.finish();
        }
        this.run.finishReps();
        if (hadFocus) {
            afterNextRender(
                () => {
                    if (!this.doneButton()) {
                        this.mainButton()?.nativeElement.focus();
                    }
                },
                { injector: this.injector }
            );
        }
    }

    /** Space pauses and resumes, like most media players, or presses Done on a rep step. */
    onSpace(event: Event) {
        const target = event.target as Element | null;
        if (
            !this.workout() ||
            this.summaryOpen() ||
            this.exerciseInDetails() ||
            this.isComplete() ||
            (event as KeyboardEvent).repeat ||
            target?.closest?.(SPACE_HANDLED_BY)
        ) {
            return;
        }
        // Otherwise Space would also scroll the page
        event.preventDefault();
        if (this.isRepsActive()) {
            this.finishReps();
        } else {
            this.togglePause();
        }
    }

    protected showExercise(exercise: Exercise) {
        this.exerciseInDetails.set(exercise);
    }

    /**
     * Back to the (i) that opened the details, on the face or, while paused, over it; if the
     * workout has moved on to a step with no exercise meanwhile, to Done or Pause (or Resume),
     * so focus isn't lost.
     */
    protected closeExercise() {
        this.exerciseInDetails.set(null);
        afterNextRender(
            () => {
                const info = this.host.nativeElement.querySelector<HTMLElement>(
                    this.isPaused()
                        ? '.workout-paused__info'
                        : `.workout-face [data-step="${this.stepKey()}"] .workout-face__info`
                );
                (
                    info ??
                    (this.isPaused() ? this.resumeButton() : undefined)?.nativeElement ??
                    this.doneButton()?.nativeElement ??
                    this.mainButton()?.nativeElement
                )?.focus();
            },
            { injector: this.injector }
        );
    }

    /** End workout: the summary opens over the run, which waits, paused, in case of Back. */
    end() {
        this.run.end();
    }

    /** Back from the summary to the paused run, with focus on Resume. */
    backToWorkout() {
        this.run.back();
        afterNextRender(() => this.resumeButton()?.nativeElement.focus(), {
            injector: this.injector,
        });
    }

    /** The summary's Done: the run is over, on to it in the history (highlighted if logged). */
    async closeSummary() {
        const run = this.run.runId();
        this.run.stop();
        await this.router.navigate(['/history'], run ? { queryParams: { run } } : {});
    }
}
