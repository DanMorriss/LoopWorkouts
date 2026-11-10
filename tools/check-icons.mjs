// Checks that the icon font (public/fonts/material-symbols-outlined.woff2, made by
// `npm run icons`) has exactly the icons the app uses: a missing one would show as its name in
// letters, and a spare one is downloaded by every page for nothing. It goes by the list
// tools/icon-font.json keeps of what's in the font, and that file's hash, so the font can't
// change without the list. Run by `npm run lint`.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { ICON_FONT, ICON_LIST, usedIcons } from './used-icons.mjs';

const used = usedIcons();
const { names, sha256 } = JSON.parse(readFileSync(ICON_LIST, 'utf8'));
const problems = [];
const missing = used.filter((n) => !names.includes(n));
const spare = names.filter((n) => !used.includes(n));
if (missing.length) problems.push(`not in the icon font: ${missing.join(', ')}`);
if (spare.length) problems.push(`in the icon font but not used: ${spare.join(', ')}`);
if (!existsSync(ICON_FONT)) {
    problems.push('no public/fonts/material-symbols-outlined.woff2');
} else if (createHash('sha256').update(readFileSync(ICON_FONT)).digest('hex') !== sha256) {
    problems.push("the font file isn't the one tools/icon-font.json lists");
}

if (problems.length) {
    console.error(`Icons: ${problems.join('\n       ')}\n       Run npm run icons to rebuild it.`);
    process.exit(1);
}
console.log(`Icons: the ${names.length} in the icon font are the ones used.`);
