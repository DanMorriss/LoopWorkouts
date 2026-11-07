// Checks that the icon font index.html asks Google Fonts for (`icon_names=`) has exactly the
// icons the app uses: a missing one would show as its name in letters, and a spare one is
// downloaded by every page for nothing. Run by `npm run lint`.
//
// An icon's name is found as the text of a `mat-icon` or `app-icon`, the quoted names in an
// `{{ … }}` there, an `icon: '…'` field, or a value in a `…_ICONS` table. An icon named some
// other way (built from parts, say) is missed: add it to one of those, or to EXTRA below.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const EXTRA = [];

const root = new URL('..', import.meta.url).pathname;
const files = readdirSync(join(root, 'src/app'), { recursive: true })
    .filter((f) => /\.(ts|html)$/.test(f) && !f.endsWith('.spec.ts'))
    .map((f) => readFileSync(join(root, 'src/app', f), 'utf8'));

const used = new Set(EXTRA);
const quoted = (text) => [...text.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]);
for (const text of files) {
    for (const [, , inner] of text.matchAll(/<(mat-icon|app-icon)\b[^>]*>([^<]*)<\/\1\s*>/g)) {
        const content = inner.trim();
        if (content.includes('{{')) quoted(content).forEach((n) => used.add(n));
        else if (content) used.add(content);
    }
    for (const [, name] of text.matchAll(/\bicon: '([a-z0-9_]+)'/g)) used.add(name);
    for (const [, table] of text.matchAll(/_ICONS\b[^=]*=\s*\{([^}]*)\}/g)) {
        quoted(table).forEach((n) => used.add(n));
    }
}

const index = readFileSync(join(root, 'src/index.html'), 'utf8');
const listed = index.match(/icon_names=([a-z0-9_,]+)/)?.[1].split(',') ?? [];
const problems = [];
const missing = [...used].filter((n) => !listed.includes(n)).sort();
const spare = listed.filter((n) => !used.has(n));
const sorted = [...listed].sort();
if (missing.length) problems.push(`not in index.html's icon_names: ${missing.join(', ')}`);
if (spare.length) problems.push(`in index.html's icon_names but not used: ${spare.join(', ')}`);
// In order, so a name is easy to find in it
if (listed.join() !== sorted.join()) problems.push(`icon_names isn't in alphabetical order`);

if (problems.length) {
    console.error(`Icons: ${problems.join('\n       ')}`);
    process.exit(1);
}
console.log(`Icons: the ${listed.length} in index.html are the ones used.`);
