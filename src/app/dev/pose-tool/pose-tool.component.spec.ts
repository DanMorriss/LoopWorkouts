import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEMO_IN_3D } from '../../shared/components/exercise-demo/demo-scene';
import { ExerciseStore } from '../../shared/state/exercise-store.service';
import { PoseToolComponent } from './pose-tool.component';

describe('PoseToolComponent', () => {
    let fixture: ComponentFixture<PoseToolComponent>;
    const el = (): HTMLElement => fixture.nativeElement;
    const code = () => el().querySelector('.pose-tool__code')!.textContent!;
    const button = (text: string) =>
        Array.from(el().querySelectorAll('button')).find((b) => b.textContent!.trim() === text)!;
    const number = (label: string) =>
        el().querySelector<HTMLInputElement>(`input[type=number][aria-label="${label}"]`)!;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [provideRouter([]), { provide: DEMO_IN_3D, useValue: false }],
        });
        const store = TestBed.inject(ExerciseStore);
        await store.load();
        await store.loadMotion();
        fixture = TestBed.createComponent(PoseToolComponent);
        document.body.appendChild(fixture.nativeElement);
        await fixture.whenStable();
    });

    afterEach(() => fixture.destroy());

    async function pick(slug: string) {
        const select = el().querySelector('select')!;
        select.value = `builtin:${slug}`;
        select.dispatchEvent(new Event('change'));
        await fixture.whenStable();
    }

    it("shows an exercise's position as code, and changes it with a slider", async () => {
        await pick('push-up');
        expect(code()).toContain('torso: 109.55');
        expect(el().querySelector('app-exercise-figure')).not.toBeNull();

        const torso = number('Torso');
        torso.value = '120';
        torso.dispatchEvent(new Event('change'));
        await fixture.whenStable();

        expect(code()).toContain('torso: 120');
    });

    it('keeps a change to one position while another is shown, until Reset', async () => {
        await pick('push-up');
        const torso = number('Torso');
        torso.value = '100';
        torso.dispatchEvent(new Event('change'));
        await fixture.whenStable();

        button('Bottom').click();
        await fixture.whenStable();
        expect(code()).toContain('torso: 90.82');

        button('Top').click();
        await fixture.whenStable();
        expect(code()).toContain('torso: 100');

        button('Reset').click();
        await fixture.whenStable();
        expect(code()).toContain('torso: 109.55');
    });

    it('copies the pose, with how to lay it out once pasted', async () => {
        await pick('push-up');
        const copied: string[] = [];
        vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(async (text) => {
            copied.push(text);
        });

        button('Copy pose').click();
        await vi.waitFor(() => expect(copied).toHaveLength(1));
        await fixture.whenStable();

        expect(copied[0]).toBe(code());
        expect(el().querySelector('.pose-tool__status')!.textContent).toContain('npm run format');
    });
});
