import {
    computed,
    DestroyRef,
    DOCUMENT,
    effect,
    inject,
    Service,
    signal,
    untracked,
} from '@angular/core';
import { Exercise } from '../../models/exercise';
import { HistoryEntry, historyId, RepSet } from '../../models/history';
import { runPosition, StepSwap, swappedStep, withSwaps } from '../../models/step-swap';
import {
    allSteps,
    placedHeadings,
    placedSupersets,
    RepSetAmount,
    RepStep,
    RunningWorkout,
    Step,
    runPlan,
    stepForSet,
    stepRounds,
    withEachRepSet,
    withRepSet,
    Workout,
    workoutSeconds,
} from '../../models/workout';
import { alarmEvents } from '../../workout/alarm-schedule';
import {
    isSetAt,
    placeAt,
    placeFields,
    setsDone,
    stepsIntoRound,
    workoutStateAt,
} from '../../workout/workout-state';
import { AlarmService } from '../alarms/alarm.service';
import { HistoryStore } from '../state/history-store.service';
import { SettingsStore } from '../state/settings-store.service';
import { WorkoutStore } from '../state/workout-store.service';
import { KeepAwakeService } from './keep-awake.service';

// How often the clock ticks, in ms, at most
const TICK_MS = 250;

// How many rounds of alarms to book at a time
const ALARM_WINDOW = 100;

// How late a vibration can be and still be worth doing, e.g. not after a background tab wakes up
const VIBRATE_LATE_LIMIT_MS = 1000;

/**
 * The workout in progress, wherever in the app the user is. It keeps the clock, books the
 * alarms, vibrates, keeps the screen on, and logs the run to the history; the workout page
 * shows it and sends it the user's presses. Started at app start, so a refreshed page
 * picks the run up again on any page.
 *
 * A run ends when it's stopped, when another workout is started in its place, or when the
 * tab closes, and is logged then (and when it finishes).
 */
@Service()
export class ActiveRunService {
    private readonly store = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    private readonly alarms = inject(AlarmService);
    private readonly settings = inject(SettingsStore);
    private readonly keepAwake = inject(KeepAwakeService);

    readonly workout = this.store.activeWorkout;
    /**
     * The workout as it runs, with how it does exercises each side (see `RunningWorkout`) and
     * any exercises swapped for others (RUN-11): what its clock, alarms and sets are worked
     * out from. `workout` is the saved one, without the swaps.
     */
    readonly running = computed((): RunningWorkout | null => {
        const workout = this.workout();
        return (
            workout && {
                ...withSwaps(workout, this.store.activeSwaps()),
                sides: this.store.activeSides(),
            }
        );
    });
    readonly isPaused = this.store.isPaused;

    private readonly _held = signal(false);
    /**
     * The clock is stopped, as when paused, but the workout page shows the run as going, e.g.
     * while the tour of it (RUN-13) points at Pause and Skip. Kept in memory only, so a
     * reload while held carries on paused.
     */
    readonly held = this._held.asReadonly();

    // Everything below is worked out from the clock rather than counted tick by tick,
    // so the workout stays correct even when ticks arrive late or not at all
    private readonly now = signal(Date.now());

    /** How long the workout has run, in ms, or null if there's no workout. */
    readonly elapsedMs = computed(() => {
        const startedAt = this.store.activeWorkoutStartedAt();
        // While paused, time stands still at the moment of the pause. The clock only moves on
        // a tick, so a run started since the last one could look a moment short of its
        // start (e.g. 20:01 left of 20:00): it never counts from before it began.
        const at = this.store.activeWorkoutPausedAt() ?? Math.max(this.now(), startedAt ?? 0);
        return this.workout() && startedAt !== null ? at - startedAt : null;
    });

    readonly state = computed(() => {
        const workout = this.running();
        const elapsedMs = this.elapsedMs();
        return workout && elapsedMs !== null
            ? workoutStateAt(
                  workout,
                  elapsedMs,
                  this.store.activeRepStepsDone(),
                  this.store.activeOffClockMs()
              )
            : null;
    });

    /** What comes after the current step: the state at the moment it ends. */
    readonly nextState = computed(() => {
        const workout = this.running();
        const state = this.state();
        const elapsedMs = this.elapsedMs();
        if (!workout || !state || elapsedMs === null || state.phase === 'complete') {
            return null;
        }
        const stepEndMs = elapsedMs - state.phaseElapsedMs + state.phaseSeconds * 1000;
        // A rep step ends with Done, which adds one to the rep steps done, and its wait to
        // the time on rep steps
        const reps = state.phase === 'reps';
        const repStepsDone = this.store.activeRepStepsDone() + (reps ? 1 : 0);
        const offClockMs = this.store.activeOffClockMs() + (reps ? state.phaseElapsedMs : 0);
        return workoutStateAt(workout, stepEndMs, repStepsDone, offClockMs);
    });

