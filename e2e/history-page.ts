import type { Locator, Page } from '@playwright/test';

// The log on Progress (/history): a list of runs under each day, newest first.

export class HistoryPage {
    constructor(readonly page: Page) {}

    /**
     * Every run in the log: each is a list item with its options (⋮), named for the run, and
     * a link to its workout's Details while the workout's still there.
     */
    get entries(): Locator {
        return this.page
            .getByRole('main')
            .getByRole('listitem')
            .filter({ has: this.page.getByRole('button', { name: /^Options for / }) });
    }

    /** The runs of one workout, by its title as it ran. */
    entry(title: string): Locator {
        return this.entries.filter({
            has: this.page.getByRole('button', { name: `Options for ${title} at ` }),
        });
    }

    /** A day of the log, by its heading: "Today", "Yesterday", "Monday 9 November". */
    day(name: string): Locator {
        return this.page.getByRole('region', { name, exact: true });
    }

    /** A run's ⋮, named for it and its time: "Options for Legs at 7:00 PM". */
    options(entry: Locator): Locator {
        return entry.getByRole('button', { name: /^Options for / });
    }
}
