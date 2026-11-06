import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ReadyMadeWorkoutComponent } from './ready-made-workout.component';

describe("ReadyMadeWorkoutComponent, a ready-made plan's workout (PLN-6)", () => {
    let fixture: ComponentFixture<unknown>;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'home', children: [] },
                    { path: 'ready-made-plans', children: [] },
                    { path: 'ready-made-plans/:id', component: ReadyMadeWorkoutComponent },
                ]),
            ],
        });
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    async function openFrom(slug: string, from = 'plans') {
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl(`/ready-made-plans/${slug}?from=${from}`);
        fixture = harness.fixture;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const text = (node: Element = el()) => node.textContent!.replace(/\s+/g, ' ').trim();

    it('shows what it needs, its exercises and sets, and its muscles, only to look at', async () => {
        await openFrom('gym-legs');

        expect(text(el().querySelector('.preview__title')!)).toBe('Gym legs');
        expect(text()).toContain('Once through');
        expect(text()).toContain('Back squat chevron_right 3 sets: 12, 10, 8, rest 2:30');
        expect(text()).toContain('Superset 3 rounds, rest 1:00');
        expect(el().querySelector('app-body-map')).not.toBeNull();
        expect(el().querySelector('button')).toBeNull();
    });

    it.each([
        ['today', 'chevron_left Today', '/home'],
        ['plans', 'chevron_left Plans', '/ready-made-plans'],
        ['plan', 'chevron_left Plans', '/ready-made-plans?from=plan'],
        ['elsewhere', 'chevron_left Plans', '/ready-made-plans'],
    ])('goes back from %s to where the card was', async (from, label, url) => {
        await openFrom('gym-legs', from);
        const back = el().querySelector('.back-link')!;

        expect(text(back)).toBe(label);
        expect(back.getAttribute('href')).toBe(url);
    });

    it('links each exercise to its page, which comes back here', async () => {
        await openFrom('gym-legs', 'today');
        const links = Array.from(el().querySelectorAll('.outline__link'));

        expect(links.map((a) => text(a))).toContain('Back squat chevron_right');
        expect(links[0].getAttribute('href')).toBe(
            '/ready-made-plans/gym-legs/back-squat?from=today'
        );
    });

    it('says so for a link to one there is not', async () => {
        await openFrom('no-such-workout');

        expect(text(el().querySelector('.preview__title')!)).toBe('Workout not found');
    });
});