    /** The sets done so far, rep and timed, in the order they were done. */
    readonly sets = computed(() => {
        const workout = this.running();
        const state = this.state();
        return workout && state
            ? setsDone(
                  workout,
                  state,
                  this.store.activeSets(),
                  this.store.activeSwaps(),
                  this.store.activeSkips()
              )
            : [];
    });

    /**
     * Time left of a time limit, in ms, rep steps and rests included: the clock plus the time
     * off it (see `WorkoutStore.activeOffClockMs`). Null without a time limit (or a run).
     */
    readonly timeLeftMs = computed(() => {
        const limit = this.workout()?.timeLimitSeconds;
        const elapsedMs = this.elapsedMs();
        if (limit === undefined || elapsedMs === null) {
            return null;
        }
        return Math.max(0, limit * 1000 - elapsedMs - this.store.activeOffClockMs());
    });

    readonly isComplete = computed(() => this.state()?.phase === 'complete');

    /**
     * The rep step time ran out on, part-way through, while its set hasn't been logged with
     * logLastSet(); null otherwise. Its reps are the step's, as a starting point.
     */
    readonly unloggedLastSet = computed(() => {
        const workout = this.running();
        const state = this.state();
        if (workout?.timeLimitSeconds === undefined || state?.phase !== 'complete') {
            return null;
        }
        const step = runPlan(workout).steps[state.stepIndex];
        const place = placeAt(workout, state.stepIndex);
        if (step?.kind !== 'reps' || !place) {
            return null;
        }
        const logged = this.store.activeSets().some((set) => isSetAt(set, state.round, place));
        return logged ? null : { step, round: state.round, place };
    });
    /** End workout was pressed: the summary is open over the run, which waits, paused. */
    readonly ending = signal(false);
    /** The summary shows once the run is finished, or ended with End workout. */
    readonly summaryOpen = computed(() => !!this.workout() && (this.ending() || this.isComplete()));
    /** A run is going, and not paused: the clock ticks, alarms sound, the screen stays on. */
    readonly isRunning = computed(() => !!this.workout() && !this.isPaused() && !this.isComplete());

    // Alarms are booked ALARM_WINDOW rounds at a time, starting from a multiple of half that,
    // so a workout that runs until stopped is topped up halfway through each batch.
    // Finite workouts (30 rounds at most) fit in the first batch.
    private readonly alarmBatch = computed(() =>
        Math.floor((this.state()?.round ?? 0) / (ALARM_WINDOW / 2))
    );

    /**
     * When the run last resumed. Resuming moves the clock on by the pause, so an alarm that
     * sounded just before it now looks due a moment ago, and alarms that late still play
     * (for the first one after Start); anything due by this was heard already. Skip sets it
     * too, just before the next step's alarm, as the skipped step's countdown beeps are
     * now past and never to be heard.
     */
    private readonly resumedAt = signal(0);

    // Changes when the workout starts, pauses, resumes or needs its next batch, or countdown
    // beeps are turned on or off; not every tick
    private readonly alarmEvents = computed(() => {
        const workout = this.running();
        const startedAt = this.store.activeWorkoutStartedAt();
        const fromRound = (this.alarmBatch() * ALARM_WINDOW) / 2;
        const resumedAt = this.resumedAt();
        return workout && startedAt !== null && !this.isPaused()
            ? alarmEvents(
                  workout,
                  startedAt,
                  fromRound,
                  ALARM_WINDOW,
                  this.store.activeRepStepsDone(),
                  this.store.activeOffClockMs(),
                  this.settings.countdownBeeps()
              ).filter((event) => event.at > resumedAt)
            : [];
    });
    private lastAlarmCheck = Date.now() - VIBRATE_LATE_LIMIT_MS;

