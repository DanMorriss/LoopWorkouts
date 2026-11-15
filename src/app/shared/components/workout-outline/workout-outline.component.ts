import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { Workout } from '../../../models/workout';
import { outline, repeatsText } from '../../../models/workout-outline';
import { PageSlide } from '../../navigation/page-slide';
import { IconComponent } from '../icon/icon.component';

/** A step whose sets can be changed from the outline: its button's id, and its sets as they read. */
export interface OutlineAmount {
    id: string;
    /** e.g. "3 × 10 @ 60 kg", in place of the outline's own, with its rest after the button. */
    text: string;
}

/**
 * A workout written out to read: how many times it goes round, then its headings, each
 * exercise with its sets, and each superset with its rounds and steps. In a ready-made
 * workout's preview (LIB-6) and a workout's details (LIB-4), where `exerciseUrl` makes each
 * exercise a link to its page, sliding in, with a › to show it is on a phone. `amounts`
 * makes the sets of the steps in it a button with a pencil, pressed to change them
 * (`changeAmount`, with the step's place in `allSteps()`): a ready-made workout's on its
 * details.
 */
@Component({
    selector: 'app-workout-outline',
    imports: [IconComponent, NgTemplateOutlet],
    template: `
        <ng-template #name let-step>
            @if (urlOf(step.exerciseId); as url) {
                <a
                    class="outline__name outline__link"
                    [href]="url"
                    (click)="slide.follow($event, url, 'in')"
                    >{{ step.name }} <app-icon class="outline__chevron">chevron_right</app-icon></a
                >
            } @else {
                <span class="outline__name">{{ step.name }}</span>
            }
        </ng-template>

        <ng-template #amount let-step>
            @if (amounts()?.get(step.index); as change) {
                <span class="outline__sets">
                    <button
                        type="button"
                        class="btn-pill outline__change"
                        [id]="change.id"
                        aria-haspopup="dialog"
                        [attr.aria-label]="'Change ' + step.name + ', ' + change.text"
                        (click)="changeAmount.emit(step.index)"
                    >
                        {{ change.text }}
                        <app-icon class="outline__pencil">edit</app-icon>
                    </button>
                    @if (step.rest) {
                        <span class="outline__rest">{{ step.rest }}</span>
                    }
                </span>
            } @else {
                <span class="outline__amount">{{ step.amount }}</span>
            }
        </ng-template>

        <p class="outline__repeats">{{ repeats() }}</p>
        <ul class="outline__lines" [class.outline__lines--links]="exerciseUrl()">
            @for (line of lines(); track $index) {
                @switch (line.kind) {
                    @case ('heading') {
                        <li class="outline__part">{{ line.text }}</li>
                    }
                    @case ('step') {
                        <li class="outline__line">
                            <ng-container
                                [ngTemplateOutlet]="name"
                                [ngTemplateOutletContext]="{ $implicit: line }"
                            />
                            {{ ' ' }}
                            <ng-container
                                [ngTemplateOutlet]="amount"
                                [ngTemplateOutletContext]="{ $implicit: line }"
                            />
                        </li>
                    }
                    @case ('superset') {
                        <li class="outline__line outline__line--superset">
                            <span class="outline__name">{{ line.name }}</span>
                            {{ ' ' }}
                            <span class="outline__amount">{{ line.amount }}</span>
                            <ul class="outline__lines outline__lines--inner">
                                @for (step of line.steps; track $index) {
                                    <li class="outline__line">
                                        <ng-container
                                            [ngTemplateOutlet]="name"
                                            [ngTemplateOutletContext]="{ $implicit: step }"
                                        />
                                        {{ ' ' }}
                                        <ng-container
                                            [ngTemplateOutlet]="amount"
                                            [ngTemplateOutletContext]="{ $implicit: step }"
                                        />
                                    </li>
                                }
                            </ul>
                        </li>
                    }
                }
            }
        </ul>
    `,
    styleUrl: './workout-outline.component.scss',
})
export class WorkoutOutlineComponent {
    readonly workout = input.required<Pick<Workout, 'blocks' | 'repeats' | 'timeLimitSeconds'>>();
    /** Where a linked exercise's link goes, or null if it has no page; none means no links. */
    readonly exerciseUrl = input<(exerciseId: string) => string | null>();
    /** The steps whose sets can be changed here, by their place in `allSteps()`. */
    readonly amounts = input<ReadonlyMap<number, OutlineAmount>>();
    /** A step's sets pressed, to change them: its place in `allSteps()`. */
    readonly changeAmount = output<number>();

    protected readonly slide = inject(PageSlide);

    protected readonly lines = computed(() => outline(this.workout()));
    protected readonly repeats = computed(() => repeatsText(this.workout()));

    protected urlOf(exerciseId: string | undefined): string | null {
        return (exerciseId && this.exerciseUrl()?.(exerciseId)) || null;
    }
}
