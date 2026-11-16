// Apart from PlanWeekComponent, which a plan card loads on its own (@defer), so the card
// can name these without bringing it in

/** A day of a ready-made plan's week, as its card shows it. */
export interface PlanWeekDay {
    /** Its workouts, in order: colour 0 for active rest, which has no number. */
    workouts: readonly { title: string; number: string; colour: number }[];
    /** A training day takes on its first training workout's colour. */
    kind: 'training' | 'active-rest' | 'rest';
    colour: number;
}

/** Where a day's workouts were moved from and to in the week, from 0 for Monday. */
export interface DayMove {
    from: number;
    to: number;
}
