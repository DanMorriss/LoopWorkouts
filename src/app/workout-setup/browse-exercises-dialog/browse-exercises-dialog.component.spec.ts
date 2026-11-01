import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BUILT_IN_EXERCISES } from '../../models/built-in-exercises';
import { canDoWith, Exercise } from '../../models/exercise';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { BrowseExercisesDialogComponent } from './browse-exercises-dialog.component';

describe('BrowseExercisesDialogComponent', () => {
    let fixture: ComponentFixture<BrowseExercisesDialogComponent>;
    let picked: Exercise[];
    let closed: number;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });
    afterEach(() => {
        fixture.destroy();
        localStorage.clear();
    });

    async function create() {
        fixture = TestBed.createComponent(BrowseExercisesDialogComponent);
        fixture.componentRef.setInput('stepNumber', 2);
        picked = [];
        closed = 0;
        fixture.componentInstance.picked.subscribe((exercise) => picked.push(exercise));
        fixture.componentInstance.closed.subscribe(() => closed++);
        await render();
    }

    async function render() {
        fixture.detectChanges();
        await fixture.whenStable();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const cards = () => Array.from(el().querySelectorAll('.exercise-card')) as HTMLElement[];
    const names = () =>
        cards().map((card) =>
            card.querySelector('.exercise-card__name')!.firstChild!.textContent!.trim()
        );
    const byName = (name: string) => BUILT_IN_EXERCISES.find((e) => e.name === name)!;
    const button = (text: string) =>
        (Array.from(el().querySelectorAll('button')) as HTMLButtonElement[]).find(
            (b) => b.textContent!.replace(/check|expand_more|expand_less/g, '').trim() === text
        )!;

    async function search(text: string) {
        const box = el().querySelector('#browse-search') as HTMLInputElement;
        box.value = text;
        box.dispatchEvent(new Event('input'));
        await render();
    }

    it('lists every exercise A to Z as buttons, each with its muscles and equipment', async () => {
        await create();

        const sorted = BUILT_IN_EXERCISES.map((e) => e.name).sort((a, b) => a.localeCompare(b));
        expect(names()).toEqual(sorted);
        expect(el().querySelector('[role="status"]')!.textContent!.trim()).toBe(
            `${BUILT_IN_EXERCISES.length} exercises`
        );
        const squat = cards()[names().indexOf('Back squat')];
        expect(squat.tagName).toBe('BUTTON');
        expect(squat.querySelector('.exercise-card__equipment')!.textContent).toContain('Barbell');
        expect(
            Array.from(squat.querySelectorAll('.exercise-card__muscle')).map((m) => m.textContent)
        ).toContain('Quads');
    });

    it('picks the exercise clicked', async () => {
        await create();

        cards()[names().indexOf('Goblet squat')].click();

        expect(picked.map((e) => e.id)).toEqual(['builtin:goblet-squat']);
    });

    it('finds by name, best match first, saying which other name it was found by', async () => {
        await create();

        await search('press-up');

        expect(names()[0]).toBe('Push-up');
        expect(el().querySelector('.exercise-card__also')!.textContent).toContain('Press-up');
    });

    it('cuts the list down to the main muscles picked', async () => {
        await create();

        button('Calves').click();
        await render();

        expect(names().length).toBeGreaterThan(0);
        for (const name of names()) {
            expect(byName(name).mainMuscles).toContain('calves');
        }
        expect(button('Calves').getAttribute('aria-pressed')).toBe('true');
        expect(button('All muscles').getAttribute('aria-pressed')).toBe('false');
    });

    it('shows only what I have, with that setting on', async () => {
        TestBed.inject(SettingsStore).update({ myEquipment: ['dumbbells'], onlyMyEquipment: true });
        await create();

        expect(names().length).toBeGreaterThan(0);
        expect(names().length).toBeLessThan(BUILT_IN_EXERCISES.length);
        for (const name of names()) {
            expect(canDoWith(byName(name), ['dumbbells'])).toBe(true);
        }
    });

    it('leaves out hidden exercises, unless their whole name is typed', async () => {
        TestBed.inject(ExerciseStore).setHidden('builtin:front-squat', true);
        await create();

        expect(names()).not.toContain('Front squat');
        await search('front squ');
        expect(names()).not.toContain('Front squat');
        await search('Front squat');
        expect(names()).toContain('Front squat');
    });

    it('says when nothing matches, and clears the search and filters', async () => {
        TestBed.inject(SettingsStore).update({ onlyMyEquipment: true });
        await create();
        button('Calves').click();
        await search('zzz');

        expect(el().textContent).toContain('No exercises match.');
        button('Clear search and filters').click();
        await render();

        expect(names().length).toBe(BUILT_IN_EXERCISES.length);
        expect(TestBed.inject(SettingsStore).onlyMyEquipment()).toBe(false);
        expect(document.activeElement).toBe(el().querySelector('#browse-search'));
    });

    it('closes with ✕, Escape or a click outside', async () => {
        await create();

        (el().querySelector('.browse__close') as HTMLButtonElement).click();
        el()
            .querySelector('.browse')!
            .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        (el().querySelector('.browse-overlay') as HTMLElement).click();
        (el().querySelector('.browse') as HTMLElement).click();

        expect(closed).toBe(3);
    });
});
