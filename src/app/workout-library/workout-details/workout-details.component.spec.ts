import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HistoryEntry } from '../../models/history';
import { PageSlide } from '../../nav/page-slide';
import { HistoryStore } from '../../shared/state/history-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { makeWorkout as baseWorkout } from '../../shared/testing/make-workout';
import { WorkoutDetailsComponent } from './workout-details.component';

describe('WorkoutDetailsComponent (LIB-4)', () => {
    let harness: RouterTestingHarness;
    let store: WorkoutStore;

    beforeEach(async () => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'library', children: [] },
                    { path: 'history', children: [] },
                    { path: 'setup', children: [] },
                    { path: 'library/:id', component: WorkoutDetailsComponent },
                ]),
            ],
        });
        store = TestBed.inject(WorkoutStore);
        harness = await RouterTestingHarness.create();
    });

    afterEach(() => localStorage.clear());

    function addSprints() {
        const { id: _id, ...workout } = baseWorkout({ title: 'Sprints' });
        return store.addWorkout(workout);
    }

    async function open(id: string) {
        await harness.navigateByUrl(`/library/${id}`);
        harness.fixture.detectChanges();
        await harness.fixture.whenStable();
    }

    const el = (): HTMLElement => harness.routeNativeElement!;
    const text = (node: Element = el()) => node.textContent!.replace(/\s+/g, ' ').trim();

    it("lists what's in it at the bottom, so it can be read without Edit", async () => {
        const legs = store.addWorkout({
            title: 'Legs',
            repeats: 2,
            blocks: [
                { kind: 'heading', text: 'Main' },
                {
                    kind: 'group',
                    rounds: 3,
                    restSeconds: 60,
                    steps: [{ kind: 'reps', reps: 10, name: 'Back squat' }],
                },
                {
                    kind: 'group',
                    rounds: 1,
                    restSeconds: 0,
                    steps: [{ kind: 'work', seconds: 30, name: '' }],
                },
            ],
        });
        await open(legs.id);

        const headings = Array.from(el().querySelectorAll('h3'), (h) => text(h));
        expect(headings).toEqual(['Muscles it works', 'History', "What's in it"]);
        expect(text(el().querySelector('.outline__repeats')!)).toBe('2 rounds of all of it');
        const lines = Array.from(el().querySelectorAll('.outline__part, .outline__line'), (line) =>
            text(line)
        );
        // An unnamed step goes by its kind, as in the history
        expect(lines).toEqual(['Main', 'Back squat 3 × 10, rest 1:00', 'Work 0:30']);
    });

    it('links each exercise with a page, sliding it in under this workout', async () => {
        const legs = store.addWorkout({
            title: 'Legs',
            repeats: 1,
            blocks: [
                {
                    kind: 'group',
                    rounds: 3,
                    restSeconds: 60,
                    steps: [{ kind: 'reps', reps: 10, name: 'Plank', exerciseId: 'builtin:plank' }],
                },
                {
                    kind: 'group',
                    rounds: 2,
                    restSeconds: 30,
                    steps: [
                        {
                            kind: 'reps',
                            reps: 8,
                            name: 'Back squat',
                            exerciseId: 'builtin:back-squat',
                        },
                        { kind: 'work', seconds: 30, name: '' },
                    ],
                },
            ],
        });
        await open(legs.id);
        const links = Array.from(el().querySelectorAll<HTMLAnchorElement>('.outline__link'));

        expect(links.map((a) => [text(a), a.getAttribute('href')])).toEqual([
            ['Plank', `/library/${legs.id}/plank`],
            ['Back squat', `/library/${legs.id}/back-squat`],
        ]);
        const slide = vi.spyOn(TestBed.inject(PageSlide), 'navigate').mockImplementation(() => {});
        links[0].click();
        expect(slide).toHaveBeenCalledWith(`/library/${legs.id}/plank`, 'in');
    });

    it("says when it hasn't been done yet, or has no exercises", async () => {
        await open(addSprints().id);

        expect(text(el().querySelector('h2')!)).toBe('Sprints');
        expect(text()).toContain('Not done yet.');
        expect(text()).toContain('None of its steps is an exercise yet');
    });

    it('lists its runs, newest first, linking to them in the history', async () => {
        const sprints = addSprints();
        const run = (startedAt: number): HistoryEntry => ({
            id: `${startedAt}-${sprints.id}`,
            workoutId: sprints.id,
            title: 'Sprints',
            startedAt,
            endedAt: startedAt + 300_000,
            activeSeconds: 300,
            roundsCompleted: 4,
            totalRounds: 4,
            outcome: 'finished',
            updatedAt: startedAt,
        });
        const history = TestBed.inject(HistoryStore);
        history.record(run(Date.UTC(2026, 9, 20, 12)));
        history.record(run(Date.UTC(2026, 9, 24, 12)));
        await open(sprints.id);

        expect(text()).toContain('Done 2 times');
        const runs = Array.from(el().querySelectorAll('.details__run'));
        expect(runs.map((a) => text(a))).toEqual([
            'Sat 24 Oct 4 rounds · 5:00',
            'Tue 20 Oct 4 rounds · 5:00',
        ]);
        expect(runs[0].getAttribute('href')).toBe(
            `/history?run=${Date.UTC(2026, 9, 24, 12)}-${sprints.id}`
        );
    });

    it('goes back with ‹ Workouts, saying which card to put focus on', async () => {
        const sprints = addSprints();
        await open(sprints.id);
        const back = el().querySelector('.back-link')!;

        expect(text(back)).toBe('chevron_left Workouts');
        expect(back.getAttribute('href')).toBe(`/library?details=${sprints.id}`);
    });

    it('edits the workout from its Edit button, coming back here', async () => {
        const sprints = addSprints();
        await open(sprints.id);
        const slide = vi.spyOn(TestBed.inject(PageSlide), 'navigate').mockImplementation(() => {});
        el().querySelector<HTMLButtonElement>('.details__edit')!.click();

        expect(slide).toHaveBeenCalledWith(
            `/setup?editId=${sprints.id}&from=%2Flibrary%2F${sprints.id}`,
            'in'
        );
    });

    it('says so for a link to one there is not, with the way back', async () => {
        await open('no-such-workout');

        expect(text(el().querySelector('h2')!)).toBe('Workout not found');
        expect(el().querySelector('.details__edit')).toBeNull();
        expect(el().querySelector('.back-link')).not.toBeNull();
    });
});
