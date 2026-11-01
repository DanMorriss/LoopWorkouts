# Home and navigation

## Stories

- **NAV-1** As a user I want to get to any page from anywhere, and straight back to a workout in progress.
- **NAV-2** As a user I want the app to open on what to do next and how my week is going.
- **NAV-3** As a new user I want to choose, the first time I open the app, whether to sign in or carry on as a guest, so I know an account's there without having to make one.

## Rules

### Where the app opens

- **The welcome screen** (NAV-3, `/welcome`) opens instead of Home on a device new to the app: not signed in, not welcomed yet, and with no workouts or history. That's a first visit, and the first open after signing out, deleting the account or Clear this device, which all empty the device. A device already in use as a guest when it came in (on 2026-10-30) has workouts or history, so goes straight Home, and counts as welcomed from then on.

    - Top to bottom: the ∞ logo, "Welcome to Loop Workouts", "Build your workouts, run them with a timer that counts your sets and rests, and see how you're getting on.", then signing in as on the Account tab (Continue with Google, "or", the email link and its code; see [backup-and-sync](backup-and-sync.md)), introduced by "Sign in to keep your workouts and history on every device you use.", then, set apart, **Continue as guest**, described by "Everything stays on this device. You can sign in any time from Account."
    - **Continue as guest** goes Home, and the device isn't asked again (`welcomed` in localStorage; see [data](data.md)). Signing in with the code goes Home too; Google and email links come back by way of the Account tab, which goes on Home once signed in.
    - There's no tab bar on it, as there isn't on the workout, so it's one choice. Linking straight to another page (e.g. an exercise) opens that page; the welcome screen waits for Home.

- The app opens on **Home** (NAV-2), at `/home`; `/` goes there. It came back on 2026-10-28, after the app had opened on the Library since the tab bar came in.
- Home opens with **Due today**, the weekly plan's workouts for today, each with Start (PLN-2, see [planning](planning.md)), then the **suggested next workout** card, with Start (not shown while a planned workout is still due today), and the **muscles worked this week** card (the body map and a bar per muscle group), both the same as on the History page (see [progress](progress.md)). A card with nothing to show isn't there.
- Before any workout, it says "Do a workout, and what to do next and the muscles you've worked show here.", with **Go to the library**.
- Home has no logo: it's on the welcome screen, and in **Account**, under **About** (the loop draws itself in and a light travels round it; it rests where the loops cross with reduced motion on).
- **On the old address** (loop-workouts.vercel.app, before the app moved to loopworkouts.com on 2026-10-28), the app moves itself to loopworkouts.com, on the same page, once nothing would be left behind: each address keeps its own data. That's straight away with nothing saved (no workouts, history, exercises of your own, notes, hidden exercises or plan), or once signed in and everything has synced, as signing in there brings it back. A sign-in coming back is left to finish first. Until then, every page starts with a card, "Loop Workouts has moved to loopworkouts.com", saying what to do:
    - **A guest with things saved:** "Your workouts and history are saved on this address only. Sign in to take them with you: signing in there brings them back.", with **Sign in** (the Account tab) and **Open loopworkouts.com**. It moves once they've signed in and synced.
    - **Signed in, with changes not synced** (offline, say): "Some of your changes haven't synced yet: check your connection. Once they have, signing in there brings back everything.", with **Try again**. It moves by itself once a sync goes through.
    - **Added to the Home Screen**, which stays on the address it was added from, so never moves itself: "This Home Screen app stays on the old address, so after that, open loopworkouts.com in your browser and add it to your Home Screen."; or, once nothing would be lost, "Nothing here would be lost now. Open loopworkouts.com in your browser and add it to your Home Screen, then remove this one. If you have an account, sign in there."

### The tab bar

