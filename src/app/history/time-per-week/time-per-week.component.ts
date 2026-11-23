import { DatePipe, formatDate } from '@angular/common';
import { Component, computed, inject, LOCALE_ID, signal } from '@angular/core';
import { CaloriesText } from '../../models/calories';
import { timePerWeek, WeekTotal } from '../../models/time-per-week';
import { chartKeyMove } from '../../shared/chart-keys';
import {
    CarouselComponent,
    SlideDirective,
} from '../../shared/components/carousel/carousel.component';
import { counted } from '../../shared/format-count';
import { CaloriesService } from '../../shared/state/calories.service';
import { ShownHistory } from '../shown-history';
import { formatDuration } from '../history-format';

/** How many weeks the chart shows at most, ending with this one. */
const WEEKS = 12;

// The chart's drawing area, in SVG units: room on the left for the times, below for dates
const WIDTH = 340;
const HEIGHT = 150;
const LEFT = 34;
const RIGHT = 4;
const TOP = 8;
const BOTTOM = 22;
/** The widest a bar gets, with only a few weeks to share the width. */
const MAX_BAR = 32;

/** Steps for the time axis, in minutes: the first at least a third of the longest week. */
const STEPS = [5, 10, 15, 20, 30, 60, 90, 120, 180, 240, 300, 360, 480, 600];

/** One week's bar, with what's said of it. */
interface WeekBar extends WeekTotal {
    /**
     * Its days, e.g. "19–25 Oct" or "28 Sep – 4 Oct": never "This week", which on Progress
     * means the last 7 days.
     */
    label: string;
    /** What a screen reader hears of it, e.g. "Week of 19 October". */
    spokenLabel: string;
    time: string;
    count: string;
    /**
     * About how many it burnt, e.g. "about 450 kcal", "under 5 kcal" or "0 kcal", with a body
     * weight given (CAL-3).
     */
    calories: string | null;
    /** Under its time over the bars: "2–8 Nov · 2 workouts · about 450 kcal". */
    when: string;
    spoken: string;
    x: number;
    y: number;
    height: number;
}

/**
 * The time spent working out each week, for the last 12 weeks, as bars (PRG-12), from the
 * week of the first workout for someone newer. The chosen week's time and workouts sit over
 * the bars, starting on this week; a tap or the arrow keys choose another, which stays chosen,
 * and hovering shows one for as long as the pointer's over it. A table of the same weeks is
 * swiped to beside the bars. With a body weight given, each week also says about how many
 * calories it burnt (CAL-3).
 */
@Component({
    selector: 'app-time-per-week',
    imports: [CarouselComponent, DatePipe, SlideDirective],
    templateUrl: './time-per-week.component.html',
    styleUrl: './time-per-week.component.scss',
})
export class TimePerWeekComponent {
    private readonly history = inject(ShownHistory);
    private readonly locale = inject(LOCALE_ID);
    private readonly calories = inject(CaloriesService);
    private readonly now = Date.now();

    protected readonly id = 'time-per-week';
    protected readonly weekCount = WEEKS;
    protected readonly width = WIDTH;
    protected readonly height = HEIGHT;
    protected readonly left = LEFT;
    protected readonly right = WIDTH - RIGHT;
    protected readonly bottom = HEIGHT - BOTTOM;

    private readonly burning = computed(() => this.calories.burning());
    /** With a body weight given, the table has a Calories column. */
    protected readonly withCalories = computed(() => this.burning() !== null);
    private readonly totals = computed(() =>
        timePerWeek(this.history.entries(), this.now, WEEKS, this.burning() ?? undefined)
    );
    /** The weeks shown: 12, or fewer from the first workout's. */
    private readonly count = computed(() => this.totals().length);
    private readonly slot = computed(() => (WIDTH - RIGHT - LEFT) / this.count());
    protected readonly barWidth = computed(() => Math.min(MAX_BAR, this.slot() * 0.62));
    /** For a screen reader: "The last 12 weeks", "The last 3 weeks" or "The week of 2 November". */
    protected readonly span = computed(() =>
        this.count() === 1
            ? `The week of ${formatDate(this.totals()[0].start, 'd MMMM', this.locale)}`
            : `The last ${this.count()} weeks`
    );

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
        this.totals().map((week, i) => {
            const time = formatDuration(week.seconds);
            const count = counted(week.workouts, 'workout');
            const y = this.yOf(week.seconds / 60);
            const label = this.days(week.start);
            const burnt = this.withCalories() ? this.calories.describeTotal(week.kcal) : null;
            const calories = this.withCalories() ? weekCalories(burnt, week.workouts) : null;
            return {
                ...week,
                label,
                spokenLabel: `Week of ${formatDate(week.start, 'd MMMM', this.locale)}`,
                time,
                count,
                calories,
                when: [label, count, week.workouts > 0 ? calories : null]
                    .filter((part) => part !== null)
                    .join(' · '),
                spoken: [spokenTime(week.seconds), count, burnt?.spoken]
                    .filter((part) => part !== undefined)
                    .join(', '),
                x: LEFT + i * this.slot() + (this.slot() - this.barWidth()) / 2,
                y,
                height: this.bottom - y,
            };
        })
    );

    protected readonly anyTime = computed(() => this.totals().some((week) => week.seconds > 0));

    /** The week chosen by a tap or the arrow keys, which stays chosen; the latest with none. */
    private readonly chosen = signal<number | null>(null);
    /** The week under a hovering mouse or pen, shown over the chosen one while it's there. */
    protected readonly hovered = signal<number | null>(null);
    private readonly shownIndex = computed(
        () => this.hovered() ?? this.chosen() ?? this.count() - 1
    );
    protected readonly shown = computed(() => this.bars()[this.shownIndex()]);

    /**
     * A press, or a mouse or pen dragged across, chooses the week under it; a mouse or pen
     * moving with nothing pressed only hovers. A finger swiping across goes to the table
     * instead. A finger's pointer leaves as it lifts, so leaving can't be what ends a tap's
     * choice.
     */
    protected onPointer(event: PointerEvent) {
        const week = this.weekAt(event);
        if (week === null) {
            return;
        }
        if (event.type === 'pointerdown' || event.buttons !== 0) {
            this.chosen.set(week);
            this.hovered.set(null);
        } else if (event.pointerType !== 'touch') {
            this.hovered.set(week);
        }
    }

    protected onKeydown(event: KeyboardEvent) {
        // From the week showing: this one with none chosen
        const moved = chartKeyMove(event.key, this.shownIndex(), this.count());
        if (moved !== null) {
            event.preventDefault();
            this.chosen.set(moved);
            this.hovered.set(null);
        }
    }

    private weekAt(event: PointerEvent): number | null {
        const box = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
        if (box.width === 0) {
            return null;
        }
        const x = ((event.clientX - box.left) / box.width) * WIDTH;
        const week = Math.floor((x - LEFT) / this.slot());
        return Math.min(this.count() - 1, Math.max(0, week));
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

/** A week's calories in the table: "about 450 kcal", "under 5 kcal", or "0 kcal" with no workouts. */
function weekCalories(burnt: CaloriesText | null, workouts: number): string {
    if (burnt) {
        return `about ${burnt.kcal}`;
    }
    return workouts > 0 ? 'under 5 kcal' : '0 kcal';
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
