import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { formatDuration } from '../../../history/history-format';
import {
    exerciseBests,
    ExerciseSession,
    progressMeasure,
    ProgressMeasure,
    sessionsByExercise,
    sessionValue,
} from '../../../models/progress';
import { HistoryStore } from '../../../shared/state/history-store.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';
import { chartKeyMove } from '../../../shared/chart-keys';
import {
    axisValue,
    bestLines,
    dateFormatFor,
    formatMeasure,
    MEASURE_TITLES,
} from '../../progress-format';
import { ProgressBestsComponent } from './progress-bests/progress-bests.component';
import { RecentSessionsComponent } from './recent-sessions/recent-sessions.component';

const DAY_MS = 24 * 60 * 60 * 1000;

/** How far back the chart goes. */
type ChartRange = '4w' | '3m' | '1y' | 'all';

const RANGES: { value: ChartRange; label: string; spoken: string; days: number }[] = [
    { value: '4w', label: '4 weeks', spoken: 'the last 4 weeks', days: 28 },
    { value: '3m', label: '3 months', spoken: 'the last 3 months', days: 91 },
    { value: '1y', label: 'Year', spoken: 'the last year', days: 365 },
    { value: 'all', label: 'All', spoken: 'all time', days: Infinity },
];

// The chart's drawing area, in SVG units: room on the left for the values, below for dates
const WIDTH = 340;
const HEIGHT = 180;
const LEFT = 44;
const RIGHT = 14;
const TOP = 14;
const BOTTOM = 26;

/** One workout on the chart. */
interface ChartPoint {
    entryId: string;
    at: number;
    title: string;
    /** In the unit shown, e.g. kg or lb, reps, or seconds. */
    value: number;
    text: string;
    spoken: string;
    x: number;
    y: number;
}

/**
 * An exercise's progress (PRG-4): its personal bests, a chart of one value per workout over
 * time, and its recent sessions, each linking to its workout in the history. The chart's
 * values can be read by hovering, by stepping through them with the arrow keys, or as a
 * table.
 */