- Along the bottom of every page but the workout's: **Home**, **Exercises**, **Library**, **History** and **Account**, each an icon with its name under it, each wider than 44px on a 320px-wide phone (about 58px). Home was added as the first tab on 2026-10-28, and Exercises moved before Library. Settings was a fifth tab until 2026-10-28; it's now a row on Account that slides in over it (see [settings](settings.md)).
- It's a capsule floating over the bottom of the page, the same shape on a phone and on a wide screen (up to 26rem wide, centred), in a frosted material the page scrolls under. It sits clear of an iPhone's home bar.
- The chosen tab has a highlight behind it, which slides to the next one when you change tab, on a spring with no bounce. A tab is chosen on its own page and the pages under it (an exercise's page is under Exercises; Settings, the Privacy notice and Terms of use under Account); making or editing a workout is under **Library**.
- Screen readers hear it as the "Main" navigation; the chosen tab is the current page on its own page, and the current item on a page under it (e.g. "Library, current" while making a workout).
- Pages leave room at the bottom for the bars, so the last of a page scrolls clear of them.
- **A tab left open across an update still opens every page.** A tab running the app from before a new version went live (e.g. one the browser kept in the background) can't find the code for pages it hasn't opened yet, so it loads that page afresh, which brings in the new version. It only tries once in a few seconds, so a page that really is broken doesn't reload over and over.

### A workout in progress

- On every page but its own, a workout that's going shows in a **bar above the tabs**, like a music app's mini player: a dot in the step's colour (pink timed, blue rest, violet reps, grey paused), the workout's name, and the step with its time, e.g. "Squats · 00:23", "Push-ups · 20 reps" or "Paused · Squats · 00:23", ticking down.
- **Pause** (or **Resume**) is at its right. The rest of the bar opens the workout.
- **Swiping the bar right ends the workout**, as End workout does. The bar follows the finger, and red **End workout** shows in the gap it leaves, turning solid (with a tick of vibration) once letting go would end it. Let go past halfway, or flicked, it slides off, the workout ends and its summary opens, where **Back to workout** takes it up again; short of that it springs back. Pulled left of where it rests, it moves less than the finger, more stiffly the further it goes. Caught again as it springs back or slides off, it stops where it is and follows the finger from there; caught sliding off, the workout doesn't end unless it's let go past halfway again. Only a finger or pen: a mouse drag does nothing, and up and down still scroll the page. A finished workout's bar doesn't swipe.
- Once the workout has finished, the bar says "Finished: see how it went", with no Pause, and opens the summary.
- The bar rises into place as it appears.
- **The workout grows out of the bar** when it's pressed: the bar's frosted panel grows to fill the screen with the workout fading in on it, on a spring with no bounce, while the tab bar slides down out of the way. **⌄ folds it back** the same way: the panel shrinks into the bar and the tab bar comes back up. Every other change of page is instant, as switching tabs is. With reduced motion, the pages cross-fade quickly instead. A tap mid-way doesn't wait for it: it ends the move at once and lands on what it was over (as it does mid-slide on an exercise's page, Settings, or the theme's fade).
- The **workout page** has no tab bar. A **⌄** button at its top left goes back to the page you came from (with its address, e.g. a muscle filter), named for it, e.g. "Back to History". The workout keeps running, in the bar. Opened straight from an address, it goes back to the Library.
- On the workout page on a phone, the workout's title takes the place of "Loop Workouts" in the header. An untitled workout keeps "Loop Workouts".

### Undo

- Deleting goes ahead **at once**, with no "Are you sure?" (the one exception is Clear this device, which can't be undone; see [backup-and-sync](backup-and-sync.md#clear-this-device-syn-9)): a workout in the library, a step in setup (one with anything in it), your own exercise (or hiding one that's in your history instead), a workout in the history. Then the **Undo bar** offers to put it back.
- It floats above the tabs (and the workout's bar), in the same frosted capsule: what happened, e.g. "Deleted "Legs day".", **Undo**, and a close button. It rises in, and sinks out as it goes.
- **Undo** puts it back as it was, where it was, and focus goes to it (e.g. the workout's ⋮ button). An exercise deleted from its page opens that page again.
- It **doesn't go on a timer**, so there's always time to read it and reach it. It goes when it's used, closed (or Escape), replaced by another delete, or the page changes.
- Focus goes to Undo as it appears, so it's one key away, and screen readers hear what happened. Closing it puts focus where it would have gone after the delete.
- **Notices** use the same bar, with no Undo: "Signed in as me@example.com." on Home after signing in, and what happened after signing out, deleting the account or being signed out (see [backup-and-sync](backup-and-sync.md)). They're read out as they show, don't take focus, and go as an offer does. A notice can have a link in place of Undo, e.g. **View library** after Import backup; and one already read out on its page (the import's result, said under its buttons) is shown but not read out again.

## Acceptance criteria

- Given a device new to the app, when I open it, then the welcome screen opens, with no tab bar; when I press Continue as guest, then Home opens, and opening the app again opens Home.
- Given a device with workouts from before the welcome screen and no account, when I open it, then Home opens.
- Given I'm signed out after signing out, when I open Home, then the welcome screen opens.
- Given nothing saved on loop-workouts.vercel.app, when I open a page there, then the same page opens on loopworkouts.com.
- Given workouts saved on loop-workouts.vercel.app as a guest, when I open it, then it stays, with the card saying it's moved; when I sign in and it's synced, then it moves to loopworkouts.com.
- Given I open the app, then it's on Home, with Home chosen in the tab bar.
- Given no workouts yet, when I open Home, then it shows Go to the library, and no logo.
- Given a workout done this week and a saved workout to suggest, when I open Home, then it shows the suggested next workout, then the muscles worked this week.
- Given the History tab, when I press Account, then Account opens and the highlight slides to it.
- Given Settings, opened from Account, then Account is chosen in the tab bar.
- Given I'm making a workout, then Library is chosen.
- Given a workout going, when I press ⌄ on its page, then I'm back where I came from, with the bar above the tabs showing the step and its time; pressing the bar's Pause pauses it, and pressing the bar opens the workout again.
- Given a workout finishes while I'm on History, then the bar says "Finished: see how it went" and opens the summary.
- Given a workout going, when I swipe its bar right past halfway and let go, then the workout ends and its summary opens; when I let go short of halfway, then the bar springs back and the workout carries on.
- Given the workout page, then there's no tab bar.
- Given a tab open since before a new version went live, when I press History (or Account, or New), then that page opens, on the new version.
- Given a workout going, when I press its bar, then the workout grows out of the bar to fill the screen; when I press ⌄, then it shrinks back into the bar and the tabs slide back up.
- Given I delete a workout, then it's gone and the Undo bar says "Deleted "Legs day"." with focus on Undo; when I press Undo, then it's back where it was.
- Given the Undo bar showing, when I wait, then it stays; when I go to another page, then it goes.

## Platform notes

- **Web:** `TabBarComponent` (`src/app/nav/tab-bar/`, tabs in `tabs.ts`), the ‹ back link at the top of a page that slides in over another in `BackLinkComponent` (`src/app/nav/back-link/`), `RunBarComponent` (`src/app/nav/run-bar/`, which also handles its swipe to end, as the library's workout cards handle theirs to delete), the header and its back link in `NavComponent` (`src/app/nav/`), and the logo in `LoopLogoComponent` (`src/app/shared/components/loop-logo/`). The welcome screen is `WelcomeComponent` (`src/app/welcome/`), opened by Home's `welcomeFirst` guard (`welcome-first.ts`), with the sign-in shared with the Account tab, `SignInComponent` (`src/app/account/sign-in/`). Home is `HomeComponent` (`src/app/home/`), showing `DueTodayComponent` (`src/app/home/due-today/`), `SuggestedWorkoutComponent` (`src/app/history/suggested-workout/`) and `MusclesThisWeekComponent` (`src/app/history/muscles-this-week/`), shared with the History page; `/home` waits for the history to load, as `/history` does. Routes in `src/app/app.routes.ts`. Moving off the old address is `AddressMove` (`src/app/nav/moved-banner/`), started in `main.ts`, with its card, `MovedBannerComponent`, at the top of `<main>`. A page whose code fails to load (renamed by a later deploy; Vercel answers for the old name with index.html) is loaded afresh by `reloadOnStaleCode` (`src/app/nav/stale-code.ts`), the router's navigation error handler in `main.ts`. How much of the page the bars cover is `--bars-height`, worked out in `styles.scss` with `:has()` from which bars are showing; pages use it to leave room. `viewport-fit=cover` in `index.html` makes `env(safe-area-inset-*)` work, for the gap above an iPhone's home bar. The Undo bar is `UndoBarComponent` (`src/app/nav/undo-bar/`), showing the offer that pages make through `UndoService` (`src/app/shared/undo/`). The morph is `WorkoutMorph` (`src/app/nav/workout-morph.ts`): the bar and ⌄ start a view transition around their own navigation (the router makes none, so other pages change at once), and `src/styles/_workout-morph.scss` pairs the bar with the workout page by view-transition-name, only while it runs.
- **Web, added to the Home Screen:** `manifest.webmanifest` makes it open on its own, without the browser's bars (`display: standalone`). `<meta name="theme-color">` is the page colour (`--page-bg`) of the theme in use: index.html sets it before the app loads, then `ThemeService` keeps it in step, so the browser's bars, and an installed app's, match the page.
- **Web, the icon:** the favicon is the ∞ and its light on the Start button's cyan: `public/favicon.svg` (the light moves round the loop in Firefox; other browsers show it still), `favicon.ico` for browsers without SVG icons, `apple-touch-icon.png` for an iPhone's home screen, and `icon-192.png` and `icon-512.png` for `manifest.webmanifest`, all drawn by `tools/build-favicon.mjs`. An iPhone app would use the same artwork, square, as its app icon.
- **Web, shared links:** `index.html` has a description for search results, and Open Graph and Twitter card tags, so a link to loopworkouts.com shows a title, a line and a picture when shared. The picture is `public/share.png` (1200 × 630): the name and tagline beside a phone mid-workout, made by `tools/build-share-image.mjs` from a running `ng serve --port 4300`. Make it again when the workout screen's look changes. The words, and their longer versions for listings and posts, are in [marketing](../marketing.md).
- **iOS:** a `TabView` with the same five tabs. The workout in progress is a bar above the tabs (`tabViewBottomAccessory`, as Music's mini player), opening the workout full screen with a zoom transition from the bar (`.navigationTransition(.zoom(sourceID:in:))`), and a leading `.swipeActions` (or a drag gesture, if the accessory doesn't take swipe actions) to end it; and a **Live Activity** on the lock screen and Dynamic Island, which also serves ALM-2 and CTL-1.
