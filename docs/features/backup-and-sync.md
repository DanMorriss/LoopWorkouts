# Backup and sync

Export and import (SYN-1, SYN-2) are built, with a prompt for having an AI turn a plan into a file to import (SYN-6), the history has room for years (SYN-5), and the data is ready for sync: random ids, `updatedAt` and deletion markers (see [data](data.md)). The library's order is a record of its own, so it merges too. Signing in, signing out and deleting an account are built, with Clear this device (SYN-8, SYN-9), and so is sync (SYN-3, SYN-4): signed in, the workouts, history and exercises are the same on every device, merged as an import is. How it works, and the backend picked, are under **Sync** below; and so is signing in with Google (SYN-7); Apple waits on an Apple Developer account. Signing in needs a tick first, giving explicit consent to keeping notes that may mention health with the account (SYN-10), which is recorded with it.

## Stories

- **SYN-1** As a user I want to export all my data to a file, so I have a backup.
- **SYN-2** As a user I want to import that file, on this device or another, without losing what's already there.
- **SYN-3** As a user I want to sign in, so my workouts and history are the same on my phone and my laptop.
- **SYN-4** As a user I want the app to keep working with no connection, and catch up when it's back.
- **SYN-5** As a user I want to keep years of history, not just the last 500 workouts.
- **SYN-6** As a user with a plan already (from a coach, a book or a spreadsheet), I want an AI to turn it into workouts I can import, so I don't have to build each one by hand.
- **SYN-7** As a user I want to sign in with Google or Apple, so I don't have to wait for an email.
- **SYN-8** As a user I want to delete my account, so nothing of mine is kept on the server.
- **SYN-9** As a user I want to clear everything from this device, e.g. a shared computer I'm done with.
- **SYN-10** As a user who writes notes that may mention my health, I want to be asked before they're kept with my account, and see when I agreed, so I know what I've consented to.

## Rules

### Export and import (SYN-1, SYN-2)

