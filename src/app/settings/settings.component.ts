import { ApplicationRef, Component, computed, DOCUMENT, inject } from '@angular/core';
import { BackLinkComponent } from '../nav/back-link/back-link.component';
import { letInputThrough } from '../nav/let-input-through';
import { SwipeBackDirective } from '../nav/swipe-back.directive';
import { AlarmService } from '../shared/alarms/alarm.service';
import { ToggleSwitchComponent } from '../shared/components/toggle-switch/toggle-switch.component';
import {
    WheelPickerComponent,
    WheelPickerOption,
} from '../shared/components/wheel-picker/wheel-picker.component';
import { MAX_SWITCH_SECONDS, Side } from '../models/workout';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { KeepAwakeService } from '../shared/run/keep-awake.service';
import { SettingsStore, Theme } from '../shared/state/settings-store.service';
import { AlarmKind } from '../models/alarm-schedule';

interface AlarmPreview {
    kind: AlarmKind;
    name: string;
    description: string;
}

/** On <html> while the theme changes, so the picker's highlight can leave the sliding to the fade. */
const SWITCHING_CLASS = 'theme-switching';

/**
 * Settings (SET-1–3): this device's choices, as they don't sync. It slides in over Account,
 * and back off with ‹ Account or a swipe right.
 */
@Component({
    selector: 'app-settings',
    imports: [BackLinkComponent, SwipeBackDirective, ToggleSwitchComponent, WheelPickerComponent],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss',
})
export class SettingsComponent {
    protected readonly settings = inject(SettingsStore);
    protected readonly alarms = inject(AlarmService);
    protected readonly keepAwake = inject(KeepAwakeService);
    private readonly appRef = inject(ApplicationRef);
    private readonly document = inject(DOCUMENT);
    private readonly reducedMotion = injectPrefersReducedMotion();
    /** The theme fade in progress, if any. */
    private transition: ViewTransition | null = null;

    protected readonly themes: { value: Theme; label: string }[] = [
        { value: 'dark', label: 'Dark' },
        { value: 'light', label: 'Light' },
        { value: 'system', label: 'System' },
    ];
    /** Where the picker's highlight sits: 0, 1 or 2. */
    protected readonly chosenIndex = computed(() =>
        this.themes.findIndex((option) => option.value === this.settings.theme())
    );

    protected readonly sides: { value: Side; label: string }[] = [
        { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' },
    ];
    protected readonly chosenSideIndex = computed(() =>
        this.sides.findIndex((option) => option.value === this.settings.eachSideFirst())
    );
    /** Off, then 1 to MAX_SWITCH_SECONDS seconds. */
    protected readonly switchOptions: WheelPickerOption[] = [
        { value: 0, label: 'Off' },
        ...Array.from({ length: MAX_SWITCH_SECONDS }, (_, i) => ({
            value: i + 1,
            label: `${i + 1} s`,
            spokenLabel: `${i + 1} ${i === 0 ? 'second' : 'seconds'}`,
        })),
    ];

    protected readonly previews: AlarmPreview[] = [
        { kind: 'work', name: 'Timed', description: 'Two short high beeps' },
        { kind: 'rest', name: 'Rest', description: 'One long low tone' },
        { kind: 'finish', name: 'Finish', description: 'Three rising notes' },
        { kind: 'countdown', name: 'Countdown', description: 'One short tick' },
    ];

    /**
     * Saves the theme, fading the whole page from the old colours to the new with a view
     * transition where the browser has them. The picker's highlight slides across as part of
     * the same fade. With reduced motion, or no view transitions, it changes at once.
     */
    protected chooseTheme(theme: Theme) {
        const root = this.document.documentElement;
        if (this.reducedMotion() || !this.document.startViewTransition) {
            this.settings.update({ theme });
            return;
        }
        root.classList.add(SWITCHING_CLASS);
        const transition = this.document.startViewTransition(() => {
            this.settings.update({ theme });
            // Render now, so the new colours and the highlight's new place are what fades in
            this.appRef.tick();
        });
        this.transition = transition;
        // A tap mid-fade ends it and lands, so choosing again doesn't wait for it
        letInputThrough(transition);
        // Choosing again mid-fade skips this one (the setting is still saved), which rejects `ready`
        transition.ready.catch(() => undefined);
        transition.finished.finally(() => {
            // Leave the class for a fade that has taken over from this one
            if (this.transition === transition) {
                root.classList.remove(SWITCHING_CLASS);
                this.transition = null;
            }
        });
    }
}
