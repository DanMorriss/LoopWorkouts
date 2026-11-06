import { Component, computed, inject } from '@angular/core';
import { EquipmentFilterComponent } from '../../shared/components/equipment-filter/equipment-filter.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { MuscleChipsComponent } from '../../shared/components/muscle-chips/muscle-chips.component';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';
import { LIBRARY_SOURCES, LibraryFilters } from '../library-filters.service';

/**
 * Over the Workouts page's cards: the search, which workouts to show (All, My own or
 * Ready-made), then Favourites and More filters, which opens the muscles and Only what I have
 * under them, so the cards still start high on a phone.
 */
@Component({
    selector: 'app-library-filters',
    imports: [EquipmentFilterComponent, IconComponent, MuscleChipsComponent, SearchFieldComponent],
    template: `
        <app-search-field
            inputId="library-search"
            placeholder="Name or exercise, e.g. squat"
            [(value)]="filters.query"
        />
        <fieldset class="segmented library-filters__source">
            <legend class="sr-only">Show</legend>
            <div
                class="segmented__options"
                [style.--count]="sources.length"
                [style.--chosen]="chosenSource()"
            >
                <span class="segmented__thumb" aria-hidden="true"></span>
                @for (source of sources; track source.value; let i = $index) {
                    <label
                        class="segmented__option"
                        [class.segmented__option--chosen]="i === chosenSource()"
                    >
                        <input
                            type="radio"
                            name="librarySource"
                            class="segmented__input"
                            [value]="source.value"
                            [checked]="filters.source() === source.value"
                            (change)="filters.source.set(source.value)"
                        />
                        <span class="segmented__label">{{ source.label }}</span>
                    </label>
                }
            </div>
        </fieldset>
        <div class="library-filters__row">
            <button
                type="button"
                class="library-filters__chip"
                [attr.aria-pressed]="filters.favourites()"
                (click)="filters.favourites.set(!filters.favourites())"
            >
                <app-icon class="library-filters__chip-icon">{{
                    filters.favourites() ? 'favorite' : 'favorite_border'
                }}</app-icon>
                Favourites
            </button>
            <button
                type="button"
                class="library-filters__chip"
                aria-controls="library-more-filters"
                [attr.aria-expanded]="filters.moreOpen()"
                (click)="filters.moreOpen.set(!filters.moreOpen())"
            >
                More filters{{ filters.moreCount() ? ' (' + filters.moreCount() + ')' : '' }}
                <app-icon class="library-filters__chip-icon">{{
                    filters.moreOpen() ? 'expand_less' : 'expand_more'
                }}</app-icon>
            </button>
        </div>
        @if (filters.moreOpen()) {
            <div id="library-more-filters" class="library-filters__more">
                <app-muscle-chips [(selected)]="filters.muscles" />
                <app-equipment-filter idPrefix="library" things="Workouts" />
            </div>
        }
    `,
    styles: `
        @use 'chip' as *;

        :host {
            display: block;
        }

        .library-filters__source {
            margin-top: 0.75rem;
        }

        .library-filters__row {
            display: flex;
            flex-wrap: wrap;
            gap: 0.4rem;
            margin-top: 0.75rem;
        }

        .library-filters__chip {
            @include chip;
        }

        .library-filters__chip-icon {
            @include chip-icon;
        }

        .library-filters__more {
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
            margin-top: 0.6rem;
        }
    `,
})
export class LibraryFiltersComponent {
    protected readonly filters = inject(LibraryFilters);
    protected readonly sources = LIBRARY_SOURCES;
    protected readonly chosenSource = computed(() =>
        this.sources.findIndex((source) => source.value === this.filters.source())
    );
}
