// Screenshots exercise demos (EXR-13) from a running `ng serve --port 4400`, to check the 3D
// figure by eye. Ids are as in the page's address (back-squat, not builtin:back-squat).
// Usage: node tools/shoot-demos.mjs <out-dir> <id>... [options]
//   --theme=light   the light theme (dark if not given)
//   --turns=2       presses Turn that many times first (45° each)
//   --drag=50       drags it round that many pixels (0.6° each; leftwards turns it on round)
//   --at=500        waits that many ms more before the shot
//   --big           draws it larger, to look at its shape closely
//   --stills        every key position side by side, as with reduced motion
//   --still=2       only that key position (from 1), as large as the moving figure
//   --figure=female the Sex setting (the 3D figure is always male for now)
import { chromium } from 'playwright';

const [out, ...rest] = process.argv.slice(2);
const ids = rest.filter((arg) => !arg.startsWith('--'));
const theme = rest.find((arg) => arg.startsWith('--theme='))?.slice(8) ?? 'dark';
const turns = Number(rest.find((arg) => arg.startsWith('--turns='))?.slice(8) ?? 0);
const figure = rest.find((arg) => arg.startsWith('--figure='))?.slice(9) ?? 'male';
const only = Number(rest.find((arg) => arg.startsWith('--still='))?.slice(8) ?? 0);
const stills = rest.includes('--stills') || only > 0;
const big = rest.includes('--big');
const drag = Number(rest.find((arg) => arg.startsWith('--drag='))?.slice(7) ?? 0);
const at = Number(rest.find((arg) => arg.startsWith('--at='))?.slice(5) ?? 0);

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
        console.log(`[${message.type()}]`, message.text());
    }
});
if (stills) {
    await page.emulateMedia({ reducedMotion: 'reduce' });
}
await page.goto('http://localhost:4400/home');
await page.evaluate(
    ([theme, bodyFigure]) => {
        localStorage.setItem('welcomed', 'guest');
        // Its tour would cover the figure
        localStorage.setItem('tour-exercise', 'seen');
        localStorage.setItem('settings', JSON.stringify({ theme, bodyFigure }));
    },
    [theme, figure]
);
for (const id of ids) {
    await page.goto(`http://localhost:4400/exercises/${id}`);
    const demo = page.locator('app-exercise-demo');
    try {
        await demo.waitFor({ timeout: 15000 });
    } catch {
        console.log('no demo for', id);
        continue;
    }
    if (big) {
        // Larger, to look at its shape closely
        await page.addStyleTag({
            content:
                'app-exercise-demo { --figure-max-height: 52rem !important; } app-exercise-figure-3d { --figure-max-height: 52rem !important; }',
        });
    }
    if (only) {
        // One key position, as large as the moving figure
        await page.addStyleTag({
            content: `.demo__still:not(:nth-child(${only})) { display: none !important; } .demo__still { max-width: 100% !important; } .demo__figure--still { --figure-max-height: 30rem !important; }`,
        });
    }
    await demo.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    for (let i = 0; i < turns; i++) {
        await page.getByRole('button', { name: 'Turn the figure' }).click();
        await page.waitForTimeout(600);
    }
    if (drag) {
        // Turns it by dragging, 0.6° a pixel: leftwards turns it on round
        const box = await page
            .locator('app-exercise-figure-3d canvas:visible')
            .first()
            .boundingBox();
        const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x - drag, y, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);
    }
    if (at) {
        await page.waitForTimeout(at);
    }
    await demo.scrollIntoViewIfNeeded();
    await demo.screenshot({
        path: `${out}/${id}${only ? `-s${only}` : ''}${turns ? `-t${turns}` : ''}${drag ? `-d${drag}` : ''}${at ? `-${at}` : ''}.png`,
    });
    console.log('shot', id);
}
await browser.close();
