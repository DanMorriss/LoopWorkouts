import { ComponentFixture, TestBed } from '@angular/core/testing';
import { userEvent } from 'vitest/browser';
import { MuscleGroup } from '../../../models/exercise';
import { SettingsStore } from '../../state/settings-store.service';
import { BodyMapComponent } from './body-map.component';
import { BODY_FIGURES } from './body-shapes';

describe('BodyMapComponent', () => {
    let fixture: ComponentFixture<BodyMapComponent>;

    function create(main: MuscleGroup[], supporting: MuscleGroup[] = []) {
        fixture = TestBed.createComponent(BodyMapComponent);
        fixture.componentRef.setInput('main', main);
        fixture.componentRef.setInput('supporting', supporting);
        fixture.detectChanges();
    }

    beforeEach(() => localStorage.clear());
    afterEach(() => {
        fixture.destroy();
        localStorage.clear();
    });

    const el = (): HTMLElement => fixture.nativeElement;
    const labels = (kind: string) =>
        Array.from(el().querySelectorAll(`.body-map__label--${kind}`)).map((l) =>
            l.textContent!.trim()
        );
    const shaded = (kind: string) => el().querySelectorAll(`.body-map__shape--${kind}`).length;
    /** How many paths the figure has for these muscles, front and back together. */
    const pathsFor = (muscles: MuscleGroup[], figure: 'male' | 'female' = 'male') =>
        (['front', 'back'] as const)
            .flatMap((side) => BODY_FIGURES[figure][side].shapes)
            .filter((shape) => shape.muscle !== null && muscles.includes(shape.muscle))
            .reduce((total, shape) => total + shape.paths.length, 0);

    it('draws a front and a back figure', () => {
        create([]);

        const captions = Array.from(el().querySelectorAll('figcaption')).map((c) => c.textContent);
        expect(captions).toEqual(['Front', 'Back']);
        expect(el().querySelectorAll('svg')).toHaveLength(2);
    });

    it('shades the main muscles, then the supporting ones, and leaves the rest unworked', () => {
        create(['quads', 'glutes'], ['hamstrings', 'lower-back']);

        expect(shaded('main')).toBe(pathsFor(['quads', 'glutes']));
        expect(shaded('supporting')).toBe(pathsFor(['hamstrings', 'lower-back']));
        expect(shaded('main')).toBeGreaterThan(0);
        expect(shaded('supporting')).toBeGreaterThan(0);
        expect(shaded('idle')).toBeGreaterThan(0);
        // Head, hands, feet and the like are drawn but never shaded
        expect(shaded('other')).toBeGreaterThan(0);
    });

    it('lists the muscles underneath, as the key and the words for the figure', () => {
        create(['quads', 'glutes'], ['hamstrings', 'lower-back']);

        expect(labels('main')).toEqual(['Quads', 'Glutes']);
        expect(labels('supporting')).toEqual(['Hamstrings', 'Lower back']);
    });

    it('hides the drawing from screen readers when not tappable, and labels each list', () => {
        create(['chest'], ['triceps']);

        expect(el().querySelector('.body-map__figures')!.getAttribute('aria-hidden')).toBe('true');
        for (const list of Array.from(el().querySelectorAll('ul'))) {
            const heading = el().querySelector(`#${list.getAttribute('aria-labelledby')}`);
            expect(['Main', 'Supporting']).toContain(heading?.textContent);
        }
    });

    it('counts a muscle listed as both main and supporting as main', () => {
        create(['quads'], ['quads', 'glutes']);

        expect(labels('main')).toEqual(['Quads']);
        expect(labels('supporting')).toEqual(['Glutes']);
        expect(shaded('main')).toBe(pathsFor(['quads']));
    });

    it('leaves out a list with nothing in it', () => {
        create(['abs']);

        expect(el().textContent).not.toContain('Supporting');
    });

    it('says so when there are no muscles to show', () => {
        create([]);

        expect(el().textContent).toContain('No muscles listed.');
        expect(shaded('main') + shaded('supporting')).toBe(0);
    });

    it('says what it is given instead, on a map for picking muscles', () => {
        create([]);
        fixture.componentRef.setInput('emptyText', 'Tap a muscle to find exercises for it.');
        fixture.detectChanges();

        expect(el().textContent).toContain('Tap a muscle to find exercises for it.');
        expect(el().textContent).not.toContain('No muscles listed.');
    });

    // Upstream has no abductors, so its upper glute, the gluteus medius, stands in for them
    it('shades the abductors on the back, apart from the glutes', () => {
        create(['abductors']);

        const back = el().querySelectorAll('svg')[1];
        expect(shaded('main')).toBe(2);
        expect(back.querySelectorAll('.body-map__shape--main').length).toBe(2);
        expect(labels('main')).toEqual(['Abductors']);
    });

    it('draws the figure chosen in settings', () => {
        TestBed.inject(SettingsStore).update({ bodyFigure: 'female' });
        create(['chest']);

        expect(el().querySelector('svg')!.getAttribute('viewBox')).toBe(
            BODY_FIGURES.female.front.viewBox
        );
        expect(shaded('main')).toBe(pathsFor(['chest'], 'female'));
    });

    it('has a shape for every muscle group, on both figures', () => {
        const muscles = new Set(
            (['male', 'female'] as const).flatMap((figure) =>
                (['front', 'back'] as const).flatMap((side) =>
                    BODY_FIGURES[figure][side].shapes.map((shape) => shape.muscle)
                )
            )
        );

        expect([...muscles].filter((m) => m !== null).sort()).toEqual(
            [
                'abductors',
                'abs',
                'adductors',
                'biceps',
                'calves',
                'chest',
                'forearms',
                'glutes',
                'hamstrings',
                'lower-back',
                'obliques',
                'quads',
                'shoulders',
                'traps',
                'triceps',
                'upper-back',
            ].sort()
        );
    });

    it('says which muscle was tapped, when tappable', () => {
        create([]);
        const tapped: MuscleGroup[] = [];
        fixture.componentInstance.muscleTapped.subscribe((m) => tapped.push(m));
        const quads = () => {
            const index = BODY_FIGURES.male.front.shapes.findIndex((s) => s.muscle === 'quads');
            const before = BODY_FIGURES.male.front.shapes
                .slice(0, index)
                .reduce((total, shape) => total + shape.paths.length, 0);
            return el().querySelectorAll('.body-map__shape')[before] as SVGPathElement;
        };

        quads().dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(tapped).toEqual([]);

        fixture.componentRef.setInput('tappable', true);
        fixture.detectChanges();
        quads().dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(tapped).toEqual(['quads']);
        expect(quads().classList).toContain('body-map__shape--tappable');
    });

    it('keeps the drawing hidden when only tappable, as the chips do the same', () => {
        create(['quads']);
        fixture.componentRef.setInput('tappable', true);
        fixture.detectChanges();

        expect(el().querySelector('.body-map__figures')!.getAttribute('aria-hidden')).toBe('true');
        expect(el().querySelector('[role="button"]')).toBeNull();
        expect(el().querySelector('[tabindex]')).toBeNull();
    });

    it('makes each muscle one labelled toggle, with toggles on', () => {
        create(['quads'], ['glutes']);
        fixture.componentRef.setInput('tappable', true);
        fixture.componentRef.setInput('toggles', true);
        fixture.detectChanges();

        const toggle = (name: string) =>
            el().querySelector(`g[aria-label="${name}"]`) as SVGGElement;
        expect(el().querySelector('.body-map__figures')!.getAttribute('aria-hidden')).toBeNull();
        expect(toggle('Quads').getAttribute('role')).toBe('button');
        expect(toggle('Quads').getAttribute('tabindex')).toBe('0');
        expect(toggle('Quads').getAttribute('aria-pressed')).toBe('true');
        expect(toggle('Glutes').getAttribute('aria-pressed')).toBe('false');
        // One stop per shape, however many paths it's drawn with
        const shapes = (['front', 'back'] as const)
            .flatMap((side) => BODY_FIGURES.male[side].shapes)
            .filter((shape) => shape.muscle !== null).length;
        expect(el().querySelectorAll('[tabindex="0"]').length).toBe(shapes);
        expect(el().querySelectorAll('path[tabindex]').length).toBe(0);
    });

    it("isn't a stop for the keyboard unless its muscles are toggles", async () => {
        create(['quads']);
        fixture.componentRef.setInput('tappable', true);
        fixture.detectChanges();
        const before = document.createElement('button');
        document.body.prepend(before);
        before.focus();

        await userEvent.tab();
        before.remove();

        expect(el().contains(document.activeElement)).toBe(false);
    });

    it('rings a toggle while it has focus', () => {
        create([]);
        fixture.componentRef.setInput('tappable', true);
        fixture.componentRef.setInput('toggles', true);
        fixture.detectChanges();
        const quads = el().querySelector<SVGGElement>('g[aria-label="Quads"]')!;
        const ringed = () => el().querySelectorAll('.body-map__shape--hovered').length;

        quads.focus();
        fixture.detectChanges();
        expect(ringed()).toBe(pathsFor(['quads']));

        quads.blur();
        fixture.detectChanges();
        expect(ringed()).toBe(0);
    });

    it('toggles a muscle with Enter or Space, with toggles on', () => {
        create([]);
        const tapped: MuscleGroup[] = [];
        fixture.componentInstance.muscleTapped.subscribe((m) => tapped.push(m));
        fixture.componentRef.setInput('tappable', true);
        fixture.componentRef.setInput('toggles', true);
        fixture.detectChanges();
        const quads = el().querySelector('g[aria-label="Quads"]')!;

        quads.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        quads.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
        quads.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

        expect(tapped).toEqual(['quads', 'quads']);
    });

    it('highlights every path in a muscle group when one of its paths is hovered', () => {
        create(['abs']);
        fixture.componentRef.setInput('tappable', true);
        fixture.detectChanges();

        const absShapeIndex = BODY_FIGURES.male.front.shapes.findIndex((s) => s.muscle === 'abs');
        const absPathsBefore = BODY_FIGURES.male.front.shapes
            .slice(0, absShapeIndex)
            .reduce((total, shape) => total + shape.paths.length, 0);
        const absPath = el().querySelectorAll('.body-map__shape')[absPathsBefore] as SVGPathElement;

        // Hovering a muscle is hovering its group of paths
        absPath.parentElement!.dispatchEvent(
            new PointerEvent('pointerenter', { pointerType: 'mouse' })
        );
        fixture.detectChanges();

        const highlighted = el().querySelectorAll('.body-map__shape--hovered').length;
        expect(highlighted).toBe(pathsFor(['abs']));
    });

    it('rings a muscle the moment a finger presses it, and not after the tap', () => {
        create(['abs']);
        fixture.componentRef.setInput('tappable', true);
        fixture.detectChanges();
        const absShapeIndex = BODY_FIGURES.male.front.shapes.findIndex((s) => s.muscle === 'abs');
        const absPathsBefore = BODY_FIGURES.male.front.shapes
            .slice(0, absShapeIndex)
            .reduce((total, shape) => total + shape.paths.length, 0);
        const abs = el().querySelectorAll('.body-map__shape')[absPathsBefore].parentElement!;
        const ringed = () => el().querySelectorAll('.body-map__shape--hovered').length;

        // A finger "entering" it as it taps doesn't count as hovering
        abs.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
        abs.dispatchEvent(
            new PointerEvent('pointerdown', { pointerType: 'touch', isPrimary: true })
        );
        fixture.detectChanges();
        expect(ringed()).toBe(pathsFor(['abs']));

        abs.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch' }));
        fixture.detectChanges();
        expect(ringed()).toBe(0);
    });

    it('can remove a listed muscle when removable labels are enabled', () => {
        create(['quads'], ['hamstrings']);
        const removed: MuscleGroup[] = [];
        fixture.componentInstance.muscleCleared.subscribe((muscle) => removed.push(muscle));

        fixture.componentRef.setInput('removableLabels', true);
        fixture.detectChanges();

        const removeQuads = el().querySelector(
            'button[aria-label="Remove Quads"]'
        ) as HTMLButtonElement;
        removeQuads.click();

        expect(removed).toEqual(['quads']);
    });

    it('maps each shape path to exactly one muscle group id (no overlaps)', () => {
        const labels = new Set<string>();

        for (const figure of ['male', 'female'] as const) {
            for (const side of ['front', 'back'] as const) {
                for (const shape of BODY_FIGURES[figure][side].shapes) {
                    if (shape.muscle === null) {
                        continue;
                    }
                    for (const path of shape.paths) {
                        const key = `${figure}:${side}:${path}`;
                        expect(labels.has(key)).toBe(false);
                        labels.add(key);
                    }
                }
            }
        }
    });

    it('rings the selected muscle and presses it in the list, whose muscles are toggles', () => {
        create(['quads'], ['glutes']);
        fixture.componentRef.setInput('selectable', true);
        fixture.componentRef.setInput('selected', 'glutes');
        fixture.detectChanges();
        const tapped: MuscleGroup[] = [];
        fixture.componentInstance.muscleTapped.subscribe((muscle) => tapped.push(muscle));

        expect(el().querySelectorAll('.body-map__shape--selected')).toHaveLength(
            pathsFor(['glutes'])
        );
        const picks = Array.from(el().querySelectorAll<HTMLButtonElement>('.body-map__pick'));
        expect(picks.map((pick) => [pick.textContent!.trim(), pick.ariaPressed])).toEqual([
            ['Quads', 'false'],
            ['Glutes', 'true'],
        ]);
        picks[0].click();
        expect(tapped).toEqual(['quads']);
    });

    it('leaves the list out with figureOnly', () => {
        create(['quads'], ['glutes']);
        fixture.componentRef.setInput('figureOnly', true);
        fixture.detectChanges();

        expect(el().querySelectorAll('.body-map__label')).toHaveLength(0);
        expect(el().querySelectorAll('svg')).toHaveLength(2);
    });
});
