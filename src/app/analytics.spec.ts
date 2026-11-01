import { withoutPrivateParts } from './analytics';

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
