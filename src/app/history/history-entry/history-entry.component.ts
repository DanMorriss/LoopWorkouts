import {
    afterNextRender,
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    Injector,
    input,
    linkedSignal,
    output,
    untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { form, FormField, maxLength } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { HistoryEntry, isTimedSet, MAX_NOTE_LENGTH } from '../../models/history';
import { HistoryStore } from '../../shared/state/history-store.service';
import {
    describeRounds,
    describeSets,
    entryName,
    formatDuration,
    sectionsOf,
} from '../history-format';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { CaloriesService } from '../../shared/state/calories.service';
import { exercisePath, isBuiltIn } from '../../models/exercise';
import { SetLinesComponent } from '../set-lines/set-lines.component';
import { ChangeSetLinesComponent, SetsChanged } from '../set-lines/change-set-lines.component';
import { musclesInSets, musclesOnACard } from '../../models/workout-muscles';
import { ShowcaseCountComponent } from '../../shared/components/showcase/showcase-count.component';
import { ShowcaseMusclesComponent } from '../../shared/components/showcase/showcase-muscles.component';
import { MenuPlacementDirective } from '../../shared/menu-placement.directive';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { PageSlide } from '../../shared/navigation/page-slide';

/**
 * One workout in the history, as a card in the family of Workouts' and Plan's: its title, the
 * time it took as the big number, the main muscles its sets worked, and its sets. Pressing it
 * slides in its workout's details, to favourite it or make a copy, while the workout's still
 * there. Its ⋮ menu
 * adds, edits or removes its note, changes its reps and weights, or deletes it. The history
 * decides which entry's menu is open, which note is being edited and whose sets are being
 * changed (one of each at a time); the entry shows that, saves notes itself, and asks the
 * history to change its sets or delete it, so the history can offer Undo.
 */
@Component({
    selector: 'li[appHistoryEntry]',
    imports: [
        ChangeSetLinesComponent,
        DatePipe,
        FormField,
        MatIconModule,
        MenuPlacementDirective,
        RouterLink,
        SetLinesComponent,
        ShowcaseCountComponent,
        ShowcaseMusclesComponent,
    ],
    templateUrl: './history-entry.component.html',
    styleUrl: './history-entry.component.scss',
    host: {
        class: 'entry',
        '[id]': "'entry-' + entry().id",
        // Focusable from code only, for arriving from the workout summary
        tabindex: '-1',
        '[class.entry--stopped]': "entry().outcome === 'stopped'",
        '[class.entry--highlighted]': 'highlighted()',
        '[class.entry--menu-open]': 'menuOpen()',
        '[class.entry--editing]': 'editing() || changingSets()',
    },
})
export class HistoryEntryComponent {
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly calories = inject(CaloriesService);
    private readonly workouts = inject(WorkoutStore);
    private readonly slide = inject(PageSlide);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);

    readonly entry = input.required<HistoryEntry>();
    /** Whether this entry's menu is open. */
    readonly menuOpen = input(false);
    /** Whether its note is being added or edited. */
    readonly editing = input(false);
    /** Whether its sets are being changed, each rep exercise's line opening its sets. */
    readonly changingSets = input(false);
    /** The run just finished, when arriving from the workout summary. */
    readonly highlighted = input(false);

    readonly menuToggled = output<void>();
    readonly menuClosed = output<void>();
    readonly editRequested = output<void>();
    readonly editClosed = output<void>();
    readonly deleteRequested = output<void>();
    readonly changeSetsRequested = output<void>();
    readonly changeSetsClosed = output<void>();
    /** Some of an exercise's sets were corrected. */
    readonly setsChanged = output<SetsChanged>();

    protected readonly name = computed(() => entryName(this.entry()));
    protected readonly duration = computed(() => formatDuration(this.entry().activeSeconds));
    protected readonly rounds = computed(() => describeRounds(this.entry()));
    /** About how many calories it burnt (CAL-1), with a body weight given. */
    protected readonly burnt = computed(() => this.calories.describe(this.entry()));
    /**
     * Its sets, one line per step, in the unit chosen in settings. Each is linked to its
     * exercise's page, where it has one.
     */
    protected readonly sets = computed(() =>
        describeSets(this.entry().sets ?? [], this.settings.weightUnit(), (id) => {
            // Built-in names never change, so a set keeps the name it ran with, e.g. "Squats"
            const exercise = this.exercises.byId(id);
            return exercise && !isBuiltIn(exercise) ? exercise.name : undefined;
        }).map((line) => {
            const exercise = line.exerciseId ? this.exercises.byId(line.exerciseId) : undefined;
            return { ...line, path: exercise ? exercisePath(exercise) : null };
        })
    );
    /**
     * Its lines under the workout's headings, and with its supersets, as they were when it ran
     * (BLD-12, BLD-13).
     */
    protected readonly sections = computed(() =>
        sectionsOf(this.sets(), this.entry().headings, this.entry().supersets)
    );
    /** The main muscles its sets worked, as a workout's card names them. */
    protected readonly muscles = computed(() =>
        musclesOnACard(musclesInSets(this.entry().sets ?? [], (id) => this.exercises.byId(id)).main)
    );
    protected readonly id = computed(() => this.entry().id);
    /** Whether it has rep sets, which can be corrected (timed ones ran as set). */
    protected readonly hasRepSets = computed(() =>
        (this.entry().sets ?? []).some((set) => !isTimedSet(set))
    );
    /**
     * Its workout's details, coming back to this entry (`?run=`); none for a workout deleted
     * since, or an example while the tour shows the page.
     */
    protected readonly workoutUrl = computed(() => {
        const { workoutId, id } = this.entry();
        return this.workouts.findAnyWorkout(workoutId)
            ? `/library/${workoutId}?run=${encodeURIComponent(id)}`
            : null;
    });

    // The box starts from the saved note each time it opens
    private readonly noteModel = linkedSignal(() => {
        this.editing();
        return { note: this.entry().note ?? '' };
    });
    protected readonly noteForm = form(this.noteModel, (note) =>
        maxLength(note.note, MAX_NOTE_LENGTH)
    );

    constructor() {
        // Into the note box as it opens, from the menu or straight from the workout summary
        effect(() => {
            if (this.editing()) {
                untracked(() => this.focusAfterRender(`#note-${CSS.escape(this.id())}`));
            }
        });
        // Onto its first exercise's sets, as they turn into buttons
        effect(() => {
            if (this.changingSets()) {
                untracked(() => this.focusAfterRender('.change-line'));
            }
        });
    }

    protected open(event: MouseEvent) {
        const url = this.workoutUrl();
        if (url) {
            this.slide.follow(event, url, 'in');
        }
    }

    /**
     * Saves the note and closes the box. Handled here rather than as a form submission: the
     * box closes as it saves, and a form taken away mid-submission stays "submitting".
     */
    protected saveNote(event: Event) {
        event.preventDefault();
        if (this.noteForm().invalid()) {
            return;
        }
        this.history.setNote(this.id(), this.noteModel().note);
        this.closeEditor();
    }

    protected cancelEdit(event?: Event) {
        // Escape in the box shouldn't also reach anything around it
        event?.stopPropagation();
        this.closeEditor();
    }

    protected removeNote() {
        this.history.setNote(this.id(), '');
        this.menuClosed.emit();
    }

    protected closeSets() {
        this.changeSetsClosed.emit();
        this.focusAfterRender(`#menu-${CSS.escape(this.id())}`);
    }

    private closeEditor() {
        this.editClosed.emit();
        this.focusAfterRender(`#menu-${CSS.escape(this.id())}`);
    }

    private focusAfterRender(selector: string) {
        afterNextRender(
            () => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(),
            { injector: this.injector }
        );
    }
}
