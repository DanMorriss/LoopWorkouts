import { inject, Service } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

/** Asks whether to leave: null if there's nothing to ask, or a promise of the answer. */
export type LeaveQuestion = () => Promise<boolean> | null;

/**
 * Lets the page open ask before it's left, as Create does with unsaved changes. A slide or a
 * morph asks before its view transition starts, as the screen is frozen during one and a dialog
 * couldn't be seen, and the route guard below asks for every other way off the page.
 */
@Service()
export class LeaveCheck {
    private question: LeaveQuestion | null = null;

    set(question: LeaveQuestion) {
        this.question = question;
    }

    clear(question: LeaveQuestion) {
        if (this.question === question) {
            this.question = null;
        }
    }

    /** Null if the page can be left straight away; otherwise a promise of whether to leave. */
    confirm(): Promise<boolean> | null {
        return this.question?.() ?? null;
    }
}

/** For a route whose page sets a question: the tab bar, browser back and the like. */
export const confirmLeaving: CanDeactivateFn<unknown> = () => inject(LeaveCheck).confirm() ?? true;
