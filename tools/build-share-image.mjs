// Builds public/share.png, the picture shown when a link to the app is shared (Open Graph and
// Twitter cards, 1200 × 630): the name and tagline beside a phone mid-workout. Run it against
// a running `ng serve --port 4300`, and again when the workout screen's look changes.
// Usage: node tools/build-share-image.mjs
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const browser = await chromium.launch();

// A phone, 14 seconds into Cardio intervals: a timed step, its ring part filled
const phone = await browser.newPage({
    viewport: { width: 400, height: 760 },
    deviceScaleFactor: 2,
});
await phone.goto('http://localhost:4300/home');
await phone.evaluate(() => {
    localStorage.setItem('welcomed', 'guest');
    localStorage.setItem('settings', JSON.stringify({ theme: 'dark' }));
});
await phone.goto('http://localhost:4300/library');
await phone.getByRole('link', { name: /Cardio intervals/ }).click();
await phone.getByRole('button', { name: /Add and start/ }).click();
await phone.waitForTimeout(14000);
const screen = (await phone.screenshot()).toString('base64');

const icon = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'base64');
const card = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await card.setContent(`<!doctype html>
<link href="https://fonts.googleapis.com/css2?family=Audiowide&display=swap" rel="stylesheet" />
<style>
    body {
        margin: 0;
        width: 1200px;
        height: 630px;
        overflow: hidden;
        background: radial-gradient(circle at 75% 40%, #1a2336, #070b12 70%);
        color: #f1f5f9;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        position: relative;
    }
    .words { position: absolute; left: 80px; top: 112px; width: 620px; }
    .name { display: flex; align-items: center; gap: 24px; font: 64px/1 Audiowide; letter-spacing: -0.02em; }
    .name img { width: 88px; height: 88px; }
    .tagline { margin-top: 36px; font: 40px/1.25 Audiowide; color: #67e8f9; letter-spacing: -0.01em; }
    ul { margin: 40px 0 0; padding: 0; list-style: none; font-size: 28px; line-height: 1.6; color: #cbd5e1; }
    li::before { content: ''; display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #fda4af; margin-right: 18px; vertical-align: middle; }
    li:nth-child(2)::before { background: #38bdf8; }
    li:nth-child(3)::before { background: #a78bfa; }
    .phone {
        position: absolute; right: 90px; top: 40px; width: 320px;
        border: 10px solid #1e293b; border-radius: 48px; overflow: hidden;
        box-shadow: 0 30px 80px rgb(0 0 0 / 0.6);
    }
    .phone img { display: block; width: 100%; }
</style>
<div class="words">
    <div class="name"><img src="data:image/svg+xml;base64,${icon}" alt="" />Loop Workouts</div>
    <div class="tagline">Build it. Run it.<br />Beat it next time.</div>
    <ul>
        <li>Interval timer and gym log in one</li>
        <li>Works offline, no app store needed</li>
        <li>See what to beat every workout</li>
    </ul>
</div>
<div class="phone"><img src="data:image/png;base64,${screen}" alt="" /></div>`);
await card.evaluate(() => document.fonts.ready);
await card.waitForTimeout(500);
await card.screenshot({ path: new URL('../public/share.png', import.meta.url).pathname });
await browser.close();
console.log('wrote public/share.png');
