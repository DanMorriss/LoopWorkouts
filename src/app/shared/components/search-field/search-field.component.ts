import { Component, ElementRef, input, model, viewChild } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/**
 * A search box with its label and a magnifying glass, bound with `[(value)]`. With something in
 * it, an × at its end clears it, focus staying in the box to type again.
 */
@Component({
    selector: 'app-search-field',
    imports: [IconComponent],
    host: { class: 'block' },
    template: `
        <div class="picker-field">
            <label class="picker-field__label" [attr.for]="inputId()">{{ label() }}</label>
            <span class="search-field">
                <app-icon class="search-field__icon">search</app-icon>
                <input
                    #box
                    class="picker-field__input search-field__input"
                    type="search"
                    autocomplete="off"
                    [id]="inputId()"
                    [placeholder]="placeholder()"
                    [attr.cdkFocusInitial]="focusFirst() ? '' : null"
                    [value]="value()"
                    (input)="typed($event)"
                />
                @if (value()) {
                    <button
                        type="button"
                        class="search-field__clear"
                        aria-label="Clear search"
                        (click)="clear()"
                    >
                        <app-icon>close</app-icon>
                    </button>
                }
            </span>
        </div>
    `,
    styles: `
        @use 'interaction' as *;

        .search-field {
            position: relative;
            display: block;
        }

        .search-field__icon {
            position: absolute;
            top: 50%;
            left: 0.8rem;
            transform: translateY(-50%);
            color: var(--text-muted);
            pointer-events: none;
        }

        .search-field__input {
            padding-left: 2.6rem;
            padding-right: 2.75rem;

            // The browser's own ×, which this one replaces
            &::-webkit-search-cancel-button {
                appearance: none;
            }
        }

        .search-field__clear {
            position: absolute;
            top: 50%;
            right: 0;
            display: grid;
            place-items: center;
            width: 44px;
            height: 44px;
            padding: 0;
            border: 0;
            border-radius: 999px;
            background: transparent;
            color: var(--text-muted);
            cursor: pointer;
            transform: translateY(-50%);
            -webkit-tap-highlight-color: transparent;

            @include hover {
                color: var(--text-strong);
            }

            &:focus-visible {
                outline: 2px solid var(--accent);
                outline-offset: -4px;
            }
        }
    `,
})
export class SearchFieldComponent {
    /** Its input's id, which must be unique on the page. */
    readonly inputId = input.required<string>();
    readonly label = input('Search');
    readonly placeholder = input('Name, e.g. squat');
    /** Where focus starts in a dialog (`cdkFocusInitial`). */
    readonly focusFirst = input(false);
    readonly value = model('');

    private readonly box = viewChild.required<ElementRef<HTMLInputElement>>('box');

    protected typed(event: Event) {
        this.value.set((event.target as HTMLInputElement).value);
    }

    /** Empties the box; focus goes back into it, as the × it was on has gone. */
    protected clear() {
        this.value.set('');
        this.box().nativeElement.focus();
    }
}
