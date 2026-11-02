import {
    afterNextRender,
    Component,
    computed,
    DestroyRef,
    DOCUMENT,
    effect,
    ElementRef,
    inject,
    Injector,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { AUTH_STORAGE_KEY } from '../../account/account-client';
import { builtInWorkoutEquipment, copyOfBuiltIn } from '../../models/built-in-workouts';
import {
    BodyFigure,
    capitalise,
    Equipment,
    EQUIPMENT_CHOICES,
    equipmentLabel,
    equipmentPhrases,
} from '../../models/exercise';
import { TrainingGoal, WEEKLY_AIMS } from '../../models/muscle-balance';
import { likelyWeightUnit, MAX_NAME_LENGTH } from '../../models/profile';
import { WeightUnit } from '../../models/weight';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { SyncStarter } from '../../sync/sync-starter.service';
import { SETUP_KEY } from '../welcome-first';
import { firstWorkout } from './first-workout';

/** The questions, in the order they're asked, then the workout to start with. */
const QUESTIONS = ['name', 'goal', 'equipment', 'body', 'units'] as const;
type Step = (typeof QUESTIONS)[number] | 'start';

/** How long to wait for the account's profile before asking anyway (offline, say). */
export const PROFILE_WAIT_MS = 8000;

/**
 * The setup (NAV-4), once, after the welcome screen: your name, what you train for, the
 * equipment you have, the body the muscle maps show and the units you lift in, one question
 * at a time, then a ready-made workout to start with. Each answer is saved as it's picked, so
 * leaving part way keeps them. Signed in, it first waits for the account's profile: one set
 * up on another device is taken, and nothing's asked.
 */
@Component({
    selector: 'app-setup',
    imports: [BodyMapComponent, IconComponent],
    templateUrl: './setup.component.html',
    styleUrl: './setup.component.scss',
})
export class SetupComponent {
    protected readonly settings = inject(SettingsStore);
    private readonly workouts = inject(WorkoutStore);
    private readonly run = inject(ActiveRunService);
    private readonly starter = inject(SyncStarter);
    private readonly router = inject(Router);
    private readonly document = inject(DOCUMENT);
    private readonly injector = inject(Injector);

    private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');

    /** Waiting for the account's profile, or asking. */
    protected readonly checking = signal(
        localStorage.getItem(AUTH_STORAGE_KEY) !== null &&
            localStorage.getItem(SETUP_KEY) !== 'asking'
    );
    protected readonly step = signal<Step>('name');
    protected readonly questionCount = QUESTIONS.length;
    /** Which question it is, from 1; 0 for the workout to start with. */
    protected readonly number = computed(() => {
        const step = this.step();
        return step === 'start' ? 0 : QUESTIONS.indexOf(step) + 1;
    });

    protected readonly maxNameLength = MAX_NAME_LENGTH;
    /** The name as it's typed, saved on Next. */
    protected readonly name = signal(this.settings.name());

    protected readonly goals: { value: TrainingGoal; label: string; hint: string }[] = [
        {
            value: 'muscle',
            label: 'Muscle',
            hint: `Get stronger and build muscle: ${aimText('muscle')}`,
        },
        {
            value: 'fitness',
            label: 'Fitness',
            hint: `Stay fit and active: ${aimText('fitness')}`,
        },
    ];

    protected readonly equipmentChoices = EQUIPMENT_CHOICES;
    protected readonly equipmentLabel = equipmentLabel;

    protected readonly bodies: { value: BodyFigure; label: string }[] = [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
    ];

    protected readonly units: { value: WeightUnit; label: string }[] = [
        { value: 'kg', label: 'Kilograms (kg)' },
        { value: 'lb', label: 'Pounds (lb)' },
    ];

    /** The ready-made workout to start with, for the goal and equipment picked. */
    protected readonly first = computed(() => {
        const workout = firstWorkout(this.settings.trainingGoal(), this.settings.myEquipment());
        const needs = equipmentPhrases(builtInWorkoutEquipment(workout)).map(capitalise);
        return { workout, needs: needs.join(', ') };
    });

    protected readonly doneTitle = computed(() => {
        const name = this.settings.name();
        return name ? `You're all set, ${name}` : "You're all set";
    });

    constructor() {
        if (!this.checking()) {
            this.ask();
            return;
        }
        // Signed in: the account may have a profile from another device, which its first
        // sync brings. Taken, nothing's asked; synced without one, or not soon, it's asked
        this.starter.start();
        effect(() => {
            if (!this.checking()) {
                return;
            }
            if (this.settings.hasProfile()) {
                untracked(() => this.finish('/home'));
                return;
            }
            const status = this.starter.status();
            if (status.lastSyncedAt !== null || status.problem !== null) {
                untracked(() => this.ask());
            }
        });
        const timer = setTimeout(() => this.checking() && this.ask(), PROFILE_WAIT_MS);
        inject(DestroyRef).onDestroy(() => clearTimeout(timer));
    }

    protected typed(event: Event) {
        this.name.set((event.target as HTMLInputElement).value);
    }

    protected next(event?: Event) {
        event?.preventDefault();
        const step = this.step();
        if (step === 'name') {
            this.settings.update({ name: this.name() });
        } else if (step === 'equipment') {
            // Picked, the lists show what you can do with it; none, they show everything
            this.settings.update({ onlyMyEquipment: this.settings.myEquipment().length > 0 });
        }
        const at = QUESTIONS.indexOf(step as (typeof QUESTIONS)[number]);
        this.go(QUESTIONS[at + 1] ?? 'start');
    }

    protected back() {
        const at = QUESTIONS.indexOf(this.step() as (typeof QUESTIONS)[number]);
        this.go(at > 0 ? QUESTIONS[at - 1] : 'name');
    }

    protected has(equipment: Equipment): boolean {
        return this.settings.myEquipment().includes(equipment);
    }

    protected toggle(equipment: Equipment) {
        const mine = this.has(equipment)
            ? this.settings.myEquipment().filter((e) => e !== equipment)
            : [...this.settings.myEquipment(), equipment];
        // In the order it's offered, as it's saved
        this.settings.update({ myEquipment: EQUIPMENT_CHOICES.filter((e) => mine.includes(e)) });
    }

    /** Adds the workout to start with to the library (unless it's there) and starts it. */
    protected startFirst() {
        const { workout } = this.first();
        const title = workout.title.toLowerCase();
        const inLibrary = this.workouts
            .workouts()
            .find((other) => other.title.trim().toLowerCase() === title);
        this.run.start(inLibrary ?? this.workouts.addWorkout(copyOfBuiltIn(workout)));
        this.finish('/workout');
    }

    /** Done (or skipped): not asked again, by this device or, signed in, any other. */
    protected finish(url: string) {
        this.checking.set(false);
        this.settings.keepProfile();
        localStorage.removeItem(SETUP_KEY);
        void this.router.navigateByUrl(url, { replaceUrl: true });
    }

    private ask() {
        this.checking.set(false);
        localStorage.setItem(SETUP_KEY, 'asking');
        // Never set: start from the units most people lift in where the device is set to
        if (!this.settings.hasProfile()) {
            const languages = this.document.defaultView?.navigator.languages ?? [];
            this.settings.update({ weightUnit: likelyWeightUnit(languages) });
        }
        this.focusHeading();
    }

    private go(step: Step) {
        this.step.set(step);
        this.focusHeading();
    }

    /** Each question's heading takes focus, so it's read out, as a new page's would be. */
    private focusHeading() {
        afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
    }
}

function aimText(goal: TrainingGoal): string {
    const { large } = WEEKLY_AIMS[goal];
    return `${large.low} to ${large.high} sets a week on each muscle.`;
}
