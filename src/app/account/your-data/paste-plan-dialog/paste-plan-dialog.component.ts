import { Component, inject, output, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { BackupService, ImportResult } from '../../../shared/backup/backup.service';
import { pastedJson } from '../../../shared/backup/pasted-json';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';

/** An import that went in, as the dialog hands it on. */
export type PastedImport = Extract<ImportResult, { ok: true }>;

/**
 * Paste plan (SYN-6): a box to paste what an AI wrote from the plan prompt, whole reply or
 * just its code block, and Import, which merges it as Import backup does a file. One that's
 * turned down is said under the box, which keeps what was pasted to try again; one that goes
 * in is handed on as `imported`, for whatever opened it to close it and say what came in.
 */
@Component({
    selector: 'app-paste-plan-dialog',
    imports: [DialogComponent, FormField],
    template: `
        <app-dialog
            labelledBy="paste-plan-title"
            describedBy="paste-plan-hint"
            (closed)="closed.emit()"
        >
            <form class="paste__form" novalidate (submit)="import($event)">
                <h2 id="paste-plan-title" class="paste__title">Paste plan</h2>
                <p id="paste-plan-hint" class="paste__hint">
                    Paste what the AI wrote: its whole reply, or just the code block.
                </p>
                <label class="picker-field" for="paste-plan-text">
                    <span class="picker-field__label">The AI's reply</span>
                    <textarea
                        class="picker-field__input paste__text"
                        id="paste-plan-text"
                        rows="8"
                        autocomplete="off"
                        spellcheck="false"
                        cdkFocusInitial
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
                <div class="paste__actions">
                    <button type="button" class="btn-pill" (click)="closed.emit()">Cancel</button>
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
            return "That isn't the JSON the AI wrote. Copy its code block, and paste it here.";
        case 'too-big':
        case 'not-a-backup':
            return "That isn't a plan for Loop Workouts. Check the AI was given the prompt from Copy AI prompt.";
    }
}
