import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MuscleBalance } from '../../models/muscle-balance';
import { fakeReducedMotion } from '../../shared/testing/fake-reduced-motion';
import { MuscleBarsComponent } from './muscle-bars.component';

describe('MuscleBarsComponent', () => {
    let fixture: ComponentFixture<MuscleBarsComponent>;

    afterEach(() => {
        fixture.destroy();
        vi.restoreAllMocks();
    });

    /** With reduced motion, so the bars are at their length straight away. */
    async function create(balance: MuscleBalance[], reduced = true) {
        fakeReducedMotion(reduced);
        fixture = TestBed.createComponent(MuscleBarsComponent);
        fixture.componentRef.setInput('balance', balance);
        fixture.detectChanges();
        await fixture.whenStable();
    }

    const aim = 10;
    const row = (index: number) =>
        fixture.nativeElement.querySelectorAll('.bars__row')[index] as HTMLElement;
    /** Whether the aim is a notch in the fill rather than a line on the track. */
    const covered = (index: number) =>
        row(index).querySelector('.bars__aim')!.classList.contains('bars__aim--covered');
    /** The aim's line, in pixels from the track's left, and the fill's right end. */
    const placed = (index: number) => {
        const track = row(index).querySelector('.bars__track')!.getBoundingClientRect();
        const fill = row(index).querySelector('.bars__fill')!.getBoundingClientRect();
        const line = row(index).querySelector('.bars__aim')!.getBoundingClientRect();
        return {
            line: { from: line.left - track.left, to: line.right - track.left },
            fillEnd: fill.right - track.left,
        };
    };

    it('draws the aim over the fill, so a bar past it still shows it', async () => {
        await create([
            { muscle: 'upper-back', sets: 40, aim, status: 'reached' },
            { muscle: 'quads', sets: 15, aim, status: 'reached' },
            { muscle: 'chest', sets: 4, aim, status: 'under' },
        ]);

        expect(covered(0)).toBe(true);
        expect(covered(1)).toBe(true);
        expect(covered(2)).toBe(false);

        // The line sits after the fill, so it's drawn over it
        const track = row(1).querySelector('.bars__track')!;
        expect(track.lastElementChild!.classList).toContain('bars__aim');
        const { line, fillEnd } = placed(1);
        expect(line.to).toBeLessThan(fillEnd);
        expect(line.to - line.from).toBeCloseTo(2, 0);
    });

    it('has no most: a bar far past the aim looks like any other that reached it', async () => {
        await create([
            { muscle: 'upper-back', sets: 40, aim, status: 'reached' },
            { muscle: 'quads', sets: 12, aim, status: 'reached' },
        ]);

        expect(row(0).className).toBe(row(1).className);
        expect(row(0).querySelectorAll('.bars__aim')).toHaveLength(1);
    });

    it('lies just past the aim, so ending on it leaves it on the track', async () => {
        await create([{ muscle: 'chest', sets: 10, aim, status: 'reached' }]);

        expect(covered(0)).toBe(false);
        const { line, fillEnd } = placed(0);
        expect(line.from).toBeGreaterThanOrEqual(fillEnd - 0.5);
    });

    it('describes each bar against its aim', async () => {
        await create([
            { muscle: 'upper-back', sets: 22, aim, status: 'reached' },
            { muscle: 'chest', sets: 1, aim, status: 'under' },
        ]);

        expect(row(0).querySelector('.sr-only')!.textContent!.trim()).toBe('22 sets, 10 reached');
        expect(row(1).querySelector('.sr-only')!.textContent!.trim()).toBe('1 set, under 10');
        expect(row(0).querySelector('.bars__track')!.getAttribute('aria-hidden')).toBe('true');
    });

    it('grows the bars in once they come into view, unless motion is reduced', async () => {
        const balance: MuscleBalance[] = [{ muscle: 'chest', sets: 10, aim, status: 'reached' }];
        /** How far the fill shows: its length once grown, nothing while it waits off the track. */
        const fill = () =>
            fixture.nativeElement.querySelector('.bars')!.classList.contains('bars--grown')
                ? row(0).querySelector<HTMLElement>('.bars__fill')!.style.width
                : '0%';

        // Out of view, they wait at nothing
        const spacer = document.body.appendChild(document.createElement('div'));
        spacer.style.height = '3000px';
        await create(balance, false);
        document.body.insertBefore(spacer, fixture.nativeElement);
        await new Promise((done) => setTimeout(done, 100));
        fixture.detectChanges();
        expect(fill()).toBe('0%');

        // Scrolled to, they grow to their length
        (fixture.nativeElement as HTMLElement).scrollIntoView();
        await vi.waitFor(() => {
            fixture.detectChanges();
            expect(fill()).toBe('50%');
        });
        spacer.remove();
        window.scrollTo(0, 0);
    });

    it('makes each row a toggle for its muscle, pressed while picked', async () => {
        await create([
            { muscle: 'chest', sets: 4, aim, status: 'under' },
            { muscle: 'quads', sets: 12, aim, status: 'reached' },
        ]);
        const tapped: string[] = [];
        fixture.componentInstance.muscleTapped.subscribe((muscle) => tapped.push(muscle));
        fixture.componentRef.setInput('selected', 'quads');
        fixture.detectChanges();

        const picks = Array.from(
            fixture.nativeElement.querySelectorAll('.bars__pick') as NodeListOf<HTMLElement>
        );
        expect(picks.map((pick) => pick.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
        picks[0].click();
        expect(tapped).toEqual(['chest']);
        expect(picks[0].getBoundingClientRect().height).toBeGreaterThanOrEqual(36);
    });
});
