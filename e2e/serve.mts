// Serves the production build (dist/loop-workouts/browser) for the end-to-end tests, as Vercel
// does: each file as it is, with the headers in vercel.json, and index.html for any other page,
// so a deep link such as /history opens the app there. Node only, so it needs no package.
// Run by playwright.config.ts once the app is built: `node e2e/serve.mts [port]`.
import { readFileSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const root = new URL('../dist/loop-workouts/browser/', import.meta.url).pathname;
const port = Number(process.argv[2] ?? 4300);

const TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.woff2': 'font/woff2',
    '.map': 'application/json',
};

interface VercelConfig {
    headers: { headers: { key: string; value: string }[] }[];
}
const vercel = JSON.parse(
    readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')
) as VercelConfig;
const headers = Object.fromEntries(
    vercel.headers.flatMap((rule) => rule.headers.map(({ key, value }) => [key, value]))
);

async function isFile(path: string): Promise<boolean> {
    try {
        return (await stat(path)).isFile();
    } catch {
        return false;
    }
}

createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname);
    // normalize() resolves any `..`, and the join keeps it inside the build
    let file = join(root, normalize(pathname));
    if (!(await isFile(file))) {
        if (extname(pathname)) {
            // A missing script or image is a 404, not the app
            response.writeHead(404, headers).end();
            return;
        }
        file = join(root, 'index.html');
    }
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    response.writeHead(200, { ...headers, 'Content-Type': type }).end(await readFile(file));
}).listen(port, '127.0.0.1', () => {
    console.log(`Serving ${root} on http://127.0.0.1:${port}`);
});
