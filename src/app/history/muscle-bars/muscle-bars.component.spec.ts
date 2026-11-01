import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MuscleBalance } from '../../models/muscle-balance';
import { MuscleBarsComponent } from './muscle-bars.component';

describe('MuscleBarsComponent', () => {
    let fixture: ComponentFixture<MuscleBarsComponent>;

    afterEach(() => fixture.destroy());

    async function create(balance: MuscleBalance[]) {
        fixture = TestBed.createComponent(MuscleBarsComponent);
        fixture.componentRef.setInput('balance', balance);
        fixture.componentRef.setInput('goal', 'muscle');
        fixture.detectChanges();
        await fixture.whenStable();
    }

    const aim = { low: 10, high: 20 };
    const row = (index: number) =>
        fixture.nativeElement.querySelectorAll('.bars__row')[index] as HTMLElement;
    /** Whether the low and high edges are notches in the fill rather than lines on the track. */
    const covered = (index: number) =>
        Array.from(row(index).querySelectorAll('.bars__edge')).map((edge) =>
            edge.classList.contains('bars__edge--covered')
        );
    /** The edges, in pixels from the track's left, and the fill's right end. */
    const placed = (index: number) => {
        const track = row(index).querySelector('.bars__track')!.getBoundingClientRect();
        const fill = row(index).querySelector('.bars__fill')!.getBoundingClientRect();
        const edges = Array.from(row(index).querySelectorAll('.bars__edge')).map((edge) => {
            const box = edge.getBoundingClientRect();
            return { from: box.left - track.left, to: box.right - track.left };
        });
        return { edges, fillEnd: fill.right - track.left };
    };

    it('draws the aim over the fill, so a bar past it still shows it', async () => {
        await create([
            { muscle: 'chest', sets: 4, aim, status: 'under' },
            { muscle: 'quads', sets: 15, aim, status: 'in-range' },
            { muscle: 'upper-back', sets: 22, aim, status: 'over' },
        ]);

        // Under: both edges on the track
        expect(covered(0)).toEqual([false, false]);
        // Within: the low edge cut into the fill, the high one on the track past it
        expect(covered(1)).toEqual([true, false]);
        // Over: both cut into the fill
        expect(covered(2)).toEqual([true, true]);

        // The edges sit after the fill, so they're drawn over it
        const track = row(2).querySelector('.bars__track')!;
        expect(track.lastElementChild!.classList).toContain('bars__edge');
        const { edges, fillEnd } = placed(2);
        expect(edges[1].to).toBeLessThan(fillEnd);
        expect(edges[0].to - edges[0].from).toBeCloseTo(2, 0);
    });

    it('lies just inside the band, so ending on an edge reads the same as its status', async () => {
        await create([
            { muscle: 'chest', sets: 10, aim, status: 'in-range' },
            { muscle: 'quads', sets: 20, aim, status: 'in-range' },
        ]);

        // Ending on the low edge leaves it on the track; on the high edge covers it
        expect(covered(0)).toEqual([false, false]);
        expect(covered(1)).toEqual([true, true]);
        const low = placed(0);
        expect(low.edges[0].from).toBeGreaterThanOrEqual(low.fillEnd - 0.5);
        const high = placed(1);
        expect(high.edges[1].to).toBeLessThanOrEqual(high.fillEnd + 0.5);
    });

    it('keeps the description of each bar as it was', async () => {
        await create([{ muscle: 'upper-back', sets: 22, aim, status: 'over' }]);

        expect(row(0).querySelector('.sr-only')!.textContent!.trim()).toBe('22 sets, over 20');
        expect(row(0).querySelector('.bars__track')!.getAttribute('aria-hidden')).toBe('true');
    });
});