@Component({
    selector: 'app-exercise-progress',
    imports: [DatePipe, ProgressBestsComponent, RecentSessionsComponent],
    templateUrl: './exercise-progress.component.html',
    styleUrl: './exercise-progress.component.scss',
})
export class ExerciseProgressComponent {
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);
    private readonly now = Date.now();

    readonly exerciseId = input.required<string>();
    /** For ids that are unique on the page. */
    readonly id = 'exercise-progress';

    protected readonly unit = this.settings.weightUnit;
    protected readonly ranges = RANGES;
    protected readonly width = WIDTH;
    protected readonly height = HEIGHT;
    protected readonly left = LEFT;
    protected readonly right = WIDTH - RIGHT;
    protected readonly bottom = HEIGHT - BOTTOM;

    /** Its sessions, newest first. */
    protected readonly sessions = computed(
        () => sessionsByExercise(this.history.entries()).get(this.exerciseId()) ?? []
    );
    protected readonly measure = computed(() => progressMeasure(this.sessions()));
    protected readonly bests = computed(() =>
        bestLines(exerciseBests(this.sessions()), this.unit())
    );

    protected readonly range = signal<ChartRange>('all');
    protected readonly rangeSpoken = computed(
        () => RANGES.find((range) => range.value === this.range())!.spoken
    );
    /** Where the chart's time axis starts and ends. */
    private readonly span = computed(() => {
        const days = RANGES.find((range) => range.value === this.range())!.days;
        return { from: days === Infinity ? null : this.now - days * DAY_MS, to: this.now };
    });

    /** The workouts in range, oldest first, with their place on the chart. */
    protected readonly points = computed((): ChartPoint[] => {
        const measure = this.measure();
        if (!measure) {
            return [];
        }
        const { from, to } = this.span();
        const unit = this.unit();
        const valued = [...this.sessions()]
            .reverse()
            .filter((session) => from === null || session.startedAt >= from)
            .map((session) => ({ session, value: sessionValue(session, measure) }))
            .filter(
                (item): item is { session: ExerciseSession; value: number } => item.value !== null
            );
        if (valued.length === 0) {
            return [];
        }
        const start = from ?? valued[0].session.startedAt;
        const end = from === null ? valued.at(-1)!.session.startedAt : to;
        const { min, max } = this.scale(valued.map((item) => axisValue(item.value, measure, unit)));
        return valued.map(({ session, value }) => {
            const shown = axisValue(value, measure, unit);
            return {
                entryId: session.entryId,
                at: session.startedAt,
                title: session.title.trim() || 'Untitled workout',
                value: shown,
                ...formatMeasure(value, measure, unit),
                // One workout sits in the middle
                x:
                    end === start
                        ? (LEFT + this.right) / 2
                        : LEFT +
                          ((session.startedAt - start) / (end - start)) * (this.right - LEFT),
                y: this.bottom - ((shown - min) / (max - min)) * (this.bottom - TOP),
            };
        });
    });

    /** The value axis: from a round number at or below the lowest, to one at or above the top. */
    protected readonly ticks = computed(() => {
        const measure = this.measure();
        const points = this.points();
        if (!measure || points.length === 0) {
            return [];
        }
        const { min, max, step } = this.scale(points.map((point) => point.value));
        const ticks = [];
        for (let value = min; value <= max + step / 2; value += step) {
            ticks.push({
                y: this.bottom - ((value - min) / (max - min)) * (this.bottom - TOP),
                label: measure === 'time' ? formatDuration(value) : String(value),
            });
        }
        return ticks;
    });

    /** The dates at each end of the time axis. */
    protected readonly axisDates = computed(() => {
        const points = this.points();
        const { from, to } = this.span();
        if (points.length === 0) {
            return null;
        }
        const start = from ?? points[0].at;
        const end = from === null ? points.at(-1)!.at : to;
        return start === end ? null : { start, end, format: this.dateFormat(start) };
    });

    protected readonly line = computed(() =>
        this.points()
            .map((point, i) => `${i === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`)
            .join(' ')
    );

    /** The workout being looked at, by hover or the arrow keys; it starts again on a new range. */
    protected readonly active = linkedSignal<ChartPoint[], number | null>({
        source: this.points,
        computation: () => null,
    });
    protected readonly activePoint = computed(() => {
        const active = this.active();
        return active === null ? null : (this.points()[active] ?? null);
    });

    protected readonly tableOpen = signal(false);
    protected readonly measureTitle = computed(() => {
        const measure = this.measure();
        return measure ? MEASURE_TITLES[measure] : '';
    });

    protected dateFormat(at: number): string {
        return dateFormatFor(at, this.now);
    }

    protected pickRange(range: ChartRange) {
        this.range.set(range);
    }

    /** The point nearest the pointer, from the moment it's pressed (a tap, too) as it moves. */
    protected onPointerMove(event: PointerEvent) {
        const svg = event.currentTarget as SVGSVGElement;
        const box = svg.getBoundingClientRect();
        if (box.width === 0) {
            return;
        }
        const x = ((event.clientX - box.left) / box.width) * WIDTH;
        this.active.set(this.nearest(x));
    }

    protected onKeydown(event: KeyboardEvent) {
        const moved = chartKeyMove(event.key, this.active(), this.points().length);
        if (moved !== null) {
            event.preventDefault();
            this.active.set(moved);
        }
    }

    /** Focusing the chart starts on the latest workout. */
    protected onFocus() {
        if (this.active() === null && this.points().length > 0) {
            this.active.set(this.points().length - 1);
        }
    }

    private nearest(x: number): number | null {
        let best: number | null = null;
        this.points().forEach((point, i) => {
            if (best === null || Math.abs(point.x - x) < Math.abs(this.points()[best].x - x)) {
                best = i;
            }
        });
        return best;
    }

    /**
     * Round numbers to run the value axis between, three or so steps apart: e.g. 40 to 100
     * in 20s. Reps and weights never go below 0.
     */
    private scale(values: number[]): { min: number; max: number; step: number } {
        let low = Math.min(...values);
        let high = Math.max(...values);
        if (low === high) {
            low -= Math.max(1, low * 0.1);
            high += Math.max(1, high * 0.1);
        }
        const step = niceStep((high - low) / 3, this.measure()!);
        const min = Math.max(0, Math.floor(low / step) * step);
        return { min, max: Math.max(min + step, Math.ceil(high / step) * step), step };
    }
}

/**
 * A step of 1, 2, 2.5 or 5 times a power of ten, at least `rough`: whole reps, half a kg or
 * lb, or for times, a round number of seconds.
 */
function niceStep(rough: number, measure: ProgressMeasure): number {
    if (measure === 'time') {
        return [5, 10, 15, 30, 60, 120, 300, 600].find((step) => step >= rough) ?? 900;
    }
    const power = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].map((n) => n * power).find((n) => n >= rough)!;
    return Math.max(step, measure === 'reps' ? 1 : 0.5);
}
