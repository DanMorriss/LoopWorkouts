import { Component, computed, inject } from '@angular/core';
import { WEEKDAYS } from '../../models/plan';
import { SettingsStore } from '../../shared/state/settings-store.service';

/**
 * The days you can train (PLN-6), on the Ready-made plans page: a day of the week to a chip,
 * pressed to pick it or not, and each plan's card is fitted to those picked (`fitToDays`).
 * Remembered on the device. None picked, and the plans are as they come.
 */
@Component({
    selector: 'app-can-train-on',
    template: `
        <div
            class="train-on"
            role="group"
            aria-labelledby="train-on-label"
            aria-describedby="train-on-hint"
        >
            <p class="train-on__label" id="train-on-label">Days you can train</p>
            <p class="train-on__hint" id="train-on-hint">
                Pick them, and each plan is fitted to your week.
            </p>
            <div class="train-on__days">
                @for (day of days(); track day.name) {
                    <button
                        type="button"
                        class="train-on__day"
                        [attr.aria-pressed]="day.picked"
                        [attr.aria-label]="day.name"
                        (click)="toggle(day.day)"
                    >
                        {{ day.short }}
                    </button>
                }
            </div>
            @if (settings.canTrainOn().length) {
                <button type="button" class="train-on__clear" (click)="clear()">
                    Any day: as they come
                </button>
            }
        </div>
    `,
    styleUrl: './can-train-on.component.scss',
})
export class CanTrainOnComponent {
    protected readonly settings = inject(SettingsStore);

    protected readonly days = computed(() =>
        WEEKDAYS.map((name, day) => ({
            day,
            name,
            short: name.slice(0, 3),
            picked: this.settings.canTrainOn().includes(day),
        }))
    );

    protected toggle(day: number) {
        const days = this.settings.canTrainOn();
        this.settings.update({
            canTrainOn: days.includes(day)
                ? days.filter((other) => other !== day)
                : [...days, day].sort((a, b) => a - b),
        });
    }

    protected clear() {
        this.settings.update({ canTrainOn: [] });
    }
}
