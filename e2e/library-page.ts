import type { Locator, Page } from '@playwright/test';

// Workouts (/library): one list of your own workouts and the ready-made ones, A to Z, each a
// card with its Details link, heart, play button and options (⋮).

export class LibraryPage {
    constructor(readonly page: Page) {}

    /** Every card showing, in order. */
    get cards(): Locator {
        return this.page
            .getByRole('main')
            .getByRole('listitem')
            .filter({ has: this.page.getByRole('link', { name: /^Details of / }) });
    }

    /** A workout's card, by its title. */
    card(title: string): Locator {
        return this.cards.filter({
            has: this.page.getByRole('link', { name: `Details of ${title}`, exact: true }),
        });
    }

    /** The titles of the cards showing, in order. */
    async titles(): Promise<string[]> {
        const names = await this.cards
            .getByRole('link', { name: /^Details of / })
            .evaluateAll((links) => links.map((link) => link.getAttribute('aria-label') ?? ''));
        return names.map((name) => name.replace(/^Details of /, ''));
    }

    /** Opens a card's options (⋮), and gives them: Add to plan, Edit, Make a copy, Delete. */
    async options(title: string): Promise<Locator> {
        await this.page
            .getByRole('button', { name: `Open options for ${title}`, exact: true })
            .click();
        return this.page.getByRole('group', { name: `Options for ${title}`, exact: true });
    }
}
