/** A stand-in for the browser's prefers-reduced-motion media query that tests can flip. */
export function fakeReducedMotion(initiallyReduced: boolean) {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const query = {
        matches: initiallyReduced,
        addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
            listeners.add(listener),
        removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
            listeners.delete(listener),
    };
    // Other queries (the theme's colour scheme, say) are the browser's own
    const real = window.matchMedia.bind(window);
    vi.spyOn(window, 'matchMedia').mockImplementation((media: string) =>
        media === '(prefers-reduced-motion: reduce)'
            ? (query as unknown as MediaQueryList)
            : real(media)
    );
    return {
        listenerCount: () => listeners.size,
        set(reduced: boolean) {
            query.matches = reduced;
            listeners.forEach((listener) => listener({ matches: reduced } as MediaQueryListEvent));
        },
    };
}
