import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
    FakeAccountClient,
    fakeAccountClient,
    provideFakeAccountClient,
} from '../../shared/testing/fake-account-client';
import { provideFakeSyncStarter } from '../../shared/testing/fake-sync';
import { NOTES_ASKED_KEY } from '../consent.service';
import { NotesAskComponent } from './notes-ask.component';

@Component({ template: '' })
class PageComponent {}

describe('NotesAskComponent (SYN-10)', () => {
    let fixture: ComponentFixture<NotesAskComponent>;
    let client: FakeAccountClient;

    async function create(consent: unknown = null, url = '/home') {
        client = fakeAccountClient('me@example.com', { consent });
        TestBed.configureTestingModule({
            providers: [
                provideRouter([{ path: '**', component: PageComponent }]),
                provideFakeAccountClient(client),
                provideFakeSyncStarter(),
            ],
        });
        await TestBed.inject(Router).navigateByUrl(url);
        fixture = TestBed.createComponent(NotesAskComponent);
        document.body.appendChild(fixture.nativeElement);
        await settle();
    }

    async function settle() {
        for (let i = 0; i < 3; i++) {
            await new Promise((resolve) => setTimeout(resolve));
        }
        await fixture.whenStable();
    }

    const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
    const box = () => document.querySelector<HTMLInputElement>('#health-consent')!;
    async function pressContinue() {
        [...document.querySelectorAll('button')]
            .find((button) => button.textContent!.trim() === 'Continue')!
            .click();
        await settle();
    }

    beforeEach(() => localStorage.clear());
    afterEach(() => {
        fixture.destroy();
        fixture.nativeElement.remove();
        localStorage.clear();
    });

    it('asks once signed in, with the box unticked and focus on Continue', async () => {
        await create();

        expect(dialog()!.textContent).toContain('Keep your notes too?');
        expect(box().checked).toBe(false);
        expect(box().labels![0].textContent!.replace(/\s+/g, ' ').trim()).toBe(
            'I agree that notes I write, which may mention my health, are kept with my account.'
        );
        await vi.waitFor(() =>
            expect(document.activeElement!.textContent!.trim()).toBe('Continue')
        );
    });

    it('keeps notes once ticked, then goes', async () => {
        await create();

        box().click();
        await settle();
        await pressContinue();

        expect(client.rpc).toHaveBeenCalledWith('give_health_consent', {
            notice_date: '2026-11-21',
        });
        await vi.waitFor(() => expect(dialog()).toBeNull());
    });

    it("leaves them on this device unticked, and doesn't ask again here", async () => {
        await create();

        await pressContinue();

        expect(client.rpc).not.toHaveBeenCalledWith('give_health_consent', expect.anything());
        expect(localStorage.getItem(NOTES_ASKED_KEY)).toBe('me@example.com');
        await vi.waitFor(() => expect(dialog()).toBeNull());
    });

    it("stays, saying so, if it couldn't be saved", async () => {
        await create();
        box().click();
        await settle();
        client.rpc.mockResolvedValueOnce({ data: null, error: { message: 'down' } });

        await pressContinue();

        expect(dialog()!.textContent).toContain("That couldn't be saved.");
        expect(localStorage.getItem(NOTES_ASKED_KEY)).toBeNull();
    });

    it("doesn't ask an account that keeps notes, or one asked here before", async () => {
        await create({ at: 1, notice: '2026-11-08' });
        expect(dialog()).toBeNull();
        fixture.destroy();
        TestBed.resetTestingModule();

        localStorage.setItem(NOTES_ASKED_KEY, 'me@example.com');
        await create();
        expect(dialog()).toBeNull();
    });

    it('waits until off the welcome screens', async () => {
        await create(null, '/welcome/setup');
        expect(dialog()).toBeNull();

        await TestBed.inject(Router).navigateByUrl('/home');
        await settle();
        expect(dialog()).not.toBeNull();
    });
});
