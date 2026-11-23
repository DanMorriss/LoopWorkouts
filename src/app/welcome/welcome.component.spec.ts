import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
    FakeAccountClient,
    fakeAccountClient,
    provideFakeAccountClient,
} from '../shared/testing/fake-account-client';
import { provideFakeSyncStarter } from '../shared/testing/fake-sync';
import { WelcomeComponent } from './welcome.component';

describe('WelcomeComponent (NAV-3)', () => {
    let client: FakeAccountClient;
    let navigate: ReturnType<typeof vi.spyOn>;

    async function create(signedInAs: string | null = null) {
        client = fakeAccountClient(signedInAs);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                provideFakeAccountClient(client),
                provideFakeSyncStarter(),
            ],
        });
        navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
        const fixture = TestBed.createComponent(WelcomeComponent);
        await new Promise((resolve) => setTimeout(resolve));
        await fixture.whenStable();
        return fixture.nativeElement as HTMLElement;
    }

    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it('says what the app is, then offers signing in, or going on without an account', async () => {
        const element = await create();

        expect(element.querySelector('.welcome__title')!.textContent).toBe('Loop Workouts');
        expect(element.textContent).toContain('The workout timer that remembers what you lifted.');
        // Signing in in its card, with no tick first: keeping notes is asked after (SYN-10)
        const card = element.querySelector('section[aria-labelledby="welcome-sync-title"]')!;
        expect(card.querySelector('h2')!.textContent!.trim()).toBe(
            'Keep your workouts on every device'
        );
        expect(card.querySelector('app-sign-in')).not.toBeNull();
        expect(card.textContent).toContain('Continue with Google');
        expect(element.querySelector('#health-consent')).toBeNull();
        expect(element.querySelector('#welcome-guest-hint')!.textContent).toContain(
            'Free while in beta. Without an account, everything stays on this device.'
        );
    });

    it("goes Home as a guest, and isn't asked again on this device", async () => {
        const element = await create();

        [...element.querySelectorAll('button')]
            .find((button) => button.textContent!.trim() === 'Continue without an account')!
            .click();

        expect(localStorage.getItem('welcomed')).toBe('guest');
        expect(navigate).toHaveBeenCalledWith('/home', { replaceUrl: true });
    });

    it('goes Home once signed in', async () => {
        await create('me@example.com');

        expect(localStorage.getItem('welcomed')).toBe('signed-in');
        expect(navigate).toHaveBeenCalledWith('/home', { replaceUrl: true });
    });
});
