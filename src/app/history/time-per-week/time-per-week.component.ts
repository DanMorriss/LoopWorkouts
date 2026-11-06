import { DatePipe, formatDate } from '@angular/common';
import { Component, computed, inject, LOCALE_ID, signal } from '@angular/core';
import { timePerWeek, WeekTotal } from '../../models/time-per-week';
import { chartKeyMove } from '../../shared/chart-keys';
import { counted } from '../../shared/format-count';
import { HistoryStore } from '../../shared/state/history-store.service';
import { formatDuration } from '../history-format';

/** How many weeks the chart shows, ending with this one. */
const WEEKS = 12;

// The chart's drawing area, in SVG units: room on the left for the times, below for dates
const WIDTH = 340;
const HEIGHT = 150;
const LEFT = 34;
const RIGHT = 4;
const TOP = 8;
const BOTTOM = 22;

/** Steps for the time axis, in minutes: the first at least a third of the longest week. */
const STEPS = [5, 10, 15, 20, 30, 60, 90, 120, 180, 240, 300, 360, 480, 600];

/** One week's bar, with what's said of it. */
interface WeekBar extends WeekTotal {
    /** "This week", "Last week", or its days, e.g. "19–25 Oct" or "28 Sep – 4 Oct". */
    label: string;
    /** What a screen reader hears of it: "This week", or e.g. "Week of 19 October". */
    spokenLabel: string;
    time: string;
    count: string;
    spoken: string;
    x: number;
    y: number;
    height: number;
}

/**
 * The time spent working out each week, for the last 12 weeks, as bars (PRG-12). The chosen
 * week's time and workouts sit over the bars, starting on this week; a tap, hover or the
 * arrow keys choose another. It can also be read as a table.
 */
@Component({
    selector: 'app-time-per-week',
    imports: [DatePipe],
    templateUrl: './time-per-week.component.html',
    styleUrl: './time-per-week.component.scss',
})
export class TimePerWeekComponent {
    private readonly history = inject(HistoryStore);
    private readonly locale = inject(LOCALE_ID);
    private readonly now = Date.now();

    protected readonly id = 'time-per-week';
    protected readonly weekCount = WEEKS;
    protected readonly width = WIDTH;
    protected readonly height = HEIGHT;
    protected readonly left = LEFT;
    protected readonly right = WIDTH - RIGHT;
    protected readonly bottom = HEIGHT - BOTTOM;
    private readonly slot = (WIDTH - RIGHT - LEFT) / WEEKS;
    protected readonly barWidth = this.slot * 0.62;

    private readonly totals = computed(() => timePerWeek(this.history.entries(), this.now, WEEKS));

    /** The time axis, in minutes: from 0 to a round number at or over the longest week. */
    private readonly scale = computed(() => {
        const longest = Math.max(...this.totals().map((week) => week.seconds)) / 60;
        const step = STEPS.find((minutes) => minutes >= longest / 3) ?? 900;
        return { step, top: Math.max(step, Math.ceil(longest / step) * step) };
    });

    protected readonly ticks = computed(() => {
        const { step, top } = this.scale();
        const ticks = [];
        for (let minutes = 0; minutes <= top; minutes += step) {
            ticks.push({ y: this.yOf(minutes), label: axisLabel(minutes) });
        }
        return ticks;
    });

    protected readonly bars = computed((): WeekBar[] =>
        this.totals().map((week, i, weeks) => {
            const named =
                i === weeks.length - 1 ? 'This week' : i === weeks.length - 2 ? 'Last week' : '';
            const time = formatDuration(week.seconds);
            const count = counted(week.workouts, 'workout');
            const y = this.yOf(week.seconds / 60);
            return {
                ...week,
                label: named || this.days(week.start),
                spokenLabel: named || `Week of ${formatDate(week.start, 'd MMMM', this.locale)}`,
                time,
                count,
                spoken: `${spokenTime(week.seconds)}, ${count}`,
                x: LEFT + i * this.slot + (this.slot - this.barWidth) / 2,
                y,
                height: this.bottom - y,
            };
        })
    );

    protected readonly anyTime = computed(() => this.totals().some((week) => week.seconds > 0));

    /** The week chosen by a tap, hover or the arrow keys; this week with none. */
    protected readonly active = signal<number | null>(null);
    protected readonly shown = computed(() => this.bars()[this.active() ?? WEEKS - 1]);

    protected readonly tableOpen = signal(false);

    protected onPointer(event: PointerEvent) {
        const box = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
        if (box.width === 0) {
            return;
        }
        const x = ((event.clientX - box.left) / box.width) * WIDTH;
        this.active.set(Math.min(WEEKS - 1, Math.max(0, Math.floor((x - LEFT) / this.slot))));
    }

    protected onKeydown(event: KeyboardEvent) {
        // From this week, which is showing with none chosen
        const moved = chartKeyMove(event.key, this.active() ?? WEEKS - 1, WEEKS);
        if (moved !== null) {
            event.preventDefault();
            this.active.set(moved);
        }
    }

    /** A week's days: "19–25 Oct" in one month, "28 Sep – 4 Oct" across two. */
    private days(start: number): string {
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        const sameMonth = new Date(start).getMonth() === end.getMonth();
        const first = formatDate(start, sameMonth ? 'd' : 'd MMM', this.locale);
        const last = formatDate(end, 'd MMM', this.locale);
        return sameMonth ? `${first}–${last}` : `${first} – ${last}`;
    }

    private yOf(minutes: number): number {
        return this.bottom - (minutes / this.scale().top) * (this.bottom - TOP);
    }
}

/** e.g. 0 → "0", 30 → "30m", 60 → "1h", 90 → "1.5h" */
function axisLabel(minutes: number): string {
    if (minutes === 0) {
        return '0';
    }
    return minutes < 60 ? `${minutes}m` : `${minutes / 60}h`;
}

/** To the minute: e.g. "1 hour 26 minutes", "45 minutes", or "no time" */
function spokenTime(seconds: number): string {
    const minutes = Math.round(seconds / 60);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (seconds === 0) {
        return 'no time';
    }
    if (h === 0) {
        return minutes === 0 ? 'under a minute' : counted(m, 'minute');
    }
    return m === 0 ? counted(h, 'hour') : `${counted(h, 'hour')} ${counted(m, 'minute')}`;
}
