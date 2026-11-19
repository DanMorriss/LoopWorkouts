import {
    planColours,
    PLANNED_STATUS_TEXT,
    PlannedStatus,
    PlannedWorkout,
    startOfWeek,
    weekdayOf,
    WEEKDAYS,
} from '../../models/plan';

/**
 * How a day of the week looks: everything on it done, some missed, still to do, only active
 * rest (not done), or free.
 */
export type DayMark = 'done' | 'missed' | 'planned' | 'rest' | 'free';

/** What's on a day: training, only active rest, or nothing (a rest day). */
type DayKind = 'training' | 'active-rest' | 'rest';

/** A workout planned on a day, as the day's panel lists it. */
export interface WeekWorkout {
    workoutId: string;
    name: string;
    status: PlannedStatus;
    activeRest: boolean;
    /** Its plan colour, 1 to 4 (`planColours`); 0 for active rest. */
    colour: number;
    /** Where it is this week, e.g. "Done", or '' for one due or to come. */
    label: string;
    /** "Moved from Tuesday", for one done today instead this week only; else ''. */
    movedFrom: string;
}

/** A day of This week on Today (PLN-4). */
export interface WeekDay {
    /** From 0 for Monday. */
    day: number;
    /** "Monday" */
    name: string;
    /** "Mon" */
    short: string;
    /** Its day of the month, e.g. 19. */
    date: number;
    today: boolean;
    kind: DayKind;
    mark: DayMark;
    /** Its first training workout's colour, 1 to 4, or 0 with none. */
    colour: number;
    /** Its ring, a segment in each workout's colour (`ringFor`); '' on a rest day. */
    ring: string;
    /** Its workouts, training first, then active rest. */
    workouts: WeekWorkout[];
    /** What a screen reader hears for it, e.g. "Monday: Legs day, done". */
    spoken: string;
}

const SPOKEN_STATUS: Record<PlannedStatus, string> = {
    done: 'done',
    missed: 'missed',
    rested: 'rested',
    today: 'due today',
    'next week': 'from next week',
    'to come': 'to come',
};

/** A plan colour as CSS: active rest's (0) is the muted text colour. */
export function colourVar(colour: number): string {
    return colour ? `var(--plan-${colour})` : 'var(--text-muted)';
}

/**
 * A day's ring, as a conic gradient: a segment for each of its workouts, in its colour, with a
 * small gap between them, so two workouts read as two; one alone is a whole ring.
 */
export function ringFor(colours: readonly number[]): string {
    if (colours.length === 0) {
        return '';
    }
    const step = 360 / colours.length;
    const gap = colours.length > 1 ? 14 : 0;
    const parts = colours.map((colour, i) => {
        const end = (i + 1) * step - gap / 2;
        return `${colourVar(colour)} ${i * step + gap / 2}deg ${end}deg, transparent ${end}deg ${end + gap}deg`;
    });
    return `conic-gradient(from ${-gap / 2}deg, ${parts.join(', ')})`;
}

/**
 * The week as This week shows it, from `thisWeek()`'s days at `now`: each day's date, what's
 * on it and how it's going, its workouts coloured as they first come in the week.
 */
export function weekDays(
    week: readonly (readonly PlannedWorkout[])[],
    now: number,
    name: (workoutId: string) => string
): WeekDay[] {
    const today = weekdayOf(now);
    const monday = new Date(startOfWeek(now));
    const colours = planColours(week);
    return week.map((planned, day) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + day);
        const workouts = [...planned]
            .sort((a, b) => Number(!!a.activeRest) - Number(!!b.activeRest))
            .map(
                (item): WeekWorkout => ({
                    workoutId: item.workoutId,
                    name: name(item.workoutId),
                    status: item.status,
                    activeRest: !!item.activeRest,
                    colour: item.activeRest ? 0 : colours.get(item.workoutId)!,
                    label: item.status === 'today' ? '' : PLANNED_STATUS_TEXT[item.status],
                    movedFrom:
                        item.movedFrom === undefined
                            ? ''
                            : `Moved from ${WEEKDAYS[item.movedFrom]}`,
                })
            );
        // Those from next week don't count this week
        const counted = workouts.filter((item) => item.status !== 'next week');
        const lead = counted.find((item) => !item.activeRest);
        return {
            day,
            name: WEEKDAYS[day],
            short: WEEKDAYS[day].slice(0, 3),
            date: date.getDate(),
            today: day === today,
            kind: lead ? 'training' : counted.length ? 'active-rest' : 'rest',
            mark: markFor(planned),
            colour: lead?.colour ?? 0,
            ring: ringFor(counted.map((item) => item.colour)),
            workouts,
            spoken: spokenDay(WEEKDAYS[day], day === today, workouts),
        };
    });
}

/** "Wednesday, today: Legs, due today", "Tuesday: Mobility flow, active rest, rested". */
function spokenDay(day: string, today: boolean, workouts: readonly WeekWorkout[]): string {
    const what = workouts.length
        ? workouts
              .map(
                  (item) =>
                      `${item.name}, ${item.activeRest ? 'active rest, ' : ''}${SPOKEN_STATUS[item.status]}`
              )
              .join('; ')
        : 'nothing planned';
    return `${day}${today ? ', today' : ''}: ${what}`;
}

/**
 * A day's mark from its workouts: done once they all are, missed if any were, free if none.
 * Those from next week (planned once the day had gone by) don't count for this week. Active
 * rest is optional: a day of it still to come is marked as active rest, once gone by without it
 * it's free, and beside training it's left out.
 */
export function markFor(all: readonly Pick<PlannedWorkout, 'status' | 'activeRest'>[]): DayMark {
    const counted = all.filter((item) => item.status !== 'next week');
    if (counted.length === 0) {
        return 'free';
    }
    if (counted.every((item) => item.status === 'done')) {
        return 'done';
    }
    const training = counted.filter((item) => !item.activeRest).map((item) => item.status);
    if (training.length === 0) {
        // Once its day's gone by without it, it was a rest day like any other
        return counted.every((item) => item.status === 'rested') ? 'free' : 'rest';
    }
    if (training.includes('missed')) {
        return 'missed';
    }
    return training.every((status) => status === 'done') ? 'done' : 'planned';
}
