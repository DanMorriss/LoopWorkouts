// Builds the icon font, public/fonts/material-symbols-outlined.woff2: Material Symbols Outlined
// with only the icons the app uses, and the fill axis for icon-outline. It's downloaded from
// Google Fonts here, once, and served from the app's own address, so a visit sends nothing to
// Google. Writes tools/icon-font.json, the icons in it and the file's hash, which
// `npm run lint` (tools/check-icons.mjs) checks against what the app uses.
// Usage: npm run icons, after using a new icon or the last of one.
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { ICON_FONT, ICON_LIST, usedIcons } from './used-icons.mjs';

const names = usedIcons();
const css = `https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&icon_names=${names.join(',')}&display=block`;
// Google gives woff2 to a browser that takes it, so it asks as one
const userAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const response = await fetch(css, { headers: { 'User-Agent': userAgent } });
if (!response.ok) {
    throw new Error(`Google Fonts answered ${response.status} for the icon font's CSS`);
}
const url = (await response.text()).match(/src: url\(([^)]+)\) format\('woff2'\)/)?.[1];
if (!url) {
    throw new Error("No woff2 in Google Fonts' CSS for the icon font");
}
const font = Buffer.from(await (await fetch(url)).arrayBuffer());
writeFileSync(ICON_FONT, font);
const sha256 = createHash('sha256').update(font).digest('hex');
writeFileSync(ICON_LIST, `${JSON.stringify({ names, sha256 }, null, 4)}\n`);
console.log(`Icon font: ${names.length} icons, ${(font.length / 1024).toFixed(1)} KiB.`);