    constructor() {
        // Tick while there's something to count; a paused or finished run stands still.
        // The signal each tick sets is what updates the page.
        effect((onCleanup) => {
            if (!this.isRunning()) {
                return;
            }
            let id: ReturnType<typeof setTimeout>;
            const tick = () => {
                this.sync();
                id = setTimeout(tick, this.msToNextTick());
            };
            const first = untracked(() => this.msToNextTick());
            id = setTimeout(tick, first);
            onCleanup(() => clearTimeout(id));
        });

        // Log the workout once it's done, wherever the user is. Recording the same run
        // again (e.g. after a refresh) only updates its entry.
        effect(() => {
            if (this.isComplete()) {
                untracked(() => this.recordRun('finished'));
            }
        });

        // Hand the whole workout's alarms to the audio clock up front, and again whenever
        // the workout pauses, resumes, or sound is unlocked or turned on or off
        effect(() => {
            const events = this.alarmEvents();
            // Reading sound() here reschedules (or silences) when it's changed in settings
            if (this.alarms.unlocked() || !this.settings.sound()) {
                this.alarms.schedule(events);
            }
        });

        // Vibrate as each alarm comes due
        effect(() => {
            const now = this.now();
            const due = this.alarmEvents().filter(
                (event) =>
                    event.at > this.lastAlarmCheck &&
                    event.at <= now &&
                    event.at > now - VIBRATE_LATE_LIMIT_MS
            );
            this.lastAlarmCheck = now;
            if (due.length > 0) {
                this.alarms.vibrate(due[due.length - 1].kind);
            }
        });

        // Keep the screen from locking mid-workout, if the setting is on
        effect(() => this.keepAwake.hold(this.settings.keepScreenOn() && this.isRunning()));

        // Browsers pause or slow timers in background tabs, so catch up as soon as the page
        // is visible again. Closing the tab (or refreshing) logs the run as it stands; a
        // refresh then carries on, and the entry is updated when it's stopped or finishes.
        const document = inject(DOCUMENT);
        const window = document.defaultView!;
        const onVisible = () => this.sync();
        const onPageHide = () => {
            this.sync();
            this.recordRun(this.isComplete() ? 'finished' : 'stopped');
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('pagehide', onPageHide);
        inject(DestroyRef).onDestroy(() => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('pagehide', onPageHide);
        });
    }

    /**
     * Starts `workout` from the beginning. A run already going is logged as stopped first,
     * as starting another one ends it.
     */
    start(workout: Workout) {
        if (!this.isComplete()) {
            this.sync();
            this.recordRun('stopped');
        }
        this.store.setActiveWorkout(workout, {
            first: this.settings.eachSideFirst(),
            switchSeconds: this.settings.switchSidesSeconds(),
        });
        this.resumedAt.set(0);
        this._held.set(false);
        this.ending.set(false);
        this._steppedUp.set(new Set());
        this._keptSwaps.set(new Set());
        this.sync();
    }

    /** Whether hold() paused the run, so release() resumes it; one already paused stays so. */
    private heldFromRunning = false;

    /**
     * Stops the clock without showing the run paused: see `held`. A run already paused is
     * shown running too, and stays paused after. Undone by release().
     */
    hold() {
        if (!this.workout() || this.isComplete() || this._held()) {
            return;
        }
        this.heldFromRunning = !this.isPaused();
        this.store.pause();
        this._held.set(true);
        this.sync();
    }

    /** Undoes hold(): the clock starts again, unless the run was paused before. */
    release() {
        if (!this._held()) {
            return;
        }
        this._held.set(false);
        if (this.heldFromRunning) {
            this.togglePause();
        }
    }

    togglePause() {
        this._held.set(false);
        if (this.isPaused()) {
            this.store.resume();
            this.resumedAt.set(Date.now());
        } else {
            this.store.pause();
        }
        this.sync();
    }

    /**
     * Done on a rep step: on to the next step. The time it took comes off the countdown's
     * clock, so the next step starts from its beginning.
     */
    finishReps() {
        this.sync();
        const state = this.state();
        const place = state && placeAt(this.running()!, state.stepIndex);
        if (state?.phase !== 'reps' || state.step?.kind !== 'reps' || !place) {
            return;
        }
        const { name, reps, weight, exerciseId } = state.step;
        this.store.finishRepStep(state.phaseElapsedMs, {
            round: state.round,
            step: place.step,
            ...placeFields(place),
            name,
            reps,
            ...(weight === undefined ? {} : { weight }),
            ...(exerciseId === undefined ? {} : { exerciseId }),
        });
        this.sync();
    }

