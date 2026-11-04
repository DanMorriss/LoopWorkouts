import { CdkTrapFocus } from '@angular/cdk/a11y';
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
import { WorkoutOutlineComponent } from '../../shared/components/workout-outline/workout-outline.component';
import { musclesWorked } from '../../models/workout-muscles';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { DialogBackComponent } from '../../shared/components/dialog-back/dialog-back.component';
import { growFromClick } from '../../shared/dialog-origin';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import type { ReadyMadeCard } from './ready-made.component';

/**
 * A ready-made workout's preview (LIB-6): what it is and needs, every exercise with its sets,
 * and the muscles it works, with Add to library and Add and start. Focus starts on its title
 * and is trapped inside while it's open. ‹ Ready-made at its top, Escape or a click outside
 * close it.
 */
@Component({
    selector: 'app-ready-made-dialog',
    imports: [
        BodyMapComponent,
        CdkTrapFocus,
        DialogBackComponent,
        MatIconModule,
        WorkoutOutlineComponent,
    ],
    templateUrl: './ready-made-dialog.component.html',
    styleUrl: './ready-made-dialog.component.scss',
})
export class ReadyMadeDialogComponent {
    readonly card = input.required<ReadyMadeCard>();
    readonly closed = output<void>();
    readonly added = output<void>();
    readonly started = output<void>();

    private readonly exercises = inject(ExerciseStore);
    private readonly dialogCard = viewChild.required<ElementRef<HTMLElement>>('dialogCard');

    protected readonly muscles = computed(() =>
        musclesWorked([this.card().workout], (id) => this.exercises.byId(id))
    );

    constructor() {
        // Grows out of the card that opened it, and shrinks back into it
        afterNextRender(() => growFromClick(this.dialogCard().nativeElement));
    }
}
