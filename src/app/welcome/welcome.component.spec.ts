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

    it('says what the app is, then offers signing in, or going on as a guest', async () => {
        const element = await create();

        expect(element.querySelector('h2')!.textContent).toBe('Welcome to Loop Workouts');
        expect(element.querySelector('app-sign-in')).not.toBeNull();
        expect(element.textContent).toContain('Continue with Google');
        expect(element.textContent).toContain('Everything stays on this device.');
        // With a ? to Help on what a guest's data means
        const help = element.querySelector('#welcome-guest-hint app-help-link a')!;
        expect(help.getAttribute('href')).toBe('/help?q=lose-workouts');
        expect(help.getAttribute('aria-label')).toBe('Help: Will I lose my workouts?');
    });

    it("goes Home as a guest, and isn't asked again on this device", async () => {
        const element = await create();

        [...element.querySelectorAll('button')]
            .find((button) => button.textContent!.trim() === 'Continue as guest')!
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
