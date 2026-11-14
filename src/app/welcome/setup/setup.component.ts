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
import { AUTH_STORAGE_KEY } from '../../shared/state/auth-storage-key';
import { BodyFigure } from '../../models/exercise';
import { TrainingGoal, WEEKLY_AIMS } from '../../models/muscle-balance';
import { likelyWeightUnit, MAX_NAME_LENGTH } from '../../models/profile';
import { WeightUnit } from '../../models/weight';
import { BodyMapComponent } from '../../shared/components/body-map/body-map.component';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { SyncStarter } from '../../sync/sync-starter.service';
import { SETUP_KEY } from '../welcome-first';
import { UndoService } from '../../shared/undo/undo.service';
import { EquipmentChipsComponent } from '../../shared/components/equipment-chips/equipment-chips.component';

/** The questions, in the order they're asked. */
const QUESTIONS = ['name', 'goal', 'equipment', 'body', 'units'] as const;
type Step = (typeof QUESTIONS)[number];

/** How long to wait for the account's profile before asking anyway (offline, say). */
export const PROFILE_WAIT_MS = 8000;

/**
 * The setup (NAV-4), once, after the welcome screen: your name, what you train for, the
 * equipment you have, the body the muscle maps show and the units you lift in, one question
 * at a time, then on to Today, which says it's all set and starts you off with a workout to add
 * (until 2026-11-03, a last screen here offered one to start straight away). Each answer is
 * saved as it's picked, so leaving part way keeps them. Signed in, it first waits for the account's profile: one set
 * up on another device is taken, and nothing's asked.
 */
@Component({
    selector: 'app-setup',
    imports: [BodyMapComponent, EquipmentChipsComponent],
    templateUrl: './setup.component.html',
    styleUrl: './setup.component.scss',
})
export class SetupComponent {
    protected readonly settings = inject(SettingsStore);
    private readonly undo = inject(UndoService);
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
    /** Which question it is, from 1. */
    protected readonly number = computed(() => QUESTIONS.indexOf(this.step()) + 1);

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

    protected readonly bodies: { value: BodyFigure; label: string }[] = [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
    ];

    protected readonly units: { value: WeightUnit; label: string }[] = [
        { value: 'kg', label: 'Kilograms (kg)' },
        { value: 'lb', label: 'Pounds (lb)' },
    ];

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
                untracked(() => this.finish());
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
        const after = QUESTIONS[QUESTIONS.indexOf(step) + 1];
        if (after) {
            this.go(after);
        } else {
            void this.finish({ allSet: true });
        }
    }

    protected back() {
        const at = QUESTIONS.indexOf(this.step());
        this.go(at > 0 ? QUESTIONS[at - 1] : 'name');
    }

    /**
     * Done (or skipped): not asked again, by this device or, signed in, any other, and on to
     * Today. Answered to the end, Today says so in the bar at the bottom, by name.
     */
    protected async finish({ allSet = false } = {}) {
        this.checking.set(false);
        this.settings.keepProfile();
        localStorage.removeItem(SETUP_KEY);
        await this.router.navigateByUrl('/home', { replaceUrl: true });
        if (allSet) {
            const name = this.settings.name();
            this.undo.notify(
                `${name ? `You're all set, ${name}` : "You're all set"}. Change any of it on You, under Profile.`
            );
        }
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
