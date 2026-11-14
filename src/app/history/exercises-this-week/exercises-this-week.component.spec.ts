import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistoryEntry, LoggedSet } from '../../models/history';
import { HistoryStore } from '../../shared/state/history-store.service';
import { ExercisesThisWeekComponent } from './exercises-this-week.component';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 10, 14, 15).getTime();

const squat = (reps: number, weight?: number): LoggedSet => ({
    round: 0,
    step: 0,
    name: 'Squats',
    reps,
    ...(weight === undefined ? {} : { weight }),
    exerciseId: 'builtin:back-squat',
});
const bench = (reps: number, weight = 60): LoggedSet => ({
    round: 0,
    step: 1,
    name: 'Bench',
    reps,
    weight,
    exerciseId: 'builtin:bench-press',
});
const plank = (seconds: number): LoggedSet => ({
    round: 0,
    step: 2,
    name: 'Plank',
    seconds,
    exerciseId: 'builtin:plank',
});

function entry(daysAgo: number, sets: LoggedSet[]): HistoryEntry {
    const startedAt = NOW - daysAgo * DAY;
    return {
        id: `${startedAt}-w`,
        workoutId: 'w',
        title: 'Legs',
        startedAt,
        endedAt: startedAt + 60_000,
        updatedAt: startedAt,
        activeSeconds: 60,
        roundsCompleted: 1,
        totalRounds: 1,
        outcome: 'finished',
        sets,
    };
}

describe('ExercisesThisWeekComponent (PRG-13)', () => {
    let fixture: ComponentFixture<ExercisesThisWeekComponent>;

    beforeEach(() => {
        vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
    });
    afterEach(() => {
        fixture?.destroy();
        vi.useRealTimers();
        localStorage.clear();
    });

    function create(...entries: HistoryEntry[]) {
        const history = TestBed.inject(HistoryStore);
        entries.forEach((item) => history.record(item));
        fixture = TestBed.createComponent(ExercisesThisWeekComponent);
        fixture.detectChanges();
    }

    const el = () => fixture.nativeElement as HTMLElement;
    const texts = (selector: string) =>
        [...el().querySelectorAll(selector)].map((node) =>
            node.textContent!.replace(/\s+/g, ' ').trim()
        );

    it("lists each exercise's reps or time and sets, new bests first, then most sets", () => {
        create(
            entry(1, [squat(10, 60), squat(10, 60), squat(8, 60), plank(45), plank(60)]),
            entry(2, [bench(8), bench(8)]),
            entry(10, [bench(6, 70), squat(50)])
        );

        expect(texts('.exercises-week__name')).toEqual(['Back squat', 'Bench press', 'Plank']);
        expect(texts('.exercises-week__total [aria-hidden="true"]')).toEqual([
            '28 reps · 3 sets',
            '16 reps · 2 sets',
            '1:45 · 2 sets',
        ]);
        expect(texts('.exercises-week__total .sr-only')).toEqual([
            '28 reps in 3 sets',
            '16 reps in 2 sets',
            '1 minute 45 seconds in 2 sets',
        ]);
        // Squats' first weight is its heaviest, but 50 reps 10 days ago stands; bench's 8 beat
        // its 6, but 70 kg stands. Both set a best, so go first, squats with more sets
        expect(
            texts('.exercises-week__best [aria-hidden="true"]:not(.exercises-week__tag)')
        ).toEqual(['Heaviest 60 kg × 10', 'Most reps 8 @ 60 kg']);
        expect(texts('.exercises-week__tag')).toEqual(['New best', 'New best']);
        expect(texts('.exercises-week__best .sr-only')).toEqual([
            'New best, heaviest: 60 kg for 10 reps',
            'New best, most reps: 8 reps at 60 kg',
        ]);
        expect(el().querySelector('a')!.getAttribute('href')).toBe('/exercises/back-squat');
    });

    it('shows nothing with nothing done in the last 7 days', () => {
        create(entry(8, [squat(10)]));
        expect(el().querySelector('section')).toBeNull();
    });

    it('shows the first 6, then the rest on Show all', () => {
        const ids = [
            'back-squat',
            'bench-press',
            'plank',
            'push-up',
            'dumbbell-lunge',
            'walking-lunge',
            'deadlift',
        ];
        create(
            entry(
                1,
                ids.map((id, step) => ({
                    round: 0,
                    step,
                    name: id,
                    reps: 5,
                    exerciseId: `builtin:${id}`,
                }))
            )
        );
        expect(el().querySelectorAll('.exercises-week__row')).toHaveLength(6);
        const toggle = el().querySelector<HTMLButtonElement>('.exercises-week__toggle')!;
        expect(toggle.textContent!.trim()).toBe('Show all 7');

        toggle.click();
        fixture.detectChanges();
        expect(el().querySelectorAll('.exercises-week__row')).toHaveLength(7);
        expect(toggle.textContent!.trim()).toBe('Show fewer');
    });
});
