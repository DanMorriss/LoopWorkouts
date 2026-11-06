import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { asOneGroup, UNTIL_STOPPED, Workout } from '../../models/workout';
import { makeWorkout, reps, rest, work } from '../../shared/testing/make-workout';
import { WorkoutCardComponent } from './workout-card.component';
import { PageSlide } from '../../nav/page-slide';
import { fakeReducedMotion } from '../../shared/testing/fake-reduced-motion';

const sprints = makeWorkout({
    id: 'workout-7',
    title: 'Sprints',
    workMinutes: 1,
    workSeconds: 5,
    restSeconds: 20,
    repeats: 4,
});

// The card's selector is an attribute on <li>, so test it inside a list like the library does
@Component({
    imports: [WorkoutCardComponent],
    template: `
        <ul>
            <li
                appWorkoutCard
                [workout]="workout()"
                [menuOpen]="menuOpen()"
                [canMoveUp]="!first()"
                [canMoveDown]="!last()"
                (started)="events.push('started')"
                (menuToggled)="events.push('menuToggled')"
                (menuClosed)="events.push('menuClosed')"
                (editRequested)="events.push('editRequested')"
                (moveRequested)="events.push('moveRequested ' + $event)"
                (deleteRequested)="events.push('deleteRequested')"
            ></li>
        </ul>
    `,
})
class HostComponent {
    workout = signal(sprints);
    menuOpen = signal(false);
    first = signal(false);
    last = signal(false);
    events: string[] = [];
}

