import { Component, computed, input, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { WeekBest } from '../../../exercises/progress-format';
import {
    CarouselComponent,
    SlideDirective,
} from '../../../shared/components/carousel/carousel.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** A new best set this week, and the exercise it's for. */
export interface NewBestTile extends WeekBest {
    name: string;
    path: string;
}

/**
 * The new bests set this week, at the top of Exercises this week (PRG-13): a tile for each,
 * swiped between, with its record as the big number and its exercise under it, going to the
 * exercise's page. "1 of 4" over them says which is shown.
 */
@Component({
    selector: 'app-new-best-tiles',
    imports: [CarouselComponent, SlideDirective, RouterLink, IconComponent],
    template: `
        <div class="bests__head">
            <h4 class="bests__title">New bests</h4>
            @if (bests().length > 1) {
                <span class="bests__position" aria-hidden="true">{{ position() }}</span>
            }
        </div>
        <app-carousel label="New bests" itemName="Best">
            @for (best of bests(); track best.path + best.label) {
                <ng-template appSlide>
                    <a
                        class="bests__tile"
                        [routerLink]="best.path"
                        [queryParams]="{ from: 'progress' }"
                    >
                        <span class="bests__label" aria-hidden="true">{{ best.label }}</span>
                        <span class="bests__value" aria-hidden="true">{{ best.text }}</span>
                        <span class="bests__name" aria-hidden="true">{{ best.name }}</span>
                        <span class="sr-only">{{ best.spoken }}, {{ best.name }}</span>
                        <app-icon class="bests__chevron">chevron_right</app-icon>
                    </a>
                </ng-template>
            }
        </app-carousel>
    `,
    styleUrl: './new-best-tiles.component.scss',
})
export class NewBestTilesComponent {
    readonly bests = input.required<NewBestTile[]>();

    private readonly carousel = viewChild.required(CarouselComponent);

    protected readonly position = computed(
        () => `${this.carousel().shown() + 1} of ${this.bests().length}`
    );
}
