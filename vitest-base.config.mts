import { defineConfig } from 'vitest/config';

// Extra Vitest settings on top of what `ng test` configures.
export default defineConfig({
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