    /**
     * Skip (RUN-12): on to the next step, from its full time, as Done does. A rep step skipped
     * is Done without its set, so it isn't logged. Of a timed step or rest, what was left is
     * added to the clock, so a time limit still runs out on time, with more rounds in it; a
     * skipped timed exercise is logged with the time it ran.
     */
    skipStep() {
        this.sync();
        const state = this.state();
        if (state?.phase === 'reps') {
            this.store.finishRepStep(state.phaseElapsedMs);
            this.sync();
            return;
        }
        if (state?.phase !== 'work' && state?.phase !== 'rest') {
            return;
        }
        const skippedMs = state.phaseSeconds * 1000 - state.phaseElapsedMs;
        this.store.skipStep({ round: state.round, stepIndex: state.stepIndex, skippedMs });
        // The next step starts now, and its alarm with it
        this.resumedAt.set(Date.now() - 1);
        this.sync();
    }

    /**
     * Changes the reps or weight of the rep step being waited on, e.g. going up a weight, in
     * this run and the saved workout, so next time starts there: for this set and the rest of
     * the run, or, on a step whose sets vary (BLD-11), for this set only. Both sides of a set
     * go together. A weight of undefined is none. A step swapped for another exercise (RUN-11)
     * changes in this run only, unless the swap's been kept for next time.
     */
    changeReps(change: { reps: number } | { weight: number | undefined }) {
        const state = this.state();
        const step = state?.step;
        const place = state && placeAt(this.running()!, state.stepIndex);
        const saved = place && allSteps(this.running()!)[place.step];
        if (state?.phase !== 'reps' || step?.kind !== 'reps' || saved?.kind !== 'reps' || !place) {
            return;
        }
        const reps = 'reps' in change ? change.reps : step.reps;
        const weight = 'weight' in change ? change.weight : step.weight;
        // No weight is left out, rather than saved as undefined
        this.updateStep(
            place.step,
            withRepSet(saved, place.set, { reps, ...(weight === undefined ? {} : { weight }) })
        );
    }

    /**
     * The rep step being waited on with `change` made to each of its sets, e.g. last time's
     * suggested step up on every set of a pyramid (PRG-5), in this run and the saved workout.
     */
    changeEachSet(change: (amount: RepSetAmount) => RepSetAmount) {
        const state = this.state();
        const place = state && placeAt(this.running()!, state.stepIndex);
        const saved = place && allSteps(this.running()!)[place.step];
        if (state?.phase !== 'reps' || saved?.kind !== 'reps' || !place) {
            return;
        }
        this.updateStep(place.step, withEachRepSet(saved, change));
    }

    /** A step changed mid-workout, in this run and the saved workout, or the run's swap. */
    private updateStep(step: number, changed: Step) {
        if (this.swappedSteps().has(step)) {
            this.store.updateActiveSwap(step, changed);
            if (!this._keptSwaps().has(step)) {
                return;
            }
        }
        this.store.updateActiveStep(step, changed);
    }

    /**
     * The steps swapped for another exercise in this run (RUN-11), by their place in the
     * workout, each with what it was at first and what it is now.
     */
    readonly swaps = computed(() => {
        const latest = new Map<number, { step: number; was: Step; now: Step }>();
        for (const swap of this.store.activeSwaps()) {
            const was = latest.get(swap.step)?.was ?? swap.original;
            latest.set(swap.step, { step: swap.step, was, now: swap.swapped });
        }
        // Swapped back to what it was is no swap at all
        return [...latest.values()]
            .filter((swap) => swap.now.exerciseId !== swap.was.exerciseId)
            .sort((a, b) => a.step - b.step);
    });
    /** The steps swapped in this run (RUN-11), by their place in the workout. */
    readonly swappedSteps = computed(
        () => new Set(this.store.activeSwaps().map((swap) => swap.step))
    );

    private readonly _keptSwaps = signal<ReadonlySet<number>>(new Set());
    /** Swapped steps the summary was told to keep for next time (see `keepSwap()`). */
    readonly keptSwaps = this._keptSwaps.asReadonly();

    /**
     * Swaps the step in progress for `exercise` (RUN-11), for the rest of this run: the same
     * reps or time, sets and sides, at the weight in `lastSets`, its sets last time. Sets
     * already done stay as they were. With `next`, it's the step after this one instead, e.g.
     * during the rest before it. Returns the swap, or null if the step isn't an exercise.
     */
    swapExercise(exercise: Exercise, lastSets: readonly RepSet[], next = false): StepSwap | null {
        const workout = this.running();
        const state = next ? this.nextState() : this.state();
        const place = workout && state ? placeAt(workout, state.stepIndex) : null;
        const current = workout && place ? allSteps(workout)[place.step] : undefined;
        if (
            !workout ||
            !state?.step ||
            !place ||
            current?.kind === 'rest' ||
            !current?.exerciseId
        ) {
            return null;
        }
        const swap: StepSwap = {
            step: place.step,
            from: runPosition(state.round, state.stepIndex, runPlan(workout).steps.length),
            original: current,
            swapped: swappedStep(current, exercise, lastSets),
        };
        this.store.swapActiveStep(swap);
        return swap;
    }

