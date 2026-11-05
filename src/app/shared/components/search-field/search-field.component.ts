import { Component, input, model } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

/** A search box with its label and a magnifying glass, bound with `[(value)]`. */
@Component({
    selector: 'app-search-field',
    imports: [IconComponent],
    host: { class: 'block' },
    template: `
        <label class="picker-field" [attr.for]="inputId()">
            <span class="picker-field__label">{{ label() }}</span>
            <span class="search-field">
                <app-icon class="search-field__icon">search</app-icon>
                <input
                    class="picker-field__input search-field__input"
                    type="search"
                    autocomplete="off"
                    [id]="inputId()"
                    [placeholder]="placeholder()"
                    [attr.cdkFocusInitial]="focusFirst() ? '' : null"
                    [value]="value()"
                    (input)="typed($event)"
                />
            </span>
        </label>
    `,
    styles: `
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

    protected typed(event: Event) {
        this.value.set((event.target as HTMLInputElement).value);
    }
}
