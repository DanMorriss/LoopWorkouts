import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MenuPlacementDirective } from './menu-placement.directive';

/** A ⋮ button with its menu, `bottom` px up from the screen's bottom, over a bar 80px tall. */
@Component({
    imports: [MenuPlacementDirective],
    template: `
        <div
            class="bottom-bars"
            style="position: fixed; bottom: 0; left: 0; height: 80px; width: 100%"
        ></div>
        <div
            style="position: fixed; right: 0; width: 44px; height: 44px"
            [style.bottom.px]="bottom()"
        >
            <div
                appMenuPlacement
                style="position: absolute; top: calc(100% + 0.2rem); right: 0; height: 150px; width: 130px; transform-origin: top right"
            ></div>
        </div>
    `,
})
class Host {
    readonly bottom = input.required<number>();
}

describe('MenuPlacementDirective', () => {
    const open = async (bottom: number) => {
        const fixture = TestBed.createComponent(Host);
        fixture.componentRef.setInput('bottom', bottom);
        document.body.appendChild(fixture.nativeElement);
        fixture.detectChanges();
        await fixture.whenStable();
        const menu = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
            '[appMenuPlacement]'
        )!;
        const button = menu.parentElement!.getBoundingClientRect();
        return { menu, box: menu.getBoundingClientRect(), button, fixture };
    };

    it('opens below its button where there is room above the bars', async () => {
        const { box, button, fixture } = await open(window.innerHeight - 100);

        expect(box.top).toBeGreaterThan(button.bottom);
        fixture.destroy();
    });

    it('opens above its button when the bars would cover it, growing from its bottom', async () => {
        const { menu, box, button, fixture } = await open(100);

        expect(box.bottom).toBeLessThan(button.top);
        expect(getComputedStyle(menu).transformOrigin).toMatch(/ 150px$/);
        fixture.destroy();
    });

    it('stays below when there is no more room above', async () => {
        const { box, button, fixture } = await open(window.innerHeight - 140);

        // Too near the top for the menu to fit above: below, where the page can scroll to it
        expect(box.top).toBeGreaterThan(button.bottom);
        fixture.destroy();
    });
});
