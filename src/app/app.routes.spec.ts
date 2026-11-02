import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HistoryEntry } from './models/history';
import { routes } from './app.routes';
import { AUTH_STORAGE_KEY } from './account/account-client';

const entry: HistoryEntry = {
    id: '1000000-1',
    workoutId: 'workout-1',
    title: 'Sprints',
    startedAt: 1_000_000,
    endedAt: 1_060_000,
    updatedAt: 1_060_000,
    activeSeconds: 60,
    roundsCompleted: 3,
    totalRounds: 3,
    outcome: 'finished',
};

describe('routes', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    });
    afterEach(() => localStorage.clear());

    it('opens on Home', async () => {
        localStorage.setItem('welcomed', 'guest');
        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl('/');

        expect(TestBed.inject(Router).url).toBe('/home');
        expect(harness.routeNativeElement!.querySelector('.home')).not.toBeNull();
    });

    describe('the welcome screen (NAV-3)', () => {
        it('opens first on a device new to the app', async () => {
            const harness = await RouterTestingHarness.create();

            await harness.navigateByUrl('/');

            expect(TestBed.inject(Router).url).toBe('/welcome');
        });

        it('lets a device with workouts or history from before go straight Home', async () => {
            localStorage.setItem('history', JSON.stringify([entry]));
            const harness = await RouterTestingHarness.create();

            await harness.navigateByUrl('/');

            expect(TestBed.inject(Router).url).toBe('/home');
            expect(localStorage.getItem('welcomed')).toBe('guest');
        });

        it('lets a device signed in go straight Home', async () => {
            localStorage.setItem(AUTH_STORAGE_KEY, '{}');
            const harness = await RouterTestingHarness.create();

            await harness.navigateByUrl('/');

            expect(TestBed.inject(Router).url).toBe('/home');
        });

        it('opens the setup (NAV-4) once answered, until it is done', async () => {
            const harness = await RouterTestingHarness.create();
            await harness.navigateByUrl('/');
            expect(localStorage.getItem('setup')).toBe('due');

            localStorage.setItem('welcomed', 'guest');
            await harness.navigateByUrl('/home');
            expect(TestBed.inject(Router).url).toBe('/welcome/setup');

            localStorage.removeItem('setup');
            await harness.navigateByUrl('/home');
            expect(TestBed.inject(Router).url).toBe('/home');
        });

        it('opens the setup once signed in from the welcome screen', async () => {
            localStorage.setItem('setup', 'due');
            localStorage.setItem(AUTH_STORAGE_KEY, '{}');
            const harness = await RouterTestingHarness.create();

            await harness.navigateByUrl('/');

            expect(TestBed.inject(Router).url).toBe('/welcome/setup');
        });
    });

    // It loads in the background, so the page would otherwise say there's nothing yet
    it('opens the history once the saved history has loaded', async () => {
        localStorage.setItem('history', JSON.stringify([entry]));
        const harness = await RouterTestingHarness.create();

        await harness.navigateByUrl('/history');

        expect(harness.routeNativeElement!.textContent).toContain('Sprints');
        expect(harness.routeNativeElement!.textContent).not.toContain('No workouts yet');
    });
});
