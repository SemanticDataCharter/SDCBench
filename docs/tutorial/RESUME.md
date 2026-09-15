# Resume notes for the SDCBench tutorial work

*Written 2026-09-15 when the work was parked. Read this first when picking it up. Everything
here is on the public repo's `dev` branch unless it says otherwise.*

## Where things stand

| Piece | State | Where |
|---|---|---|
| Tutorial PRD, "The Pizza Order" | Draft 1 with Tim's decisions folded in | `docs/tutorial/PRD.md` |
| Pizza ontology, v2.0, CC BY 3.0 | Downloaded, verified, upload fields written | `docs/tutorial/pizza.owl`, `docs/tutorial/PIZZA-ONTOLOGY.md` |
| Usability review, pass one | Done, with before and after captures | `docs/UX-REVIEW-2026-09-14.md`, `docs/review/` |
| Fix pass from that review | Built and verified with a mocked bridge | `app/` on `dev`; PR #1 (`dev` to `main`) |
| Release guard: one VERSION file, canon tests and tag checks in CI | Built; checks job proven green on the runner | PR #2 (`ci-release-guard` to `dev`) |
| The tutorial itself | Not started | will live in `pizza_tutorial/` at the repo root |

## Open pull requests

- **#1** `dev` to `main`: PRD, review, fix pass, ontology. The build workflow passed on it.
- **#2** `ci-release-guard` to `dev`: VERSION file, `tools/set_version.py`, `checks` job. Merge
  #2 into `dev` first, then #1 into `main`, or #1 first and then a second `dev` to `main`
  PR. Either order works. Note the workflow only auto-runs on PRs to `main`; #2 was proven by
  a manual dispatch on its branch.

## What only Tim can do, in order

1. **Pass two of the review: sit at the keyboard** with the shipped-or-dev build and do steps
   1 to 3 of the pizza tutorial cold (sign in, search, reuse, sketch, requirement, send).
   This decides whether the panel results list is enough or the Reuse flyout should go, and
   catches WebKitGTK rendering, drag feel and sign-in against production, none of which the
   mocked-bridge harness can see.
2. **Upload the ontology once, as Public**, from Tim's production account, with the exact
   fields in `PIZZA-ONTOLOGY.md`. The semantic-link search then finds `pizza.owl#...Topping`
   for every modeler.
3. **Merge #2 and #1**, then tag `v4.0.0-beta.3` on `main` after `python3 tools/set_version.py
   4.0.0-beta.3`. The tag ships the fix pass through CI to a GitHub Release.

## Then the bench picks up here

1. Create `pizza_tutorial/` with the FR-9 pre-flight script first: it confirms the ten reused
   components exist and are published under the labels in the PRD, and that the ontology is
   present and public. Run it against production.
2. Run the tutorial end to end ourselves, timing each step and reading the credits from the
   wallet history. Replace the target times in PRD section 6 with the measurements.
3. Save the finished step-2 canvas as the FR-3 draft file in `pizza_tutorial/`.
4. Write the eight step files and the index, with screenshots from the tagged build.
5. Help overlay and semanticdatacharter.com rendering; then the three-user test in PRD
   section 9, then Beale walks it.

## Decisions already made, so they are not reopened

- SDCStudio is for the domain-expert modeler; the learner plays both roles. Step 4 stays.
- Clusters are billed. The pizza model mints 3 groups and 7 fields: about 3,000 credits of the
  10,000 a $10 wallet buys. The bench's own cost dialog shows "3 new groups and 7 new fields".
- Connected blocks are the visualization; the generated app's pages are the data view. No
  charts, no CordovaOS, no FHIR in this tutorial. A FHIR variant is the likely sequel.
- The tutorial lives in `pizza_tutorial/` at the repo root. `docs/tutorial/` keeps the PRD
  and the ontology.
- "Search in" defaults to "Everything I can see" because the server already searches own,
  team and public projects when no project is sent; the bench used to send one.
- One teal for data blocks; the type badge carries the meaning. Reuse is a "reused" pill.

## Things to know before touching the code

- **Blockly 13:** `block.select()` is a no-op and `Blockly.common.setSelected()` fires no
  SELECTED event. The bench tracks `lastSelectedId` from both SELECTED and CLICK events and
  reads `Blockly.common.getSelected()` (`app/src/canvas.js`, `selectedBlock()`).
- **The review harness** is not in the repo. Recipe: copy `app/`, `canon/`, `docs/` to a
  scratch dir sharing `app/node_modules`; replace `app/src/sidecar/bridge.js` with a mock
  (canned sign-in, projects, wallet, search rows, `createModel`); expose
  `window.__bench = { Blockly, ws }` after `registerToolboxCategoryCallback` in `canvas.js`;
  append a `?scenario=` handler to `main.js`; run `npx vite --port 5173`; capture with
  `google-chrome --headless=new --screenshot --virtual-time-budget=5000`. The interactive
  Chrome tab freezes on overlays, so headless is the reliable path.
- **Canon tests need the SDC4 schema.** `tools/generate_composition.py` reads `SDCRM_XSD`,
  defaulting to `/home/twcook/GitHub/SDCRM/sdc4/schemas/sdc4.xsd`. CI checks out
  `SemanticDataCharter/SDCRM` at `v4.1.0`.
- **Version markers** are written by `tools/set_version.py`; `--check` is what CI runs. The
  first run found `package-lock.json` at 0.1.0.
- The `dev` branch on the public repo was created 2026-09-14 for this work; the repo had
  only `main` before.

## Verified facts the PRD relies on

- Default library (production backup of 2026-09-14): 75 published public components. The
  ten the tutorial reuses exist under the exact labels in PRD section 2.
- Component rows reference the project by its `ct_id`, not its primary key.
- Credits: mint 100, assemble 500, app download 1,500, validate 1, sign 5. $10 = 10,000.
- Registration ends with wallet funding, so a new account is a funded account.
- The GitHub copy of pizza.owl is version 1.5 with no license annotation; the Stanford copy
  is 2.0 with CC BY 3.0 declared in the file. We ship the Stanford one.
