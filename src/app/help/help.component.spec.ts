import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HELP_SECTIONS } from './help-topics';
import { HelpComponent } from './help.component';
import { TourService } from '../tour/tour.service';

describe('HelpComponent (NAV-7)', () => {
    let harness: RouterTestingHarness;

    beforeEach(async () => {
        TestBed.configureTestingModule({
            providers: [
                provideRouter([
                    { path: 'account', children: [] },
                    { path: 'help', component: HelpComponent },
                ]),
            ],
        });
        harness = await RouterTestingHarness.create();
    });

    async function open(url = '/help') {
        await harness.navigateByUrl(url);
        harness.fixture.detectChanges();
        await harness.fixture.whenStable();
    }

    const el = (): HTMLElement => harness.routeNativeElement!;
    const headings = () => [...el().querySelectorAll('h3')].map((h) => h.textContent!.trim());
    const questions = () => [...el().querySelectorAll('summary')].map((s) => s.textContent!.trim());
    const opened = () =>
        [...el().querySelectorAll<HTMLDetailsElement>('details')]
            .filter((d) => d.open)
            .map((d) => d.querySelector('summary')!.textContent!.trim());

    async function search(text: string) {
        const box = el().querySelector<HTMLInputElement>('input[type="search"]')!;
        box.value = text;
        box.dispatchEvent(new Event('input'));
        harness.fixture.detectChanges();
        await harness.fixture.whenStable();
    }

    it('lists every section and question, closed, under You', async () => {
        await open();

        expect(el().querySelector('h2')!.textContent!.trim()).toBe('Help');
        expect(el().querySelector('.back-link')!.getAttribute('href')).toBe('/account');
        expect(headings()).toEqual(HELP_SECTIONS.map((section) => section.title));
        expect(questions()).toHaveLength(
            HELP_SECTIONS.reduce((sum, section) => sum + section.topics.length, 0)
        );
        expect(opened()).toEqual([]);
    });

    it('takes the tour of the app from under the search box (NAV-8)', async () => {
        await open();

        el().querySelector<HTMLButtonElement>('.help__tour')!.click();

        expect(TestBed.inject(TourService).stop()).toBe(0);
    });

    it('opens a question to its answer, with a link to do it', async () => {
        await open();
        const topic = el().querySelector<HTMLDetailsElement>('#help-backup')!;
        topic.querySelector('summary')!.click();
        harness.fixture.detectChanges();

        expect(topic.open).toBe(true);
        expect(topic.textContent).toContain('Export backup saves everything to one file.');
        expect(topic.querySelector('a')!.getAttribute('href')).toBe('/account');
    });

    it('searches every question and answer, opening those it finds', async () => {
        await open();
        await search('iphone');

        expect(questions()).toEqual([
            "Why doesn't my iPhone vibrate?",
            'Will the alarms play with my phone locked?',
            'How do I sign in?',
        ]);
        expect(opened()).toEqual(questions());
        expect(el().querySelector('[role="status"]')!.textContent!.trim()).toBe('3 answers');
    });

    it('says when nothing matches, with a way to ask', async () => {
        await open();
        await search('zzqx');

        expect(questions()).toEqual([]);
        expect(el().querySelector('.help__none')!.textContent).toContain(
            'Nothing matches "zzqx". Try other words, or email us below.'
        );
        expect(el().querySelector('.help__more a')!.getAttribute('href')).toContain(
            'mailto:dan@loopworkouts.com'
        );
    });

    it('opens on the question a ? link asked for, with focus on it', async () => {
        document.body.appendChild(harness.fixture.nativeElement);
        await open('/help?q=no-sound');
        await new Promise((resolve) => setTimeout(resolve));

        expect(opened()).toEqual(['Why is there no sound?']);
        expect(document.activeElement).toBe(el().querySelector('#help-no-sound summary'));
        harness.fixture.nativeElement.remove();
    });
});
