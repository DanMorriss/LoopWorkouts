import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { PageSlide } from '../../shared/navigation/page-slide';
import { PlanStore } from '../../shared/state/plan-store.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { UndoService } from '../../shared/undo/undo.service';
import { ReadyMadePlansComponent } from './ready-made-plans.component';

describe('ReadyMadePlansComponent (PLN-6)', () => {
    let harness: RouterTestingHarness;

    beforeEach(async () => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'home', children: [] },
                    { path: 'plan', children: [] },
                    { path: 'ready-made-plans', component: ReadyMadePlansComponent },
                ]),
            ],
        });
        harness = await RouterTestingHarness.create();
    });
    afterEach(() => localStorage.clear());

    async function open(url = '/ready-made-plans') {
        await harness.navigateByUrl(url);
        harness.fixture.detectChanges();
        await harness.fixture.whenStable();
    }

    const el = (): HTMLElement => harness.routeNativeElement!;
    const titles = () =>
        [...el().querySelectorAll('.plan-card__title')].map((t) => t.textContent!.trim());

    it('lists every plan, those for your goal first', async () => {
        TestBed.inject(SettingsStore).update({ trainingGoal: 'fitness' });
        await open();

        expect(el().querySelector('h2')!.textContent!.trim()).toBe('Ready-made plans');
        expect(titles()).toEqual([
            'Fitness, 4 days',
            'Kettlebell, 3 days',
            'No equipment, 3 days',
            '3-day beginner gym',
            'Push, pull, legs',
            'Dumbbells at home, 4 days',
        ]);
        const first = el().querySelector('app-plan-card')!;
        const text = (selector: string) =>
            [...first.querySelectorAll(selector)].map((t) =>
                t.textContent!.replace(/\s+/g, ' ').trim()
            );
        expect(text('.plan-card__count')).toEqual(['4 days a week']);
        expect(text('.showcase-tag')).toEqual(['Kettlebell']);
    });

    it('hides those needing what you have not got, with Only what I have on', async () => {
        TestBed.inject(SettingsStore).update({ myEquipment: [], onlyMyEquipment: true });
        await open();

        expect(titles()).toEqual(['No equipment, 3 days']);
        expect(el().textContent).toContain("5 more need equipment you haven't picked.");
    });

    it('goes back to Today, or to the Plan page it was opened from', async () => {
        await open();
        expect(el().querySelector('.back-link')!.getAttribute('href')).toBe('/home');

        // Opened afresh from the Plan page
        await open('/plan');
        await open('/ready-made-plans?from=plan');
        expect(el().querySelector('.back-link')!.getAttribute('href')).toBe('/plan');
    });

    describe('its workouts', () => {
        const row = () =>
            [...el().querySelectorAll<HTMLAnchorElement>('.plan-card__workout')].find((link) =>
                link.textContent!.includes('Gym legs')
            )!;

        it('slides each in on its own page, saying where to come back to', async () => {
            await open();
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});

            expect(row().getAttribute('href')).toBe('/ready-made-plans/gym-legs?from=plans');
            row().click();

            expect(slide).toHaveBeenCalledWith('/ready-made-plans/gym-legs?from=plans', 'in');
        });

        it('comes back to the Plan page way, when opened from there', async () => {
            await open('/ready-made-plans?from=plan');

            expect(row().getAttribute('href')).toBe('/ready-made-plans/gym-legs?from=plan');
        });
    });

    it('uses one, then goes to Today, with Undo', async () => {
        await open();
        el().querySelector<HTMLButtonElement>('[aria-label="Use Push, pull, legs"]')!.click();
        await harness.fixture.whenStable();

        expect(TestBed.inject(Router).url).toBe('/home');
        // Its ready-made workouts are planned as they are, not copied
        expect(TestBed.inject(WorkoutStore).workouts()).toEqual([]);
        expect(TestBed.inject(PlanStore).plan().days.flat()).toContain('builtin:gym-push');
        expect(TestBed.inject(UndoService).offer()?.message).toBe(
            'Your week is planned: Push, pull, legs'
        );
    });

    it('leaves out its active rest days, with its switch off', async () => {
        await open();
        const card = [...el().querySelectorAll<HTMLElement>('app-plan-card')].find((c) =>
            c.textContent!.includes('Push, pull, legs')
        )!;
        const toggle = card.querySelector<HTMLButtonElement>('[role="switch"]')!;
        // Named, and on as the plan comes
        const label = document.getElementById(toggle.getAttribute('aria-labelledby')!)!;
        expect(label.textContent!.trim()).toBe('Include active rest days');
        expect(
            document.getElementById(toggle.getAttribute('aria-describedby')!)!.textContent!.trim()
        ).toBe('Optional stretching on 2 rest days.');
        expect(toggle.getAttribute('aria-checked')).toBe('true');
        expect(card.textContent).toContain('+ 2 active rest');
        expect(card.textContent).toContain('Mobility flow');

        toggle.click();
        harness.fixture.detectChanges();
        // The card shows the plan as it'll be used: no active rest, the training as it was
        expect(toggle.getAttribute('aria-checked')).toBe('false');
        expect(card.textContent).not.toContain('+ 2 active rest');
        expect(card.textContent).not.toContain('Mobility flow');
        expect(card.querySelector('.plan-card__count')!.textContent).toContain('4');

        card.querySelector<HTMLButtonElement>('[aria-label="Use Push, pull, legs"]')!.click();
        await harness.fixture.whenStable();
        const planned = TestBed.inject(PlanStore).plan().days.flat();
        expect(planned).toContain('builtin:gym-push');
        expect(planned).not.toContain('builtin:mobility-flow');
        expect(planned).not.toContain('builtin:full-body-stretch');
    });
});
