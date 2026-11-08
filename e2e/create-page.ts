import { expect, type Locator, type Page } from '@playwright/test';
import { setWheel } from './workout-page';

// Create (/setup): a workout's title, its steps (each a row that opens to its fields), its
// rounds or time limit, and Save and Start. A step's fields are named for the step as its row
// reads, e.g. "Step 1, Jog Seconds", so they're found by the end of their name.

export type StepKindName = 'Reps' | 'Timed' | 'Rest';

export class CreatePage {
    constructor(readonly page: Page) {}

    get title(): Locator {
        return this.page.getByRole('textbox', { name: 'Workout Title' });
    }

    /** The list of steps (and headings). */
    get steps(): Locator {
        return this.page.getByRole('list', { name: 'Steps' }).first();
    }

    /** Step `n` (from 1), by its kind pill, which every step has: "Reps, change type of step 1". */
    stepRow(n: number): Locator {
        return this.page
            .getByRole('listitem')
            .filter({
                has: this.page.getByRole('button', {
                    name: new RegExp(`, change type of step ${n}$`),
                }),
            })
            .last();
    }

    /** Step `n`'s kind pill. */
    kindPill(n: number): Locator {
        return this.page.getByRole('button', { name: new RegExp(`, change type of step ${n}$`) });
    }

    /** Changes step `n`'s kind from its pill. */
    async setKind(n: number, kind: StepKindName) {
        await this.kindPill(n).click();
        await this.page
            .getByRole('group', { name: `Type of step ${n}` })
            .getByRole('button', { name: kind, exact: true })
            .click();
        await expect(this.kindPill(n)).toHaveAccessibleName(`${kind}, change type of step ${n}`);
    }

    /** One of step `n`'s fields: Reps, Weight (kg), Sets, Minutes, Seconds, Each side… */
    field(n: number, name: string, role: 'spinbutton' | 'switch' = 'spinbutton'): Locator {
        return this.page.getByRole(role, {
            name: new RegExp(`^Step ${n}, .* ${escape(name)}$`),
        });
    }

    /** Step `n`'s exercise box, which is its name too. */
    exercise(n: number): Locator {
        return this.stepRow(n).getByRole('combobox', { name: 'Exercise (optional)' });
    }

    /** The row's header, which opens and closes the step: "Step 1, Jog, 00:30". */
    header(n: number): Locator {
        return this.page.getByRole('button', { name: new RegExp(`^Step ${n}, `) });
    }

    /** Sets step `n`'s time with its Minutes and Seconds wheels. */
    async setTime(n: number, minutes: number, seconds: number) {
        await setWheel(this.field(n, 'Minutes'), minutes);
        await setWheel(this.field(n, 'Seconds'), seconds);
    }

    /**
     * Types a name in step `n`'s exercise box and leaves it, without picking a suggestion (so
     * it's linked by its name when saved, as a typed name is).
     */
    async name(n: number, name: string) {
        const box = this.exercise(n);
        await box.fill(name);
        await box.press('Escape');
    }

    get addStep(): Locator {
        return this.page.getByRole('button', { name: 'Add step' });
    }

    get addHeading(): Locator {
        return this.page.getByRole('button', { name: 'Add heading' });
    }

    get rounds(): Locator {
        return this.page.getByRole('spinbutton', { name: 'Rounds', exact: true });
    }

    get save(): Locator {
        return this.page.getByRole('button', { name: 'Save', exact: true });
    }

    /** Start workout, or Save & start workout for one already saved. */
    get start(): Locator {
        return this.page.getByRole('button', { name: /^(Save & start|Start) workout$/ });
    }

    /** Builds a new workout on Create: its title, then each step's kind, name and amount. */
    async build(title: string, steps: NewStep[]) {
        await this.title.fill(title);
        for (const [i, step] of steps.entries()) {
            const n = i + 1;
            if (n > 1) {
                await this.addStep.click();
            }
            if (step.kind !== 'Reps') {
                await this.setKind(n, step.kind);
            }
            if (step.name) {
                await this.name(n, step.name);
            }
            if (step.kind === 'Reps') {
                await setWheel(this.field(n, 'Reps'), step.reps ?? 10);
            } else {
                await this.setTime(
                    n,
                    Math.floor((step.seconds ?? 30) / 60),
                    (step.seconds ?? 30) % 60
                );
            }
        }
    }
}

/** A step to build: its kind, name, and reps or seconds. */
export interface NewStep {
    kind: StepKindName;
    name?: string;
    reps?: number;
    seconds?: number;
}

function escape(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
