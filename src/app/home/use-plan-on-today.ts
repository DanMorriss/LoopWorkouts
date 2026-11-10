import { afterNextRender, ApplicationRef, EnvironmentInjector, inject } from '@angular/core';
import { BuiltInPlan } from '../models/built-in-plans';
import { ReadyMadePlans, weekPlannedText } from '../shared/state/ready-made-plans.service';
import { UndoService } from '../shared/undo/undo.service';
import { morphHome } from './home-morph';

/** The week's Edit plan link, which focus moves to once a plan is used on Today. */
export const WEEK_EDIT_ID = 'week-edit';

/**
 * For a card on Today offering a ready-made plan: gives what uses it, with Undo. The card
 * grows or shrinks into the week, rather than the page jumping, and focus moves there, to Edit
 * plan. Call it in an injection context.
 */
export function injectUsePlanOnToday(): (plan: BuiltInPlan) => void {
    const readyMade = inject(ReadyMadePlans);
    const undo = inject(UndoService);
    const appRef = inject(ApplicationRef);
    /** The app's, not the card's, which is gone by the time focus moves on. */
    const injector = inject(EnvironmentInjector);

    return (plan) =>
        morphHome(appRef, () => {
            const undoUse = readyMade.use(plan);
            undo.offerUndo({ message: weekPlannedText(plan), undo: undoUse, keepFocus: true });
            afterNextRender(() => document.getElementById(WEEK_EDIT_ID)?.focus(), { injector });
        });
}
