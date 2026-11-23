---
name: Loop Workouts
description: The workout timer that remembers what you lifted
colors:
  night-page: "#070b12"
  frost-text: "#e5ebf5"
  frost-text-strong: "#f0f9ff"
  slate-muted: "#bfccdd"
  panel-glass: "rgba(15, 23, 42, 0.35)"
  card-glass: "rgba(15, 23, 42, 0.42)"
  control-glass: "rgba(15, 23, 42, 0.75)"
  raised-navy: "rgba(15, 23, 42, 0.97)"
  slate-line: "rgba(148, 163, 184, 0.45)"
  sky-accent: "#38bdf8"
  cyan-glow: "#22d3ee"
  cta-cyan-top: "#67e8f9"
  cta-cyan-bottom: "#0ea5c6"
  cta-ink: "#032029"
  work-pink: "#fda4af"
  rest-blue: "#38bdf8"
  reps-violet: "#a78bfa"
  danger-red: "#dc2626"
typography:
  display:
    fontFamily: "Audiowide, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 400
    letterSpacing: "calc((1.25rem - 1em) * 0.04)"
  dialog-title:
    fontFamily: "Audiowide, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 400
  headline:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "2rem"
  title:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "2rem"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  hint:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 400
    lineHeight: 1.5
  label-caps:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.8rem"
    letterSpacing: "0.05em"
rounded:
  sm: "0.5rem"
  control: "0.75rem"
  card: "0.9rem"
  sheet: "1rem"
  pill: "999px"
spacing:
  gap: "0.5rem"
  gutter: "0.75rem"
  card: "1rem"
components:
  button-main:
    backgroundColor: "{colors.cta-cyan-bottom}"
    textColor: "{colors.cta-ink}"
    rounded: "{rounded.pill}"
    padding: "0 1.6rem"
    height: "52px"
  button-main-small:
    backgroundColor: "{colors.cta-cyan-bottom}"
    textColor: "{colors.cta-ink}"
    rounded: "{rounded.pill}"
    padding: "0 1.1rem"
    height: "44px"
  button-main-round:
    backgroundColor: "{colors.cta-cyan-bottom}"
    textColor: "{colors.cta-ink}"
    rounded: "{rounded.pill}"
    size: "80px"
  button-pill:
    textColor: "{colors.frost-text}"
    rounded: "{rounded.pill}"
    padding: "0 1rem"
    height: "44px"
  button-icon:
    backgroundColor: "{colors.control-glass}"
    textColor: "{colors.frost-text}"
    rounded: "{rounded.pill}"
    size: "44px"
  chip:
    backgroundColor: "{colors.control-glass}"
    textColor: "{colors.frost-text}"
    rounded: "{rounded.pill}"
    padding: "0 0.8rem"
    height: "36px"
  panel-card:
    backgroundColor: "{colors.card-glass}"
    rounded: "{rounded.card}"
    padding: "{spacing.card}"
  picker-field:
    backgroundColor: "{colors.control-glass}"
    textColor: "{colors.frost-text}"
    rounded: "{rounded.control}"
    height: "44px"
  dialog:
    backgroundColor: "{colors.raised-navy}"
    rounded: "{rounded.card}"
---

# Design System: Loop Workouts

## Overview

**Creative North Star: "The Training Partner"**

Loop Workouts should feel like someone who trains with you: it counts you through, tells you what's next, and remembers what you did last time. Warmth beats gadgetry. The look is a dark navy night with a soft sky-and-cyan glow, glassy panels the page shows through, and frosted bars floating over the bottom. At its centre is the workout's ring, whose pink, blue and violet tell you at a glance whether you're working, resting or on reps.

The system is tactile and physical, close to iOS. The main button is a raised, lit pill, every button shrinks a little as it's pressed, things move on a critically damped spring, and the bars are frosted glass. Physical doesn't mean busy: motion answers a touch or marks a change in the workout, and nothing moves just to be looked at. Hierarchy comes from size and weight in the system's own face. Audiowide, the display face, is kept for page titles and the workout's big numbers, and gives the app its character.

