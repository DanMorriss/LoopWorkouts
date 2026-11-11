import { CdkDrag, CdkDragDrop, CdkDragStart } from '@angular/cdk/drag-drop';
import { afterNextRender, inject, Injectable, Injector, signal } from '@angular/core';
import { DropSpring } from '../shared/drop-spring';
import { movedRow, partEnd, StepModel, wellFormed } from './step-model';
import { WorkoutSetupForm } from './workout-setup-form';

/** Dragging Create's rows by their handles. One for each Create page. */
@Injectable()
export class SetupDrag {
    private readonly form = inject(WorkoutSetupForm);
    private readonly injector = inject(Injector);

    /**
     * Where a step's handle was grabbed, from the step's top left (px). The CDK puts a custom
     * preview's top left corner at the pointer, so the preview is moved back by this much,
     * keeping the pointer where it took hold rather than jumping to the corner. No wider than
     * the step, so it stays on screen.
     */
    readonly grabbedAt = signal({ x: 0, y: 0, width: 0 });
    /** A step let go settles into its place at the finger's speed. */
    readonly drop = new DropSpring();

    /**
     * The superset being dragged: its steps hide from when the drag starts until it's dropped,
     * so it drags as one row, its steps following it (`dropStep`). 0 for none. Only once it's
     * dragging, so pressing its handle leaves the list where it is under the finger.
     */
    readonly heldSuperset = signal(0);

    grabStep(event: PointerEvent) {
        const step = (event.currentTarget as Element).closest('.step')?.getBoundingClientRect();
        if (step) {
            this.grabbedAt.set({
                x: event.clientX - step.left,
                y: event.clientY - step.top,
                width: step.width,
            });
        }
    }

    dragStarted({ source }: CdkDragStart<number>) {
        const row = this.form.model().steps.find((other) => other.key === source.data);
        if (row?.kind !== 'superset') {
            return;
        }
        this.heldSuperset.set(row.key);
        // The CDK measured the rows as the drag started, with its steps still showing: once
        // they've folded away, it measures them again, so the rows below sort where they are
        const list = source.dropContainer;
        afterNextRender(
            () => {
                if (this.heldSuperset() === row.key && list?._dropListRef.isDragging()) {
                    list._dropListRef.withItems(list.getSortedItems().map((item) => item._dragRef));
                }
            },
            { injector: this.injector }
        );
    }

    /**
     * Where a dragged row can go: anywhere that keeps each superset's steps together under its
     * row, so a step in one stays in it, and others go round it. Straight after a collapsed
     * superset's row is let through too, as that's after the superset on screen (`dropStep`).
     */
    readonly canDropAt = (index: number, drag: CdkDrag<number>): boolean => {
        const from = this.form.model().steps.findIndex((row) => row.key === drag.data);
        const rows = movedRow(this.form.model().steps, from, index);
        const at = rows.findIndex((row) => row.key === drag.data);
        const before = rows[at - 1];
        return (
            wellFormed(rows) ||
            (rows[at].group === 0 &&
                before?.kind === 'superset' &&
                !this.form.isExpanded(before.key))
        );
    };

    /** A step dragged by its handle and dropped in a new place. */
    dropStep(event: CdkDragDrop<unknown>) {
        this.heldSuperset.set(0);
        if (event.previousIndex === event.currentIndex) {
            return;
        }
        const key = this.form.model().steps[event.previousIndex].key;
        let rows = movedRow(this.form.model().steps, event.previousIndex, event.currentIndex);
        if (!wellFormed(rows)) {
            // Dropped just after a collapsed superset's row: it goes after its steps
            const at = rows.findIndex((row) => row.key === key);
            const part = rows.slice(at, partEnd(rows, at));
            rows = rows.filter((row) => !part.includes(row));
            rows.splice(partEnd(rows, at - 1), 0, ...part);
        }
        this.form.placeRows(rows, key);
    }

    /** Whether a row's in a superset that's collapsed, which shows as one line. */
    isHidden(step: StepModel): boolean {
        return (
            step.group !== 0 &&
            (!this.form.isExpanded(step.group) || step.group === this.heldSuperset())
        );
    }
}
