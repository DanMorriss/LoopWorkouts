import { Component, computed, inject, input, output } from '@angular/core';
import { describeRounds, formatDuration } from '../../../history/history-format';
import { HistoryEntry } from '../../../models/history';
import { CaloriesService } from '../../../shared/state/calories.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';

/**
 * The summary's figures: the time (pauses left out), the rounds and, with a body weight
 * given, about how many calories it burnt (CAL-1). Without one, a way to add one (CAL-2),
 * which is asked for only here and on Profile, not in the setup.
 */
@Component({
    selector: 'app-summary-stats',
    template: `
        <dl class="summary__stats">
            <div class="summary__stat">
                <dt>Time</dt>
                <dd>{{ duration() }}</dd>
            </div>
            <div class="summary__stat">
                <dt>Rounds</dt>
                <dd>{{ rounds() }}</dd>
            </div>
            <!-- An estimate, so said as one -->
            @if (burnt(); as burnt) {
                <div class="summary__stat">
                    <dt>Calories</dt>
                    <dd>
                        <span aria-hidden="true">About {{ burnt.kcal }}</span
                        ><span class="sr-only">{{ burnt.spoken }}</span>
                    </dd>
                </div>
            }
        </dl>
        @if (askForWeight()) {
            <button type="button" class="summary__add-weight" (click)="addWeight.emit()">
                Add your weight to see calories
            </button>
        }
    `,
    styles: `
        @use 'type' as *;
        @use 'interaction' as *;

        :host {
            display: block;
        }

        .summary__stats {
            display: grid;
            // Two or three: Time, Rounds and, with a body weight, Calories
            grid-auto-columns: 1fr;
            grid-auto-flow: column;
            gap: 0.75rem;
            margin: 1.25rem 0 0;
        }

        .summary__add-weight {
            @include link-button;
        }

        .summary__stat {
            padding: 0.75rem;
            border: 1px solid var(--border-soft);
            border-radius: 0.75rem;
            background: var(--card);
            text-align: center;

            dt {
                color: var(--text-muted);
                font-size: 0.8rem;
                letter-spacing: 0.04em;
            }

            // The workout's numbers, in the display face
            dd {
                margin: 0.2rem 0 0;
                @include display;
                color: var(--text-strong);
                font-size: 1.15rem;
            }
        }
    `,
})
export class SummaryStatsComponent {
    private readonly settings = inject(SettingsStore);
    private readonly calories = inject(CaloriesService);

    /** The run, as it is in the history. */
    readonly entry = input.required<HistoryEntry>();
    /** Add your weight to see calories was pressed. */
    readonly addWeight = output<void>();

    protected readonly duration = computed(() => formatDuration(this.entry().activeSeconds));
    protected readonly rounds = computed(() => describeRounds(this.entry()));
    protected readonly burnt = computed(() => this.calories.describe(this.entry()));
    protected readonly askForWeight = computed(() => this.settings.bodyWeight() === null);
}
