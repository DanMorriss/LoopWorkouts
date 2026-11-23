import {
    afterNextRender,
    Component,
    computed,
    DOCUMENT,
    effect,
    ElementRef,
    inject,
    Injector,
    input,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { ConsentService } from '../../../account/consent.service';
import { describeRounds, formatDuration } from '../../../history/history-format';
import { bodyWeightHint } from '../../../models/calories';
import { HistoryEntry } from '../../../models/history';
import { WeightFieldComponent } from '../../../shared/components/weight-field/weight-field.component';
import { injectFocusAfterRender } from '../../../shared/focus-after-render';
import { CaloriesService } from '../../../shared/state/calories.service';
import { SettingsStore } from '../../../shared/state/settings-store.service';

/**
 * The summary's figures: the time (pauses left out), the rounds and, with a body weight
 * given, about how many calories it burnt (CAL-1), and about how many more over the next day
 * as the body recovers. Without one, Add your weight to see calories (CAL-2) opens the Body
 * weight box here, kept on this device as Profile's is; once it's given, the calories show,
 * and focus goes to the figures. It's also asked for, optionally, in the setup, and on Profile.
 */
@Component({
    selector: 'app-summary-stats',
    imports: [WeightFieldComponent],
    template: `
        <dl #figures class="summary__stats" tabindex="-1">
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
        @if (afterburn(); as more) {
            <p class="summary__afterburn">
                <span aria-hidden="true">Plus about {{ more.kcal }}</span
                ><span class="sr-only">Plus {{ more.spoken }}</span> over the next day, as your body
                recovers
            </p>
        }
        @if (askForWeight()) {
            @if (adding()) {
                <div class="summary__weight">
                    <app-weight-field kind="body" describedBy="summary-weight-hint">
                        Body weight
                    </app-weight-field>
                    <p class="summary__weight-hint" id="summary-weight-hint">{{ weightHint() }}</p>
                </div>
            } @else {
                <button type="button" class="summary__add-weight" (click)="addWeight()">
                    Add your weight to see calories
                </button>
            }
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
            border-radius: 0.75rem;
        }

        .summary__afterburn,
        .summary__weight-hint {
            @include page-hint;
            margin: 0.5rem 0 0;
        }

        .summary__afterburn {
            text-align: center;
        }

        .summary__weight {
            margin-top: 1rem;
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
    private readonly consent = inject(ConsentService);
    private readonly document = inject(DOCUMENT);
    private readonly injector = inject(Injector);
    private readonly focusAfterRender = injectFocusAfterRender();
    private readonly figures = viewChild.required<ElementRef<HTMLElement>>('figures');

    /** The run, as it is in the history. */
    readonly entry = input.required<HistoryEntry>();

    protected readonly duration = computed(() => formatDuration(this.entry().activeSeconds));
    protected readonly rounds = computed(() => describeRounds(this.entry()));
    protected readonly burnt = computed(() => this.calories.describe(this.entry()));
    protected readonly afterburn = computed(() =>
        this.burnt() ? this.calories.describeAfterburn(this.entry()) : null
    );
    protected readonly askForWeight = computed(() => this.settings.bodyWeight() === null);
    /** Add your weight to see calories was pressed: the Body weight box is open. */
    protected readonly adding = signal(false);
    protected readonly weightHint = computed(() => bodyWeightHint(!!this.consent.weightGiven()));

    constructor() {
        // Given in the box, which goes as the calories come: focus goes to the figures, which
        // now have them, unless it was given by leaving the box for something else
        effect(() => {
            if (this.askForWeight() || !untracked(this.adding)) {
                return;
            }
            afterNextRender(
                () => {
                    const focused = this.document.activeElement;
                    if (focused === null || focused === this.document.body) {
                        this.figures().nativeElement.focus();
                    }
                },
                { injector: this.injector }
            );
        });
    }

    protected addWeight() {
        this.adding.set(true);
        this.focusAfterRender('body-weight');
    }
}
