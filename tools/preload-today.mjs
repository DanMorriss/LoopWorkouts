// Preloads Today's chunk and the chunks it imports when the page opens on Today, and the
// built-in exercises' (which Today waits for, though they aren't in the first download), so
// a phone fetches them alongside main rather than one round trip after another (the page, main,
// Today's chunk, then what that imports). Run by `npm run build`, after `ng build`, which
// writes the chunk graph to browser-stats.json (`statsJson` in angular.json): chunk names
// change with every build, so index.html can't name them itself.
//
// Only on `/` and `/home`, by a small inline script, as on other pages they'd compete with
// what that page needs (measured on a slowed phone: Today's largest paint 0.55s sooner, but
// the Exercises list's 0.45s later). The script's hash joins those of the page's other
// inline scripts in the Content-Security-Policy that autoCsp writes.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ENTRY = 'src/app/home/home.component.ts';
// Loaded on demand (ExerciseStore.load()), but Today waits for it, so it comes too
const EXERCISES = 'src/app/models/built-in-exercises.ts';

const dist = new URL('../dist/loop-workouts/', import.meta.url).pathname;
const { outputs } = JSON.parse(readFileSync(join(dist, 'browser-stats.json'), 'utf8'));
const indexPath = join(dist, 'browser/index.html');
const index = readFileSync(indexPath, 'utf8');

const name = (path) => path.split('/').pop();
const byName = new Map(Object.keys(outputs).map((path) => [name(path), outputs[path]]));
// What index.html already loads or preloads (main is started by an inline script)
const loaded = new Set([...index.matchAll(/\b((?:main|chunk)-[\w-]+\.js)\b/g)].map((m) => m[1]));

const today = Object.entries(outputs).find(([, out]) => out.entryPoint === ENTRY)?.[0];
if (!today) {
    console.error(`preload-today: no chunk for ${ENTRY} in browser-stats.json`);
    process.exit(1);
}

// Today's chunk, then each chunk it imports (and they import) that isn't loaded already
const preload = [];
const visit = (file) => {
    if (loaded.has(file) || preload.includes(file)) return;
    preload.push(file);
    for (const { path, kind } of byName.get(file)?.imports ?? []) {
        if (kind === 'import-statement') visit(name(path));
    }
};
visit(name(today));
const exercises = Object.entries(outputs).find(([, out]) => EXERCISES in (out.inputs ?? {}))?.[0];
if (!exercises) {
    console.error(`preload-today: no chunk for ${EXERCISES} in browser-stats.json`);
    process.exit(1);
}
visit(name(exercises));

const script =
    `if (/^\\/(home)?$/.test(location.pathname)) for (const href of ${JSON.stringify(preload)}) ` +
    `document.head.append(Object.assign(document.createElement('link'), { rel: 'modulepreload', href }))`;
const hash = createHash('sha256').update(script).digest('base64');
const policy = "script-src 'strict-dynamic' ";
if (!index.includes(policy)) {
    console.error(`preload-today: no "${policy}" in index.html's Content-Security-Policy`);
    process.exit(1);
}
// After Angular's own preloads, so what main needs is asked for first
const lastPreload = index.lastIndexOf('<link rel="modulepreload"');
const at = lastPreload < 0 ? index.indexOf('</head>') : index.indexOf('>', lastPreload) + 1;
const built = index.slice(0, at) + `<script>${script}</script>` + index.slice(at);
writeFileSync(indexPath, built.replace(policy, `${policy}'sha256-${hash}' `));
const kb = preload.reduce((sum, file) => sum + (byName.get(file)?.bytes ?? 0), 0) / 1000;
console.log(`preload-today: ${preload.length} chunks preloaded for Today (${kb.toFixed(1)} kB)`);
