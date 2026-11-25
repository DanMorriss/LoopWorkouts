import { Component, inject, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { BackupService, ImportResult } from '../../../shared/backup/backup.service';
import { pastedJson } from '../../../shared/backup/pasted-json';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { planPrompt } from '../../../shared/backup/plan-prompt';

/** An import that went in, as the dialog hands it on. */
export type PastedImport = Extract<ImportResult, { ok: true }>;

/**
 * Bring in a plan (SYN-6), in two steps: Copy AI prompt, for an AI chat to turn a plan into
 * Loop Workouts' own, then a box to paste what it wrote, and Import, which merges it as Import
 * backup does a file. One that's turned down is said under the box, which keeps what was
 * pasted to try again; one that goes in is handed on as `imported`, for whatever opened it to
 * close it and say what came in. It closes by ‹ Back, Escape or a click outside.
 */
@Component({
    selector: 'app-paste-plan-dialog',
    imports: [DialogComponent, FormField, IconComponent],
    template: `
        <app-dialog
            labelledBy="paste-plan-title"
            describedBy="paste-plan-hint"
            (closed)="closed.emit()"
        >
            <form class="paste__form" novalidate (submit)="import($event)">
                <h2 id="paste-plan-title" class="paste__title">Bring in a plan</h2>
                <p id="paste-plan-hint" class="paste__hint">
                    Have a plan from a coach, a book or a spreadsheet? An AI chat can turn it into
                    workouts here, in two steps.
                </p>
                <ol class="paste__steps">
                    <li class="paste__step">
                        <span class="paste__step-name" id="paste-plan-copy-name">
                            1. Copy the prompt
                        </span>
                        <span class="paste__hint" id="paste-plan-copy-hint">
                            Paste it into an AI chat, then add your plan under it.
                        </span>
                        <button
                            type="button"
                            class="btn-pill paste__copy"
                            cdkFocusInitial
                            aria-describedby="paste-plan-copy-hint"
                            (click)="copyPrompt()"
                        >
                            <app-icon aria-hidden="true">content_copy</app-icon>
                            Copy AI prompt
                        </button>
                        <p class="paste__hint" role="status">{{ copied() }}</p>
                    </li>
                    <li class="paste__step">
                        <label class="picker-field" for="paste-plan-text">
                            <span class="paste__step-name">2. Paste the AI's reply</span>
                            <textarea
                                class="picker-field__input paste__text"
                                id="paste-plan-text"
                                rows="6"
                                autocomplete="off"
                                spellcheck="false"
                                [formField]="pasteForm.text"
                                [attr.aria-invalid]="!!problem()"
                                [attr.aria-describedby]="problem() ? 'paste-plan-problem' : null"
                            ></textarea>
                        </label>
                        @if (problem(); as problem) {
                            <p id="paste-plan-problem" class="paste__problem" role="alert">
                                {{ problem }}
                            </p>
                        }
                    </li>
                </ol>
                <div class="paste__actions">
                    <button type="submit" class="btn-main" [disabled]="importing()">Import</button>
                </div>
            </form>
        </app-dialog>
    `,
    styleUrl: './paste-plan-dialog.component.scss',
})
export class PastePlanDialogComponent {
    readonly imported = output<PastedImport>();
    readonly closed = output<void>();

    private readonly backup = inject(BackupService);

    private readonly model = signal({ text: '' });
    protected readonly pasteForm = form(this.model);
    /** Why the last Import was turned down, if it was. */
    protected readonly problem = signal('');
    protected readonly importing = signal(false);
    /** Whether the prompt was copied, read out. */
    protected readonly copied = signal('');

    /** Copies the prompt for turning a plan into Loop Workouts' own (see `planPrompt()`). */
    protected async copyPrompt() {
        try {
            await navigator.clipboard.writeText(planPrompt());
            this.copied.set('Copied. Paste it into an AI chat, then add your plan.');
        } catch {
            this.copied.set("The prompt couldn't be copied. Try again, or another browser.");
        }
    }

    /**
     * Handled here rather than as a form submission: the dialog closes as it imports, and a
     * form taken away mid-submission stays "submitting".
     */
    protected async import(event: Event) {
        event.preventDefault();
        const text = this.model().text;
        if (text.trim() === '') {
            this.problem.set("Paste the AI's reply first.");
            return;
        }
        this.importing.set(true);
        const result = await this.backup.import(
            new Blob([pastedJson(text)], { type: 'application/json' })
        );
        this.importing.set(false);
        if (result.ok) {
            this.imported.emit(result);
        } else {
            this.problem.set(pasteProblem(result.problem));
        }
    }
}

/** Why what was pasted didn't go in. */
function pasteProblem(problem: Extract<ImportResult, { ok: false }>['problem']): string {
    switch (problem) {
        case 'too-new':
            return "That's from a newer version of Loop Workouts. Update the app and try again.";
        case 'unreadable':
            return "That doesn't look like what the AI wrote. Copy its whole reply, and paste it here.";
        case 'too-big':
        case 'not-a-backup':
            return "That isn't a plan for Loop Workouts. Check the AI was given the prompt from step 1.";
    }
}
