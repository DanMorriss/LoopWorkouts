import { Workout } from '../../models/workout';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
    AnimationCallbackEvent,
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
import { isActiveRest } from '../../models/active-rest';
import { stretchOffer } from '../../models/stretch-routine';
import { musclesInSets } from '../../models/workout-muscles';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { entryName } from '../../history/history-format';
import { injectPrefersReducedMotion } from '../../shared/reduced-motion';
import { SummarySetsComponent } from './summary-sets/summary-sets.component';
import { SummaryCopyComponent } from './summary-copy/summary-copy.component';
import { SummaryKettlebellComponent } from './summary-kettlebell/summary-kettlebell.component';
import { SummaryStepUpsComponent } from './summary-step-ups/summary-step-ups.component';
import { SummaryStretchComponent } from './summary-stretch/summary-stretch.component';
import { SummarySwapsComponent } from './summary-swaps/summary-swaps.component';
import { SheetDrag } from '../../shared/sheet-drag';
import { SummaryStatsComponent } from './summary-stats/summary-stats.component';
import { SummaryBestsComponent } from './summary-bests/summary-bests.component';

/**
 * How the workout went, once it's finished or ended with End workout: the time, rounds and
 * sets, which can be corrected, what to step up next time, the muscles worked, a note, and
 * the suggested next workout. A workout ended early (or one that runs until stopped) can be
 * taken up again with Back to workout; the run waits, paused, until then. Stretches for the
 * muscles it worked can be started from here, from its card or the bottom bar, where it's
 * the main button over Done. Focus starts on
 * the heading and is trapped inside while it's open.
 */
@Component({
    selector: 'app-workout-summary',
    imports: [
        BodyMapComponent,
        CdkTrapFocus,
        FormField,
        MatIconModule,
        SummaryCopyComponent,
        SummarySetsComponent,
        SummaryStatsComponent,
        SummaryBestsComponent,
        SummaryKettlebellComponent,
        SummaryStepUpsComponent,
        SummaryStretchComponent,
        SummarySwapsComponent,
    ],
    templateUrl: './workout-summary.component.html',
    styleUrl: './workout-summary.component.scss',
    // Going, it sinks back down the way it came, from wherever it is (sheetDrag.leave)
    host: { '(animate.leave)': 'onLeave($event)' },
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
    /** Make a copy, of a ready-made workout: the copy, to open in Create. */
    readonly copied = output<Workout>();
    /** Start stretches: the stretches for this workout, to run in its place. */
    readonly stretch = output<Workout>();

    protected readonly finished = this.run.isComplete;
    protected readonly heading = computed(() => {
        if (!this.finished()) {
            return 'Workout ended';
        }
        return this.run.workout()?.timeLimitSeconds === undefined
            ? 'Workout finished'
            : "Time's up";
    });
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
    /** The muscles this workout's sets worked, main and supporting, for the body map. */
    protected readonly muscles = computed(() =>
        musclesInSets(this.run.sets(), (id) => this.exercises.byId(id))
    );

    /**
     * Stretches for the muscles this workout worked hardest (PRG-16): not after a workout of
     * only stretches, nor one with nothing logged that works a muscle.
     */
    protected readonly stretches = computed(() => {
        const workout = this.run.workout();
        return !workout || isActiveRest(workout)
            ? null
            : stretchOffer(this.run.sets(), (id) => this.exercises.byId(id), {
                  first: this.settings.eachSideFirst(),
                  switchSeconds: this.settings.switchSidesSeconds(),
              });
    });

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

    protected startStretches(routine: Workout) {
        this.saveNote();
        this.stretch.emit(routine);
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
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    protected readonly sheetDrag = new SheetDrag({
        sheet: () => this.sheet().nativeElement,
        grabber: () => this.grabber()?.nativeElement,
        scrim: () => this.host,
        // A finished workout has nothing to go back to, so its heading doesn't drag the sheet
        canGoAway: computed(() => !this.finished()),
        // Not a touch in a dialog over the sheet, e.g. a set's wheels, which are scrolled
        ownsTouch: (target) => !target.closest('app-dialog'),
        // On a wider screen, a little way down as it fades, as it came
        cardAway: { transform: 'translateY(2rem)', opacity: 0 },
        reducedMotion: injectPrefersReducedMotion(),
        goneAway: () => this.leave('back'),
    });

    protected onLeave(event: AnimationCallbackEvent) {
        // Done with as it goes, so taps reach the workout under it straight away
        this.host.style.pointerEvents = 'none';
        void this.sheetDrag.leave().finally(event.animationComplete);
    }
}
