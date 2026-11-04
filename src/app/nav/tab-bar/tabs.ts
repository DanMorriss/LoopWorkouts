/**
 * The tab bar's tabs, in order, each named for what you come to it for: what to do today, your
 * workouts, the exercises, how you're getting on, and you. A tab is chosen on its own page, the
 * pages under it, and any pages it `holds`: the weekly plan and the ready-made plans belong to Today, where its week
 * shows; making a workout and the ready-made workouts to Workouts, where they're started from;
 * and Settings, Help and the legal pages to You, which they slide in over. The paths are the ones the
 * pages have always had (an email sign-in link comes back to /account, for one), so links and
 * bookmarks keep working.
 */
export const TABS = [
    { path: '/home', label: 'Today', icon: 'today', holds: ['/plan', '/ready-made-plans'] },
    {
        path: '/library',
        label: 'Workouts',
        icon: 'view_list',
        holds: ['/setup', '/ready-made'],
    },
    { path: '/exercises', label: 'Exercises', icon: 'fitness_center', holds: [] },
    { path: '/history', label: 'Progress', icon: 'insights', holds: [] },
    {
        path: '/account',
        label: 'You',
        icon: 'account_circle',
        holds: ['/settings', '/help', '/privacy', '/terms'],
    },
] as const;

export type Tab = (typeof TABS)[number];
