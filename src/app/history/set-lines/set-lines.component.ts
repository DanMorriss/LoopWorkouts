import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, input, TemplateRef } from '@angular/core';
import { SetsSection, SetsSummary } from '../history-format';

/**
 * A workout's lines of sets, as `sectionsOf()` groups them: under its headings, with a superset's
 * lines together under its name (BLD-12). What a line says is the template given to it, whose
 * context is the line, as the history links an exercise's name and the summary doesn't:
 *
 *     <app-set-lines [sections]="sections()">
 *         <ng-template let-line>{{ line.name }}: {{ line.text }}</ng-template>
 *     </app-set-lines>
 *
 * It takes its text's size from where it is; `--set-heading-size`, `--set-heading-gap` and
 * `--set-superset-indent` set the rest.
 */
@Component({
    selector: 'app-set-lines',
    imports: [NgTemplateOutlet],
    host: { class: 'block' },
    template: `
        @for (section of sections(); track $index) {
            @if (section.heading) {
                <h4 class="set-lines__heading">{{ section.heading }}</h4>
            }
            <ul class="set-lines__list">
                @for (item of section.items; track $index) {
                    @if (item.superset) {
                        <li>
                            <span class="set-lines__superset-name">{{ item.superset }}</span>
                            <ul class="set-lines__superset-lines">
                                @for (line of item.lines; track $index) {
                                    <li>
                                        <ng-container
                                            [ngTemplateOutlet]="lineTemplate()"
                                            [ngTemplateOutletContext]="{ $implicit: line }"
                                        />
                                    </li>
                                }
                            </ul>
                        </li>
                    } @else {
                        <li>
                            <ng-container
                                [ngTemplateOutlet]="lineTemplate()"
                                [ngTemplateOutletContext]="{ $implicit: item.lines[0] }"
                            />
                        </li>
                    }
                }
            </ul>
        }
    `,
    styles: `
        .set-lines__heading {
            margin: var(--set-heading-gap, 0.5rem) 0 0;
            color: var(--text-strong);
            font-size: var(--set-heading-size, 0.9rem);
            font-weight: 600;
        }

        .set-lines__list {
            margin: 0;
            padding: 0;
            list-style: none;
        }

        // A superset's name, with its lines under it, set in a little and joined by a line
        .set-lines__superset-name {
            color: var(--text-muted);
        }

        .set-lines__superset-lines {
            margin: 0 0 0 0.2rem;
            padding-left: var(--set-superset-indent, 0.6rem);
            border-left: 2px solid var(--border-strong);
            list-style: none;
        }
    `,
})
export class SetLinesComponent {
    readonly sections = input.required<readonly SetsSection<SetsSummary>[]>();
    protected readonly lineTemplate =
        contentChild.required<TemplateRef<{ $implicit: SetsSummary }>>(TemplateRef);
}
