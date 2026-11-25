import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
    CarouselComponent,
    SlideDirective,
} from '../../../shared/components/carousel/carousel.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { WeekBestOf } from '../../week-rows';

/**
 * The new bests set this week (PRG-13): a tile for each, swiped between, with what it is, its
 * record as the big number, what it beat, and its exercise, going to the exercise's page. The
 * carousel's dots say which is shown.
 */
@Component({
    selector: 'app-new-best-tiles',
    imports: [CarouselComponent, SlideDirective, RouterLink, IconComponent],
    template: `
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
                        @if (best.was) {
                            <span class="bests__was" aria-hidden="true">{{ best.was }}</span>
                        }
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
    readonly bests = input.required<WeekBestOf[]>();
}
