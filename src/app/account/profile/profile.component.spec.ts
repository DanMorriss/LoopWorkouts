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
        const wheel = () =>
            fixture.nativeElement.querySelector(
                'app-weekly-sets-field [role="spinbutton"]'
            ) as HTMLElement;
        const setsHint = () =>
            fixture.nativeElement.querySelector('#weekly-sets-hint').textContent.trim();

        it('offers Muscle and Fitness in a labelled group, with Muscle chosen to begin with', () => {
            create();

            expect(labels('trainingGoal')).toEqual(['Muscle', 'Fitness']);
            const group = radios('trainingGoal')[0].closest('fieldset')!;
            expect(group.querySelector('legend')!.textContent).toBe('Training for');
            expect(radios('trainingGoal').find((r) => r.checked)?.value).toBe('muscle');
            expect(
                fixture.nativeElement.querySelector(`#${group.getAttribute('aria-describedby')}`)
                    .textContent
            ).toBe(
                'Choosing one sets the sets a week below to suit it: 10 for Muscle, 6 for Fitness'
            );
        });

        it('aims each muscle at 10 sets a week to begin with, 4 on small ones', () => {
            create();

            expect(wheel().getAttribute('aria-valuenow')).toBe('10');
            expect(wheel().getAttribute('aria-labelledby')).toBe(
                'weekly-sets-label weekly-sets-hint'
            );
            expect(setsHint()).toBe('Small muscles, like the forearms, aim for 4');
        });

        it('saves the sets a week picked, with the small muscles following', async () => {
            create();
            // A freshly shown wheel jumps to its value a frame later, which would undo a turn
            await new Promise(requestAnimationFrame);
            await new Promise(requestAnimationFrame);

            (
                fixture.nativeElement.querySelector(
                    'app-weekly-sets-field [data-value="14"]'
                ) as HTMLElement
            ).click();
            fixture.detectChanges();

            expect(settings.weeklySets()).toBe(14);
            expect(wheel().getAttribute('aria-valuenow')).toBe('14');
            expect(setsHint()).toBe('Small muscles, like the forearms, aim for 6');
        });

        it("puts the sets a week to Fitness's when it's picked", () => {
            create();
            settings.update({ weeklySets: 14 });

            radios('trainingGoal')[1].click();
            fixture.detectChanges();

            expect(settings.trainingGoal()).toBe('fitness');
            expect(settings.weeklySets()).toBe(6);
            expect(wheel().getAttribute('aria-valuenow')).toBe('6');
            expect(setsHint()).toBe('Small muscles, like the forearms, aim for 2');
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

    describe('my kettlebell (PRG-14)', () => {
        const box = () =>
            fixture.nativeElement.querySelector(
                'app-weight-field[kind="kettlebell"] input'
            ) as HTMLInputElement | null;

        it('is only there for someone with a kettlebell, or its weight known', () => {
            create();
            expect(box()).toBeNull();

            settings.update({ myEquipment: ['kettlebell'] });
            fixture.detectChanges();
            expect(box()!.closest('label')!.textContent).toContain('My kettlebell in kilograms');
            expect(
                fixture.nativeElement.querySelector(`#${box()!.getAttribute('aria-describedby')}`)
                    .textContent
            ).toContain('Kettlebell workouts start at this');
        });

        it('saves it in kg, to the nearest half, shown in the unit chosen', () => {
            settings.update({ myEquipment: ['kettlebell'] });
            create();

            box()!.value = '16.2';
            box()!.dispatchEvent(new Event('change'));
            fixture.detectChanges();
            expect(settings.kettlebellWeight()).toBe(16);
            expect(box()!.value).toBe('16');

            settings.update({ weightUnit: 'lb' });
            fixture.detectChanges();
            expect(box()!.value).toBe('35.5');
        });
    });

    describe('body weight (CAL-2)', () => {
        const box = () =>
            fixture.nativeElement.querySelector(
                'app-weight-field[kind="body"] input'
            ) as HTMLInputElement;
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
