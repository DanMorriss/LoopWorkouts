// The icons the app uses, by name, for the icon font (tools/build-icon-font.mjs) and its check
// (tools/check-icons.mjs).
//
// An icon's name is found as the text of a `mat-icon` or `app-icon`, the quoted names in an
// `{{ … }}` there, an `icon: '…'` field, or a value in a `…_ICONS` table. An icon named some
// other way (built from parts, say) is missed: add it to one of those, or to EXTRA below.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const EXTRA = [];

export const root = new URL('..', import.meta.url).pathname;

/** The names of the icons the app uses, A to Z. */
export function usedIcons() {
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
    return [...used].sort();
}

/** The icon font, served from the app's own address, and the list of what's in it. */
export const ICON_FONT = join(root, 'public/fonts/material-symbols-outlined.woff2');
export const ICON_LIST = join(root, 'tools/icon-font.json');
