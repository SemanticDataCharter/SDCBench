# SDCBench visual review, pass two

**Date:** 2026-10-02.  
**Build reviewed:** the `dev` branch after PR #1 (the September fix pass), read in full: `index.html`, `style.css`, `main.js`, `canvas.js`, the Tauri window config, the canon, the September screenshots in `docs/review/`. Compared against the two places a domain expert comes from: the company site (`axius-sdc.com`: off-white ground, Inter for text, Newsreader for headings, JetBrains Mono for identifiers, navy, teal and gold) and the SDCStudio web application (Inter, the same palette as design tokens, light with a dark variant, shadcn cards). **The brief, from Tim:** some of the UI looks old; this is the front door to domain experts.

Pass one (`UX-REVIEW-2026-09-14.md`) fixed the flow: search beside results, the empty-canvas hint, the reused pill, the requirement warning, the advanced disclosure. The look it left is a competent dark developer tool. This pass is about the look, and the verdict is that the bench does not yet look like it belongs to the two things it sits between.

## Why it reads as old, in five observations

1. **It is the only dark surface in the family.** The site is off-white; the Studio opens light. The bench opens on `#050b14`, so the first thing a domain expert sees after the Studio's sign-up page is a black window. Dark is not wrong, but dark by default, with no light mode, and a ground darker than either sibling, reads as a terminal rather than a bench.
2. **Stock Blockly chrome.** The toolbox is Blockly's default tree (two text rows with a colored tab), the zoom controls and the trash can are Blockly's stock grey icons, the grid is Blockly's dotted grid, and the flyout is a plain dark strip. Everyone who has seen Scratch or App Inventor recognizes it at once, and that recognition is the "old" feeling. The zelos renderer helped the blocks; nothing was done for the furniture around them.
3. **No typographic identity.** Everything is `system-ui` at 12 to 15 pixels. The header title is 15 px semibold. Section labels are 12 px uppercase muted. There is no display face, no size above 18 px anywhere, and the help overlay renders Markdown as a wall of 14 px paragraphs. The site and the Studio both use Inter; the site uses Newsreader for headings. The bench uses whatever the operating system has.
4. **No mark.** The header is the word "SDCBench" in 15 px. The Snap-Stack logo (`images/logo_transparent_cropped.png`, three interlocking blocks in navy, teal and gold, exactly the brand) appears nowhere in the application, not in the header, not on the sign-in card, not on the empty canvas. The window title is "SDCBench 4.0.0b2".
5. **The panel is a form, not a workspace.** The right panel is a stack of `select`, `input`, `textarea` and `button` with muted explanatory paragraphs between them, the same weight for the search box (the main verb) and the saved-drafts picker (rare). "Your model" has a two-line description box, a drafts row, a save-and-send row and an Advanced disclosure, all at one visual level. Nothing says what matters.

Under those, the blocks themselves are close: one teal for data, slate for groups, amber for attachments is right. The model root is an indigo (`#5b6ee1`) that belongs to no palette. The block face type is 11 px system-ui at weight 500 on 90 percent zoom, which is small on a 1100 by 740 window.

## The direction

Make the bench look like a bench from the same workshop as the site and the Studio: **light by default, the house type, the house mark, and the Blockly furniture replaced with ours.** Calm and exact, per the brand rule; nothing playful added, and the playfulness Blockly brings by default taken away.

Concretely:

- **Ground and surfaces.** Off-white ground `#f7f9fb` (the site's and the Studio's `brand-bg`), white panels and cards with a `#e1e6ea` rule, ink `#333333` for text and navy `#0a2342` for headings and the primary button, teal `#2ca58d` for the one accent, gold `#f0a500` only as the signal (units, ranges, warnings). A dark variant that follows the OS setting and keeps the same tokens inverted, so the people who liked the dark bench keep it.
- **Type.** Inter for everything (vendored, the site already ships `inter-latin.woff2` under the OFL), Newsreader at 500 for the sign-in heading, the empty-canvas welcome and the help headings, JetBrains Mono for identifiers (the version, a `ct_id` in Advanced). Body 14 px, labels 13 px, headings 20 to 28 px. Blockly's `fontStyle` to Inter 12 px at 500, start scale 1.0.
- **The mark.** The Snap-Stack logo at 28 px beside the wordmark in the header, at 64 px on the sign-in card, and large and faint on the empty canvas as the welcome. The window title "SDCBench", the version in the About line of Help only.
- **Blockly furniture, ours.** The toolbox becomes a narrow palette column with two labeled tiles ("New" with a block glyph, "Reuse" with the pill) drawn in our CSS over `.blocklyToolboxDiv` and `.blocklyTreeRow`; the zoom controls and trash hidden (`zoom.controls: false`, `trashcan: false`) and replaced by three small buttons of ours in the canvas corner (fit, zoom in, zoom out) plus delete-by-drag-off and the Delete key; the grid off or at 2 percent opacity; the flyout white with a rule; the scrollbars thin and ours. Blockly exposes every one of these through the theme `componentStyles` and plain CSS, no fork.
- **Blocks.** Keep teal, slate and amber. The model root to navy `#0a2342`, which is the one block that frames everything. Corner radius and notch size from zelos as they are. The field name input and the type dropdown already read well on the September screenshot; the only change is the face type.
- **The panel as a workspace.** Three cards with real hierarchy. *Find* at the top: the search box as the largest control, the scope selector as a small secondary line, results as rows with the type chip. *Describe* appears only when a sketched block is selected, as it does now, but as its own card with the block's name as the heading. *Your model* at the bottom: the status line as a sentence with an icon, the description box, then one primary button (Send) and one secondary (Save), the drafts picker and Advanced behind a small "More" row. Muted explanatory paragraphs cut to one line each or moved into placeholders and tooltips.
- **The first minute.** The empty canvas shows the mark and one sentence in Newsreader, "Your model starts here", with the two first moves as two short lines, in place of the current 13 px hint beside the root block. The sign-in card gets the mark, a 24 px Newsreader heading, a single input and button, and the two sentences it has now.
- **Help** as a right-side drawer over the panel rather than a centered modal, with the contents list it already has, Newsreader headings, 15 px body, and a width that does not cover the canvas. The cost confirmation stays a modal but gets the same card styling and a plain two-line sum.

