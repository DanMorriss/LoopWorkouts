import { Component } from '@angular/core';

/**
 * A Material Symbols glyph, named by its ligature (e.g. `<app-icon>close</app-icon>`), drawn
 * with the font index.html loads, which has only the icons the app uses (`icon_names`, checked
 * by `tools/check-icons.mjs`). Used in place of `mat-icon` on what's on every page (the tab
 * bar, the workout's bar, the Undo bar), so Material's icon module stays out of the first
 * load. Filled, as Material Icons were; the `icon-outline` class draws it as an outline. It's
 * always decorative: hidden from screen readers, so the button or link it's in needs its own
 * name.
 */
@Component({
    selector: 'app-icon',
    template: '<ng-content />',
    host: {
        class: 'icon material-symbols-outlined notranslate',
        'aria-hidden': 'true',
    },
    styles: `
        :host {
            display: inline-block;
            width: 24px;
            height: 24px;
            overflow: hidden;
            user-select: none;
        }
    `,
})
export class IconComponent {}
