import { Component, computed, input, model } from '@angular/core';
import { MotionView, Pose } from '../../models/exercise-motion';
import { LimbControlComponent } from './limb-control.component';
import { NumberSliderComponent } from './number-slider.component';
import {
    BODY_FIELDS,
    fallbackOf,
    PoseField,
    shownFrom,
    SOLID_FIELDS,
    valueOf,
    withField,
} from './pose-fields';

/** Every number of one pose, for the posing tool: the body, each limb, and what only 3D shows. */
@Component({
    selector: 'app-pose-sliders',
    imports: [LimbControlComponent, NumberSliderComponent],
    template: `
        @for (group of groups(); track group.id) {
            <section class="sliders__group" [attr.aria-labelledby]="group.id">
                <h3 class="sliders__heading" [id]="group.id">{{ group.heading }}</h3>
                @for (field of group.fields; track field.label) {
                    <app-number-slider
                        [label]="field.label"
                        [min]="field.min"
                        [max]="field.max"
                        [step]="field.step ?? 0.5"
                        [optional]="field.optional ?? false"
                        [fallback]="fallback(field)"
                        [value]="value(field)"
                        (valueChange)="set(field, $event)"
                    />
                }
            </section>
            <!-- The limbs after the body, before what only 3D shows -->
            @if ($first) {
                <section class="sliders__group" aria-labelledby="sliders-limbs">
                    <h3 class="sliders__heading" id="sliders-limbs">Arms and legs</h3>
                    @for (limb of limbs; track limb.label) {
                        <app-limb-control
                            [(pose)]="pose"
                            [view]="view()"
                            [limbs]="limb.limbs"
                            [index]="limb.index"
                            [label]="limb.label"
                        />
                    }
                </section>
            }
        }
    `,
    styles: `
        :host {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }

        .sliders__group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .sliders__heading {
            margin: 0;
            color: var(--text-strong);
            font-size: 1rem;
        }
    `,
})
export class PoseSlidersComponent {
    readonly pose = model.required<Pose>();
    readonly view = input.required<MotionView>();

    protected readonly limbs = [
        { limbs: 'arms', index: 0, label: 'Near arm' },
        { limbs: 'arms', index: 1, label: 'Far arm' },
        { limbs: 'legs', index: 0, label: 'Near leg' },
        { limbs: 'legs', index: 1, label: 'Far leg' },
    ] as const;
    /** The body's numbers, and what only 3D shows (the kettlebell's place only if it's set down). */
    protected readonly groups = computed(() => {
        const view = this.view();
        const shown = (fields: readonly PoseField[]) =>
            fields.filter(
                (field) =>
                    shownFrom(field, view) &&
                    (field.key !== 'bellAt' || this.pose().bellAt !== undefined)
            );
        return [
            { id: 'sliders-body', heading: 'Body', fields: shown(BODY_FIELDS) },
            { id: 'sliders-solid', heading: 'Only in 3D', fields: shown(SOLID_FIELDS) },
        ];
    });

    protected value(field: PoseField) {
        return valueOf(field, this.pose());
    }

    protected fallback(field: PoseField) {
        return fallbackOf(field, this.pose(), this.view());
    }

    protected set(field: PoseField, value: number | undefined) {
        this.pose.set(withField(this.pose(), this.view(), field, value));
    }
}
