import { pastedJson } from './pasted-json';

describe('pastedJson', () => {
    it('keeps JSON pasted on its own', () => {
        expect(pastedJson('  {"app":"Loop Workouts"}\n')).toBe('{"app":"Loop Workouts"}');
    });

    it("takes the code block out of a whole reply, leaving the AI's words and notes", () => {
        const reply = [
            "Here's your plan:",
            '```json',
            '{"app": "Loop Workouts", "workouts": [{"title": "Legs"}]}',
            '```',
            'Notes:',
            '- Used the low end of {8–12} reps.',
        ].join('\n');
        expect(pastedJson(reply)).toBe('{"app": "Loop Workouts", "workouts": [{"title": "Legs"}]}');
    });

    it('finds the object in words with no code block', () => {
        expect(pastedJson('Sure! {"app":"Loop Workouts"} Enjoy.')).toBe('{"app":"Loop Workouts"}');
    });

    it('leaves text with no object for the import to turn down', () => {
        expect(pastedJson(' my plan ')).toBe('my plan');
    });
});
