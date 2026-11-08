import { routeOf, withoutPrivateParts } from './analytics';

describe('withoutPrivateParts', () => {
    it('drops a sign-in coming back, in the hash or the query', () => {
        expect(
            withoutPrivateParts('https://loopworkouts.com/account#access_token=abc&refresh_token=d')
        ).toBe('https://loopworkouts.com/account');
        expect(
            withoutPrivateParts('https://loopworkouts.com/account?error_code=otp_expired&code=x')
        ).toBe('https://loopworkouts.com/account');
    });

    it('keeps where the visit came from', () => {
        expect(
            withoutPrivateParts(
                'https://loopworkouts.com/?ref=reddit&utm_source=hn&utm_campaign=launch&email=a@b.c'
            )
        ).toBe('https://loopworkouts.com/?ref=reddit&utm_source=hn&utm_campaign=launch');
    });

    it('leaves a plain page as it is', () => {
        expect(withoutPrivateParts('https://loopworkouts.com/exercises/deadlift')).toBe(
            'https://loopworkouts.com/exercises/deadlift'
        );
    });
});

describe('routeOf', () => {
    const paths = ['home', 'library', 'library/:id', 'library/:workoutId/:id', 'exercises/:id'];

    it('names a page with a parameter by its route', () => {
        expect(routeOf('https://loopworkouts.com/exercises/push-up', paths)).toBe(
            '/exercises/[id]'
        );
        expect(routeOf('https://loopworkouts.com/library/abc/def?x=1#y', paths)).toBe(
            '/library/[workoutId]/[id]'
        );
    });

    it('keeps an exact page before one with a parameter', () => {
        expect(routeOf('https://loopworkouts.com/library', paths)).toBe('/library');
        expect(routeOf('https://loopworkouts.com/library/abc', paths)).toBe('/library/[id]');
    });

    it('gives an address that matches no route as it is', () => {
        expect(routeOf('https://loopworkouts.com/', paths)).toBe('/');
        expect(routeOf('https://loopworkouts.com/nowhere/at/all', paths)).toBe('/nowhere/at/all');
    });
});
