import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BUILT_IN_WORKOUTS, copyOfBuiltIn } from '../../models/built-in-workouts';
import { PageSlide } from '../../nav/page-slide';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { ReadyMadeComponent } from './ready-made.component';

describe('ReadyMadeComponent', () => {
    let fixture: ComponentFixture<unknown>;
    let store: WorkoutStore;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'library', children: [] },
                    { path: 'workout', children: [] },
                    { path: 'ready-made', component: ReadyMadeComponent },
                ]),
            ],
        });
        store = TestBed.inject(WorkoutStore);
    });

    afterEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    async function open() {
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl('/ready-made');
        fixture = harness.fixture;
        await render();
    }

    async function render() {
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const text = (node: Element = el()) => node.textContent!.replace(/\s+/g, ' ').trim();
    const groups = () => Array.from(el().querySelectorAll('.ready__group')).map((h) => text(h));
    const names = () => Array.from(el().querySelectorAll('.ready__name')).map((n) => text(n));
    const card = (title: string) =>
        Array.from(el().querySelectorAll<HTMLAnchorElement>('.ready__card')).find((c) =>
            text(c).startsWith(title)
        )!;

    it('lists every ready-made workout, in its group', async () => {
        await open();

        expect(groups()).toEqual(['No equipment', 'Kettlebell', 'Dumbbells', 'Gym', 'Other kit']);
        expect(names()).toEqual(BUILT_IN_WORKOUTS.map((w) => w.title));
        expect(text(card('Dumbbell full body'))).toContain('7 exercises · Dumbbells, Bench');
        expect(text(card('Bodyweight basics'))).toContain('No equipment');
    });

    it('hides those needing what you have not got, with Only what I have on', async () => {
        TestBed.inject(SettingsStore).update({
            myEquipment: ['kettlebell'],
            onlyMyEquipment: true,
        });
        await open();

        expect(groups()).toEqual(['No equipment', 'Kettlebell']);
        expect(names()).not.toContain('Gym push');
        const hidden = BUILT_IN_WORKOUTS.filter(
            (w) => w.group === 'dumbbells' || w.group === 'gym' || w.group === 'other'
        ).length;
        expect(text()).toContain(`${hidden} more need equipment you haven't picked.`);
    });

    it('slides each one in on its own page, with a link to it', async () => {
        await open();
        const slide = vi.spyOn(TestBed.inject(PageSlide), 'navigate').mockImplementation(() => {});

        expect(card('Gym legs').getAttribute('href')).toBe('/ready-made/gym-legs');
        card('Gym legs').click();

        expect(slide).toHaveBeenCalledWith('/ready-made/gym-legs', 'in');
    });

    it('says which are in your workouts already', async () => {
        store.addWorkout({ ...copyOfBuiltIn(BUILT_IN_WORKOUTS[0]) });
        await open();

        expect(text(card(BUILT_IN_WORKOUTS[0].title))).toContain('In your workouts');
        expect(text(card(BUILT_IN_WORKOUTS[1].title))).not.toContain('In your workouts');
    });
});
