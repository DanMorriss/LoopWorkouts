import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BackupService, ImportCounts } from '../../shared/backup/backup.service';
import { planPrompt } from '../../shared/backup/plan-prompt';
import { UndoService } from '../../shared/undo/undo.service';
import { importLink, importMessage, YourDataComponent } from './your-data.component';

// An import that changed nothing, to build results from
const NOTHING: ImportCounts = {
    workoutsAdded: 0,
    workoutsUpdated: 0,
    entriesAdded: 0,
    entriesUpdated: 0,
    exercisesAdded: 0,
    exercisesUpdated: 0,
    removed: 0,
    skipped: 0,
};

describe('YourDataComponent', () => {
    let fixture: ComponentFixture<YourDataComponent>;

    function create(signedIn = false) {
        fixture = TestBed.createComponent(YourDataComponent);
        fixture.componentRef.setInput('signedIn', signedIn);
        fixture.detectChanges();
    }

    beforeEach(() => localStorage.clear());
    afterEach(() => {
        fixture.destroy();
        localStorage.clear();
    });

    const text = () => (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');

    it('says clearing the device signs it out, only while signed in', () => {
        create();
        expect(text()).toContain('Clear your workouts, history and settings from it.');
        expect(text()).not.toContain('That signs this device out too');
        fixture.destroy();

        create(true);
        expect(text()).toContain('That signs this device out too');
        expect(fixture.nativeElement.querySelector('app-clear-device')).not.toBeNull();
    });

    describe('backup', () => {
        const button = (label: string) =>
            Array.from(
                fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
            ).find((b) => b.textContent!.trim() === label)!;
        const fileInput = () =>
            fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
        const status = () =>
            (
                fixture.nativeElement.querySelector('[role="status"]') as HTMLElement
            ).textContent!.trim();

        it('exports a backup and says what it was saved as', async () => {
            create();
            const exportSpy = vi
                .spyOn(TestBed.inject(BackupService), 'export')
                .mockResolvedValue('loop-workouts-2026-10-21.json');

            button('Export backup').click();
            await fixture.whenStable();
            fixture.detectChanges();

            expect(exportSpy).toHaveBeenCalledTimes(1);
            expect(status()).toBe('Backup saved as loop-workouts-2026-10-21.json.');
        });

        it('opens the file picker from Import backup, keeping the input itself out of reach', () => {
            create();
            const click = vi.spyOn(fileInput(), 'click').mockImplementation(() => {});

            button('Import backup').click();

            expect(click).toHaveBeenCalledTimes(1);
            expect(fileInput().tabIndex).toBe(-1);
            expect(fileInput().getAttribute('aria-hidden')).toBe('true');
        });

        it('imports the chosen file and says what was added', async () => {
            create();
            const importSpy = vi
                .spyOn(TestBed.inject(BackupService), 'import')
                .mockResolvedValue({ ...NOTHING, ok: true, workoutsAdded: 2, entriesAdded: 14 });
            const file = new File(['{}'], 'backup.json');
            Object.defineProperty(fileInput(), 'files', { value: [file], configurable: true });

            fileInput().dispatchEvent(new Event('change'));
            await fixture.whenStable();
            fixture.detectChanges();

            expect(importSpy).toHaveBeenCalledWith(file);
            expect(status()).toBe('Added 2 workouts and 14 history entries.');
        });

        it('shows what an import did in the bar at the bottom too, without reading it out twice', async () => {
            create();
            vi.spyOn(TestBed.inject(BackupService), 'import').mockResolvedValue({
                ...NOTHING,
                ok: true,
                workoutsAdded: 2,
            });
            const file = new File(['{}'], 'backup.json');
            Object.defineProperty(fileInput(), 'files', { value: [file], configurable: true });

            fileInput().dispatchEvent(new Event('change'));
            await fixture.whenStable();

            expect(TestBed.inject(UndoService).offer()).toMatchObject({
                message: 'Added 2 workouts.',
                quiet: true,
                link: { label: 'View library', url: '/library' },
            });
        });

        it('copies the prompt for bringing in a plan with AI, and says so', async () => {
            create();
            const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

            button('Copy AI prompt').click();
            await fixture.whenStable();
            fixture.detectChanges();

            expect(writeText).toHaveBeenCalledWith(planPrompt());
            expect(status()).toBe('Prompt copied. Paste it into an AI chat, then add your plan.');
        });

        it("says when the prompt couldn't be copied", async () => {
            create();
            vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));

            button('Copy AI prompt').click();
            await fixture.whenStable();
            fixture.detectChanges();

            expect(status()).toBe("The prompt couldn't be copied. Try again, or another browser.");
        });
    });

    describe('importLink', () => {
        it('goes to where the import brought things in, workouts first', () => {
            expect(
                importLink({ ...NOTHING, ok: true, workoutsUpdated: 1, entriesAdded: 3 })
            ).toEqual({
                label: 'View library',
                url: '/library',
            });
            expect(
                importLink({ ...NOTHING, ok: true, exercisesAdded: 1, entriesAdded: 3 })
            ).toEqual({
                label: 'View exercises',
                url: '/exercises',
            });
            expect(importLink({ ...NOTHING, ok: true, entriesUpdated: 2 })).toEqual({
                label: 'View history',
                url: '/history',
            });
        });

        it('has nowhere to go when nothing came in, or the file was no good', () => {
            expect(importLink({ ...NOTHING, ok: true, removed: 2 })).toBeUndefined();
            expect(importLink({ ok: false, problem: 'not-a-backup' })).toBeUndefined();
        });
    });

    describe('importMessage', () => {
        const added = (workoutsAdded: number, entriesAdded: number, skipped = 0) =>
            importMessage({ ...NOTHING, ok: true, workoutsAdded, entriesAdded, skipped });

        it('says what was added', () => {
            expect(added(1, 0)).toBe('Added 1 workout.');
            expect(added(0, 1)).toBe('Added 1 history entry.');
            expect(added(3, 2)).toBe('Added 3 workouts and 2 history entries.');
        });

        it('says what was updated and removed', () => {
            expect(
                importMessage({ ...NOTHING, ok: true, workoutsUpdated: 1, entriesUpdated: 2 })
            ).toBe('Updated 1 workout and 2 history entries.');
            expect(importMessage({ ...NOTHING, ok: true, entriesAdded: 1, removed: 2 })).toBe(
                'Added 1 history entry. Removed 2 items deleted since on the other device.'
            );
        });

        it('says when there was nothing new', () => {
            expect(added(0, 0)).toBe('Nothing new: everything in that backup is already here.');
        });

        it('says how many items were left out', () => {
            expect(added(1, 0, 1)).toBe(
                "Added 1 workout. 1 item in it couldn't be read, so it was left out."
            );
            expect(added(0, 0, 2)).toBe(
                "Nothing new: everything in that backup is already here. 2 items in it couldn't be read, so they were left out."
            );
        });

        it('says why a file was turned down', () => {
            expect(importMessage({ ok: false, problem: 'not-a-backup' })).toBe(
                "That file isn't a Loop Workouts backup."
            );
            expect(importMessage({ ok: false, problem: 'too-big' })).toBe(
                "That file isn't a Loop Workouts backup."
            );
            expect(importMessage({ ok: false, problem: 'unreadable' })).toBe(
                "That file couldn't be read. Is it a Loop Workouts backup?"
            );
            expect(importMessage({ ok: false, problem: 'too-new' })).toBe(
                'That backup is from a newer version of Loop Workouts. Update the app and try again.'
            );
        });
    });
});
