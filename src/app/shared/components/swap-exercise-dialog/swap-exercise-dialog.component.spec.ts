import { TestBed } from '@angular/core/testing';
import { BUILT_IN_EXERCISES } from '../../../models/built-in-exercises';
import { SettingsStore } from '../../state/settings-store.service';
import { SwapExerciseDialogComponent } from './swap-exercise-dialog.component';

describe('SwapExerciseDialogComponent', () => {
    const chainsawRow = BUILT_IN_EXERCISES.find(
        (exercise) => exercise.id === 'builtin:chainsaw-row'
    )!;

    function open() {
        const fixture = TestBed.createComponent(SwapExerciseDialogComponent);
        fixture.componentRef.setInput('exercise', chainsawRow);
        fixture.componentRef.setInput('measuredBy', 'reps');
        fixture.detectChanges();
        const text = (selector: string) =>
            (fixture.nativeElement as HTMLElement).querySelector(selector)?.textContent?.trim();
        const names = () =>
            Array.from(
                (fixture.nativeElement as HTMLElement).querySelectorAll('.swap__option .swap__name')
            ).map((name) => name.textContent!.trim());
        return { text, names };
    }

    beforeEach(() => localStorage.clear());
    afterEach(() => localStorage.clear());

    it('offers the closest with my equipment, once picked', () => {
        TestBed.inject(SettingsStore).update({ myEquipment: ['pull-up bar', 'kettlebell'] });
        const { text, names } = open();

        expect(text('.swap__heading')).toBe('Same muscles, with your equipment');
        expect(names()).toEqual(['Pull-up', 'Chin-up']);
    });

    it('offers the closest needing other equipment, when none can be done with mine', () => {
        // No other exercise for the upper back can be done with only kettlebells
        TestBed.inject(SettingsStore).update({ myEquipment: ['kettlebell'] });
        const { text, names } = open();

        expect(text('.swap__heading')).toBe('Same muscles, needing other equipment');
        expect(names()).toHaveLength(5);
        expect(names()).toContain('Barbell row');
        expect(text('.swap__none')).toBeUndefined();
    });
});