## What it is not

- Not a React or framework rewrite. The app is 1,300 lines of vanilla JS and 157 lines of CSS; the whole direction above is CSS tokens, two fonts, one image, Blockly theme and CSS overrides, and a reflow of the panel markup. No change to `canvas.js`'s model, the bridge, the Rust side or the canon.
- Not a new feature. Nothing here adds a capability; the September flow stays exactly as it is, so the pizza tutorial's steps still hold.
- Not a light-only decision. The OS setting chooses; both looks use one token set.

## Effort and order

| Pass | What | Effort |
|---|---|---|
| A | Tokens, fonts, the mark, the header and sign-in card, light and dark via `prefers-color-scheme` | half a day |
| B | Blockly furniture: palette column, custom zoom buttons, grid, flyout, scrollbars, block face type, root color | half a day |
| C | The panel as three cards, the empty-canvas welcome, the help drawer, the confirm card | one day |
| D | Screenshots of the nine states again, the user guide's figures, a before-and-after row for the README | half a day |

Pass A changes the first impression by itself; B removes the Scratch feeling; C is where the panel stops looking like a form. All three fit in the beta line as 4.0.0-beta.3, which is the tag the parked tutorial work is waiting for anyway.

## Decisions taken, 2026-10-02

Tim: "I'm thinking along the lines of a boardgame app that you might see on a mobile app store", and then **tablet-first with desktop fit, guided first game in this release.** That changes the direction in three ways and the passes below replace the table above.

- **The feel is a well-made tabletop app:** pieces that lift and snap, a board that is a surface rather than a grid, everything large enough to touch, one thing to do at a time. Calm and exact stays the rule for the palette and the type; tactility is how the pieces move, not how they look.
- **One layout, tablet-first, desktop-fit.** Designed for an iPad in landscape (1024 wide) and up: the panel is a bottom sheet under about 900 pixels wide and docks right above it; the palette is a tray; every target is 44 pixels; the requirement editor is a sheet. Tested in the browser at iPad size before any store account exists. A phone build is a different, smaller product and is not planned.
- **The guided first game** runs the pizza model inside the app with the next move highlighted, as the first-run path. The written tutorial stays as the reference.

| Pass | What | Effort |
|---|---|---|
| A | Tokens, the three fonts, the mark, light by default and dark by OS setting, the responsive skeleton (sheet under 900 px), the header and sign-in card | half a day |
| B | The board and the pieces: our palette tray and zoom controls, the grid off, the flyout and scrollbars ours, lift and snap feedback on drag, the root block navy, touch targets | one day |
| C | The panel as three cards, the empty-canvas welcome, the help drawer, the confirm card, the sheet behavior on a tablet | one day |
| D | The guided first game: the pizza model as a scripted sequence of moves with the next move highlighted and the panel's prompt per step, skippable, resumable | two days |
| E | Screenshots of the states at desktop and iPad size, the user guide's figures, a before-and-after row for the README | half a day |

Ships as 4.0.0-beta.3. Android through Tauri 2 follows the desktop release and needs no new hardware; iOS lands with macOS when a Mac does.

## Decisions for Tim (the earlier five, as answered)

1. **Light by default, dark by OS setting.** Taken.
2. **Newsreader for the few display lines.** Taken.
3. **The mark on the empty canvas**: faint and large behind the welcome line. Taken.
4. **Blockly's zoom and trash**: ours. Taken.
5. **Order**: A to E as in the second table.
