import { Component, computed, input, linkedSignal, model } from '@angular/core';
import { Limb, MotionView, Pose } from '../../models/exercise-motion';
import { limbAs, LimbKind, limbKind, LimbSet, withLimb } from '../../models/pose-editing';
import { NumberSliderComponent } from './number-slider.component';

/** The ways a limb can be given, with their sliders' names and ranges. */
const KINDS: Record<LimbKind, { label: string; sliders: readonly Slider[] }> = {
    angles: {
        label: 'Angles',
        sliders: [
            { label: 'Upper', min: -180, max: 360 },
            { label: 'Lower', min: -180, max: 360 },
        ],
    },
    reach: {
        label: 'Reach',
        sliders: [
            { label: 'End x', min: -160, max: 160 },
            { label: 'End y', min: -260, max: 10 },
        ],
    },
    touch: {
        label: 'Touch',
        sliders: [
            { label: 'Forward', min: -60, max: 60 },
            { label: 'Up', min: -70, max: 30 },
        ],
    },
};

interface Slider {
    readonly label: string;
    readonly min: number;
    readonly max: number;
}

/**
 * One arm or leg of a pose, for the posing tool: how it's given (switching keeps it where it
 * is), its two numbers, and which way the elbow or knee bends.
 */
@Component({
    selector: 'app-limb-control',
    imports: [NumberSliderComponent],
    template: `
        <fieldset class="limb">
            <legend class="limb__name">{{ label() }}</legend>
            <div class="limb__choices">
                @for (kind of kinds(); track kind) {
                    <button
                        type="button"
                        class="limb__choice"
                        [attr.aria-pressed]="kind === current()"
                        (click)="giveAs(kind)"
                    >
                        {{ kindLabel(kind) }}
                    </button>
                }
            </div>
            @if (onBar()) {
                <p class="limb__note">On the barbell: pick Reach to move it off.</p>
            } @else {
                @for (slider of sliders(); track slider.label; let i = $index) {
                    <app-number-slider
                        [label]="slider.label"
                        [min]="slider.min"
                        [max]="slider.max"
                        [value]="numbers()[i]"
                        (valueChange)="setNumber(i, $event ?? 0)"
                    />
                }
            }
            @let bend = bendOf();
            @if (bend) {
                <div class="limb__choices">
                    @for (way of bends; track way) {
                        <button
                            type="button"
                            class="limb__choice"
                            [attr.aria-pressed]="way === bend"
                            (click)="setBend(way)"
                        >
                            Bend {{ way }}
                        </button>
                    }
                </div>
            }
        </fieldset>
    `,
    styles: `
        @use 'chip' as *;

        .limb {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            margin: 0;
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            padding: 0.5rem 0.75rem 0.75rem;
        }

        .limb__name {
            padding: 0 0.25rem;
            color: var(--text-strong);
        }

        .limb__choices {
            display: flex;
            flex-wrap: wrap;
            gap: 0.4rem;
        }

        .limb__choice {
            @include chip;
        }

        .limb__note {
            margin: 0.25rem 0;
            color: var(--text-muted);
            font-size: 0.85rem;
        }
    `,
})
export class LimbControlComponent {
    readonly pose = model.required<Pose>();
    readonly view = input.required<MotionView>();
    readonly limbs = input.required<LimbSet>();
    readonly index = input.required<0 | 1>();
    /** e.g. "Near arm". */
    readonly label = input.required<string>();

    protected readonly bends = ['cw', 'ccw'] as const;
    private readonly limb = computed(() => this.pose()[this.limbs()][this.index()]);
    /** The way it last bent, kept while it's given by angles, which don't say. */
    private readonly lastBend = linkedSignal<Limb, 'cw' | 'ccw'>({
        source: this.limb,
        computation: (limb, previous) => ('bend' in limb ? limb.bend : (previous?.value ?? 'cw')),
    });
    protected readonly current = computed(() => limbKind(this.limb()));
    /** A hand can touch the body; a foot is given by its angles or where it is. */
    protected readonly kinds = computed((): LimbKind[] =>
        this.limbs() === 'arms' ? ['angles', 'reach', 'touch'] : ['angles', 'reach']
    );
    protected readonly onBar = computed(() => {
        const limb = this.limb();
        return 'reach' in limb && limb.reach === 'bar';
    });
    protected readonly sliders = computed(() => KINDS[this.current()].sliders);
    protected readonly numbers = computed((): readonly number[] => {
        const limb = this.limb();
        if ('angles' in limb) {
            return limb.angles;
        }
        return 'touch' in limb ? limb.touch : limb.reach === 'bar' ? [] : limb.reach;
    });
    protected readonly bendOf = computed(() => {
        const limb = this.limb();
        return 'bend' in limb ? limb.bend : null;
    });

    protected kindLabel(kind: LimbKind): string {
        return KINDS[kind].label;
    }

    protected giveAs(kind: LimbKind) {
        const pose = this.pose();
        this.put(limbAs(pose, this.view(), this.limbs(), this.index(), kind, this.lastBend()));
    }

    protected setNumber(i: number, value: number) {
        const limb = this.limb();
        const pair = [...this.numbers()] as [number, number];
        pair[i] = value;
        if ('angles' in limb) {
            this.put({ ...limb, angles: pair });
        } else if ('touch' in limb) {
            this.put({ touch: pair, bend: limb.bend });
        } else {
            this.put({ reach: pair, bend: limb.bend });
        }
    }

    protected setBend(bend: 'cw' | 'ccw') {
        const limb = this.limb();
        if (!('angles' in limb)) {
            this.put({ ...limb, bend });
        }
    }

    private put(limb: Limb) {
        this.pose.set(withLimb(this.pose(), this.limbs(), this.index(), limb));
    }
}
