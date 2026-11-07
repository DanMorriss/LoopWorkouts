import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BUILT_IN_EXERCISES } from '../../../models/built-in-exercises';
import { Exercise } from '../../../models/exercise';
import { ExerciseStore } from '../../state/exercise-store.service';
import { SettingsStore } from '../../state/settings-store.service';
import { fakeReducedMotion } from '../../testing/fake-reduced-motion';
import { DEMO_IN_3D, DEMO_IN_WORKER, ExerciseDemoComponent } from './exercise-demo.component';

describe('ExerciseDemoComponent', () => {
    let fixture: ComponentFixture<ExerciseDemoComponent>;

    const builtIn = (id: string) => BUILT_IN_EXERCISES.find((exercise) => exercise.id === id)!;
    const el = (): HTMLElement => fixture.nativeElement;
    const toggle = () => el().querySelector<HTMLButtonElement>('.demo__toggle');
    /** Where the figure's parts are placed now, to tell whether it moved. */
    const drawing = () =>
        Array.from(el().querySelectorAll('g[transform]'))
            .map((part) => part.getAttribute('transform'))
            .join(' ');
    const frames = (count: number) =>
        new Promise<void>((resolve) => {
            const next = (left: number) =>
                left === 0 ? resolve() : requestAnimationFrame(() => next(left - 1));
            next(count);
        });

    async function create(exercise: Exercise, in3d = false, inWorker = true) {
        TestBed.configureTestingModule({
            providers: [
                { provide: DEMO_IN_3D, useValue: in3d },
                { provide: DEMO_IN_WORKER, useValue: inWorker },
            ],
        });
        await TestBed.inject(ExerciseStore).loadMotion();
        fixture = TestBed.createComponent(ExerciseDemoComponent);
        fixture.componentRef.setInput('exercise', exercise);
        document.body.appendChild(fixture.nativeElement);
        fixture.detectChanges();
        await fixture.whenStable();
    }

    afterEach(() => {
        fixture.destroy();
        localStorage.clear();
    });

    it('shows nothing for your own exercise, which has no demo', async () => {
        fakeReducedMotion(false);
        await create({
            ...builtIn('builtin:deadlift'),
            id: 'my-deadlift',
            description: '',
            steps: [],
            tips: [],
            updatedAt: 0,
        });

        expect(el().querySelector('app-exercise-figure')).toBeNull();
        expect(toggle()).toBeNull();
    });

    it("plays the exercise's figure, shading its main muscles, until paused", async () => {
        fakeReducedMotion(false);
        await create(builtIn('builtin:back-squat'));

        expect(el().querySelector('app-exercise-figure')?.getAttribute('aria-hidden')).toBe('true');
        // Its quads and glutes as main, and its hamstrings, adductors and lower back as supporting
        expect(el().querySelectorAll('.figure__muscle--main').length).toBeGreaterThan(0);
        expect(el().querySelectorAll('.figure__muscle--supporting').length).toBeGreaterThan(0);
        expect(toggle()?.textContent?.trim()).toBe('Pause');
        expect(toggle()?.getAttribute('aria-label')).toBe('Pause the demo');

        const before = drawing();
        await frames(40);
        fixture.detectChanges();
        expect(drawing()).not.toBe(before);

        toggle()!.click();
        fixture.detectChanges();
        expect(toggle()?.textContent?.trim()).toBe('Play');
        expect(toggle()?.getAttribute('aria-label')).toBe('Play the demo');
        const paused = drawing();
        await frames(20);
        fixture.detectChanges();
        expect(drawing()).toBe(paused);
    });

    it('shows its key positions still, labelled, with reduced motion', async () => {
        fakeReducedMotion(true);
        await create(builtIn('builtin:push-up'));

        const labels = Array.from(el().querySelectorAll('.demo__label')).map((label) =>
            label.textContent?.trim()
        );
        expect(labels).toEqual(['Top', 'Bottom']);
        expect(el().querySelectorAll('app-exercise-figure')).toHaveLength(2);
        expect(el().querySelector('.demo__stills')?.getAttribute('aria-hidden')).toBe('true');
        expect(toggle()).toBeNull();
    });

    it('shows a hold, such as a plank, still, with nothing to pause', async () => {
        fakeReducedMotion(false);
        await create(builtIn('builtin:plank'));

        const labels = Array.from(el().querySelectorAll('.demo__label')).map((label) =>
            label.textContent?.trim()
        );
        expect(labels).toEqual(['Hold']);
        expect(toggle()).toBeNull();
    });

    it('starts playing when reduced motion is turned off', async () => {
        const reduced = fakeReducedMotion(true);
        await create(builtIn('builtin:lateral-raise'));

        reduced.set(false);
        fixture.detectChanges();

        expect(el().querySelector('.demo__stills')).toBeNull();
        expect(toggle()).not.toBeNull();
    });

    describe('in 3D', () => {
        const hasWebGL = !!document.createElement('canvas').getContext('webgl2');
        const canvas = () => el().querySelector<HTMLCanvasElement>('app-exercise-figure-3d canvas');
        const turnButton = () =>
            el().querySelector<HTMLButtonElement>('button[aria-label="Turn the figure"]');
        /**
         * Waits for three.js to load and the figure to be drawn: drawn in a worker, the picture
         * comes a moment after the page asks for it.
         */
        async function drawn() {
            await vi.waitFor(() => expect(canvas()).not.toBeNull(), { timeout: 10000 });
            await vi.waitFor(() => expect(pixels()).not.toBe(0), { timeout: 10000 });
            fixture.detectChanges();
        }
        /** Waits for what's drawn to change from `before` (the canvas's pixels()). */
        const changes = (before: number) =>
            vi.waitFor(() => expect(pixels()).not.toBe(before), { timeout: 5000 });
        /** The canvas's pixels, to tell whether what's drawn changed. */
        const pixels = () => {
            const image = canvas()!
                .getContext('2d')!
                .getImageData(0, 0, canvas()!.width, canvas()!.height);
            let sum = 0;
            for (let i = 0; i < image.data.length; i += 7) {
                sum = (sum * 31 + image.data[i]) % 1_000_000_007;
            }
            return sum;
        };

        it.runIf(hasWebGL)(
            'draws the figure, hidden from screen readers, and plays it',
            async () => {
                fakeReducedMotion(false);
                await create(builtIn('builtin:back-squat'), true);
                await drawn();

                expect(el().querySelector('app-exercise-figure')).toBeNull();
                expect(
                    el().querySelector('app-exercise-figure-3d')?.getAttribute('aria-hidden')
                ).toBe('true');
                expect(canvas()!.width).toBeGreaterThan(0);
                const before = pixels();
                await frames(40);
                await changes(before);
                expect(toggle()?.textContent?.trim()).toBe('Pause');
            }
        );

        it.runIf(hasWebGL)(
            "draws it on the page where it can't be drawn in a worker, and plays it",
            async () => {
                fakeReducedMotion(false);
                await create(builtIn('builtin:back-squat'), true, false);
                await drawn();

                expect(canvas()!.width).toBeGreaterThan(0);
                const before = pixels();
                await frames(40);
                await changes(before);
            }
        );

        it.runIf(hasWebGL)(
            'repaints the figure in the new colours when the theme changes',
            async () => {
                fakeReducedMotion(true);
                await create(builtIn('builtin:push-up'), true);
                await drawn();
                const dark = pixels();

                TestBed.inject(SettingsStore).update({ theme: 'light' });
                fixture.detectChanges();
                await frames(2);
                fixture.detectChanges();

                await changes(dark);
            }
        );

        it.runIf(hasWebGL)('turns the figure round with Turn, as dragging does', async () => {
            fakeReducedMotion(true);
            await create(builtIn('builtin:push-up'), true);
            await drawn();

            // Still, with reduced motion, but it can still be turned
            expect(toggle()).toBeNull();
            expect(turnButton()?.textContent?.trim()).toBe('Turn');
            const before = pixels();
            turnButton()!.click();
            fixture.detectChanges();
            await frames(2);
            await changes(before);
        });
    });
});