    /** Takes back the latest swap, e.g. with Undo. */
    undoSwap() {
        this.store.undoActiveSwap();
    }

    /** The summary's "Use … next time": the saved workout's step becomes the swapped one. */
    keepSwap(step: number) {
        const swap = this.swaps().find((swap) => swap.step === step);
        if (!swap) {
            return;
        }
        this.store.updateActiveStep(step, swap.now);
        this._keptSwaps.update((steps) => new Set([...steps, step]));
    }

    /**
     * End workout: the run is logged as it stands, any alarm sounding is silenced, and the
     * summary opens. The run is kept, paused, until the summary is closed with stop(), so
     * back() can take it up again.
     */
    end() {
        this.sync();
        this.store.pause();
        this.recordRun('stopped');
        this.alarms.cancel();
        this.ending.set(true);
    }

    /** From the summary back to the run, still paused where it was ended. */
    back() {
        this.ending.set(false);
    }

    /**
     * Corrects a set already done, from the summary, and updates its history entry. Only
     * this run's record changes; useSetsNextTime() carries it over to the saved workout.
     */
    changeSet(index: number, change: { reps: number } | { weight: number | undefined }) {
        const set = this.store.activeSets()[index];
        if (!set) {
            return;
        }
        const reps = 'reps' in change ? change.reps : set.reps;
        const weight = 'weight' in change ? change.weight : set.weight;
        const { weight: _old, ...rest } = set;
        this.store.updateActiveSet(index, {
            ...rest,
            reps,
            ...(weight === undefined ? {} : { weight }),
        });
        this.recordRun(this.isComplete() ? 'finished' : 'stopped');
    }

    /**
     * Logs the set time ran out in (see unloggedLastSet), with how many reps were done of it
     * and the step's weight, and updates the history entry.
     */
    logLastSet(reps: number) {
        const last = this.unloggedLastSet();
        if (!last || reps < 1) {
            return;
        }
        const { name, weight, exerciseId } = last.step;
        this.store.addActiveSet({
            round: last.round,
            step: last.place.step,
            ...placeFields(last.place),
            name,
            reps,
            ...(weight === undefined ? {} : { weight }),
            ...(exerciseId === undefined ? {} : { exerciseId }),
        });
        this.recordRun('finished');
    }

    private readonly _steppedUp = signal<ReadonlySet<number>>(new Set());
    /**
     * The steps given a Next time step-up on the summary (PRG-10), by their place in the
     * workout, which useSetsNextTime() leaves as they are.
     */
    readonly steppedUp = this._steppedUp.asReadonly();

    /** Step `step` was given a step-up on the summary, which "Yes, use next time" keeps. */
    keepStepUp(step: number) {
        this._steppedUp.update((steps) => new Set([...steps, step]));
    }

    /**
     * Makes each rep step of the saved workout start next time from its sets in this run, e.g.
     * after the summary's sets were corrected: each set as it was last done (both sides as one,
     * the second), and any not done as it was. Sets that came out alike are one reps and
     * weight; sets that differ vary (BLD-11), so a pyramid worked out mid-workout is kept. A
     * set cut short by a time limit doesn't count, as it wasn't all of the step. A step given a
     * step-up on the summary keeps it, as that was asked for since (see steppedUp).
     */
    useSetsNextTime() {
        const workout = this.running();
        const state = this.state();
        if (!workout) {
            return;
        }
        // The step time ran out on, which isn't done
        const cutAt =
            workout.timeLimitSeconds !== undefined && state?.phase === 'complete'
                ? placeAt(workout, state.stepIndex)
                : null;
        const cutShort = (set: RepSet) => !!cutAt && isSetAt(set, state!.round, cutAt);
        const done = this.store.activeSets().filter((set) => !cutShort(set));
        const lastSets = new Map(done.map((set) => [`${set.step}/${set.set ?? 0}`, set]));
        const rounds = stepRounds(workout);
        allSteps(workout).forEach((step, stepIndex) => {
            if (
                step.kind !== 'reps' ||
                this._steppedUp().has(stepIndex) ||
                (this.swappedSteps().has(stepIndex) && !this._keptSwaps().has(stepIndex)) ||
                !done.some((set) => set.step === stepIndex)
            ) {
                return;
            }
            const amounts = Array.from({ length: rounds[stepIndex] }, (_, set): RepSetAmount => {
                const { reps, weight } =
                    lastSets.get(`${stepIndex}/${set}`) ?? (stepForSet(step, set) as RepStep);
                return { reps, ...(weight === undefined ? {} : { weight }) };
            });
            const [first] = amounts;
            const alike = amounts.every(
                (amount) => amount.reps === first.reps && amount.weight === first.weight
            );
            const { sets: _sets, weight: _weight, ...rest } = step;
            this.store.updateActiveStep(stepIndex, {
                ...rest,
                ...first,
                ...(alike ? {} : { sets: amounts }),
            });
        });
    }

