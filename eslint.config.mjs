// Only what isn't checked elsewhere: how big a component can get. Formatting is Prettier's, and
// unused code is the compiler's and knip's.
import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

// Lines of code: comments and blank lines don't count, as the reasons for things should stay
// written down. Templates count as well, so moving one out of its component doesn't get round it.
const MAX_LINES = 300;
const maxLines = (max) => ['error', { max, skipBlankLines: true, skipComments: true }];

// Already over when the limit came in. Each can only come down: lower its number as it shrinks,
// and remove it once it's under the limit. Never raise one or add another.
const OVER_THE_LIMIT = {
    'workout-setup/workout-setup.component.html': 1005,
    'workout-setup/workout-setup.component.ts': 1394,
};

export default [
    { ignores: ['**/*.spec.ts'] },
    {
        files: ['src/app/**/*.component.ts', 'src/app/**/*.directive.ts'],
        languageOptions: { parser: tseslint.parser },
    },
    {
        files: ['src/app/**/*.component.html'],
        languageOptions: { parser: angular.templateParser },
    },
    {
        files: [
            'src/app/**/*.component.ts',
            'src/app/**/*.directive.ts',
            'src/app/**/*.component.html',
        ],
        rules: { 'max-lines': maxLines(MAX_LINES) },
    },
    ...Object.entries(OVER_THE_LIMIT).map(([file, max]) => ({
        files: [`src/app/${file}`],
        rules: { 'max-lines': maxLines(max) },
    })),
];
