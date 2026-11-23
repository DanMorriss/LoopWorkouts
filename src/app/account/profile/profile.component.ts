import { Component, computed, inject } from '@angular/core';
import { bodyWeightHint } from '../../models/calories';
import { BodyFigure } from '../../models/exercise';
import { DEFAULT_WEEKLY_SETS, TrainingGoal } from '../../models/muscle-balance';
import { MAX_NAME_LENGTH } from '../../models/profile';
import { WeightUnit } from '../../models/weight';
import { WeightFieldComponent } from '../../shared/components/weight-field/weight-field.component';
import { ConsentService } from '../consent.service';
import { BodyWeightConsentComponent } from './body-weight-consent.component';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WeeklySetsFieldComponent } from '../../shared/components/weekly-sets-field/weekly-sets-field.component';

/**
 * Account → Profile: your name, for Home's greeting (SET-7), your sex, for the body map's
 * figure (SET-5), what you train for and the sets a week, for the muscle bars' aims (PRG-8),
 * and the weight unit
 * you lift in (SET-4). They're saved with the settings, and synced with your account when
 * you're signed in, with your equipment and your kettlebell's weight (PRG-14), shown when you
 * have one, as your profile. Your body weight, for calories
 * (CAL-2), is here too, but syncs only with its own consent (CAL-6).
 */
@Component({
    selector: 'app-profile',
    imports: [BodyWeightConsentComponent, WeeklySetsFieldComponent, WeightFieldComponent],
    template: `
        <!-- Saved as it's left, trimmed -->
        <label class="picker-field profile__field">
            <span class="profile__name">Name</span>
            <input
                class="picker-field__input"
                type="text"
                autocomplete="given-name"
                aria-describedby="name-hint"
                [maxLength]="maxNameLength"
                [value]="settings.name()"
                (change)="setName($event)"
            />
        </label>
        <p class="profile__hint" id="name-hint">What Today greets you by</p>

        <!-- Which figure the body maps draw -->
        <fieldset class="segmented profile__picker" aria-describedby="sex-hint">
            <legend class="profile__name">Sex</legend>
            <div
                class="segmented__options"
                [style.--count]="sexes.length"
                [style.--chosen]="chosenSexIndex()"
            >
                <!-- The highlight behind the chosen option, which slides between them -->
                <span class="segmented__thumb" aria-hidden="true"></span>
                @for (option of sexes; track option.value; let i = $index) {
                    <label
                        class="segmented__option"
                        [class.segmented__option--chosen]="i === chosenSexIndex()"
                    >
                        <input
                            type="radio"
                            name="bodyFigure"
                            class="segmented__input"
                            [value]="option.value"
                            [checked]="settings.bodyFigure() === option.value"
                            (change)="settings.update({ bodyFigure: option.value })"
                        />
                        <span class="segmented__label">{{ option.label }}</span>
                    </label>
                }
            </div>
            <p class="profile__hint" id="sex-hint">The body the muscle maps show</p>
        </fieldset>

        <!-- Sets the sets a week each muscle bar aims at, below, to suit it -->
        <fieldset class="segmented profile__picker" aria-describedby="goal-hint">
            <legend class="profile__name">Training for</legend>
            <div
                class="segmented__options"
                [style.--count]="goals.length"
                [style.--chosen]="chosenGoalIndex()"
            >
                <span class="segmented__thumb" aria-hidden="true"></span>
                @for (option of goals; track option.value; let i = $index) {
                    <label
                        class="segmented__option"
                        [class.segmented__option--chosen]="i === chosenGoalIndex()"
                    >
                        <input
                            type="radio"
                            name="trainingGoal"
                            class="segmented__input"
                            [value]="option.value"
                            [checked]="settings.trainingGoal() === option.value"
                            (change)="settings.update({ trainingGoal: option.value })"
                        />
                        <span class="segmented__label">{{ option.label }}</span>
                    </label>
                }
            </div>
            <p class="profile__hint" id="goal-hint">{{ goalHint }}</p>
        </fieldset>
        <app-weekly-sets-field class="profile__weekly-sets" />

        <!-- Weights are always saved in kg, so switching loses nothing -->
        <fieldset class="segmented profile__picker">
            <legend class="profile__name">Weight units</legend>
            <div
                class="segmented__options"
                [style.--count]="weightUnits.length"
                [style.--chosen]="chosenUnitIndex()"
            >
                <span class="segmented__thumb" aria-hidden="true"></span>
                @for (option of weightUnits; track option.value; let i = $index) {
                    <label
                        class="segmented__option"
                        [class.segmented__option--chosen]="i === chosenUnitIndex()"
                    >
                        <input
                            type="radio"
                            name="weightUnit"
                            class="segmented__input"
                            [value]="option.value"
                            [checked]="settings.weightUnit() === option.value"
                            (change)="settings.update({ weightUnit: option.value })"
                        />
                        <span class="segmented__label">{{ option.label }}</span>
                    </label>
                }
            </div>
        </fieldset>

        <!-- What every kettlebell workout starts at (PRG-14), for those with one -->
        @if (hasKettlebell()) {
            <app-weight-field
                class="profile__weight"
                kind="kettlebell"
                describedBy="kettlebell-weight-hint"
            >
                <span class="profile__name">My kettlebell</span>
            </app-weight-field>
            <p class="profile__hint" id="kettlebell-weight-hint">
                Kettlebell workouts start at this. Setting a weight in one changes it too
            </p>
        }

        <!-- Health data, so it syncs only with its own consent, given below -->
        <app-weight-field class="profile__weight" kind="body" describedBy="body-weight-hint">
            <span class="profile__name">Body weight</span>
        </app-weight-field>
        <p class="profile__hint" id="body-weight-hint">{{ weightHint() }}</p>
        <app-body-weight-consent />
    `,
    styles: `
        :host {
            display: block;
        }

        // The pickers' look is shared (styles/_segmented.scss); here, their spacing
        .segmented {
            padding-top: 0.25rem;
        }

        .profile__picker {
            margin-top: 1rem;
        }

        .profile__name {
            color: var(--text);
        }

        .profile__field {
            padding-top: 0.25rem;
        }

        .profile__weight,
        .profile__weekly-sets {
            margin-top: 1rem;
        }

        .profile__hint {
            margin: 0.5rem 0 0;
            font-size: 0.85rem;
            color: var(--text-muted);
        }
    `,
})
export class ProfileComponent {
    protected readonly settings = inject(SettingsStore);
    private readonly consent = inject(ConsentService);
    protected readonly maxNameLength = MAX_NAME_LENGTH;