Dark is the default theme. Light is the same set of roles, each retuned for contrast on a pale page rather than inverted. Both meet WCAG AA, checked in tests.

**Key Characteristics:**
- A dark navy page with two soft glows, under see-through panels and cards.
- The ring's phase colours carry meaning: work pink, rest blue and reps violet.
- One raised cyan pill per screen for the main action.
- Frosted, floating pill bars at the bottom (the tabs, the run bar and Undo).
- Pills and soft rounded cards; nothing sharp-cornered.
- Spring motion that settles without a bounce, and a still version for reduced motion.

## Colors

The palette is cool and night-time: navy and slate neutrals, sky and cyan for what's live or tappable, and three phase colours kept for the workout. Every colour is a token in `src/styles.scss`, set for both themes. The frontmatter gives the dark theme's values; the light theme's are in `.impeccable/design.json`.

### Primary
- **Sky Accent** (`--accent`): focus rings, links, a chosen chip's tint and selected states. It's the colour of "this is the one you've picked".
- **Cyan Glow** (`--glow`, with `--glow-soft`, `--glow-text` and `--glow-dot`): what's live, such as the ∞ switch's light, the tab bar's selected tab and the muscles mainly worked on the body map.
- **Start Cyan** (`--cta-top` to `--cta-bottom`, with `--cta-ink` for its label): the gradient on the one main button, and the colour of the ∞ logo's light.

### Secondary
- **Work Pink** (`--work`): timed steps, filling the ring clockwise, and their badges and edges.
- **Rest Blue** (`--rest`): rest, filling the ring anticlockwise.
- **Reps Violet** (`--reps`): rep steps, with a full, still ring and the count on its face. It also edges tags such as "New best".

### Tertiary
- **Plan colours** (`--plan-1` to `--plan-4`: cyan, violet, pink and amber): to tell a ready-made plan's workouts apart on its week.
- **Danger Red** (`--danger`, `--danger-soft`, `--danger-strong`): deleting, and a swipe about to delete.

