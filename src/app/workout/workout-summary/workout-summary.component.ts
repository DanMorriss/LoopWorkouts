import { Workout } from '../../models/workout';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
    Component,
    computed,
    ElementRef,
    inject,
    linkedSignal,
    output,
    viewChild,
} from '@angular/core';
import { form, FormField, maxLength } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { MAX_NOTE_LENGTH } from '../../models/history';
import { isMostRounds, newBests, roundsScore, sessionsByExercise } from '../../models/progress';
import { musclesInSets } from '../../models/workout-muscles';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { WheelPickerComponent } from '../../shared/components/wheel-picker/wheel-picker.component';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { describeScore, entryName } from '../../history/history-format';
import { SuggestedWorkoutComponent } from '../../history/suggested-workout/suggested-workout.component';
import { bestLines } from '../../exercises/progress-format';
import { injectPrefersReducedMotion } from '../../shared/reduced-motion';
import {
    ownExerciseName,
    REP_OPTIONS,
    SummarySetsComponent,
} from './summary-sets/summary-sets.component';
import { SummaryCopyComponent } from './summary-copy/summary-copy.component';
import { SummaryStepUpsComponent } from './summary-step-ups/summary-step-ups.component';
import { SummarySwapsComponent } from './summary-swaps/summary-swaps.component';
import { SheetDrag } from './sheet-drag';
import { SummaryStatsComponent } from './summary-stats/summary-stats.component';

/**
 * How the workout went, once it's finished or ended with End workout: the time, rounds and
 * sets, which can be corrected, what to step up next time, the muscles worked, a note, and
 * the suggested next workout. A workout ended early (or one that runs until stopped) can be
 * taken up again with Back to workout; the run waits, paused, until then. Focus starts on
 * the heading and is trapped inside while it's open.
 */
@Component({
    selector: 'app-workout-summary',
    imports: [
        BodyMapComponent,
        CdkTrapFocus,
        FormField,
        MatIconModule,
        SuggestedWorkoutComponent,
        SummaryCopyComponent,
        SummarySetsComponent,
        SummaryStatsComponent,
        SummaryStepUpsComponent,
        SummarySwapsComponent,
        WheelPickerComponent,
    ],
    templateUrl: './workout-summary.component.html',
    styleUrl: './workout-summary.component.scss',
    host: { '[class.summary--dragged-away]': 'sheetDrag.draggedAway()' },
})
export class WorkoutSummaryComponent {
    private readonly run = inject(ActiveRunService);
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);
    private readonly exercises = inject(ExerciseStore);

    /** Back to workout: the run carries on from where it was ended. */
    readonly back = output<void>();
    /** Done: the run is over, on to it in the history. */
    readonly done = output<void>();
    /** Add your weight to see calories: the run is over, on to Profile's Body weight. */
    readonly addWeight = output<void>();
    /** Make a copy, of a ready-made workout: the copy, to open in Create. */
    readonly copied = output<Workout>();

    protected readonly finished = this.run.isComplete;
    protected readonly heading = computed(() => {
        if (!this.finished()) {
            return 'Workout ended';
        }
        return this.run.workout()?.timeLimitSeconds === undefined
            ? 'Workout finished'
            : "Time's up";
    });
    /** The rep step time ran out on, to log how much of it was done; null otherwise. */
    protected readonly lastSet = computed(() => {
        const last = this.run.unloggedLastSet();
        if (!last) {
            return null;
        }
        const { exerciseId, name } = last.step;
        const current = exerciseId === undefined ? undefined : this.exerciseName(exerciseId);
        return { name: current || name.trim() || 'the reps', reps: last.step.reps };
    });
    /** Starts at the step's reps, as most of a set is likely done by then. */
    protected readonly lastSetReps = linkedSignal(() => this.lastSet()?.reps ?? 1);
    /** This run in the history; missing when it ended before its first step was done. */
    protected readonly entry = computed(() => {
        const id = this.run.runId();
        return this.history.entries().find((entry) => entry.id === id);
    });
    protected readonly title = computed(() => {
        const entry = this.entry();
        return entry ? entryName(entry) : (this.run.workout()?.title.trim() ?? '');
    });

    protected readonly weightUnit = this.settings.weightUnit;
    private readonly exerciseName = ownExerciseName(this.exercises);
    /**
     * The bests this run set (PRG-2), e.g. "Heaviest: 80 kg × 5", and "Most rounds" for a
     * time limit (PRG-7). Equalling a best isn't one, and nor is doing it for the first time.
     */
    protected readonly personalBests = computed(() => {
        const entry = this.entry();
        if (!entry) {
            return [];
        }
        const before = sessionsByExercise(
            this.history.entries().filter((other) => other.id !== entry.id)
        );
        const lines: string[] = [];
        const score = roundsScore(entry);
        if (score && isMostRounds(entry, this.history.entries())) {
            lines.push(`Most rounds: ${describeScore(score)}`);
        }
        for (const [exerciseId, [session]] of sessionsByExercise([entry])) {
            // Newest first, as the history is, so on a tie the earlier best stands
            const bests = newBests([session, ...(before.get(exerciseId) ?? [])]);
            for (const line of bestLines(bests, this.weightUnit())) {
                if (line.entryId === entry.id) {
                    lines.push(`${line.label}: ${line.text}`);
                }
            }
        }
        return lines;
    });

    /** The muscles this workout's sets worked, main and supporting, for the body map. */
    protected readonly muscles = computed(() =>
        musclesInSets(this.run.sets(), (id) => this.exercises.byId(id))
    );

    protected logLastSet() {
        this.run.logLastSet(this.lastSetReps());
    }

    protected readonly repOptions = REP_OPTIONS;

    // The note box starts from the saved note
    private readonly noteModel = linkedSignal(() => ({ note: this.entry()?.note ?? '' }));
    protected readonly noteForm = form(this.noteModel, (note) =>
        maxLength(note.note, MAX_NOTE_LENGTH)
    );

    /** Saves the note as it is, e.g. on leaving the box or the summary. */
    protected saveNote() {
        const id = this.entry()?.id;
        const note = this.noteModel().note;
        if (id && !this.noteForm().invalid() && note.trim() !== (this.entry()?.note ?? '')) {
            this.history.setNote(id, note);
        }
    }

    protected leave(to: 'back' | 'done') {
        this.saveNote();
        this[to].emit();
    }

    /** Escape goes back to the workout, where there's one to go back to. */
    protected onEscape(event: Event) {
        event.stopPropagation();
        if (!this.finished()) {
            this.leave('back');
        }
    }

    private readonly sheet = viewChild.required<ElementRef<HTMLElement>>('sheet');
    private readonly grabber = viewChild<ElementRef<HTMLElement>>('grabber');
    protected readonly sheetDrag = new SheetDrag({
        sheet: () => this.sheet().nativeElement,
        grabber: () => this.grabber()?.nativeElement,
        host: inject<ElementRef<HTMLElement>>(ElementRef).nativeElement,
        finished: this.finished,
        reducedMotion: injectPrefersReducedMotion(),
        goBack: () => this.leave('back'),
    });
}
