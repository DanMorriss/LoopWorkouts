import { DatePipe } from '@angular/common';
import {
    afterNextRender,
    Component,
    computed,
    ElementRef,
    inject,
    Injector,
    signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HistoryEntry } from '../models/history';
import { changeSmoothly } from '../shared/layout-change';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { HistoryStore } from '../shared/state/history-store.service';
import { UndoService } from '../shared/undo/undo.service';
import { HistoryEntryComponent } from './history-entry/history-entry.component';
import { MusclesThisWeekComponent } from './muscles-this-week/muscles-this-week.component';
import { entryName, formatDuration } from './history-format';

interface DayGroup {
    /** e.g. "2026-10-18", for tracking and ids. */
    key: string;
    /** "Today", "Yesterday", or the date. */
    label: string;
    /** For days before yesterday, the date to format; null for Today and Yesterday. */
    date: number | null;
    entries: HistoryEntry[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function dayKey(time: number): string {
    const date = new Date(time);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * The Progress tab: the last seven days, the muscles worked this week (PRG-6, PRG-8), then the
 * log, every workout done by day. The workout to do next is on Today and the workout summary,
 * not here. Its address stays /history, as links to a run in it use it. Arriving from the workout summary, `?run=<id>` highlights that run and
 * brings it into view, and `?note=<id>` does the same with its note box open.
 */
@Component({
    selector: 'app-history',
    imports: [DatePipe, HistoryEntryComponent, MusclesThisWeekComponent, RouterLink],
    templateUrl: './history.component.html',
    styleUrl: './history.component.scss',
    host: {
        // A click anywhere else closes an open menu
        '(document:click)': 'openMenuId.set(null)',
    },
})
export class HistoryComponent {
    private readonly history = inject(HistoryStore);
    private readonly injector = inject(Injector);
    private readonly reducedMotion = injectPrefersReducedMotion();
    private readonly now = Date.now();

    /** Workouts grouped by the day they started, newest first. */
    protected readonly groups = computed(() => {
        const today = dayKey(this.now);
        const yesterday = dayKey(this.now - DAY_MS);
        const groups: DayGroup[] = [];
        for (const entry of this.history.entries()) {
            const key = dayKey(entry.startedAt);
            let group = groups.at(-1);
            if (group?.key !== key) {
                const label = key === today ? 'Today' : key === yesterday ? 'Yesterday' : '';
                group = { key, label, date: label ? null : entry.startedAt, entries: [] };
                groups.push(group);
            }
            group.entries.push(entry);
        }
        return groups;
    });

    /** Workouts and time spent over the last seven days. */
    protected readonly lastWeek = computed(() => {
        const recent = this.history
            .entries()
            .filter((entry) => entry.startedAt >= this.now - 7 * DAY_MS);
        return {
            workouts: recent.length,
            time: formatDuration(recent.reduce((total, entry) => total + entry.activeSeconds, 0)),
        };
    });

    private readonly undo = inject(UndoService);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    /** Whose menu is open, and whose note is being edited: one of each at most. */
    protected readonly openMenuId = signal<string | null>(null);
    protected readonly editingId = signal<string | null>(null);
    /** The run arrived at from the workout summary. */
    protected readonly highlightedId = signal<string | null>(null);

    protected readonly entryName = entryName;

    constructor() {
        const params = inject(ActivatedRoute).snapshot.queryParamMap;
        const noteFor = params.get('note');
        const run = noteFor ?? params.get('run');
        if (run && this.history.entries().some((entry) => entry.id === run)) {
            this.highlightedId.set(run);
            this.editingId.set(noteFor);
            this.bringIntoView(run, !noteFor);
        }
    }

    protected toggleMenu(id: string) {
        this.openMenuId.update((open) => (open === id ? null : id));
    }

    /** Closes a menu from inside it (Escape, or once it's done), returning focus to its button. */
    protected closeMenu(id: string) {
        if (this.openMenuId() !== id) {
            return;
        }
        this.openMenuId.set(null);
        this.focusAfterRender(`menu-${id}`);
    }

    protected editNote(id: string) {
        this.openMenuId.set(null);
        this.editingId.set(id);
    }

    protected closeNote(id: string) {
        if (this.editingId() === id) {
            this.editingId.set(null);
        }
    }

    /** Deletes a workout from the history, and offers to put it back, note and all. */
    protected delete(entry: HistoryEntry) {
        this.openMenuId.set(null);
        this.closeNote(entry.id);
        // The entries and days after it close up the gap, and open it again on Undo
        this.smoothChange(() => this.history.delete(entry.id));
        this.undo.offerUndo({
            message: `Deleted ${entryName(entry)}`,
            undo: () => {
                this.smoothChange(() => this.history.restore(entry));
                this.focusAfterRender(`menu-${entry.id}`);
            },
        });
    }

    /** Makes a change to the history, with the days and entries sliding to their new places. */
    private smoothChange(change: () => void) {
        changeSmoothly(this.host.nativeElement, '.history__day, .entry', this.injector, change);
    }

    /**
     * Scrolls a run to the middle of the screen. Its note box takes focus itself when open;
     * otherwise the entry does, so a screen reader starts from it.
     */
    private bringIntoView(id: string, focus: boolean) {
        afterNextRender(
            () => {
                const element = document.getElementById(`entry-${id}`);
                element?.scrollIntoView({
                    block: 'center',
                    behavior: this.reducedMotion() ? 'auto' : 'smooth',
                });
                if (focus) {
                    element?.focus({ preventScroll: true });
                }
            },
            { injector: this.injector }
        );
    }

    private focusAfterRender(id: string) {
        afterNextRender(() => document.getElementById(id)?.focus(), { injector: this.injector });
    }
}
