import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, input, output, signal } from '@angular/core';
import { WEEKDAYS } from '../../models/plan';
import { DropSpring } from '../../shared/drop-spring';
import { injectFocusAfterRender } from '../../shared/focus-after-render';
import { PlanMarkComponent } from './plan-mark.component';
import { DayMove, PlanWeekDay } from './plan-week-day';

/**
 * A ready-made plan's week (PLN-6), Monday first: a day to a column under its letter, each
 * workout a numbered, coloured mark, active rest a quiet ring, a rest day dashed. A day can be
 * dragged to another place in the week (held a moment first, on a phone, so the page still
 * scrolls), or pressed and then another pressed, by a tap or a keyboard, to move its workouts
 * there; the others shift along (`moved`). Once moved, **Back to its days** puts it back
 * (`reset`).
 */
@Component({
    selector: 'app-plan-week',
    imports: [CdkDrag, CdkDropList, PlanMarkComponent],
    template: `
        <p class="plan-week__hint" [id]="id() + '-hint'">
            {{
                picked() === null
                    ? 'Drag a day to move it, or tap it and then where it goes.'
                    : 'Now tap where ' + names[picked()!] + ' goes.'
            }}
        </p>
        <div class="plan-week__letters" aria-hidden="true">
            @for (name of names; track $index) {
                <span>{{ name[0] }}</span>
            }
        </div>
        <ol
            class="plan-week__days"
            data-drags
            cdkDropList
            cdkDropListOrientation="horizontal"
            cdkDropListLockAxis="x"
            [attr.aria-label]="'The week of ' + title()"
            (cdkDropListDropped)="dropped($event)"
        >
            @for (day of days(); track $index; let i = $index) {
                <li
                    [class]="'plan-week__day plan-week__day--' + day.kind"
                    [style.--c]="day.colour ? 'var(--plan-' + day.colour + ')' : null"
                    cdkDrag
                    [cdkDragStartDelay]="{ touch: 250, mouse: 0 }"
                    (cdkDragStarted)="dragStarted()"
                    (cdkDragMoved)="drop.moved($event)"
                    (cdkDragReleased)="drop.released($event)"
                >
                    <button
                        type="button"
                        class="plan-week__press"
                        [id]="id() + '-day-' + i"
                        [attr.aria-pressed]="picked() === i"
                        [attr.aria-label]="label(day, i)"
                        [attr.aria-describedby]="id() + '-hint'"
                        (click)="press(i)"
                        (keydown.escape)="picked.set(null)"
                    >
                        @for (workout of day.workouts; track $index) {
                            <app-plan-mark
                                [number]="workout.number"
                                [colour]="workout.colour"
                                [small]="day.workouts.length > 1"
                            />
                        } @empty {
                            <span class="plan-week__rest"></span>
                        }
                    </button>
                </li>
            }
        </ol>
        @if (changed()) {
            <button type="button" class="plan-week__reset" (click)="putBack()">
                Back to its days
            </button>
        }
        <p class="sr-only" role="status">{{ announcement() }}</p>
    `,
    styleUrl: './plan-week.component.scss',
})
export class PlanWeekComponent {
    readonly days = input.required<readonly PlanWeekDay[]>();
    /** The plan's title, for screen readers. */
    readonly title = input.required<string>();
    /** What its ids start with, the card's own. */
    readonly id = input.required<string>();
    /** Whether a day's been moved, so Back to its days shows. */
    readonly changed = input(false);
    readonly moved = output<DayMove>();
    readonly reset = output<void>();

    protected readonly names = WEEKDAYS;
    private readonly focusAfterRender = injectFocusAfterRender();
    /** The day pressed first, to move where the next press says; null for none. */
    protected readonly picked = signal<number | null>(null);
    protected readonly announcement = signal('');
    protected readonly drop = new DropSpring();
    /** A drag ends with a click on the day, which isn't a press. */
    private dragged = false;

    /** "Monday: Gym full body", "Saturday: rest", and whether it's picked to move. */
    protected label(day: PlanWeekDay, i: number): string {
        const what = day.workouts.length
            ? day.workouts.map((workout) => workout.title).join(', ')
            : 'rest';
        return `${WEEKDAYS[i]}: ${what}`;
    }

    protected dragStarted() {
        this.picked.set(null);
        this.dragged = true;
    }

    protected dropped(event: CdkDragDrop<unknown>) {
        // The click that follows the drop, if any, comes first
        setTimeout(() => (this.dragged = false));
        this.move(event.previousIndex, event.currentIndex);
    }

    /** The first press picks a day; the next moves it there, or, on itself, puts it down. */
    protected press(i: number) {
        if (this.dragged) {
            this.dragged = false;
            return;
        }
        const from = this.picked();
        if (from === null) {
            this.picked.set(i);
            this.announcement.set(`${WEEKDAYS[i]} picked. Now pick where it goes.`);
            return;
        }
        this.picked.set(null);
        if (from === i) {
            this.announcement.set(`${WEEKDAYS[i]} put down`);
            return;
        }
        this.move(from, i);
    }

    protected putBack() {
        this.picked.set(null);
        this.reset.emit();
        this.announcement.set('Its days are back as they came');
        // As the button goes
        this.focusAfterRender(`${this.id()}-day-0`);
    }

    private move(from: number, to: number) {
        if (from === to) {
            return;
        }
        const day = this.days()[from];
        const what = day.workouts.length
            ? day.workouts.map((workout) => workout.title).join(' and ')
            : 'The rest day';
        this.moved.emit({ from, to });
        this.announcement.set(`${what} moved to ${WEEKDAYS[to]}`);
    }
}
