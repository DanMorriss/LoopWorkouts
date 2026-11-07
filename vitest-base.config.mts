import { defineConfig } from 'vitest/config';

// Extra Vitest settings on top of what `ng test` configures.
export default defineConfig({
    plugins: [
        // Web workers (e.g. the 3D demos' figure.worker.ts): Vite takes the built app's
        // `new Worker(new URL(...))` for one of its own, and asks for the file with
        // `?worker_file`, which it then can't find (404), so the app falls back to drawing on the
        // page and the worker's never tested. Without the query, the built file is served.
        {
            name: 'serve-built-workers',
            configureServer(server) {
                server.middlewares.use((req, _res, next) => {
                    const built = req.url?.match(/\/(worker-[\w-]+\.js)\?worker_file/);
                    if (built) {
                        req.url = `/${built[1]}`;
                    }
                    next();
                });
            },
        },
    ],
    test: {
        // Undo vi.spyOn() spies (e.g. on Date.now) after each test, as Jasmine did
        restoreMocks: true,
        // More pages at once make timing tests fail, and don't make the run any quicker. Every
        // page shares one GPU process, and the 3D demos' WebGL is drawn in software in headless
        // Chromium, so with many pages the others can go seconds without a frame. Measured on
        // 2026-11-05: 3 or 4 failures a run by default (247-316s), and none in 6 runs with 2
        // workers (193-265s), 2 with 4, or 2 without the 3D spec.
        maxWorkers: 2,
    },
});
