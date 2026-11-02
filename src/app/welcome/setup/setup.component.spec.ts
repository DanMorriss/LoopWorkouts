import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AUTH_STORAGE_KEY } from '../../account/account-client';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import {
    FakeSyncStarter,
    fakeSyncStarter,
    provideFakeSyncStarter,
} from '../../shared/testing/fake-sync';
import { PROFILE_WAIT_MS, SetupComponent } from './setup.component';

describe('SetupComponent (NAV-4)', () => {
    let starter: FakeSyncStarter;
    let navigate: ReturnType<typeof vi.spyOn>;
    let element: HTMLElement;
    let fixture: ReturnType<typeof TestBed.createComponent<SetupComponent>>;

    async function create({ signedIn = false } = {}) {
        if (signedIn) {
            localStorage.setItem(AUTH_STORAGE_KEY, '{}');
        }
        starter = fakeSyncStarter();
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideFakeSyncStarter(starter)],
        });
        navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
        fixture = TestBed.createComponent(SetupComponent);
        element = fixture.nativeElement as HTMLElement;
        await fixture.whenStable();
    }

    const settings = () => TestBed.inject(SettingsStore);
    const heading = () => element.querySelector('h2')?.textContent!.trim();
    // By its words, less a picked chip's ✓ (an icon font's ligature, "check")
    const button = (name: string) =>
        [...element.querySelectorAll('button')].find(
            (b) =>
                b
                    .textContent!.replace(/\s+/g, ' ')
                    .replace(/^check /, '')
                    .trim() === name
        )!;
    const choose = async (label: string) => {
        const option = [...element.querySelectorAll('label')].find((l) =>
            l.textContent!.includes(label)
        )!;
        option.querySelector('input')!.click();
        await fixture.whenStable();
    };
    const press = async (name: string) => {
        button(name).click();
        await fixture.whenStable();
    };

    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('setup', 'due');
    });
    afterEach(() => {
        vi.useRealTimers();
        localStorage.clear();
    });

    it('asks one question at a time, saving each answer, then offers a workout', async () => {
        await create();
        expect(element.textContent).toContain('Question 1 of 5');
        expect(heading()).toBe('What should we call you?');
        expect(document.activeElement).toBe(element.querySelector('h2'));

        const name = element.querySelector('input')!;
        name.value = '  Sam ';
        name.dispatchEvent(new Event('input'));
        await press('Next');
        expect(settings().name()).toBe('Sam');

        expect(heading()).toBe('What do you train for?');
        await choose('Fitness');
        expect(settings().trainingGoal()).toBe('fitness');
        await press('Next');

        expect(heading()).toBe('What equipment do you have?');
        await press('Kettlebell');
        expect(button('Kettlebell').getAttribute('aria-pressed')).toBe('true');
        await press('Next');
        expect(settings().myEquipment()).toEqual(['kettlebell']);
        expect(settings().onlyMyEquipment()).toBe(true);

        expect(heading()).toBe('Which body should the muscle maps show?');
        await choose('Female');
        expect(settings().bodyFigure()).toBe('female');
        await press('Next');

        expect(heading()).toBe('Do you lift in kilograms or pounds?');
        await choose('Pounds');
        expect(settings().weightUnit()).toBe('lb');
        await press('Next');

        expect(heading()).toBe("You're all set, Sam");
        expect(element.textContent).toContain('Kettlebell full body');
        expect(element.textContent).not.toContain('Question');
        expect(settings().hasProfile()).toBe(true);
    });

    it('goes back to the question before, as it was answered', async () => {
        await create();
        await press('Next');
        await choose('Fitness');
        await press('Back');

        expect(heading()).toBe('What should we call you?');
        await press('Next');
        expect(element.querySelector<HTMLInputElement>('input:checked')!.value).toBe('fitness');
    });

    it("isn't asked again once skipped, and opens Home", async () => {
        await create();
        await press('Skip for now');

        expect(localStorage.getItem('setup')).toBeNull();
        expect(settings().hasProfile()).toBe(true);
        expect(navigate).toHaveBeenCalledWith('/home', { replaceUrl: true });
    });

    it('adds the workout offered to the library and starts it', async () => {
        await create();
        const start = vi.spyOn(TestBed.inject(ActiveRunService), 'start').mockReturnValue();
        for (let i = 0; i < 5; i++) {
            await press('Next');
        }
        await press('Start it');

        const workouts = TestBed.inject(WorkoutStore).workouts();
        expect(workouts.map((w) => w.title)).toEqual(['Bodyweight basics']);
        expect(start).toHaveBeenCalledWith(workouts[0]);
        expect(localStorage.getItem('setup')).toBeNull();
        expect(navigate).toHaveBeenCalledWith('/workout', { replaceUrl: true });
    });

    it('signed in, takes the profile the account already has, asking nothing', async () => {
        await create({ signedIn: true });
        expect(element.textContent).toContain('Getting your profile…');
        expect(starter.start).toHaveBeenCalled();

        settings().mergeProfile({
            name: 'Sam',
            bodyFigure: 'female',
            trainingGoal: 'muscle',
            weightUnit: 'kg',
            myEquipment: [],
            updatedAt: 5,
        });
        await fixture.whenStable();

        expect(localStorage.getItem('setup')).toBeNull();
        expect(navigate).toHaveBeenCalledWith('/home', { replaceUrl: true });
    });

    it('signed in, asks once the account has synced without a profile', async () => {
        await create({ signedIn: true });

        starter.status.set({ syncing: false, lastSyncedAt: 5, problem: null });
        await fixture.whenStable();

        expect(heading()).toBe('What should we call you?');
        expect(localStorage.getItem('setup')).toBe('asking');
    });

    it("signed in, asks anyway if the account doesn't answer soon", async () => {
        vi.useFakeTimers({ toFake: ['setTimeout'] });
        await create({ signedIn: true });

        vi.advanceTimersByTime(PROFILE_WAIT_MS);
        await fixture.whenStable();

        expect(heading()).toBe('What should we call you?');
    });

    it('signed in and part way through, carries on without waiting', async () => {
        localStorage.setItem('setup', 'asking');
        await create({ signedIn: true });

        expect(heading()).toBe('What should we call you?');
    });
});
