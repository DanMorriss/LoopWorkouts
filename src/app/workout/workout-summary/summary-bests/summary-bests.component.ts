import { Component, computed, inject, input } from '@angular/core';
import { describeScore, formatDuration } from '../../../history/history-format';
import { HistoryEntry } from '../../../models/history';
import { isMostRounds, roundsScore } from '../../../models/progress';
import { Mark, sinceLastTime } from '../../../models/since-last-time';
import { weightIn } from '../../../models/weight';
import { HistoryStore } from '../../../shared/state/history-store.service';
import { ExerciseStore } from '../../../shared/state/exercise-store.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';
import { counted } from '../../../shared/format-count';
import { ownExerciseName } from '../../own-exercise-name';

/** One line of the card: what, how it went, and whether it's a new best. */
interface Line {
    key: string;
    name: string;
    text: string;
    best: boolean;
}

/**
 * Since last time, at the top of the workout summary under its figures (PRG-2), as beating
 * your last time is what the app is for: each exercise done before, by name, with a new best
 * marked and the best it beat ("Back squat: 60 kg × 10, up from 57.5 kg × 5"), or, short of
 * one, beside last time ("Plank: 0:45, last time 0:50"); and the most rounds in a time limit.
 * An exercise done for the first time has nothing to compare, so isn't here. Until
 * 2026-11-24 the summary listed the bests alone, without their exercises' names, and never
 * said last time.
 */
@Component({
    selector: 'app-summary-bests',
    template: `
        @if (lines().length) {
            <section class="bests" aria-labelledby="summary-bests">
                <h3 id="summary-bests">Since last time</h3>
                <ul class="bests__list">
                    @for (line of lines(); track line.key) {
                        <li class="bests__line">
                            <span class="bests__name">{{ line.name }}</span>
                            @if (line.best) {
                                <span class="bests__tag">New best</span>
                            }
                            <span class="bests__text">{{ line.text }}</span>
                        </li>
                    }
                </ul>
            </section>
        }
    `,
    styleUrl: './summary-bests.component.scss',
})
export class SummaryBestsComponent {
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);
    private readonly exerciseName = ownExerciseName(inject(ExerciseStore));

    /** The run, as logged. */
    readonly entry = input.required<HistoryEntry>();

    protected readonly lines = computed((): Line[] => {
        const entry = this.entry();
        const history = this.history.entries();
        const lines: Line[] = [];
        const score = roundsScore(entry);
        if (score && isMostRounds(entry, history)) {
            lines.push({
                key: 'rounds',
                name: 'Most rounds',
                text: describeScore(score),
                best: true,
            });
        }
        for (const line of sinceLastTime(entry, history)) {
            const set = entry.sets?.find((one) => one.exerciseId === line.exerciseId);
            const now = this.mark(line.now);
            const before = this.mark(line.before);
            lines.push({
                key: line.exerciseId,
                name: this.exerciseName(line.exerciseId) ?? set?.name ?? '',
                text: line.best ? `${now}, up from ${before}` : sinceLast(now, before, line),
                best: line.best,
            });
        }
        return lines;
    });

    /** "60 kg × 10", "24 reps" or "0:45". */
    private mark(mark: Mark): string {
        if (mark.weight !== undefined) {
            const unit = this.settings.weightUnit();
            return `${weightIn(mark.weight, unit)} ${unit} × ${mark.reps}`;
        }
        return mark.reps !== undefined ? counted(mark.reps, 'rep') : formatDuration(mark.seconds!);
    }
}

/**
 * A top set short of a best beside last time's: "60 kg × 10, up from 55 kg × 8 last time", "as
 * last time" or "last time 0:50".
 */
function sinceLast(now: string, before: string, line: { now: Mark; before: Mark }): string {
    const order = (mark: Mark) => [mark.weight ?? 0, mark.reps ?? 0, mark.seconds ?? 0];
    const [a, b] = [order(line.now), order(line.before)];
    const diff = a.map((value, i) => value - b[i]).find((value) => value !== 0) ?? 0;
    return diff > 0
        ? `${now}, up from ${before} last time`
        : diff === 0
          ? `${now}, as last time`
          : `${now}, last time ${before}`;
}