describe('WorkoutCardComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let host: HostComponent;

    beforeEach(() => {
        fixture = TestBed.createComponent(HostComponent);
        host = fixture.componentInstance;
        fixture.detectChanges();
    });

    const card = (): HTMLElement => fixture.nativeElement.querySelector('li');
    const el = (selector: string): HTMLElement => card().querySelector(selector)!;
    /** What screen readers hear about it, after its name. */
    const spoken = () =>
        card().querySelector('[id^="workout-summary-"]')!.textContent!.trim().replace(/\s+/g, ' ');
    const set = (changes: Partial<{ workout: Workout; menuOpen: boolean }>) => {
        if (changes.workout) host.workout.set(changes.workout);
        if (changes.menuOpen !== undefined) host.menuOpen.set(changes.menuOpen);
        fixture.detectChanges();
    };

    describe('pressing it', () => {
        it('slides in its details from anywhere but its buttons, a link to them', () => {
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});
            const open = el('.workout-card__open');

            expect(open.getAttribute('href')).toBe(`/library/${sprints.id}`);
            expect(open.getAttribute('aria-label')).toBe('Details of Sprints');
            open.click();

            expect(slide).toHaveBeenCalledWith(`/library/${sprints.id}`, 'in');
            expect(host.events).toEqual([]);
        });

        it('starts it with the play button, without opening its details', () => {
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});
            el('.workout-card__start').click();

            expect(host.events).toEqual(['started']);
            expect(slide).not.toHaveBeenCalled();
        });
    });

    describe('in the ready-made cards look', () => {
        const linked = (...exerciseIds: string[]): Workout => ({
            ...sprints,
            blocks: exerciseIds.map((exerciseId, i) => ({
                kind: 'group',
                rounds: 3,
                restSeconds: 60,
                steps: [{ kind: 'reps', reps: 10, name: `Exercise ${i}`, exerciseId }],
            })),
        });
        const texts = (selector: string) =>
            Array.from(card().querySelectorAll(selector), (node) =>
                node.textContent!.replace(/\s+/g, ' ').trim()
            );

        it('counts its exercises, or its steps with none named', () => {
            set({ workout: linked('builtin:plank') });
            expect(texts('.workout-card__count')).toEqual(['1 exercise']);

            set({ workout: linked('builtin:plank', 'builtin:back-squat') });
            expect(texts('.workout-card__count')).toEqual(['2 exercises']);

            set({ workout: sprints });
            expect(texts('.workout-card__count')).toEqual(['2 steps']);
        });

        it('names its main muscles and what it needs, for the eye and for screen readers', () => {
            set({ workout: linked('builtin:plank') });

            expect(texts('.showcase-muscle')).toContain('Abs');
            expect(texts('.showcase-tag')).toEqual(['No equipment']);
            expect(spoken()).toContain('. Works ');
            expect(spoken()).toContain('Abs');
            expect(spoken()).toContain('. Needs No equipment');
        });

        it('says nothing of muscles or equipment with no exercise to go on', () => {
            set({ workout: sprints });

            expect(card().querySelector('.workout-card__works')).toBeNull();
            expect(card().querySelector('.showcase-tag')).toBeNull();
            expect(spoken()).not.toContain('Works');
            expect(card().querySelector('.workout-card__start')).not.toBeNull();
        });
    });

    it('shows a time limit in place of the rounds', () => {
        set({ workout: { ...sprints, repeats: UNTIL_STOPPED, timeLimitSeconds: 1200 } });

        expect(el('.workout-card__summary').textContent).toContain('01:05 - 00:20 in 20:00');
        expect(spoken()).toBe('Timed 01:05, rest 00:20, as many rounds as possible in 20:00');
    });

    it('is a list item showing the title and padded times', () => {
        expect(card().classList).toContain('workout-card');
        expect(el('.workout-card__title').textContent?.trim()).toBe('Sprints');
        expect(el('.workout-card__summary').textContent).toContain('01:05 - 00:20 x 4');
        expect(spoken()).toBe('Timed 01:05, rest 00:20, repeated 4 times');
    });

    it('shows ∞ for a workout that runs until stopped', () => {
        set({ workout: { ...sprints, repeats: UNTIL_STOPPED } });

        expect(el('.workout-card__summary').textContent).toContain('01:05 - 00:20 x ∞');
        expect(spoken()).toBe('Timed 01:05, rest 00:20, repeated until stopped');
    });

    it('sums up an unnamed round of several steps by their count and total time', () => {
        set({ workout: { ...sprints, blocks: asOneGroup([work(30), work(45), rest(20)]) } });

        expect(el('.workout-card__summary').textContent).toContain('3 steps · 01:35 x 4');
        expect(spoken()).toBe('3 steps, 01:35 a round, repeated 4 times');
    });

    it('adds "+ reps" to the time of an unnamed round with rep steps', () => {
        set({ workout: { ...sprints, blocks: asOneGroup([work(30), reps(20), rest(20)]) } });

        expect(el('.workout-card__summary').textContent).toContain('3 steps · 00:50 + reps x 4');
        expect(spoken()).toBe('3 steps, 00:50 a round plus reps, repeated 4 times');
    });

    it('lists the named exercises in the round when the workout has them', () => {
        set({
            workout: {
                ...sprints,
                blocks: asOneGroup([
                    work(30, 'Squats'),
                    reps(20, 'Bench press'),
                    work(25, 'Deadlifts'),
                    rest(20),
                ]),
            },
        });

        expect(el('.workout-card__summary').textContent).toContain(
            'Squats, Bench press + 1 more x 4'
        );
        expect(spoken()).toBe('Squats, Bench press + 1 more, repeated 4 times');
    });

    it('says "reps" alone for a round with no timed steps', () => {
        set({ workout: { ...sprints, blocks: asOneGroup([reps(10)]) } });

        expect(el('.workout-card__summary').textContent).toContain('1 step · reps x 4');
        expect(spoken()).toBe('1 step, all reps, repeated 4 times');
    });

    it('shows a workout with no rest as rest 00:00, as before', () => {
        set({ workout: { ...sprints, blocks: asOneGroup([work(65)]) } });

        expect(el('.workout-card__summary').textContent).toContain('01:05 - 00:00 x 4');
    });

    it('names an untitled workout generically', () => {
        set({ workout: { ...sprints, title: '  ' } });

        expect(el('.workout-card__title').textContent?.trim()).toBe('Untitled workout');
        expect(el('.workout-card__start').getAttribute('aria-label')).toBe('Start workout');
    });

    it('starts the workout in one press of the card, which says what it is', () => {
        el('.workout-card__start').click();

        expect(host.events).toEqual(['started']);
        expect(el('.workout-card__start').getAttribute('aria-label')).toBe('Start Sprints');
        expect(spoken()).toBe('Timed 01:05, rest 00:20, repeated 4 times');
    });

    it('toggles its options, which offer edit and delete, without starting', () => {
        el('.workout-card__action--menu').click();
        expect(host.events).toEqual(['menuToggled']);
        expect(el('.workout-card__action--menu').getAttribute('aria-expanded')).toBe('false');

        set({ menuOpen: true });
        expect(card().classList).toContain('workout-card--menu-open');
        expect(el('.workout-card__action--menu').getAttribute('aria-expanded')).toBe('true');
        expect(card().querySelector('.workout-card__menu-item--details')).toBeNull();
        el('.workout-card__menu-item--edit').click();
        el('.workout-card__menu-item--danger').click();

        expect(host.events).toEqual(['menuToggled', 'editRequested', 'deleteRequested']);
    });

    it('offers moving up and down in its options', () => {
        set({ menuOpen: true });

        el('.workout-card__menu-item--up').click();
        el('.workout-card__menu-item--down').click();

        expect(host.events).toEqual(['moveRequested -1', 'moveRequested 1']);
    });

    it("can't move up when it's first, or down when it's last", () => {
        host.first.set(true);
        set({ menuOpen: true });
        expect(card().querySelector('.workout-card__menu-item--up')).toBeNull();
        expect(card().querySelector('.workout-card__menu-item--down')).not.toBeNull();

        host.first.set(false);
        host.last.set(true);
        fixture.detectChanges();
        expect(card().querySelector('.workout-card__menu-item--up')).not.toBeNull();
        expect(card().querySelector('.workout-card__menu-item--down')).toBeNull();
    });

    it('asks to close its options on Escape', () => {
        set({ menuOpen: true });

        el('.workout-card__menu-item--edit').dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );

        expect(host.events).toEqual(['menuClosed']);
    });

    describe('gestures', () => {
        const face = () => el('.workout-card__face');
        const offset = () => new DOMMatrix(getComputedStyle(face()).transform).m41;

        function pointer(type: string, x: number, y = 100) {
            face().dispatchEvent(
                new PointerEvent(type, {
                    pointerId: 1,
                    pointerType: 'touch',
                    clientX: x,
                    clientY: y,
                    bubbles: true,
                })
            );
        }

        /** Presses at x = 300, moves `dx` across (and `dy` down), and maybe lets go. */
        function swipe(dx: number, { dy = 0, letGo = true } = {}) {
            pointer('pointerdown', 300);
            pointer('pointermove', 300 + dx / 2, 100 + dy / 2);
            pointer('pointermove', 300 + dx, 100 + dy);
            if (letGo) {
                pointer('pointerup', 300 + dx, 100 + dy);
            }
            fixture.detectChanges();
        }

        it('follows a swipe to the left, showing Delete behind as it goes', () => {
            swipe(-80, { letGo: false });

            expect(offset()).toBe(-80);
            expect(card().style.getPropertyValue('--reveal')).toBe('80px');
            expect(card().classList).not.toContain('workout-card--past-delete');
        });

        it('says when letting go would delete it, once past halfway', () => {
            swipe(-card().offsetWidth * 0.6, { letGo: false });

            expect(card().classList).toContain('workout-card--past-delete');
        });

        it('deletes once swiped past halfway and let go', async () => {
            fakeReducedMotion(true);
            swipe(-card().offsetWidth * 0.6);

            await vi.waitFor(() => expect(host.events).toEqual(['deleteRequested']));
        });

        it('deletes on a short, fast flick, by where it would carry', async () => {
            fakeReducedMotion(true);
            // Moves this close together read as a fast flick
            swipe(-60);

            await vi.waitFor(() => expect(host.events).toEqual(['deleteRequested']));
        });

        it('opens nothing after a swipe', async () => {
            fakeReducedMotion(true);
            const slide = vi
                .spyOn(TestBed.inject(PageSlide), 'navigate')
                .mockImplementation(() => {});
            swipe(-60, { letGo: false });
            await new Promise((resolve) => setTimeout(resolve, 120));
            pointer('pointerup', 240);
            el('.workout-card__open').click();

            expect(slide).not.toHaveBeenCalled();
        });

        it('springs back, without deleting or starting, when let go short of halfway', async () => {
            swipe(-60, { letGo: false });
            // A pause before letting go, so it's let go slowly rather than flicked
            await new Promise((resolve) => setTimeout(resolve, 120));
            pointer('pointerup', 240);
            el('.workout-card__start').click();

            const [spring] = face().getAnimations();
            const [from, to] = (spring.effect as KeyframeEffect).getKeyframes();
            expect(new DOMMatrix(String(from['transform'])).m41).toBe(-60);
            expect(new DOMMatrix(String(to['transform'])).m41).toBe(0);
            expect(host.events).toEqual([]);
        });

        it('resists a swipe to the right, where there is nothing to show', () => {
            swipe(200, { letGo: false });

            expect(offset()).toBeGreaterThan(0);
            expect(offset()).toBeLessThan(200);
        });

        it('leaves up and down to the page, still a tap away from starting', () => {
            swipe(4, { dy: 80 });

            expect(offset()).toBe(0);
            el('.workout-card__start').click();
            expect(host.events).toEqual(['started']);
        });

        it('lifts when held, and opens its options when let go of where it is, without starting', () => {
            vi.useFakeTimers();
            try {
                pointer('pointerdown', 300);
                vi.advanceTimersByTime(500);
                fixture.detectChanges();
                expect(card().classList).toContain('workout-card--lifted');

                pointer('pointerup', 300);
                fixture.detectChanges();
                el('.workout-card__start').click();

                expect(card().classList).not.toContain('workout-card--lifted');
                expect(host.events).toEqual(['menuToggled']);
            } finally {
                vi.useRealTimers();
            }
        });

        it("doesn't open its options when held and moved, which drags it instead", () => {
            vi.useFakeTimers();
            try {
                pointer('pointerdown', 300);
                vi.advanceTimersByTime(500);
                pointer('pointermove', 300, 140);
                pointer('pointerup', 300, 140);
                fixture.detectChanges();
                el('.workout-card__start').click();

                expect(offset()).toBe(0);
                expect(host.events).toEqual([]);
            } finally {
                vi.useRealTimers();
            }
        });

        it('leaves a long press on a touch screen to the hold, not the right-click', () => {
            const event = new PointerEvent('contextmenu', {
                pointerType: 'touch',
                bubbles: true,
                cancelable: true,
            });
            el('.workout-card__start').dispatchEvent(event);

            expect(event.defaultPrevented).toBe(true);
            expect(host.events).toEqual([]);
        });

        it("doesn't open its options if let go before the hold", () => {
            vi.useFakeTimers();
            try {
                pointer('pointerdown', 300);
                vi.advanceTimersByTime(200);
                pointer('pointerup', 300);
                vi.advanceTimersByTime(500);

                expect(host.events).toEqual([]);
            } finally {
                vi.useRealTimers();
            }
        });

        it('opens its options on a right-click, in place of the browser menu', () => {
            const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
            el('.workout-card__start').dispatchEvent(event);

            expect(event.defaultPrevented).toBe(true);
            expect(host.events).toEqual(['menuToggled']);
        });
    });
});
