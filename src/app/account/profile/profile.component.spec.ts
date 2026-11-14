import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsStore } from '../../shared/state/settings-store.service';
import { ProfileComponent } from './profile.component';

describe('ProfileComponent', () => {
    let fixture: ComponentFixture<ProfileComponent>;
    let settings: SettingsStore;

    function create() {
        fixture = TestBed.createComponent(ProfileComponent);
        fixture.detectChanges();
    }

    beforeEach(() => {
        localStorage.clear();
        settings = TestBed.inject(SettingsStore);
    });
    afterEach(() => {
        fixture.destroy();
        localStorage.clear();
    });

    const radios = (name: string) =>
        Array.from(
            fixture.nativeElement.querySelectorAll(
                `input[name="${name}"]`
            ) as NodeListOf<HTMLInputElement>
        );
    const labels = (name: string) =>
        radios(name).map((r) => r.closest('label')!.textContent!.trim());

    describe('name (SET-7)', () => {
        it('saves a name as it is left, trimmed, and shows it as kept', () => {
            create();
            const input = fixture.nativeElement.querySelector(
                'input[type="text"]'
            ) as HTMLInputElement;
            expect(input.closest('label')!.textContent).toContain('Name');
            expect(input.value).toBe('');

            input.value = '  Sam  ';
            input.dispatchEvent(new Event('change'));

            expect(settings.name()).toBe('Sam');
            expect(input.value).toBe('Sam');
        });
    });

    describe('sex', () => {
        it('offers Male and Female in a labelled group, with Male chosen to begin with', () => {
            create();

            expect(labels('bodyFigure')).toEqual(['Male', 'Female']);
            const group = radios('bodyFigure')[0].closest('fieldset')!;
            expect(group.querySelector('legend')!.textContent).toBe('Sex');
            expect(
                fixture.nativeElement.querySelector(`#${group.getAttribute('aria-describedby')}`)
                    .textContent
            ).toBe('The body the muscle maps show');
            expect(radios('bodyFigure').find((r) => r.checked)?.value).toBe('male');
        });

        it('saves Female when picked', () => {
            create();

            radios('bodyFigure')[1].click();
            fixture.detectChanges();

            expect(settings.bodyFigure()).toBe('female');
            expect(radios('bodyFigure').find((r) => r.checked)?.value).toBe('female');
        });
    });

    describe('training for', () => {
        it('offers Muscle and Fitness in a labelled group, with Muscle chosen to begin with', () => {
            create();

            expect(labels('trainingGoal')).toEqual(['Muscle', 'Fitness']);
            const group = radios('trainingGoal')[0].closest('fieldset')!;
            expect(group.querySelector('legend')!.textContent).toBe('Training for');
            expect(radios('trainingGoal').find((r) => r.checked)?.value).toBe('muscle');
            expect(
                fixture.nativeElement.querySelector(`#${group.getAttribute('aria-describedby')}`)
                    .textContent
            ).toBe('Aim for 10 to 20 sets a week on each muscle, 4 to 10 on small ones');
        });

        it('saves Fitness when picked, and says its lower aim', () => {
            create();

            radios('trainingGoal')[1].click();
            fixture.detectChanges();

            expect(settings.trainingGoal()).toBe('fitness');
            expect(fixture.nativeElement.querySelector('#goal-hint').textContent).toBe(
                'Aim for 6 to 12 sets a week on each muscle, 2 to 6 on small ones'
            );
        });
    });

    describe('weight units', () => {
        it('offers kg and lb in a labelled group, with kg chosen to begin with', () => {
            create();

            expect(labels('weightUnit')).toEqual(['Kilograms (kg)', 'Pounds (lb)']);
            expect(
                radios('weightUnit')[0].closest('fieldset')!.querySelector('legend')!.textContent
            ).toBe('Weight units');
            expect(radios('weightUnit').find((r) => r.checked)?.value).toBe('kg');
        });

        it('saves lb when picked', () => {
            create();

            radios('weightUnit')[1].click();
            fixture.detectChanges();

            expect(settings.weightUnit()).toBe('lb');
            expect(radios('weightUnit').find((r) => r.checked)?.value).toBe('lb');
        });
    });

    describe('body weight (CAL-2)', () => {
        const box = () =>
            fixture.nativeElement.querySelector('app-body-weight-field input') as HTMLInputElement;
        const type = (value: string) => {
            box().value = value;
            box().dispatchEvent(new Event('change'));
            fixture.detectChanges();
        };

        it('saves it in kg as it is left, shown in the unit chosen, on this device only', () => {
            create();
            expect(box().closest('label')!.textContent).toContain('Body weight in kilograms');
            expect(
                fixture.nativeElement.querySelector(`#${box().getAttribute('aria-describedby')}`)
                    .textContent
            ).toContain('Kept on this device only');

            type('72.54');
            expect(settings.bodyWeight()).toBe(72.5);
            expect(box().value).toBe('72.5');
            expect(settings.hasProfile()).toBe(false);

            settings.update({ weightUnit: 'lb' });
            fixture.detectChanges();
            expect(box().value).toBe('159.8');
        });

        it('takes an empty box, or one out of range, as none', () => {
            settings.update({ bodyWeight: 80 });
            create();
            expect(box().value).toBe('80');

            type('500');
            expect(settings.bodyWeight()).toBeNull();
            expect(box().value).toBe('');

            type('80,5');
            expect(settings.bodyWeight()).toBe(80.5);
            type('');
            expect(settings.bodyWeight()).toBeNull();
        });
    });
});
