// Screenshots exercise demos (EXR-13) from a running `ng serve --port 4300`, to check the 3D
// figure by eye. Ids are as in the page's address (back-squat, not builtin:back-squat).
// Usage: node tools/shoot-demos.mjs <out-dir> <id>... [--theme=light] [--turns=2] [--at=500] [--figure=female] [--big]
//   --figure: the Sex setting; the 3D figure is always male for now [--drag=50]
//   --turns: presses Turn that many times first (45° each); --at: waits that many ms more
import { chromium } from 'playwright';

const [out, ...rest] = process.argv.slice(2);
const ids = rest.filter((arg) => !arg.startsWith('--'));
const theme = rest.find((arg) => arg.startsWith('--theme='))?.slice(8) ?? 'dark';
const turns = Number(rest.find((arg) => arg.startsWith('--turns='))?.slice(8) ?? 0);
const figure = rest.find((arg) => arg.startsWith('--figure='))?.slice(9) ?? 'male';
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
await page.goto('http://localhost:4300/home');
await page.evaluate(
    ([theme, bodyFigure]) => {
        localStorage.setItem('welcomed', 'guest');
        localStorage.setItem('settings', JSON.stringify({ theme, bodyFigure }));
    },
    [theme, figure]
);
for (const id of ids) {
    await page.goto(`http://localhost:4300/exercises/${id}`);
    const demo = page.locator('app-exercise-demo');
    await demo.waitFor();
    if (big) {
        // Larger, to look at its shape closely
        await page.addStyleTag({
            content:
                'app-exercise-demo { --figure-max-height: 52rem !important; } app-exercise-figure-3d { --figure-max-height: 52rem !important; }',
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
        const box = await page.locator('app-exercise-figure-3d canvas').first().boundingBox();
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
        path: `${out}/${id}${turns ? `-t${turns}` : ''}${at ? `-${at}` : ''}.png`,
    });
    console.log('shot', id);
}
await browser.close();
