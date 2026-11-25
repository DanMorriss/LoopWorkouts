import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoggedSet } from '../../../models/history';
import { HistoryStore } from '../../../shared/state/history-store.service';
import { ExerciseLastTimeComponent } from './exercise-last-time.component';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('ExerciseLastTimeComponent', () => {
    let fixture: ComponentFixture<ExerciseLastTimeComponent>;
    let heading: HTMLElement;

    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        TestBed.configureTestingModule({ providers: [provideRouter([])] });
        heading = document.createElement('h3');
        heading.id = 'progress-heading';
        heading.tabIndex = -1;
        document.body.append(heading);
    });
    afterEach(() => {
        fixture.destroy();
        heading.remove();
        localStorage.clear();
    });

    const swing = (reps: number, weight: number): LoggedSet => ({
        round: 0,
        step: 0,
        name: 'Kettlebell swing',
        reps,
        weight,
        exerciseId: 'builtin:kettlebell-swing',
    });

    function logged(daysAgo: number, sets: LoggedSet[]) {
        const startedAt = Date.now() - daysAgo * DAY_MS;
        TestBed.inject(HistoryStore).record({
            id: `${startedAt}-bells`,
            workoutId: 'bells',
            title: 'Bells',
            startedAt,
            endedAt: startedAt + 60_000,
            activeSeconds: 60,
            roundsCompleted: 1,
            totalRounds: 1,
            outcome: 'finished',
            sets,
        });
    }

    async function create() {
        fixture = TestBed.createComponent(ExerciseLastTimeComponent);
        fixture.componentRef.setInput('exerciseId', 'builtin:kettlebell-swing');
        fixture.componentRef.setInput('progressId', 'progress-heading');
        fixture.detectChanges();
        await fixture.whenStable();
    }

    const el = (): HTMLElement => fixture.nativeElement;
    const text = (selector: string) =>
        Array.from(el().querySelectorAll(selector)).map((e) =>
            e.textContent!.replace(/\s+/g, ' ').trim()
        );

    it('shows nothing before the exercise has been done', async () => {
        await create();
        expect(el().textContent!.trim()).toBe('');
    });

    it('shows its latest sets and best, and goes down to its progress', async () => {
        logged(9, [swing(12, 16)]);
        logged(2, [swing(15, 16), swing(15, 16)]);
        await create();

        expect(text('dt')).toEqual(['Last time', 'Best']);
        expect(text('dd')[0]).toContain('2 × 15 @ 16 kg');
        expect(text('dd')[1]).toBe('16 kg × 15');

        el().querySelector<HTMLButtonElement>('.last-time__more')!.click();
        expect(document.activeElement).toBe(heading);
    });
});
