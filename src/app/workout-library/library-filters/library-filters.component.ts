import { Component, computed, inject } from '@angular/core';
import { EquipmentFilterComponent } from '../../shared/components/equipment-filter/equipment-filter.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { MuscleChipsComponent } from '../../shared/components/muscle-chips/muscle-chips.component';
import { SearchFieldComponent } from '../../shared/components/search-field/search-field.component';
import { LibraryFilters, WORKOUT_KIND_CHOICES } from '../library-filters.service';

/**
 * Over the Workouts page's cards: the search, which kind of workout to show (All, Training or
 * Stretches, LIB-10), then Favourites, My own and Filters, which opens the muscles and Only what
 * I have under them, so the cards still start high on a phone.
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
        <fieldset class="segmented library-filters__kind">
            <legend class="sr-only">Show</legend>
            <div
                class="segmented__options"
                [style.--count]="kinds.length"
                [style.--chosen]="chosenKind()"
            >
                <span class="segmented__thumb" aria-hidden="true"></span>
                @for (kind of kinds; track kind.value; let i = $index) {
                    <label
                        class="segmented__option"
                        [class.segmented__option--chosen]="i === chosenKind()"
                    >
                        <input
                            type="radio"
                            name="libraryKind"
                            class="segmented__input"
                            [value]="kind.value"
                            [checked]="filters.kind() === kind.value"
                            (change)="filters.setKind(kind.value)"
                        />
                        <span class="segmented__label">{{ kind.label }}</span>
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
                <app-icon
                    class="library-filters__chip-icon"
                    [class.icon-outline]="!filters.favourites()"
                >
                    favorite
                </app-icon>
                Favourites
            </button>
            <button
                type="button"
                class="library-filters__chip"
                [attr.aria-pressed]="filters.mine()"
                (click)="filters.mine.set(!filters.mine())"
            >
                My own
            </button>
            <button
                type="button"
                class="library-filters__chip"
                aria-controls="library-more-filters"
                [attr.aria-expanded]="filters.moreOpen()"
                (click)="filters.moreOpen.set(!filters.moreOpen())"
            >
                Filters{{ filters.moreCount() ? ' (' + filters.moreCount() + ')' : '' }}
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

        .library-filters__kind {
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
    protected readonly kinds = WORKOUT_KIND_CHOICES;
    protected readonly chosenKind = computed(() =>
        this.kinds.findIndex((kind) => kind.value === this.filters.kind())
    );
}
