import { CdkTrapFocus } from '@angular/cdk/a11y';
import { DatePipe } from '@angular/common';
import {
    afterNextRender,
    Component,
    computed,
    ElementRef,
    inject,
    input,
    output,
    viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { describeRounds, formatDuration } from '../../history/history-format';
import { Workout } from '../../models/workout';
import { musclesWorked } from '../../models/workout-muscles';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { WorkoutOutlineComponent } from '../../shared/components/workout-outline/workout-outline.component';
import { growFromClick } from '../../shared/dialog-origin';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { HistoryStore } from '../../shared/state/history-store.service';

/** How many of its latest runs it lists. */
const RECENT_RUNS = 5;

/**
 * A workout's details, from its options in the library: the muscles its exercises work, on
 * the body map; its history, with its latest runs linking to them on the Progress page; and
 * what's in it, each step and its sets, so it can be read without opening Edit.
 * Focus starts on its title and is trapped inside while it's open.
 */
@Component({
    selector: 'app-workout-details-dialog',
    imports: [
        BodyMapComponent,
        CdkTrapFocus,
        DatePipe,
        MatIconModule,
        RouterLink,
        WorkoutOutlineComponent,
    ],
    templateUrl: './workout-details-dialog.component.html',
    styleUrl: './workout-details-dialog.component.scss',
})
export class WorkoutDetailsDialogComponent {
    readonly workout = input.required<Workout>();
    readonly closed = output<void>();
    readonly editRequested = output<void>();

    private readonly exercises = inject(ExerciseStore);
    private readonly history = inject(HistoryStore);
    private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');

    protected readonly name = computed(() => this.workout().title.trim() || 'Untitled workout');
    protected readonly muscles = computed(() =>
        musclesWorked([this.workout()], (id) => this.exercises.byId(id))
    );
    /** Its runs, newest first, as the history keeps them. */
    private readonly runs = computed(() =>
        this.history.entries().filter((entry) => entry.workoutId === this.workout().id)
    );
    protected readonly timesDone = computed(() => {
        const count = this.runs().length;
        return count === 1 ? 'Done once' : `Done ${count} times`;
    });
    protected readonly recentRuns = computed(() =>
        this.runs()
            .slice(0, RECENT_RUNS)
            .map((entry) => ({
                id: entry.id,
                startedAt: entry.startedAt,
                text: `${describeRounds(entry)} · ${formatDuration(entry.activeSeconds)}`,
            }))
    );
    protected readonly moreRuns = computed(() => this.runs().length > RECENT_RUNS);

    constructor() {
        // Grows out of the Details item that opened it, and shrinks back into it
        afterNextRender(() => growFromClick(this.card().nativeElement));
    }
}