    /**
     * Ends the run for good, logging it (as finished if it was), and silences any alarm still
     * sounding.
     */
    stop() {
        this.sync();
        this.recordRun(this.isComplete() ? 'finished' : 'stopped');
        this.store.stop();
        this.alarms.cancel();
        this._held.set(false);
        this.ending.set(false);
    }

    /** The run's id in the history, or null with no run. */
    runId(): string | null {
        const workout = this.workout();
        const runStartedAt = this.store.activeRunStartedAt();
        return workout && runStartedAt !== null ? historyId(runStartedAt, workout.id) : null;
    }

    sync() {
        this.now.set(Date.now());
    }

    /**
     * How long until the next tick: the next quarter second of the clock, or the next alarm
     * if that's sooner. Steps start on whole seconds of the clock, but a time limit's end
     * needn't (it's moved by the time on rep steps), so a tick lands on each alarm too: the
     * face rolls on and the phone vibrates in the very tick the beep was booked for, rather
     * than up to a quarter second after it.
     */
    private msToNextTick(): number {
        const now = Date.now();
        const elapsedMs = now - (this.store.activeWorkoutStartedAt() ?? now);
        const toQuarter = TICK_MS - (((elapsedMs % TICK_MS) + TICK_MS) % TICK_MS);
        const nextAlarm = this.alarmEvents()
            .map((event) => event.at - now)
            .filter((ms) => ms > 0);
        return Math.min(toQuarter, ...nextAlarm);
    }

    /**
     * Adds this run to the history. A stopped run is only logged once at least one step
     * has been done, so starting a workout by mistake and stopping it leaves no trace.
     */
    private recordRun(outcome: HistoryEntry['outcome']) {
        const workout = this.running();
        const state = this.state();
        const id = this.runId();
        const startedAt = this.store.activeWorkoutStartedAt();
        const elapsedMs = this.elapsedMs();
        if (!workout || !state || !id || startedAt === null || elapsedMs === null) {
            return;
        }
        const finished = outcome === 'finished';
        if (!finished && state.round === 0 && state.stepIndex === 0) {
            return;
        }
        // A finish is dated when the workout actually ended, even if the page only notices
        // later (e.g. it was in the background); startedAt has moved on by any pauses and by
        // the time spent on rep steps, which the clock leaves out, and back by any time
        // skipped, which it adds. A time limit ends when the clock and the time off it add up
        // to it.
        const limit = workout.timeLimitSeconds;
        const offClockMs = this.store.activeOffClockMs();
        const finishMs =
            limit === undefined ? workoutSeconds(workout) * 1000 : limit * 1000 - offClockMs;
        const countdownMs = finished ? finishMs : elapsedMs;
        const activeSeconds = Math.floor((countdownMs + offClockMs) / 1000);
        const sets = this.sets();
        const headings = placedHeadings(workout);
        const supersets = placedSupersets(workout);
        const timeLimit =
            limit === undefined
                ? {}
                : {
                      timeLimitSeconds: limit,
                      ...(finished ? { stepsIntoRound: stepsIntoRound(workout, state) } : {}),
                  };
        this.history.record({
            id,
            workoutId: workout.id,
            title: workout.title,
            startedAt: this.store.activeRunStartedAt()!,
            endedAt: finished ? startedAt + countdownMs : Date.now(),
            activeSeconds,
            // When time ran out, the round it was in is the full rounds done
            roundsCompleted: finished && limit === undefined ? workout.repeats : state.round,
            totalRounds: workout.repeats,
            outcome,
            ...timeLimit,
            ...(sets.length > 0 ? { sets } : {}),
            ...(headings.length > 0 ? { headings } : {}),
            ...(supersets.length > 0 ? { supersets } : {}),
        });
    }
}