    protected setName(event: Event) {
        const input = event.target as HTMLInputElement;
        this.settings.update({ name: input.value });
        // As it's kept, e.g. without the spaces round it
        input.value = this.settings.name();
    }

    protected readonly sexes: { value: BodyFigure; label: string }[] = [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
    ];
    protected readonly chosenSexIndex = computed(() =>
        this.sexes.findIndex((option) => option.value === this.settings.bodyFigure())
    );

    protected readonly goals: { value: TrainingGoal; label: string }[] = [
        { value: 'muscle', label: 'Muscle' },
        { value: 'fitness', label: 'Fitness' },
    ];
    protected readonly chosenGoalIndex = computed(() =>
        this.goals.findIndex((option) => option.value === this.settings.trainingGoal())
    );
    protected readonly goalHint = `Choosing one sets the sets a week below to suit it: ${DEFAULT_WEEKLY_SETS.muscle} for Muscle, ${DEFAULT_WEEKLY_SETS.fitness} for Fitness`;

    /** A kettlebell among your equipment, or a weight for one already known. */
    protected readonly hasKettlebell = computed(
        () =>
            this.settings.myEquipment().includes('kettlebell') ||
            this.settings.kettlebellWeight() !== null
    );

    protected readonly weightHint = computed(() => bodyWeightHint(!!this.consent.weightGiven()));

    protected readonly weightUnits: { value: WeightUnit; label: string }[] = [
        { value: 'kg', label: 'Kilograms (kg)' },
        { value: 'lb', label: 'Pounds (lb)' },
    ];
    protected readonly chosenUnitIndex = computed(() =>
        this.weightUnits.findIndex((option) => option.value === this.settings.weightUnit())
    );
}
