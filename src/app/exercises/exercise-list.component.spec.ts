import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BUILT_IN_EXERCISES } from '../models/built-in-exercises';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { HistoryStore } from '../shared/state/history-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { ExerciseListComponent } from './exercise-list.component';

describe('ExerciseListComponent', () => {
    let fixture: ComponentFixture<ExerciseListComponent>;

    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });
    afterEach(() => {
        fixture.destroy();
        localStorage.clear();
    });

    async function create() {
        fixture = TestBed.createComponent(ExerciseListComponent);
        await render();
    }

    async function render() {
        fixture.detectChanges();
        await fixture.whenStable();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const names = (selector = '.exercises__list') =>
        Array.from(el().querySelectorAll(`${selector} .exercise-card__name`)).map((name) =>
            name.firstChild!.textContent!.trim()
        );
    const button = (text: string) =>
        (Array.from(el().querySelectorAll('button')) as HTMLButtonElement[]).find(
            (b) => b.textContent!.replace(/check|expand_more|expand_less|add/g, '').trim() === text
        )!;

    async function search(text: string) {
        const box = el().querySelector('#exercise-search') as HTMLInputElement;
        box.value = text;
        box.dispatchEvent(new Event('input'));
        await render();
    }

    it('lists every exercise A to Z, with how many there are', async () => {
        await create();

        const sorted = BUILT_IN_EXERCISES.map((e) => e.name).sort((a, b) => a.localeCompare(b));
        expect(names()).toEqual(sorted);
        expect(el().querySelector('[role="status"]')!.textContent!.trim()).toBe(
            `${BUILT_IN_EXERCISES.length} exercises`
        );
    });

    it("shows each one's main muscles and equipment, and links to its page", async () => {
        await create();

        const card = Array.from(el().querySelectorAll('.exercise-card')).find((c) =>
            c.textContent!.includes('Back squat')
        ) as HTMLAnchorElement;
        expect(card.getAttribute('href')).toBe('/exercises/back-squat');
        expect(
            Array.from(card.querySelectorAll('.exercise-card__muscle')).map((m) => m.textContent)
        ).toEqual(['Quads', 'Glutes']);
        expect(card.querySelector('.exercise-card__equipment')!.textContent).toBe('Barbell, rack');
    });

    it('marks your own exercises', async () => {
        TestBed.inject(ExerciseStore).addOwn('Sled push', 'reps');
        await create();

        const card = Array.from(el().querySelectorAll('.exercise-card')).find((c) =>
            c.textContent!.includes('Sled push')
        )!;
        expect(card.querySelector('.exercise-card__tag')!.textContent).toBe('Your own');
    });

    it('searches by name and other names, best match first', async () => {
        await create();

        await search('press-up');

        expect(names()[0]).toBe('Push-up');
        expect(el().querySelector('.exercise-card__also')!.textContent).toBe(
            'Also called Press-up'
        );
    });

    it('cuts the list down to any picked main muscle, toggling each chip', async () => {
        await create();

        button('Calves').click();
        button('Shins').click();
        await render();

        expect(names().length).toBeGreaterThan(0);
        for (const name of names()) {
            const exercise = BUILT_IN_EXERCISES.find((e) => e.name === name)!;
            expect(
                exercise.mainMuscles.includes('calves') || exercise.mainMuscles.includes('shins')
            ).toBe(true);
        }
        expect(button('Calves').getAttribute('aria-pressed')).toBe('true');
        expect(button('Shins').getAttribute('aria-pressed')).toBe('true');
        expect(button('All muscles').getAttribute('aria-pressed')).toBe('false');

        const firstCard = el().querySelector('.exercise-card') as HTMLAnchorElement;
        expect(firstCard.getAttribute('href')).toContain('?muscles=calves,shins');

        button('Calves').click();
        await render();

        expect(button('Calves').getAttribute('aria-pressed')).toBe('false');
        expect(button('Shins').getAttribute('aria-pressed')).toBe('true');

        button('All muscles').click();
        await render();

        expect(button('All muscles').getAttribute('aria-pressed')).toBe('true');
        expect(button('Shins').getAttribute('aria-pressed')).toBe('false');
    });

    it('picks muscles from the body map and keeps chips and URL in sync', async () => {
        await create();

        const shapeFor = (muscle: string) => {
            const label = `${muscle.charAt(0).toUpperCase()}${muscle.slice(1)}`;
            return el().querySelector(`g[aria-label="${label}"]`) as SVGGElement;
        };

        shapeFor('quads').dispatchEvent(new MouseEvent('click'));
        await render();

        expect(button('Quads').getAttribute('aria-pressed')).toBe('true');
        const firstCard = el().querySelector('.exercise-card') as HTMLAnchorElement;
        expect(firstCard.getAttribute('href')).toContain('?muscles=quads');

        button('Quads').click();
        await render();

        const quadsShape = shapeFor('quads');
        expect(button('Quads').getAttribute('aria-pressed')).toBe('false');
        expect(quadsShape.getAttribute('aria-pressed')).toBe('false');
    });

    it('picks abductors from the body map', async () => {
        await create();

        const abductors = el().querySelector('g[aria-label="Abductors"]') as SVGGElement;
        abductors.dispatchEvent(new MouseEvent('click'));
        await render();

        expect(button('Abductors').getAttribute('aria-pressed')).toBe('true');
        expect(abductors.getAttribute('aria-pressed')).toBe('true');
    });

    it('can de-select from the body-map selected-muscle list', async () => {
        await create();

        const shapeFor = (muscle: string) => {
            const label = `${muscle.charAt(0).toUpperCase()}${muscle.slice(1)}`;
            return el().querySelector(`g[aria-label="${label}"]`) as SVGGElement;
        };

        shapeFor('quads').dispatchEvent(new MouseEvent('click'));
        await render();
        expect(button('Quads').getAttribute('aria-pressed')).toBe('true');

        const remove = el().querySelector('button[aria-label="Remove Quads"]') as HTMLButtonElement;
        remove.click();
        await render();

        expect(button('Quads').getAttribute('aria-pressed')).toBe('false');
    });

    it('shows only what you can do with your equipment, remembered', async () => {
        await create();
        el().querySelector<HTMLButtonElement>('.kit__edit')!.click();
        await render();
        button('Pull-up bar').click();
        el().querySelector<HTMLButtonElement>('[role="switch"]')!.click();
        await render();

        const settings = TestBed.inject(SettingsStore);
        expect(settings.myEquipment()).toEqual(['pull-up bar']);
        expect(settings.onlyMyEquipment()).toBe(true);
        expect(names()).toContain('Pull-up');
        expect(names()).toContain('Push-up');
        expect(names()).not.toContain('Back squat');
    });

    it('shows only what needs nothing with No equipment, which a piece takes off', async () => {
        await create();
        el().querySelector<HTMLButtonElement>('.kit__edit')!.click();
        await render();
        const kit = () => el().querySelector('.kit__edit')!.textContent!.replace(/\s+/g, ' ');
        expect(kit()).toContain('My equipment: none picked');

        button('No equipment').click();
        el().querySelector<HTMLButtonElement>('[role="switch"]')!.click();
        await render();

        const settings = TestBed.inject(SettingsStore);
        expect(settings.myEquipment()).toEqual(['none']);
        expect(kit()).toContain('My equipment: no equipment');
        expect(button('No equipment').getAttribute('aria-pressed')).toBe('true');
        expect(names()).toContain('Push-up');
        expect(names()).not.toContain('Pull-up');

        button('Pull-up bar').click();
        await render();
        expect(settings.myEquipment()).toEqual(['pull-up bar']);
        expect(button('No equipment').getAttribute('aria-pressed')).toBe('false');

        button('No equipment').click();
        await render();
        expect(settings.myEquipment()).toEqual(['none']);
        expect(button('Pull-up bar').getAttribute('aria-pressed')).toBe('false');
    });

    it('offers to clear the filters when nothing matches', async () => {
        await create();
        await search('zzz');

        expect(el().textContent).toContain('No exercises match.');
        button('Clear search and filters').click();
        await render();

        expect(names()).toHaveLength(BUILT_IN_EXERCISES.length);
    });

    it('keeps hidden exercises apart, at the end', async () => {
        TestBed.inject(ExerciseStore).setHidden('builtin:plank', true);
        await create();

        expect(names()).not.toContain('Plank');
        const toggle = el().querySelector<HTMLButtonElement>('.exercises__hidden-toggle')!;
        expect(toggle.textContent).toContain('Hidden from the picker (1)');
        toggle.click();
        await render();

        expect(names('#exercise-list-hidden')).toEqual(['Plank']);
    });

    it('makes a new exercise of your own, and goes to its page', async () => {
        await create();
        const router = TestBed.inject(Router);
        const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

        el().querySelector<HTMLButtonElement>('#exercise-list-new')!.click();
        await render();
        const name = el().querySelector('#exercise-editor-name') as HTMLInputElement;
        name.value = 'Sled drag';
        name.dispatchEvent(new Event('input'));
        await render();
        el()
            .querySelector('app-exercise-editor form')!
            .dispatchEvent(new Event('submit', { cancelable: true }));
        await render();

        const made = TestBed.inject(ExerciseStore).own()[0];
        expect(made.name).toBe('Sled drag');
        expect(navigate).toHaveBeenCalledWith(`/exercises/${made.id}`);
        expect(el().querySelector('app-exercise-editor')).toBeNull();
    });

    it('shows the latest and best of each exercise done in a workout', async () => {
        const startedAt = Date.now();
        TestBed.inject(HistoryStore).record({
            id: 'run',
            workoutId: 'legs',
            title: 'Legs',
            startedAt,
            endedAt: startedAt + 1000,
            activeSeconds: 1,
            roundsCompleted: 2,
            totalRounds: 2,
            outcome: 'finished',
            sets: [
                {
                    round: 0,
                    step: 0,
                    name: 'Back squat',
                    reps: 5,
                    weight: 100,
                    exerciseId: 'builtin:back-squat',
                },
                {
                    round: 1,
                    step: 0,
                    name: 'Back squat',
                    reps: 5,
                    weight: 100,
                    exerciseId: 'builtin:back-squat',
                },
            ],
        });
        await create();
        await search('back squat');

        const card = el().querySelector('.exercise-card')!;
        const progress = card
            .querySelector('.exercise-card__progress')!
            .textContent!.replace(/\s+/g, ' ');
        expect(progress).toContain('Latest 2 × 5 @ 100 kg');
        expect(progress).toContain('Best 100 kg');
        expect(el().querySelectorAll('.exercise-card__progress').length).toBe(1);
    });
});
