import { routes } from '../app.routes';
import { allTopics, HELP_SECTIONS, searchTopics } from './help-topics';

describe('HELP_SECTIONS (NAV-7)', () => {
    it('has unique ids, in kebab case, for sections and topics', () => {
        const ids = allTopics().map(({ topic }) => topic.id);
        expect(new Set(ids).size).toBe(ids.length);
        ids.forEach((id) => expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/));
        const sections = HELP_SECTIONS.map((section) => section.id);
        expect(new Set(sections).size).toBe(sections.length);
    });

    it('starts with what matters most: your data, then sound, then planning', () => {
        expect(HELP_SECTIONS.slice(0, 3).map((section) => section.title)).toEqual([
            'Your data',
            'Sound and the screen',
            'Planning your week',
        ]);
    });

    it.each(allTopics().map(({ topic }) => [topic.question, topic] as const))(
        '%s has a short answer, and a link only to a page there is',
        (_question, topic) => {
            expect(topic.answer.length).toBeGreaterThan(0);
            expect(topic.answer.length).toBeLessThanOrEqual(3);
            topic.answer.forEach((paragraph) => expect(paragraph.length).toBeLessThanOrEqual(260));
            if (topic.link) {
                const path = topic.link.url.slice(1);
                expect(
                    routes.some((route) => route.path === path),
                    topic.link.url
                ).toBe(true);
            }
        }
    );

    it('has a line for each tab, and where the plan and Settings are', () => {
        const where = HELP_SECTIONS.find((section) => section.id === 'where')!;
        expect(where.topics.map((topic) => topic.question)).toEqual([
            'Today',
            'Workouts',
            'Exercises',
            'Progress',
            'You',
            'The plan',
            'Settings',
        ]);
    });
});

describe('searchTopics', () => {
    const questions = (query: string) => searchTopics(query).map(({ topic }) => topic.question);

    it('finds every word, in any order, in the question or answer, ignoring case', () => {
        expect(questions('IPHONE vibrate')).toEqual(["Why doesn't my iPhone vibrate?"]);
        expect(questions('vibrate iphone')).toEqual(["Why doesn't my iPhone vibrate?"]);
        expect(questions('backup')).toContain(
            'How do I back up my data, or move it to another device?'
        );
    });

    it('finds everything with nothing typed, and nothing for nonsense', () => {
        expect(searchTopics('  ')).toHaveLength(allTopics().length);
        expect(searchTopics('zzqx')).toEqual([]);
    });
});
