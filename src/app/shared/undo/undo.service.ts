import { inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';

/** Something just done that can be taken back, as the Undo bar offers it. */
export interface UndoOffer {
    /** What happened, e.g. "Deleted Legs day". */
    message: string;
    /**
     * Puts it back. Where focus goes next is the caller's to decide: it knows what came back.
     * Missing for a notice, which only says what happened (see `notify()`).
     */
    undo?: () => void;
    /** Where focus goes if the offer is closed without undoing, e.g. the step after it. */
    dismissed?: () => void;
    /** A page to see what happened on, e.g. View library after an import. */
    link?: { label: string; url: string };
    /**
     * Already read out on the page it happened on, so the bar only shows it: e.g. an import's
     * result, which Your data says in a line of its own.
     */
    quiet?: boolean;
}

/**
 * Deleting goes ahead at once and offers Undo, rather than asking "Are you sure?" first: a
 * slip is easy to take back, and nobody learns to click through a question. One offer at a
 * time, shown in the Undo bar above the tabs (UndoBarComponent). It stays until it's used,
 * closed, replaced by another, or the page changes, rather than going on a timer someone
 * might not beat.
 */
@Service()
export class UndoService {
    private readonly router = inject(Router);
    private readonly _offer = signal<(UndoOffer & { id: number; url: string }) | null>(null);
    private nextId = 1;

    /** The offer showing, with an id that's new each time, and the page it belongs to. */
    readonly offer = this._offer.asReadonly();

    /** Offers to undo something just done on the page showing, replacing any earlier offer. */
    offerUndo(offer: UndoOffer) {
        this._offer.set({ ...offer, id: this.nextId++, url: this.router.url });
    }

    /**
     * Says what just happened in the same bar, with nothing to undo, e.g. "Signed in as
     * me@example.com" on the page signing in ends on. Read out as it shows, unless it's
     * `quiet`; it doesn't take focus, and goes as an offer does. A `link` goes with it, e.g.
     * View library.
     */
    notify(message: string, more: Pick<UndoOffer, 'link' | 'quiet'> = {}) {
        this.offerUndo({ message, ...more });
    }

    /** Takes the offer up. */
    undo() {
        const offer = this._offer();
        this._offer.set(null);
        offer?.undo?.();
    }

    /** Closes the offer without undoing. */
    dismiss() {
        const offer = this._offer();
        this._offer.set(null);
        offer?.dismissed?.();
    }

    /** Lets an offer go quietly, e.g. once its page has gone. */
    clear() {
        this._offer.set(null);
    }
}