### Neutral
- **Night Page** (`--page-bg`, and `--page-paint`'s two glows and gradient): the page itself, painted on a layer fixed to the screen.
- **Frost Text** (`--text`, `--text-strong`) and **Slate Muted** (`--text-muted`): body text, titles and hints.
- **Glass surfaces** (`--panel`, `--card`, `--control`, `--control-hover` and `--raised`), from the page up: each is a touch more solid than the one under it. Dialogs use the near-solid `--raised`.
- **Chrome** (`--chrome`, `--chrome-edge`, `--chrome-light`): the frosted bars, with a bright top edge where light catches them.
- **Slate Lines** (`--border-soft`, `--border`, `--border-strong`): dividers, control edges and pressed edges.

### Named Rules
**The Phase Colour Rule.** Pink, blue and violet mean work, rest and reps, everywhere. Don't use them for anything else (decoration, categories or brand accents), or the ring stops reading at a glance.

**The One Main Button Rule.** A screen has at most one `.btn-main`. Everything else is a `.btn-pill`, `.btn-icon` or `.btn-add`.

**The Token-Only Rule.** No raw hex or `rgba()` in a component's styles. A see-through version of a token is `color-mix(in srgb, var(--token) 30%, transparent)`.

## Typography

**Display Font:** Audiowide (falling back to the system face)
**Body Font:** the system's own face (San Francisco on Apple devices, Segoe UI or Roboto elsewhere)

**Character:** a wide, rounded, slightly technical display face for the moments that matter, the workout's numbers and each page's title, over a system face tuned for reading at every size.

### Hierarchy
- **Display** (Audiowide, 400, 1.6rem for a page's title and 1.3rem for a dialog's): page titles, dialog titles and the workout's big numbers. Its tracking follows its size: none at 1.25rem, tighter as it grows (`display-tracking`).
- **Headline** (system, 600, 1.5rem, 2rem leading): a page's main heading in the reading face.
- **Title** (system, 600, 1.25rem, 2rem leading): a section's heading.
- **Body** (system, 400, 1rem, 1.45 leading): everything else. Sizes are in rem, so they follow the browser's text size.
- **Hint** (system, 0.85rem, 1.5 leading, muted): the line or two under a title saying what the page is for (`page-hint`).
- **Small and caps** (`small-type`, `caps`): anything 0.75rem or under is tracked out a little, and capitals more (0.05 to 0.07em), as they read as a block when set close.

### Named Rules
**The Display Is for Moments Rule.** Audiowide is for page titles, dialog titles and the workout's numbers, and nothing else. It has one weight, so never bold it.

**The Steady Digits Rule.** Numbers that tick use `tabular-nums` in the system face. Audiowide has no such digits, so the workout's countdown gives each digit a fixed-width cell (`ClockDigitsComponent`).

## Layout

Phones come first, in one column with a 0.75rem gutter (or the safe area, if it's wider). The page reaches the screen's edges (`viewport-fit=cover`) and keeps clear of the notch and rounded corners. Below 640px, dialogs become sheets from the bottom; at 640px and up they sit in the middle of the page. On a wide landscape window (900px and up), the workout page is two columns: the ring on the left, up to 36rem and as tall as the window allows, and the rows above it, Up next and the controls beside it.

The bars float over the bottom of the page: the tab bar (3.75rem), the run bar above it while a workout's going (3.5rem), and Undo above that after a delete (3.25rem), each 0.5rem apart. `--bars-height` adds up what's showing, so pages leave room for them. A page's own top bar (`src/app/nav/top-bar/`) stays at the top, and focus scrolls clear of both.

Spacing is small and steady: 0.5rem between related things, 0.75rem at the edges and 1rem inside a card. Touch targets are at least 44px, with `hit-area` adding the difference to anything drawn smaller, such as 36px chips.

### Named Rules
**The Arm's-Length Rule.** On the workout page, the step, the time and what's next must read from a metre or two away, and the next action is one big tap target.

## Elevation & Depth

Depth comes from layers of glass more than from shadows. Each surface (panel, card, control, raised) is a little more solid than the one under it, and the floating bars and dialog overlays blur what's behind them. Shadows are few and do a job: the raised main button, dialogs, and the bars' lit top edge.

### Shadow Vocabulary
- **Main button** (`inset 0 1px 0 var(--cta-edge), inset 0 -2px 0 var(--cta-shade), 0 2px 4px var(--cta-near), 0 8px 18px -6px var(--cta-far)`): a lit top edge and a shaded bottom make it raised, and a tight and a wide teal shadow set it on the page. It deepens on hover and flattens when pressed.
- **Dialog** (`0 18px 40px var(--shadow)`): lifts a dialog off its blurred overlay.
- **Frosted bars** (`backdrop-filter: blur(20px) saturate(180%)` on `--chrome`, with a `--chrome-light` top edge): the page scrolls under them.

### Named Rules
**The Glass, Not Glow Rule.** Depth is glass and a soft shadow, never a glow lighting up the page around a button. A glow under the main button was tried and was too much. The one glow is the ring's own flash as Done is pressed, a cue of the workout's, not decoration; the step strip's current segment is told by being filled and taller, not by a glow.

**The Honest Fallback Rule.** With reduced transparency, the glass goes solid in the colour it showed, and blurs drop. With more contrast, every surface gets a defined edge.

## Shapes

Soft and friendly: pills for anything tappable and short, and gently rounded cards. Corners are 999px for buttons, chips, tags and the bars; 0.75rem for fields and add buttons; 0.9rem for cards, panels and dialogs; and 1rem across the top of a sheet. Nothing has square corners. The ring and the round Pause button are full circles.

## Components

### Buttons
Tactile: each shrinks a little the moment it's pressed (`pressed-scale`), and springs back.
- **Main** (`.btn-main`): a raised pill with a cyan gradient, 52px tall, its label in `--cta-ink` at 1.0625rem and 600. A band of light crosses it once, soon after the screen opens, and then rests. `--small` is 44px, beside a page's title; `--round` is an 80px circle for the workout's Pause and Resume, with a deeper press and no band.
- **Pill** (`.btn-pill`): any smaller action, outlined in `--border` on no fill, 44px tall. On hover or press, its edge strengthens and it fills with `--control`. `--danger` is for Delete.
- **Icon** (`.btn-icon`): a 44px outlined circle on `--control`, for an icon on its own.
- **Add** (`.btn-add`): a dashed 0.75rem box in the colour of what it adds (work, rest, reps or a heading).
- **Focus:** a 2px `--accent` outline, offset 2 to 4px.

### Chips
- **Style:** a 36px pill on `--control` with a `--border` edge, 44px to a finger.
- **State:** picked (`aria-pressed`) has a `--glow-text` edge, an `--accent-soft` fill and a ✓. Tags (`tag`) are smaller, unpressable and edged in `--reps`.

### Cards / Containers
- **Corner Style:** 0.9rem.
- **Background:** `--card` on the page's `--panel`, both see-through (solid in the light theme, so it keeps its edge).
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** 1px `--panel-border`.
- **Internal Padding:** 1rem (`panel-card`).

### Inputs / Fields
- **Style:** a 44px field (`.picker-field`) on `--control` with a 1px `--border` and 0.75rem corners.
- **Focus:** the `--accent` outline.
- **Wheels:** times, reps and weights are picked on iPhone-style wheels (`wheel-picker`), swiped, scrolled or typed.

### Navigation
- **Tab bar:** a floating, frosted pill along the bottom with five tabs (Today, Workouts, Exercises, Progress and You). The selected tab sits on an `--accent-soft` pill edged in `--glow`, which slides between tabs on the spring.
- **Run bar:** a workout that's going floats above the tabs, like a music app's mini player, with its step, time and Pause.
- **Top bar:** a page's ‹ and title, kept at the top.

### Dialogs
On `--raised`, with 0.9rem corners and the dialog shadow over a blurred `--overlay`. On a phone, a dialog is a sheet from the bottom with a grab handle, which can be dragged away. Each closes by ‹ Back, Escape or a click outside.

### The workout ring (signature)
A glassy bubble whose ring fills as each step goes by, clockwise in work pink and anticlockwise in rest blue, and full and still in reps violet. Its fill has rounded ends, and the bubble is lit from the top left (`--bubble-light`, `--bubble-shade`) in both themes. The step's kind and name are on its face, and the big thing is the time on a timed step or a rest and the count on a rep step, each at `min(4rem, 17.4cqi)`, with the name a step smaller over a clock. Each step rolls in like a drum, and a timed step's last 3 seconds pop.

## Do's and Don'ts

### Do:
- **Do** keep pink, blue and violet for work, rest and reps only (The Phase Colour Rule).
- **Do** use one `.btn-main` per screen, and the shared `.btn-pill`, `.btn-icon`, `chip` and `panel-card` styles from `src/styles/` rather than new ones.
- **Do** take every colour from a token, set for both themes, with `color-mix` for a see-through version.
- **Do** make every touch target at least 44px, with `hit-area` where it's drawn smaller.
- **Do** move things on the spring (`--ease-spring`, 0.45s), with a still or faded version for reduced motion.
- **Do** keep Audiowide for page titles, dialog titles and the workout's numbers, never bolded.
- **Do** keep it warm and encouraging: progress is beating your last time.

### Don't:
- **Don't** go gym-bro: no black and neon red, shouty capitals or "beast mode" energy.
- **Don't** make it a clinical dashboard: no dense grey tables or walls of charts that turn training into admin. A chart has a job and a Show as a table.
- **Don't** add glows that light up the page, or motion that asks for attention after it has it (the main button's band crosses once).
- **Don't** add motion to the workout page beyond its own cues: the ring, the pulse before the next step and the drum roll.
- **Don't** use raw hex or `rgba()` in a component, or a second meaning for one class name.
- **Don't** change the ∞ logo, the ring's phase colours or Audiowide: `PRODUCT.md` keeps them.
