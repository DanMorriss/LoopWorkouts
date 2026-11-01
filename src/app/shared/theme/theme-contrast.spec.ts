import { contrastRatio } from '../testing/contrast';

/**
 * Checks the colour tokens in styles.scss against each other, in both themes.
 *
 * axe can't work out contrast over the page's gradient or the see-through cards, so it
 * marks that text for review instead of failing it. This checks the same pairs directly,
 * flattening see-through surfaces onto the page the way the browser draws them.
 */

// What each kind of colour sits on: the page, a panel or card on the page, or a control on a panel
const BACKDROPS: Record<string, string[]> = {
    page: ['--page-bg'],
    panel: ['--page-bg', '--panel'],
    card: ['--page-bg', '--card'],
    control: ['--page-bg', '--panel', '--control'],
    raised: ['--page-bg', '--raised'],
};

const TEXT = [
    '--text',
    '--text-strong',
    '--text-muted',
    '--glow-text',
    '--focus',
    '--accent',
    '--work',
    '--rest',
    '--reps',
];
// Controls and focus rings need 3:1 (WCAG 1.4.11)
const NON_TEXT = ['--control-off', '--glow', '--accent', '--focus', '--button-primary'];

function token(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Paints the layers in order and reads back the colour you'd see. */
function flatten(layers: string[]): string {
    const context = document.createElement('canvas').getContext('2d')!;
    for (const layer of layers) {
        context.fillStyle = token(layer);
        context.fillRect(0, 0, 1, 1);
    }
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
}

for (const theme of ['dark', 'light'] as const) {
    describe(`colour tokens, ${theme} theme`, () => {
        beforeEach(() => (document.documentElement.dataset['theme'] = theme));
        afterEach(() => delete document.documentElement.dataset['theme']);

        for (const [backdrop, layers] of Object.entries(BACKDROPS)) {
            for (const text of TEXT) {
                it(`${text} is readable on a ${backdrop} (at least 4.5:1)`, () => {
                    expect(contrastRatio(token(text), flatten(layers))).toBeGreaterThanOrEqual(4.5);
                });
            }
            for (const part of NON_TEXT) {
                it(`${part} stands out on a ${backdrop} (at least 3:1)`, () => {
                    expect(contrastRatio(token(part), flatten(layers))).toBeGreaterThanOrEqual(3);
                });
            }
        }

        it('keeps the danger text readable on its own background', () => {
            const background = flatten(['--page-bg', '--raised', '--danger-soft']);

            expect(contrastRatio(token('--text-danger'), background)).toBeGreaterThanOrEqual(4.5);
        });

        it('keeps the main button label readable across its whole gradient', () => {
            for (const stop of ['--cta-top', '--cta-bottom']) {
                expect(contrastRatio(token('--cta-ink'), token(stop))).toBeGreaterThanOrEqual(4.5);
            }
        });

        it('makes the main button stand out on the page (at least 3:1 at one end)', () => {
            const page = flatten(['--page-bg']);
            const best = Math.max(
                contrastRatio(token('--cta-top'), page),
                contrastRatio(token('--cta-bottom'), page)
            );

            expect(best).toBeGreaterThanOrEqual(3);
        });

        it('keeps the switch dot visible on the lit-up loop', () => {
            expect(contrastRatio(token('--glow-dot'), token('--glow'))).toBeGreaterThanOrEqual(1.5);
        });

        describe('body map', () => {
            it('keeps each muscle label readable on its own shade', () => {
                for (const shade of ['main', 'supporting']) {
                    expect(
                        contrastRatio(token(`--muscle-${shade}-ink`), token(`--muscle-${shade}`))
                    ).toBeGreaterThanOrEqual(4.5);
                }
            });

            // The labels say the same in words, so the figure needs its shades apart, not 3:1
            it('keeps main, supporting and unworked muscles apart in lightness', () => {
                const [main, supporting, idle] = ['main', 'supporting', 'idle'].map((s) =>
                    token(`--muscle-${s}`)
                );

                expect(contrastRatio(main, idle)).toBeGreaterThanOrEqual(3);
                expect(contrastRatio(supporting, idle)).toBeGreaterThanOrEqual(2);
                expect(contrastRatio(main, supporting)).toBeGreaterThanOrEqual(2);
            });

            it('makes the main muscles stand out on the page (at least 3:1)', () => {
                expect(
                    contrastRatio(token('--muscle-main'), flatten(['--page-bg', '--panel']))
                ).toBeGreaterThanOrEqual(3);
            });
        });

        // Sign in with Google and Apple: their words on their buttons, and the buttons' edges
        it('makes the Google and Apple buttons readable, and stand out on the panel', () => {
            const panel = flatten(['--page-bg', '--panel']);
            for (const brand of ['google', 'apple']) {
                expect(
                    contrastRatio(token(`--${brand}-ink`), token(`--${brand}-bg`))
                ).toBeGreaterThanOrEqual(4.5);
            }
            expect(contrastRatio(token('--google-border'), panel)).toBeGreaterThanOrEqual(3);
            expect(contrastRatio(token('--apple-bg'), panel)).toBeGreaterThanOrEqual(3);
        });

        // The history's bars of sets per muscle, filled on an unworked-muscle track
        it('makes each muscle bar stand out on its track (at least 3:1)', () => {
            for (const fill of ['under', 'in', 'over']) {
                expect(
                    contrastRatio(token(`--balance-${fill}`), token('--muscle-idle'))
                ).toBeGreaterThanOrEqual(3);
            }
        });

        // The aim's edges: a line on the track, and a notch in the track's colour on a fill,
        // so the fills against the track (above) cover the notches
        it("makes the aim's edges stand out on the track (at least 3:1)", () => {
            expect(
                contrastRatio(
                    flatten(['--muscle-idle', '--balance-band-edge']),
                    token('--muscle-idle')
                )
            ).toBeGreaterThanOrEqual(3);
        });
    });
}
