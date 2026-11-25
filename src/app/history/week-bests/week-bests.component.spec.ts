import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistoryEntry, LoggedSet } from '../../models/history';
import { HistoryStore } from '../../shared/state/history-store.service';
import { WeekBestsComponent } from './week-bests.component';

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

describe('WeekBestsComponent (PRG-13)', () => {
    let fixture: ComponentFixture<WeekBestsComponent>;

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
        fixture = TestBed.createComponent(WeekBestsComponent);
        fixture.detectChanges();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const texts = (selector: string) =>
        [...el().querySelectorAll(selector)].map((e) => e.textContent!.replace(/\s+/g, ' ').trim());

    it("shows this week's new bests as tiles, each with what it beat", () => {
        create(
            entry(1, [squat(10, 60), squat(10, 60), squat(8, 60)]),
            entry(2, [bench(8), bench(8)]),
            entry(10, [bench(6, 70), squat(50), squat(12, 55)])
        );

        // Squats' first weight is its heaviest, but 50 reps 10 days ago stands; bench's 8 beat
        // its 6, but 70 kg stands
        expect(texts('.bests__label')).toEqual(['Heaviest', 'Most reps']);
        expect(texts('.bests__value')).toEqual(['60 kg × 10', '60 kg × 8']);
        expect(texts('.bests__was')).toEqual(['up from 55 kg × 12', 'up from 70 kg × 6']);
        expect(texts('.bests__name')).toEqual(['Back squat', 'Bench press']);
        expect(texts('.bests__tile .sr-only')).toEqual([
            'New best, heaviest: 60 kg for 10 reps, up from 55 kg for 12 reps, Back squat',
            'New best, most reps: 8 reps at 60 kg, up from 6 reps at 70 kg, Bench press',
        ]);
        expect(el().querySelector('.bests__tile')!.getAttribute('href')).toBe(
            '/exercises/back-squat?from=progress'
        );
    });

    it('says the last best set, with none this week', () => {
        create(entry(1, [squat(10, 60)]), entry(12, [squat(10, 62.5)]), entry(20, [squat(10, 60)]));
        expect(el().querySelector('app-new-best-tiles')).toBeNull();
        expect(texts('.week-bests__none')[0]).toContain('None in the last 7 days yet.');
        expect(texts('.week-bests__last')).toEqual(['Back squat 62.5 kg × 10']);
    });

    it('says what sets one, with none ever', () => {
        create(entry(1, [squat(10, 60)]));
        expect(texts('.week-bests__none')).toEqual([
            'None in the last 7 days yet. Beat your last time at an exercise and it shows here.',
        ]);
    });
});