- They're in **You → Your data** (in Settings until 2026-10-28), under the hint "Your workouts and history are saved on this device, and with your account if you sign in. Export a backup to keep a copy of your own."
- **Export backup** downloads one file of the workouts, the library's order, the weekly plan, history, your own exercises, your notes on exercises, which exercises are hidden from the picker, deletions and settings (your equipment included), e.g. `loop-workouts-2026-10-21.json` (dated by the device's calendar), and says "Backup saved as loop-workouts-2026-10-21.json." The file's shape is in [data](data.md#backup-file).
- **Import backup** opens a file picker. The chosen file is **merged** with what's here, by id:
    - A workout, history entry, exercise of your own, note on an exercise or hidden exercise only in the file is **added**.
    - One in both keeps **the most recent change**: an edit, a note, a change of reps mid-workout. On a tie, this device's stays.
    - Exercises and notes come in first, so the file's workouts and history entries can be **linked** to them: a step or set that isn't linked yet (a file from before exercises), or is linked to an exercise that's neither here nor in the file, is linked by its name, as saved data is (see [data](data.md#data-version)).
    - An **exercise of your own with the same name** as one here (matched as names are, so "sled push" is "Sled push") but another id, e.g. typed on two devices, is taken to be the one here: it isn't added, and the file's steps, sets, note and hidden mark for it go to the one here.
    - One **deleted where the backup came from** is deleted here too, unless it's changed here since. One **deleted here** doesn't come back, unless it changed there after it was deleted here.
    - The **library's order** in the file is taken if a workout was moved there more recently than here (LIB-3): the workouts it lists go in its order, and any others (e.g. made here since) after them. A library never moved keeps its order. It isn't counted in what the import says it did.
    - The **weekly plan** in the file (PLN-1) is taken if it changed there more recently than here; not counted either.
    - Nothing else here is changed or removed.
    - **Settings** in the file are left out: theme, sound, your equipment and so on are a choice for each device (the profile among them syncs, but isn't imported from a file).
    - Workouts and history entries in the file that aren't usable are left out, the same as when the app loads its own data, and older workout formats convert.
    - **A version 1 file** (from before ids were random) has no dates or deletions, and its workout ids were only unique on its device. Its workouts are matched by what they are instead (title, steps and rounds): one the same as a workout here is skipped, any other is added with a new id. So a workout changed since that backup was made is kept, and the backup's version is added alongside it. Its workouts merge by run id as above.
- What happened is shown under the buttons, and read out by screen readers. It shows in the **bar at the bottom** too (as the Undo bar shows things, with no Undo), where it's seen on a phone, with a button to see what came in: **View workouts** if any workouts were added or updated, else **View exercises** for exercises, else **View history** for history entries (none when nothing came in, or the file was turned down). The bar isn't read out, as the line under the buttons is:
    - "Added 2 workouts, 3 exercises and 14 history entries." (or just the parts that apply)
    - "Updated 1 workout and 2 history entries." when newer copies were taken (exercises count too)
    - "Removed 3 items deleted since on the other device."
    - Those that apply, in that order, or "Nothing new: everything in that backup is already here."
    - Either, followed by "1 item in it couldn't be read, so it was left out." when some were.
    - "That file isn't a Loop Workouts backup." (not a backup, or over 50 MB)
    - "That file couldn't be read. Is it a Loop Workouts backup?" (not JSON)
    - "That backup is from a newer version of Loop Workouts. Update the app and try again."
- A file that's turned down changes nothing.

### Bringing in a plan with AI (SYN-6)

- Under the backup buttons: "Have a plan from a coach, a book or a spreadsheet? Copy this prompt into an AI chat, add your plan, then bring in the file it writes with Import backup." and a **Copy AI prompt** button.
- It copies the prompt to the clipboard and says "Prompt copied. Paste it into an AI chat, then add your plan." If the browser won't allow it: "The prompt couldn't be copied. Try again, or another browser."
- The prompt asks for one JSON object, in a code block, in the backup file's shape (see [data](data.md#backup-file)) cut down to what a plan needs: `app`, `version` (the app's current one), `workouts` and `exercises`, **with no ids or dates**. It's made from the app itself, so it keeps up with it:
    - the workout and step fields, with their limits (steps per workout, rounds or until stopped, a time limit, seconds, reps, a weight in kg, converting lb, a name's length), and each exercise as a group of its sets with the rest between them, done each side where the plan says so, each set's own reps and weight where they differ (e.g. a pyramid), exercises the plan pairs up (a superset, giant set or "A1/A2") as one group of their steps with its rounds and rest, under the plan's own section titles as headings (up to 10, each up to 40 characters)
    - every built-in exercise's name and other names, to name steps by where they match
    - for any other exercise, an entry in `exercises` with how it's measured, the equipment and muscles to choose from, and an optional description, how-to steps and tips
    - an example file, and to pick a sensible value for what doesn't fit (e.g. the low end of 8–12 reps, or a weight given as a percentage of a max) and list what it changed under the JSON as "Notes:"
    - it ends with "MY PLAN", for the plan to be pasted after it.
- The file it writes goes in with **Import backup**, which is eased for a file written by hand:
    - `history` can be left out (`exportedAt`, `exerciseNotes`, `hiddenExercises`, `deleted` and `settings` already could).
    - A **workout with no id** is new: it's given a random id, dated now, and matched by what it is (title, steps and rounds), as a version 1 file's are. One the same as a workout here is skipped, so importing the same file twice doesn't add it twice.
    - An **exercise of your own with no id** is given a random id and dated now. One with the name of an exercise here, built-in or your own, is taken to be that one, as above, so it isn't added again.
    - Steps are linked by name as usual: to a built-in exercise or one of yours where the name matches, else to the file's own exercises, else to a new exercise of your own made from the step.
    - What happened is shown as for any backup, e.g. "Added 3 workouts and 2 exercises."

### Room for history (SYN-5)

- Every workout in the history is kept, with no cap. On the web it's in IndexedDB rather than `localStorage` (about 5 MB, which held the newest 500), and the old list moves across on load (see [data](data.md#history-the-history)).
- Deletions are remembered for the last 5,000, so an old backup can only bring back something deleted that long ago.
- A backup can be up to 50 MB, far more than years of workouts take.

### Clear this device (SYN-9)

- **Clear this device** is at the end of **You → Your data**, under "Done with this device, on a shared computer say? Clear your workouts, history and settings from it." (and, signed in, "That signs this device out too; your account keeps what's in it."). It works signed in or not.
- It can't be undone, so unlike deleting elsewhere it **asks first**: the button opens a warning in its place, "This removes your workouts, history, exercises and settings from this device. It can't be undone, so export a backup first to keep them.", with **Clear everything** and **Cancel**. Focus goes to the warning, so it's read out; Cancel puts it back on the button.
- **Clear everything** removes all the app keeps on the device: workouts, the library's order, the weekly plan, history, your own exercises, notes, hidden exercises, deletions and settings, and the workout in progress, which isn't logged. Then the app starts again, empty, on the page it was on.
- **Other open tabs** of the app start again empty too, on the page each was on: they're told as it clears, so none keeps what it had in memory and saves it back. A workout going in one of them is dropped, not logged.
- Signed in, it signs this device out too, as the sign-in is kept on the device. The account keeps what it holds, and signing in again brings it back.

### Signing in (SYN-3) and deleting an account (SYN-8)

Signing in makes the account, if it's new, and starts sync (below).

- The same sign-in is on the **welcome screen** a device new to the app opens on (NAV-3, see [home-and-navigation](home-and-navigation.md)), with **Continue as guest** under it.
- **Signed out**, the You tab's Sync section says "Sign in, and your workouts and history will be the same on every device you sign in on. An account is optional: without one, everything stays on this device.", then **Continue with Google** (and **Continue with Apple** once it's set up; SYN-7, below), "or", and an **Email** field and **Email me a sign-in link**.
- **Consent to keeping notes** (SYN-10): notes are free text, so they may mention health, which UK GDPR counts as special category data, needing explicit consent to keep. Above the ways of signing in is a tick box, unticked: "I agree that notes I write, which may mention my health, are kept with my account." Its whole line is its label, at least 44px tall.
    - Pressing **Continue with Google** (or Apple) or **Email me a sign-in link** without it ticked does nothing but say "Tick the box to agree before signing in." under it, with focus on the box. Errors only show once you've tried, and go once it's ticked.
    - Ticked, the consent is kept on the device (`health-consent` in localStorage, holding the privacy notice's date) until it's signed in, as Google and email links leave the page, and then saved with the account (`give_health_consent()`), dated by the server's clock with the notice's date. Every sign-in through the form saves it again, under the latest notice. If it can't be saved (offline, say), it's kept to save at the next sign-in.
    - **Signed in**, under how sync is going, the You tab says "On 8 November 2026 you agreed that notes you write, which may mention your health, are kept with your account (under the privacy notice of 8 November 2026). To withdraw, delete those notes, or your account."
    - **With none on record** (an account made before the tick, or an email link opened on another device, which has no tick saved), it says "Notes you write may mention your health, which needs your consent to keep them with your account.", with the same tick and **Agree**. Agree without the tick: "Tick the box to agree.", with focus on the box; saved, it says when, with focus there; not saved: "That couldn't be saved. Check your connection and try again."
    - If it can't be looked up (offline, say), it says nothing of it.
    - **Withdrawing:** delete the notes that mention health (a deletion syncs, so it's gone from the account too), or delete the account, which deletes the record of consent with it.
- **Google and Apple** (SYN-7): Apple isn't offered yet, as it needs an Apple Developer account; the button is built, and shows once `'apple'` is added to `SIGN_IN_PROVIDERS`. Each button goes to Google or Apple to sign in, saying "Going to Google…" while it leaves, and comes back signed in, by way of the You tab (where Supabase's code reads the sign-in), which then goes on to **Today**. They're in their own colours and with their marks, as their guidelines ask: Google's dark button (light in the light theme) and Apple's white (black in the light theme).
    - An account is one per email address: signing in with Google or Apple with the email you signed up with by link signs in to that account, and the other way round. Apple may give a private relay address (…@privaterelay.appleid.com) if you choose to hide yours, which is then the account's address.
    - Not reaching Google or Apple (offline, say): "Couldn't reach Google. Check your connection and try again."
    - **Coming back to the wrong page:** Supabase goes to the site's home page, rather than the You tab, when it doesn't take the address it was given (one missing from its Redirect URLs). A sign-in landing anywhere but the You tab, from Google or an email link, goes on to it as the app opens, so it still signs in (`sendSignInToAccount()`, `src/app/account/sign-in-landing.ts`, run before the first navigation).
    - Turned down or cancelled there, it comes back with "Signing in didn't finish. Try again, or sign in another way." above the buttons, and the reason taken out of the address.
    - An empty or malformed address is caught before anything is sent, on the field: "Enter your email address." or "That isn't an email address. Check it and try again." Focus goes to the field. Errors only show once you've tried.
    - Spaces round the address are dropped.
- **Sent**, it says "We've sent a sign-in link to me@example.com. Open it on this device, or type the code from the email here.", with focus on it, then a **Code** field, **Sign in**, and **Use another email** (back to the email field).
    - **The link** comes back signed in, by way of the You tab, and goes on to **Today**. Opened in another browser on the same device, it signs that browser in.
    - **The code** (6 to 10 digits, as the project sends) signs in where it's typed. It's there for the app added to an iPhone's Home Screen, which keeps its storage apart from Safari's, where email links open.
    - A code that's too short or has letters in it: "The code is the number in the email, e.g. 123456." One the server turns down: "That code didn't work: it may be wrong, or expired. Check it, or send another email."
    - Sending fails: "The email couldn't be sent. Check your connection and try again."; too many sent: "Too many sign-in emails for now. Wait a while, then try again."
    - A link that's expired or been used comes back with "That sign-in link has expired or was used already. Send yourself another." above the email field, and the reason is taken out of the address.
    - Signing in with the code goes on to **Today**. Every way of signing in ends on Today (2026-10-30, when it was called Home), wherever it was started: the You tab or the welcome screen. Today says "Signed in as me@example.com." in the bar over the tabs (as the Undo bar shows things, with no Undo), read out by screen readers.
- **Other tabs** open on the device when it signs in start again the next time they're looked at, so they have the account's data and sync too, rather than saving what they had over what was fetched. (Signing out already reloads them, as clearing the device does.)
- **Signed out without asking**: if the sign-in ends without Sign out being pressed here (the account deleted on another device, say, or the sign-in can't be renewed), the device is cleared as signing out clears it, keeping its settings, and the app reloads, saying in the bar "You were signed out, so your data was removed from this device. Signing in again brings back what your account has." Changes not yet synced are lost, as they can't be sent any more.
- **Signed in**, it says "Signed in as me@example.com.", then "Your workouts, history, exercises and profile sync between the devices you sign in on. Other settings stay a choice for each device.", how sync is going (below), and offers **Sign out** and **Delete account**. This device's hint adds "That signs this device out too; your account keeps what's in it."
    - Over the buttons: "Signing out removes your workouts and history from this device. Your account keeps them, ready for when you sign in again."
    - **Sign out** syncs first ("Syncing before signing out…"), then signs this device out and **removes the account's data from it**: workouts, the library's order, the weekly plan, history, your own exercises, notes, hidden exercises and deletions, and a workout in progress. This device's settings stay (theme, sound, units, your profile and equipment), less your name, and with the profile undated, so it isn't sent to the next account signed in here. Other devices stay signed in. The app reloads on the You tab, saying "Signed out. Your data was removed from this device; your account keeps it." It's removed so the next person to use the device doesn't see it, nor have it merged into their account when they sign in. (Decided on 2026-10-30; until then signing out kept the data.)
    - If something couldn't be sent (offline, say), it asks first: "Some changes on this device haven't synced, maybe because you're offline. Signing out removes them from this device, so they'd be lost.", with **Sign out anyway** and **Cancel** (focus on the warning; Cancel puts it back on Sign out).
    - **Delete account** asks first, as Clear this device does: "This deletes your account and everything of yours, on the server and on this device. It can't be undone. To keep a copy, export a backup first.", with **Delete my account** and **Cancel** (focus on the warning; Cancel puts it back on Delete account). Deleting signs this device out and clears it as signing out does, keeping its settings; the app reloads, saying "Your account has been deleted, and its data removed from this device." in the bar over the tabs If it fails: "Your account couldn't be deleted. Check your connection and try again.", still signed in.
- While it checks whether you're signed in (only on a device with an account's session saved): "Checking whether you're signed in…". If Supabase's code can't be loaded (offline, say), it shows as signed out.
- What each of these did is read out by screen readers, under the section.

### Sync (SYN-3, SYN-4)

Decided with Dan on 2026-10-27:

- **An account is optional.** Without one, the app works as it did before accounts, on the device only.
- **Signing in is by an email link** (type your email, tap the link it sends) or its code, or with Google (SYN-7), and Apple once it's set up. If an iPhone app offers Google, the App Store asks for Sign in with Apple beside it.
- **A You tab** in the tab bar (the You tab until 2026-11-03) is where you sign in, see when it last synced, sign out and **delete your account** (SYN-8). Deleting it removes everything of yours on the server; what's on the device stays.
- **Signing out removes the account's data from the device**, after syncing it, keeping only the device's settings (less your name), so a shared device doesn't keep one person's workouts for the next. Deleting the account removes it from the device too.
- **The device's copy is the one the app works from.** Nothing waits on the network: changes are saved here first, sent when online, and other devices' changes are merged in as an import's are, record by record, the most recent change winning.
- **What syncs:** workouts, the library's order, the weekly plan, the history, your own exercises, your notes on exercises, hidden exercises, deletions, and your profile (SET-7: name, sex, what you train for, weight units and equipment, as one record, the most recent change to any of it winning). **Other settings don't:** theme, sound, Only what I have and the rest stay a choice for each device, as with import. The run in progress doesn't either. A profile is sent only once it's been set here (in the setup, or by changing it), so a device never set up doesn't overwrite one set elsewhere.
- **The first sign-in on a device** merges what's here with what's in the account, as importing a backup does, so nothing is lost on either side.
- **The privacy notice and terms** are updated before anything is sent off the device: what's stored, where, and who to contact.
- **The server keeps the data in Europe** (an EU region).

How it works:

- **On the server**, one table of records of every kind: the user, the kind (`workout`, `history`, `exercise`, `exercise-note`, `hidden-exercise`, `ready-made-favourite`, `ready-made-change`, `library-order`, `plan` or `profile`), the record's id, its `updatedAt`, `deletedAt` if it was deleted, the record itself as JSON, the app's data version it was written in, and a number (`seq`) the server counts up on every write. A deletion is a record with `deletedAt` set, kept for good, so the device's cap of 5,000 doesn't apply there. Each user can only read their own rows, and write them only through the sending function.
- **Fetching** comes first: the device asks for the rows written since the last `seq` it saw, 500 at a time, merges them as an import does (the same merge, so an exercise of your own made on two devices under one name becomes one), and remembers the new `seq`. A row written by a newer version of the app is left alone, and fetched again until this one is updated; the You tab'says so.
- **Sending:** then the records changed here since they were last sent or fetched go up, 200 at a time. The server keeps one only if it's newer than its copy, a deletion winning a tie, as merging does. What was fetched isn't sent back, unless it lost to a newer change here. Writes for an account go one at a time, so a device that's fetched up to a `seq` can't miss one written below it.
- **When:** on opening the app and signing in, 3 seconds after a change (so a burst goes as one), on coming back online, and on coming back to the app. One person's devices don't need changes to arrive live. One that doesn't finish is tried again a minute later.
- **Clocks:** "most recent wins" goes by each device's clock, so a phone set an hour fast would win every change for an hour. So the server gives its own time with every reply, the device keeps how far its clock is off from that, and dates changes by the server's time once it knows it. As a backstop, the server takes any `updatedAt` more than a minute ahead of its own time as now. A change made offline before a device's first sync goes by its own clock, which is fine for one person's devices. A change is always dated after the one it replaces (a deletion after the record, Undo after the deletion), so it wins even when that one was dated by a clock that was ahead.
- **Signing out** forgets what was sent and fetched, so signing in again, as this account or another, merges everything again as a first sign-in does. Deleting the account signs out too.
- **On the You tab**, signed in, under what syncs: "Syncing…", "Synced at 12:30." (today) or "Last synced on 27 October.", "Not synced yet.", "You're offline: it'll sync when you're back online.", "It couldn't sync just now, and will try again in a minute.", or "Some of your data is from a newer version of Loop Workouts. Reload the app to update it, and it will sync too."
- **The code that syncs** is loaded only once someone signs in, so it doesn't add to the app's first load (near its 500 kB budget); nor does Supabase's.

### The backend

Compared on 2026-10-27, for cost, how it fits the device-first design above, sign-in, what it adds to the app's size, and an iPhone app later:

|                       | Supabase                                                  | Firebase (Firestore)                                                                     | Our own (Vercel functions and Postgres)    |
| --------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------ |
| Fits the design above | Well: the one table, with row-level security per user     | Brings its own offline copy, so the stores are rebuilt around it or there are two copies | Well, but we build all of it               |
| Sign-in               | Email link, Google and Apple built in                     | Email link, Google and Apple built in                                                    | The hard part: a library or service to add |
| Size in the app       | Small, or none with plain `fetch` to its API              | Large (Firestore and Auth), against a nearly full budget                                 | None                                       |
| iPhone app            | A Swift library, the same table                           | A strong Swift library                                                                   | Plain HTTP                                 |
| Cost at this size     | A free tier (an idle free project is paused after a week) | A free tier, then paid per read and write                                                | Free tiers of Vercel and Neon              |
| Leaving it            | Easy: it's Postgres                                       | Hard                                                                                     | Nothing to leave                           |

**Picked: Supabase**, in an EU region, unless its current pricing and limits say otherwise when it's set up (check them then). The app already does what Firebase is best at (working offline); Supabase's Postgres fits the one table and leaves a way out, and it adds little to the app.

## Acceptance criteria

- Given 2 workouts and 5 history entries, and a deleted workout, when I export, then a file named for today downloads holding all of them, the deletion and the settings.
- Given a workout here, when I import a backup with a later change to it, then the later one replaces it; with an earlier change, this one stays.
- Given a workout here with no note, when I import a backup where it was given a note later, then it has the note.
- Given a backup made after a workout was deleted on that device, when I import it, then the workout goes here too, unless I changed it here after.
- Given a workout I deleted here, when I import a backup that has it, then it stays deleted.
- Given my own exercise "Sled push" here, when I import a backup with a "Sled push" of its own made on another device, then I still have one "Sled push", and the backup's workouts and history that used its one use mine.
- Given a version 1 backup with a workout "Legs" and one the same already here, when I import it, then "Legs" isn't added again; a different workout with the same old id as one here is added with a new id, and both are kept.
- Given a backup with a light theme and lb, when I import it, then my settings don't change.
- Given I moved "Legs" to the top of the library on another device after any move here, when I import a backup from it, then "Legs" is at the top here too, with any workouts the backup doesn't have after the others.
- Given workouts, history and settings here, and a workout going, when I press Clear this device and then Clear everything, then the app starts again with none of them, and the workout isn't in the history.
- Given the app open in two tabs, with a workout going in the other, when I clear this device in one, then the other starts again empty too, and the workout isn't in the history.
- Given I press Clear this device, then nothing is cleared until I press Clear everything; when I press Cancel, then nothing changes and focus is back on Clear this device.
- Given a backup with 2 workouts not here, when I import it, then "Added 2 workouts." shows under the buttons and in the bar at the bottom, with View workouts; when I press View workouts, then Workouts opens and the bar goes.
- Given a file that isn't a backup, or is from a newer version, when I import it, then nothing changes and I'm told why.
- Given a backup with a broken workout and two broken history entries, when I import it, then the rest are added and "3 items in it couldn't be read" is shown.
- Given I press Copy AI prompt, then the prompt is on the clipboard and I'm told so.
- Given a file written by hand with a workout "Legs" of 8 back squats and 30 seconds of "Sled push", no ids and no history, and an exercise "Sled push", when I import it, then "Legs" is added with its first step linked to the built-in Back squat and its second to my new "Sled push"; when I import it again, then nothing new is added.
- Given 600 workouts in the history, when I open the app again, then all 600 are there.
- Given a history saved before it moved to IndexedDB, when I open the app, then every entry is still there.

- Given I'm signed out, when I press Email me a sign-in link with the field empty, then "Enter your email address." shows on the field, and nothing is sent.
- Given I'm signed out, when I press Continue with Google and sign in there, then I'm on Today, signed in as my Google address (as You says); when I cancel there instead, then it says "Signing in didn't finish. Try again, or sign in another way."
- Given an account made by email link as me@example.com, when I sign in with Google as me@example.com, then it's the same account, with the same data.
- Given I've asked for a sign-in email, when I type its code and press Sign in, then I'm signed in, and the tab says "Signed in as" my address.
- Given a sign-in link that's expired, when it opens the app, then the You tab'says so, and its address no longer has the reason in it.
- Given I'm signed in with everything synced, when I press Sign out, then I'm signed out, my workouts and history are gone from this device and my theme isn't; when I sign in again, they come back.
- Given I'm signed in and offline with a change not synced, when I press Sign out, then it asks first; Cancel leaves me signed in with the change; Sign out anyway signs out and removes it.
- Given I'm signed in, when I press Delete account, then nothing is deleted until I press Delete my account; then the account is gone, I'm signed out, and my workouts and history are gone from this device too, my settings staying.
- Given workouts and history on my phone, when I sign in on my laptop with the same account, then they're on my laptop too, and the laptop's are on my phone the next time it syncs.
- Given I'm signed in on two devices, when I change a workout on one, then the other has the change the next time it syncs (on opening it, or coming back to it); when I delete one, then it's deleted on the other.
- Given a workout changed on both devices, when they sync, then both end up with the change made last.
- Given I'm signed in and offline, when I change a workout, then it's saved here, the You tab'says I'm offline, and it's sent when I'm back online.
- Given I delete a workout and press Undo after it's synced, then it's back on every device.
- Given a phone whose clock is an hour fast, when it's synced once, then its changes are dated by the server's clock and don't beat later ones from my other devices.
- Given I sign out, then my data stays here; when I sign in again, then nothing's lost on either side.
- Given I'm signed out and haven't ticked the box for keeping notes, when I press Continue with Google or Email me a sign-in link, then nothing is sent, "Tick the box to agree before signing in." shows under the box, and focus is on it.
- Given I tick the box and sign in, then the account records when I agreed and the privacy notice's date, and the You tab says so, with how to withdraw.
- Given an account with no consent on record, when I open the You tab signed in, then it asks, with the tick and Agree; once agreed, it says when.

## Platform notes

- **Web:** `BackupService`, `backup-file.ts` and the AI prompt, `planPrompt()` in `plan-prompt.ts` (`src/app/shared/backup/`); the stores' `mergeWorkouts()` and `mergeEntries()` (and `importWorkouts()` for version 1 files), using `mergeRecords()` in `models/sync.ts`, and `WorkoutStore.mergeLibraryOrder()` for the library's order (with `inOrder()` in `models/sync.ts`); Clear this device is `ClearDeviceComponent` (`shared/components/clear-device/`) and `DeviceDataService` (`shared/state/`), which empties localStorage and sessionStorage, deletes the IndexedDB database and reloads; the You tab is `AccountComponent` (`src/app/account/`), at `/account`, with Your data in `YourDataComponent` (`src/app/account/your-data/`); deletions are kept by `DeletionStore`, and saved data is converted by `migrate.ts`. The file is downloaded through a link with `download`; on an iPhone, Safari offers to save it to Files. The picker is a file input opened by the Import button, kept out of the keyboard's way.
- **Accounts (web):** `AccountService` (`src/app/account/`) wraps Supabase's client, made by `ACCOUNT_CLIENT` in `account-client.ts` (the project's address and publishable key) and loaded only when it's needed: at once if the device has a session saved (`sb-…-auth-token`) or a sign-in's tokens are in the address, and otherwise once the sign-in form is used (`prepare()`, on focus or a press), so a first visit's welcome screen and a guest's You tab don't load it (since 2026-11-07; until then they did, 59 KiB). With no session to look for, it's signed out at once. It signs in with `signInWithOtp()` (an implicit-flow link back to `/account`, which the client reads from the address) or `verifyOtp()` with the code, or `signInWithOAuth()` for Google and Apple (SYN-7; those offered are `SIGN_IN_PROVIDERS`, each set up in Supabase under Authentication → Providers, coming back to `/account` as a link does), signs out with `signOut({ scope: 'local' })`, and deletes with the `delete_my_account()` database function. Since anyone can make an account, `push_records()` limits what one can store (500 changes a call, an id of 200 characters, 64 kB a record, 20,000 records and 20 MB an account), refusing the whole push when over. The sign-in sits in localStorage, so the site sends a Content-Security-Policy against injected scripts (a `<meta>` written by Angular's `security.autoCsp`, with the inline scripts' hashes) and, from `vercel.json`, `frame-ancestors 'none'` and the other security headers. The server side (the records table, row-level security and that function) is in `supabase/schema.sql`, run in the project's SQL editor. The sign-in emails are sent by Resend (in the EU) through Supabase's custom SMTP, from Loop Workouts <signin@mail.loopworkouts.com>; their templates, set in Supabase (Authentication → Emails), carry both the link (`{{ .ConfirmationURL }}`) and the code (`{{ .Token }}`). Tests use `fakeAccountClient()` (`shared/testing/`). Consent to keeping notes (SYN-10) is `ConsentService` (`consent.service.ts`), saved and looked up by `give_health_consent()` and `my_health_consent()` in `supabase/schema.sql`, which keep it in the `consents` table (deleted with the account); `PRIVACY_NOTICE_DATE` (`src/app/legal/notice-date.ts`) is the notice's date, shown on it and saved with consent. The tick is `HealthConsentComponent`, on the sign-in form and in `ConsentStatusComponent` on the You tab.
- **Sync (web):** `SyncStarter` (`src/app/sync/`, in the first load) loads `SyncService`, and with it Supabase's code, when the app opens on a device that's signed in (`sb-…-auth-token` is saved) or on signing in; it holds the status the You tab'shows (`syncText()`). `SyncService` follows the client's sign-in and out, and syncs with the `pull_records()` and `push_records()` database functions (in `supabase/schema.sql`); `sync-records.ts` turns records into the server's rows and back, using the stores' readers, and `BackupService.merge()` merges them in, as an import does. One Supabase client, from `ACCOUNT_CLIENT`, is shared with `AccountService`. The stores date changes with `SyncClock` (`shared/state/`), which keeps the server's time. Tests use `fakeSyncServer()`, which keeps records as the database does, and `fakeSyncStarter()` (`shared/testing/fake-sync.ts`); the SQL was checked against Postgres (PGlite) when it was written.
- **iOS:** a share sheet for export and a document picker for import, reading and writing the same file. Supabase's Swift library signs in the same way, with the code (or a universal link) rather than Safari.

## Open questions

- Should there be a nudge to export, or to add the app to the Home Screen, for those without an account?
