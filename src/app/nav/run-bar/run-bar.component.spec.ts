import { GestureClock } from '../../shared/testing/gesture-clock';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Workout } from '../../models/workout';
import { ActiveRunService } from '../../shared/run/active-run.service';
import { WorkoutStore } from '../../shared/state/workout-store.service';
import { FakeAudioContext, provideFakeAudioContext } from '../../shared/testing/fake-audio-context';
import { makeWorkout, reps, work } from '../../shared/testing/make-workout';
import { RunBarComponent } from './run-bar.component';

@Component({ template: '' })
class BlankPage {}

describe('RunBarComponent', () => {
    let fixture: ComponentFixture<RunBarComponent>;
    let element: HTMLElement;

    beforeEach(async () => {
        // A fake clock that only moves when the test advances it (Date.now included)
        vi.useFakeTimers();
        await TestBed.configureTestingModule({
            imports: [RunBarComponent],
            providers: [
                provideRouter([{ path: '**', component: BlankPage }]),
                provideFakeAudioContext(new FakeAudioContext()),
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(RunBarComponent);
        element = fixture.nativeElement;
        await go('/library');
    });

    afterEach(() => {
        fixture.destroy();
        vi.useRealTimers();
        sessionStorage.clear();
        localStorage.clear();
    });

    const bar = () => element.querySelector<HTMLElement>('aside');
    const status = () => element.querySelector('.run-bar__status')!.textContent!.trim();
    const button = () => element.querySelector<HTMLButtonElement>('.run-bar__pause');

    async function go(url: string) {
        await TestBed.inject(Router).navigateByUrl(url);
        fixture.detectChanges();
    }

    function start(workout: Workout) {
        TestBed.inject(WorkoutStore).setActiveWorkout(workout);
        fixture.detectChanges();
    }

    function advance(ms: number) {
        vi.advanceTimersByTime(ms);
        fixture.detectChanges();
    }

    it('is only there while a workout is going', () => {
        expect(bar()).toBeNull();

        start(makeWorkout({ title: 'Sprints' }));

        expect(bar()!.getAttribute('aria-label')).toBe('Workout in progress');
        expect(element.querySelector('.run-bar__title')!.textContent!.trim()).toBe('Sprints');
    });

    it('is not on the workout page itself', async () => {
        start(makeWorkout());

        await go('/workout');

        expect(bar()).toBeNull();
    });

    it('shows the step and its time, ticking down, in the step colour', () => {
        start(makeWorkout({ steps: [work(30, 'Plank')] }));
        expect(status()).toBe('Plank · 00:30');
        expect(bar()!.dataset['phase']).toBe('work');

        advance(5000);

        expect(status()).toBe('Plank · 00:25');
    });

    it('shows the reps on a rep step, and calls an unnamed step by its kind', () => {
        start(makeWorkout({ steps: [reps(20, 'Push-ups')] }));
        expect(status()).toBe('Push-ups · 20 reps');

        start(makeWorkout({ id: 'workout-2', steps: [work(10)] }));
        expect(status()).toBe('Timed · 00:10');
    });

    it('opens the workout from the rest of the bar', () => {
        start(makeWorkout());

        expect(element.querySelector('a')!.getAttribute('href')).toBe('/workout');
    });

    it('pauses and resumes the workout without leaving the page', () => {
        start(makeWorkout({ steps: [work(30, 'Plank')] }));

        button()!.click();
        fixture.detectChanges();

        expect(TestBed.inject(ActiveRunService).isPaused()).toBe(true);
        expect(button()!.getAttribute('aria-label')).toBe('Resume');
        expect(status()).toBe('Paused · Plank · 00:30');
        expect(bar()!.dataset['phase']).toBe('paused');

        button()!.click();
        fixture.detectChanges();

        expect(TestBed.inject(ActiveRunService).isPaused()).toBe(false);
        expect(button()!.getAttribute('aria-label')).toBe('Pause');
    });

    describe('swiped right', () => {
        const pointer = (
            type: string,
            x: number,
            y = 20,
            {
                target = bar()!,
                pointerType = 'touch',
            }: { target?: Element; pointerType?: string } = {}
        ) =>
            target.dispatchEvent(
                clock.stamp(
                    new PointerEvent(type, {
                        bubbles: true,
                        pointerId: 7,
                        isPrimary: true,
                        pointerType,
                        clientX: x,
                        clientY: y,
                    })
                )
            );

        let clock: GestureClock;
        /** Long enough that letting go after it reads as still, not as a flick. */
        const pause = () => clock.pass(150);

        beforeEach(() => {
            // Pointers made up by a test aren't active, so the browser won't capture them
            vi.spyOn(Element.prototype, 'setPointerCapture').mockImplementation(() => undefined);
            element.style.width = '400px';
            start(makeWorkout({ steps: [work(30, 'Plank')] }));
            clock = new GestureClock();
            // Its spring plays out in real time
            vi.useRealTimers();
        });

        it('follows the finger, showing End workout behind as much as it leaves', () => {
            pointer('pointerdown', 20);
            pointer('pointermove', 80);
            pointer('pointermove', 120);

            expect(bar()!.style.transform).toBe('translateX(100px)');
            expect(element.style.getPropertyValue('--reveal')).toBe('100px');
            expect(element.querySelector('.run-bar__end')!.textContent).toContain('End workout');
            expect(element.classList).not.toContain('run-bar--past-end');
        });

        it('ends the workout and opens its summary once let go past halfway', async () => {
            pointer('pointerdown', 20);
            pointer('pointermove', 120);
            pointer('pointermove', 280);
            expect(element.classList).toContain('run-bar--past-end');
            pause();
            pointer('pointerup', 280);

            await vi.waitFor(() => expect(TestBed.inject(Router).url).toBe('/workout'), {
                timeout: 3000,
            });
            expect(TestBed.inject(ActiveRunService).summaryOpen()).toBe(true);
        });

        it('keeps going when caught on its way off, from where it was seen', async () => {
            pointer('pointerdown', 20);
            pointer('pointermove', 120);
            pointer('pointermove', 280);
            pause();
            pointer('pointerup', 280);
            await new Promise((resolve) => setTimeout(resolve, 30));

            // Caught part of the way off: stopped there, not jumped off the end
            const seen = new DOMMatrix(getComputedStyle(bar()!).transform).m41;
            pointer('pointerdown', 300);
            expect(new DOMMatrix(bar()!.style.transform).m41).toBeCloseTo(seen, 0);
            expect(seen).toBeLessThan(400);
            // Let go short of halfway, it comes back, and the workout goes on
            pointer('pointermove', 330);
            pointer('pointermove', 100);
            pause();
            pointer('pointerup', 100);
            await new Promise((resolve) => setTimeout(resolve, 600));

            expect(TestBed.inject(ActiveRunService).summaryOpen()).toBe(false);
            expect(TestBed.inject(Router).url).toBe('/library');
        });

        it('springs back, still going, when let go short of halfway', async () => {
            pointer('pointerdown', 20);
            pointer('pointermove', 60);
            pointer('pointermove', 120);
            pause();
            pointer('pointerup', 120);
            await fixture.whenStable();

            expect(bar()!.style.transform).toBe('');
            expect(TestBed.inject(ActiveRunService).summaryOpen()).toBe(false);
            expect(TestBed.inject(Router).url).toBe('/library');
        });

        it("doesn't open the workout from the link a swipe starts on", async () => {
            const link = element.querySelector('a')!;
            pointer('pointerdown', 20, 20, { target: link });
            pointer('pointermove', 60);
            pointer('pointermove', 120);
            pause();
            pointer('pointerup', 120);
            const click = new MouseEvent('click', { bubbles: true, cancelable: true });
            link.dispatchEvent(click);

            expect(click.defaultPrevented).toBe(true);
            expect(TestBed.inject(Router).url).toBe('/library');
        });

        it('leaves a mouse drag and an up-and-down move alone, and resists a move left', () => {
            pointer('pointerdown', 20, 20, { pointerType: 'mouse' });
            pointer('pointermove', 300, 20, { pointerType: 'mouse' });
            pointer('pointerup', 300, 20, { pointerType: 'mouse' });
            expect(bar()!.style.transform).toBe('');

            pointer('pointerdown', 20, 20);
            pointer('pointermove', 25, 80);
            pointer('pointermove', 300, 80);
            pointer('pointerup', 300, 80);
            expect(bar()!.style.transform).toBe('');

            // Left of where it rests, it moves less than the finger, rather than stopping dead
            pointer('pointerdown', 200, 20);
            pointer('pointermove', 230);
            pointer('pointermove', 100);
            const moved = new DOMMatrix(bar()!.style.transform).m41;
            expect(moved).toBeLessThan(0);
            expect(moved).toBeGreaterThan(-100);
            pointer('pointercancel', 100);
            expect(bar()!.style.transform).toBe('');

            expect(TestBed.inject(ActiveRunService).summaryOpen()).toBe(false);
        });
    });

    it('says when it has finished, with no Pause, and opens its summary', () => {
        start(makeWorkout({ steps: [work(3)], repeats: 1 }));

        advance(4000);

        expect(status()).toBe('Finished: see how it went');
        expect(bar()!.dataset['phase']).toBe('finished');
        expect(button()).toBeNull();
    });
});
