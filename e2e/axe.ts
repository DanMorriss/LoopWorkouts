import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

// axe-core, run on the page as it is, as a11y.spec.ts runs it on each component: the WCAG 2.1 A
// and AA rules and axe's best practices. Here it's the whole app, so the rules about the whole
// document (one <main>, one <h1>, everything in a landmark) are on too.

const source = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

// A closed wheel's other numbers: scrolled out of its one-row window and hidden from screen
// readers, as in a11y.spec.ts
const UNSEEN_WHEEL_NUMBERS =
    'app-wheel-picker:not(.wheel-picker--open) .wheel-picker__item:not(.wheel-picker__item--selected)';

declare global {
    interface Window {
        axe?: {
            run(
                context: unknown,
                options: unknown
            ): Promise<{
                violations: {
                    id: string;
                    impact: string;
                    help: string;
                    nodes: { target: string[] }[];
                }[];
            }>;
        };
    }
}

/**
 * The page's axe violations, one line each with where they are: none is `[]`. axe goes in with
 * page.evaluate, which the app's Content-Security-Policy doesn't stop as it would a script tag.
 */
export async function axeViolations(page: Page): Promise<string[]> {
    if (!(await page.evaluate(() => !!window.axe))) {
        await page.evaluate(source);
    }
    return page.evaluate(async (exclude) => {
        // Checked once things have moved into place: a dialog fading in would otherwise read
        // as low contrast. Looping ones carry on.
        document
            .getAnimations()
            .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
            .forEach((animation) => animation.finish());
        const results = await window.axe!.run(
            { include: [document], exclude: [exclude] },
            {
                runOnly: {
                    type: 'tag',
                    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
                },
            }
        );
        return results.violations.map(
            (v) =>
                `${v.id} (${v.impact}): ${v.help} at ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`
        );
    }, UNSEEN_WHEEL_NUMBERS);
}
