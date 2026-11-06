import { Component, computed, inject, input } from '@angular/core';
import { BuiltInWorkout } from '../../../models/built-in-workouts';
import { MUSCLE_LABELS } from '../../../models/exercise';
import { MUSCLES_ON_A_CARD, musclesWorked } from '../../../models/workout-muscles';
import { PageSlide } from '../../../nav/page-slide';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ShowcaseCountComponent } from '../../../shared/components/showcase/showcase-count.component';
import { ShowcaseKitComponent } from '../../../shared/components/showcase/showcase-kit.component';
import { ShowcaseMusclesComponent } from '../../../shared/components/showcase/showcase-muscles.component';
import { ExerciseStore } from '../../../shared/state/exercise-store.service';
import { readyMadeCard, readyMadeSlug } from '../ready-made-card';

/**
 * A ready-made workout (LIB-6) on Workouts, as a card: its name and what it is, how many
 * exercises, the muscles it mainly works and what it needs. It isn't yours yet, so it has no
 * play button: pressing it slides in its page, where it's added.
 */
@Component({
    selector: 'app-ready-made-card',
    imports: [
        IconComponent,
        ShowcaseCountComponent,
        ShowcaseKitComponent,
        ShowcaseMusclesComponent,
    ],
    host: { class: 'block' },
    template: `
        @let shown = card();
        <a
            class="ready-card"
            [href]="url()"
            [attr.data-ready-made]="workout().id"
            (click)="slide.follow($event, url(), 'in')"
        >
            <span class="ready-card__head">
                <span class="ready-card__intro">
                    <span class="ready-card__name">{{ workout().title }}</span>
                    <span class="sr-only">. </span>
                    <span class="ready-card__description">{{ workout().description }}</span>
                </span>
                {{ ' ' }}
                <app-showcase-count
                    [number]="shown.exercises"
                    [label]="shown.exercises === 1 ? 'exercise' : 'exercises'"
                />
            </span>
            @if (muscles().shown.length) {
                <app-showcase-muscles [muscles]="muscles().shown" [more]="muscles().more" />
            }
            <span class="sr-only">. </span>
            <app-showcase-kit [needs]="shown.equipment">
                <app-icon class="ready-card__chevron">chevron_right</app-icon>
            </app-showcase-kit>
        </a>
    `,
    styleUrl: './ready-made-card.component.scss',
})
export class ReadyMadeCardComponent {
    readonly workout = input.required<BuiltInWorkout>();

    private readonly exercises = inject(ExerciseStore);
    protected readonly slide = inject(PageSlide);

    protected readonly url = computed(() => `/ready-made/${readyMadeSlug(this.workout())}`);
    protected readonly card = computed(() => readyMadeCard(this.workout(), new Set()));

    /** Its main muscles, the first few, then how many more. */
    protected readonly muscles = computed(() => {
        const main = musclesWorked([this.workout()], (id) => this.exercises.byId(id)).main;
        return {
            shown: main.slice(0, MUSCLES_ON_A_CARD).map((muscle) => MUSCLE_LABELS[muscle]),
            more: Math.max(0, main.length - MUSCLES_ON_A_CARD),
        };
    });
}
