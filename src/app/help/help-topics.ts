/**
 * The Help page's questions and answers (NAV-7), in sections, most needed first. Each answer
 * is a few short paragraphs, using the app's own words for its buttons and pages, so it can
 * be found by searching for them. A topic's `id` is its address on the page
 * (`/help?q=<id>`), which the ? links beside the app's harder parts open; it never changes.
 * Keep these true to what the app does: change one in the same PR as the feature it explains.
 */
export interface HelpTopic {
    id: string;
    question: string;
    /** Its paragraphs, in order. */
    answer: readonly string[];
    /** Where in the app to go to do it, if anywhere. */
    link?: { label: string; url: string };
}

export interface HelpSection {
    id: string;
    title: string;
    topics: readonly HelpTopic[];
}

export const HELP_SECTIONS: readonly HelpSection[] = [
    {
        id: 'data',
        title: 'Your data',
        topics: [
            {
                id: 'lose-workouts',
                question: 'Will I lose my workouts?',
                answer: [
                    "As a guest, everything is saved in this browser, on this device only. Clearing the site's data, using a private window or changing phone loses it.",
                    'To keep it, sign in on the You tab, so it syncs to your account, or export a backup from You, under Your data.',
                ],
                link: { label: 'Go to You', url: '/account' },
            },
            {
                id: 'what-syncs',
                question: "What's kept when I'm signed in?",
                answer: [
                    'Your workouts, plan, history, your own exercises and notes, and your profile (name, goal, equipment, body and units) are the same on every device you sign in on.',
                    "Other settings, such as the theme and sound, are a choice for each device. Everything works offline, and catches up when you're back online.",
                ],
            },
            {
                id: 'backup',
                question: 'How do I back up my data, or move it to another device?',
                answer: [
                    'On You, under Your data, Export backup saves everything to one file.',
                    "Import backup, on another device or browser, brings it in, merged with what's there, so nothing already there is lost.",
                ],
                link: { label: 'Go to You', url: '/account' },
            },
            {
                id: 'sign-out',
                question: 'What happens when I sign out?',
                answer: [
                    'Signing out syncs first, then removes your workouts, plan and history from this device. Your account keeps them, and signing in again brings them back. This device keeps its settings.',
                    "If something hasn't synced yet, because you're offline say, it warns you before signing out.",
                ],
            },
            {
                id: 'delete-or-clear',
                question: "What's the difference between Delete account and Clear this device?",
                answer: [
                    'Delete account removes your account and everything of yours, on the server and on this device.',
                    "Clear this device, on You under Your data, removes everything from this device only. If you're signed in, your account keeps its copy.",
                    "Neither can be undone, so both ask first. Export a backup if you'd like a copy.",
                ],
            },
        ],
    },
    {
        id: 'sound',
        title: 'Sound and the screen',
        topics: [
            {
                id: 'no-sound',
                question: 'Why is there no sound?',
                answer: [
                    "Browsers only play sound after you've tapped the page. Any tap turns it on. After a refresh mid-workout, the workout shows a Tap to turn on sound button.",
                    "If it's still quiet, check that Sound is on in Settings, and your phone's volume, and that it isn't on silent.",
                ],
                link: { label: 'Open Settings', url: '/settings' },
            },
            {
                id: 'iphone-vibration',
                question: "Why doesn't my iPhone vibrate?",
                answer: [
                    "iPhones don't let websites vibrate, so Settings says this device can't vibrate. The sounds still play.",
                ],
            },
            {
                id: 'locked-phone',
                question: 'Will the alarms play with my phone locked?',
                answer: [
                    'Not reliably: a locked phone can silence a website, iPhones especially. So while a workout runs, the screen is kept on (Keep screen on, in Settings).',
                    'If it does lock, the timer still keeps the right time, and catches up as soon as you come back.',
                ],
            },
            {
                id: 'sounds',
                question: 'What do the sounds mean?',
                answer: [
                    'Two short high beeps: a timed or rep step starts. One long low tone: a rest starts. Three rising notes: finished.',
                    'Ticks count down the last 3 seconds of a timed step or rest of 10 seconds or more. Play each sound in Settings, and turn the countdown beeps off there if you like.',
                ],
                link: { label: 'Open Settings', url: '/settings' },
            },
        ],
    },
    {
        id: 'planning',
        title: 'Planning your week',
        topics: [
            {
                id: 'ready-made-plans',
                question: "What's a ready-made plan?",
                answer: [
                    'A week of ready-made workouts, the same every week, such as 3-day beginner gym or Fitness, 4 days.',
                    "Use this plan adds the workouts you haven't got, and puts them on their days. Find the plans on Today, or on the Plan page under Start from a ready-made plan.",
                ],
                link: { label: 'See the ready-made plans', url: '/ready-made-plans' },
            },
            {
                id: 'replace-plan',
                question: 'What happens to my plan if I use a ready-made one?',
                answer: [
                    "It replaces your plan. Your own workouts stay in Workouts, they're just not on the plan any more.",
                    'Changed your mind? Press Undo in the bar at the bottom straight away: your plan comes back, and the workouts it added go.',
                ],
            },
            {
                id: 'plan-added-workouts',
                question: 'Why did using a plan add workouts?',
                answer: [
                    "A plan is made of workouts, so any you don't have are added to Workouts as your own copies, to change as you like.",
                    'A workout you have already with the same name is used, rather than adding a second copy.',
                ],
            },
            {
                id: 'own-plan',
                question: 'How do I plan my own week?',
                answer: [
                    'On Today, press Edit plan (or Plan your week). Press Add on a day and pick a workout; take one off with its ✕.',
                    'Need more workouts? Add new workouts, at the top of the list, takes you to Workouts to make one or add a ready-made one.',
                ],
                link: { label: 'Open the plan', url: '/plan' },
            },
            {
                id: 'plan-statuses',
                question: 'What do Done, Missed, Due and From next week mean?',
                answer: [
                    "Done: you did it on its day. Missed: its day went by without it. Due: it's today's, still to do.",
                    "From next week: you planned it after its day had already gone by this week, so it isn't counted until next week.",
                ],
            },
            {
                id: 'starts-next-week',
                question: 'Why does Today say my plan starts next week?',
                answer: [
                    "You set it up after its days had gone by this week, on a Sunday say. Those days count from next week, so they aren't marked as missed.",
                ],
            },
            {
                id: 'different-day',
                question: 'I did a planned workout on a different day. Does it count?',
                answer: [
                    'Only on the day it was planned. It still shows in Progress, but its planned day says Missed.',
                ],
            },
        ],
    },
    {
        id: 'running',
        title: 'Doing a workout',
        topics: [
            {
                id: 'rep-steps',
                question: "Why doesn't a rep step count down?",
                answer: [
                    "A rep step waits for you, however long the set takes. When you've finished, press Done: the Next: pill under the ring (or Space, on a keyboard).",
                ],
            },
            {
                id: 'skip',
                question: 'What does Skip do?',
                answer: [
                    "Skip, beside Pause, moves on without finishing the step. A skipped set of reps isn't logged; a timed exercise is logged with the time it ran.",
                    'With a time limit, the time you save goes to more rounds.',
                ],
            },
            {
                id: 'change-weight',
                question: 'Can I change the weight or reps mid-workout?',
                answer: [
                    'Yes: tap the reps or the weight on the face and turn the wheel. It changes this set, the rest of the workout and the saved workout, so next time starts from there.',
                ],
            },
            {
                id: 'swap-exercise',
                question: "Someone's on the machine. Can I swap the exercise?",
                answer: [
                    "Open the step's details with the (i) by its name, and press Swap exercise. It offers the closest exercises for the same muscles that your equipment allows.",
                    'When you finish, the summary asks whether to use the swap next time.',
                ],
            },
            {
                id: 'leave-running',
                question: 'Can I look at other pages during a workout?',
                answer: [
                    'Yes. Press ⌄ at the top left: the workout keeps going in a bar above the tabs, with its step, time and Pause, and the sounds keep playing. Tap the bar to go back to it.',
                ],
            },
            {
                id: 'end-early',
                question: 'How do I end a workout early?',
                answer: [
                    "Press End workout, or swipe the bar above the tabs to the right. You'll see how it went, and it's kept in Progress as stopped. Back to workout, on the summary, takes it up again.",
                ],
            },
            {
                id: 'time-limit-score',
                question: 'How is a time-limit workout scored?',
                answer: [
                    "It's as many rounds as you can before time's up. The score is the full rounds, then the steps done of the last one, e.g. 7 rounds + 3.",
                    'If time runs out mid-set, it asks how many reps you got.',
                ],
            },
        ],
    },
    {
        id: 'workouts',
        title: 'Making and finding workouts',
        topics: [
            {
                id: 'step-kinds',
                question: 'What kinds of steps are there?',
                answer: [
                    'Timed, e.g. 0:30 of jumping jacks; Reps, e.g. 10 squats, with a weight if you like; and Rest.',
                    "Type an exercise's name for a step, or browse for one, to link it to the exercise: you'll see how it's done, the muscles it works, and your progress.",
                ],
                link: { label: 'Make a workout', url: '/setup' },
            },
            {
                id: 'repeat',
                question: 'What do rounds, ∞ and Time limit do?',
                answer: [
                    'Repeat runs the whole workout 1 to 30 times. ∞ goes round and round until you stop. Time limit fits in as many rounds as you can in a set time, such as 20:00.',
                ],
            },
            {
                id: 'sets-and-supersets',
                question: 'How do I do sets, supersets and headings?',
                answer: [
                    'Give an exercise Sets, with a Rest after each set. Its Join with next button makes it a superset with the next exercise: done back to back, then a rest, for a number of rounds.',
                    'Add heading splits a long workout into parts, such as Warmup.',
                ],
            },
            {
                id: 'ready-made-workouts',
                question: 'Where can I find workouts to start with?',
                answer: [
                    'On Workouts, under Ready-made workouts: workouts for no equipment, a kettlebell, dumbbells, a gym and other kit. Add to my workouts copies one in, yours to change.',
                ],
                link: { label: 'See the ready-made workouts', url: '/ready-made' },
            },
            {
                id: 'only-what-i-have',
                question: 'What does Only what I have do?',
                answer: [
                    'It shows only the exercises, ready-made workouts and plans your equipment allows. Pick your equipment under My equipment; those that need nothing always show.',
                    "It's one setting for all three, so set it once.",
                ],
            },
            {
                id: 'workout-steps',
                question: "How do I see what's in a workout without editing it?",
                answer: [
                    "On Workouts, open a workout's ⋮ menu and choose Details. What's in it, at the bottom, lists every step and its sets.",
                ],
            },
            {
                id: 'missing-muscles',
                question: 'What are Missing muscle groups?',
                answer: [
                    'At the bottom of Workouts: the muscles none of your workouts work, and those they only work lightly. Tap one to find exercises for it.',
                    'Under them, a ready-made workout that covers the most of them, to add in one tap.',
                ],
                link: { label: 'Go to Workouts', url: '/library' },
            },
            {
                id: 'ai-import',
                question: 'Can I bring in a plan from a coach, a book or a spreadsheet?',
                answer: [
                    'Yes. On You, under Your data, press Copy AI prompt, and paste it into an AI chat with your plan. Save the file it writes, then bring it in with Import backup.',
                ],
                link: { label: 'Go to You', url: '/account' },
            },
        ],
    },
    {
        id: 'progress',
        title: 'Progress',
        topics: [
            {
                id: 'muscle-bars',
                question: 'What do the muscle bars show?',
                answer: [
                    'The sets for each muscle group in the last 7 days. The shaded band is the sets a week to aim for, set by Training for in You, under Profile: a grey bar is under it, a cyan one in range, and a pink one over.',
                ],
                link: { label: 'Go to Progress', url: '/history' },
            },
            {
                id: 'log',
                question: "Where are the workouts I've done?",
                answer: [
                    'On Progress, under Log: every workout you finished, or stopped after at least one step, by day, with its sets.',
                    'Each one\'s ⋮ menu adds a note, such as "felt strong", or deletes it, with Undo.',
                ],
                link: { label: 'Go to Progress', url: '/history' },
            },
            {
                id: 'bests',
                question: 'Where can I see my best lifts?',
                answer: [
                    "Each exercise's page, in Exercises, shows your bests, a chart and your recent sessions. New personal bests show on the summary when you finish a workout.",
                ],
                link: { label: 'Go to Exercises', url: '/exercises' },
            },
        ],
    },
    {
        id: 'account',
        title: 'Signing in',
        topics: [
            {
                id: 'need-account',
                question: 'Do I need an account?',
                answer: [
                    'No. Everything works without one, saved on this device. Sign in only if you want your workouts and history on every device you use.',
                ],
            },
            {
                id: 'how-to-sign-in',
                question: 'How do I sign in?',
                answer: [
                    'On You, press Continue with Google, or type your email for a sign-in link.',
                    "The email has a code too: type it in the app if the link opens somewhere else, such as Safari when you use the app from your iPhone's Home Screen.",
                ],
                link: { label: 'Go to You', url: '/account' },
            },
            {
                id: 'apple',
                question: 'Can I sign in with Apple?',
                answer: ["Not yet: it's coming. For now, use Google or your email."],
            },
        ],
    },
    {
        id: 'where',
        title: 'Where is…?',
        topics: [
            {
                id: 'where-today',
                question: 'Today',
                answer: [
                    "Where the app opens: your week, what's due today, and how to plan your week if you haven't yet.",
                ],
                link: { label: 'Go to Today', url: '/home' },
            },
            {
                id: 'where-workouts',
                question: 'Workouts',
                answer: [
                    'Your saved workouts: start, change or delete them, make a new one with New, or add one from Ready-made workouts.',
                ],
                link: { label: 'Go to Workouts', url: '/library' },
            },
            {
                id: 'where-exercises',
                question: 'Exercises',
                answer: [
                    'Every exercise, by muscle and equipment: how each is done, and your progress with it. Make your own exercises here too.',
                ],
                link: { label: 'Go to Exercises', url: '/exercises' },
            },
            {
                id: 'where-progress',
                question: 'Progress',
                answer: [
                    "How you're getting on: the muscles you've worked this week, and every workout you've done.",
                ],
                link: { label: 'Go to Progress', url: '/history' },
            },
            {
                id: 'where-you',
                question: 'You',
                answer: [
                    'Signing in, your profile (name, goal, equipment, body and units), backups, Settings and this Help.',
                ],
                link: { label: 'Go to You', url: '/account' },
            },
            {
                id: 'where-plan',
                question: 'The plan',
                answer: ["On Today: press Edit plan, or Plan your week if nothing's planned yet."],
                link: { label: 'Open the plan', url: '/plan' },
            },
            {
                id: 'where-settings',
                question: 'Settings',
                answer: [
                    'On You: the theme, which side to start with, sound, countdown beeps, vibration and keeping the screen on. Your units are under Profile, on You.',
                ],
                link: { label: 'Open Settings', url: '/settings' },
            },
        ],
    },
];

/** Every topic, with its section, in order. */
export function allTopics(): { section: HelpSection; topic: HelpTopic }[] {
    return HELP_SECTIONS.flatMap((section) => section.topics.map((topic) => ({ section, topic })));
}

/**
 * The topics matching a search: every word of it, in any order, found in the question or the
 * answer, ignoring case. Empty, everything.
 */
export function searchTopics(query: string): { section: HelpSection; topic: HelpTopic }[] {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return allTopics().filter(({ topic }) => {
        const text = [topic.question, ...topic.answer].join(' ').toLowerCase();
        return words.every((word) => text.includes(word));
    });
}
