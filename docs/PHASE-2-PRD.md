# SDCBench — Phase 2 PRD

**Status:** Rev 3, 2026-08-11. Supersedes rev 2 (rev 2 remains in git history).
Rev 3 encodes the **separation line**: SDCBench diagrams a data model and captures
requirements; SDCStudio does the modeling and publication. This retires the tier-1
constraint editor and promotes the plain-language requirement to the primary
handoff artifact. Design foundation: [`COMPOSITION-MODEL.md`](COMPOSITION-MODEL.md).

## 1. Goal

Let a domain expert **assemble a governed data model by reusing published SDCStudio
components**, searching the open library and pulling in components that already
*mean* what their data means, and **sketch a new component only when the library has
none that fits**, stating in plain language what it should mean. The output is a
**draft Data Model plus per-component requirements**, handed to a data modeler to
finish (constraints, semantic binding, units, reference ranges, publish) in
SDCStudio.

### ★ The separation line (rev 3)

SDCBench is a **high-level diagramming and requirements-capture tool, not a modeling
tool.** A domain expert should be able to lay out how their data sits in a document
tree and say, in plain language, what each piece is, without ever meeting the
reference model. The modeling itself (constraints, semantic binding, units,
reference-range values, tier-3, publish) needs modeling knowledge and stays in
SDCStudio, the final publication UI.

| | SDCBench (domain expert) | SDCStudio (data modeler) |
|---|---|---|
| Does | reuse published components, sketch new ones, structure the tree, **state requirements in plain language** | constraints, units, reference ranges, semantic binding, tier-3, **publish** |
| Produces | a draft model (reuse by `ct_id` + new stubs) with per-component requirements | the finished, published model |

The handoff mechanism is the **requirement description** on each component, not a
constraint editor. SDCStudio's publish gate still enforces completeness (a
quantified type cannot publish without a published Units; a parent cannot publish
with unpublished children), so nothing incomplete escapes to the library.

**One-line success (rev 3):** a non-modeler searches the library, drops in the
published components that match their data, sketches a new one only for a genuine
gap (choosing its data type and writing a plain-language requirement), and creates a
**draft Data Model built mostly from reuse**, ready for a modeler to finish in
SDCStudio, without ever meeting `XdQuantityType`, `Cluster`, or `XdAdapter`.

### ★ Governing principle (unchanged): the psychology is the point

We solved the substrate problem; this tool **meets scientists where they already
are.** Scientists think in **building blocks**, so the canvas lets them *see* their
data assembling into a **document tree** ("this is how my data sits in a tree") and
**drag components into the places the RM rules allow.** That felt sense of building a
structure they understand, not feature depth, is the primary design driver.
Corollary guardrail: **resist overexposing the reference model.** Rev 3 acts on this
guardrail directly by removing the constraint editor: the richest modeling detail is
exactly where overexposure creeps in, so it lives in SDCStudio, not here.

Two parts:

- **2a — Reuse-first assembly (the core; essentially complete).** Search/browse the
  published library, add matching published components to the model by `ct_id`,
  structure them into Groups on a Blockly canvas.
- **2b — Create only when required (reduced to requirements capture).** When no
  published component fits a concept, mint a **new draft**: its data type plus a
  **plain-language requirement description**, wired into the model alongside the
  reused components. No constraint editing on the bench.

## 1.1 What changed since rev 2

Rev 2 assumed the Phase-1 CSV-analyze flow seeded the canvas. The shipped rev-3 app
is **canvas-first**: it opens on the Blockly assembly canvas behind an
**API-key-only** login gate; the CSV-analyze and BYO-LLM paths are set aside. Built
since rev 2:

- Canvas-first shell; Google Blockly v13 vendored offline; key-only gate with
  keychain-stored token and auto sign-in.
- **Dual project selectors:** "Building in" (own + team projects only, the build
  target) and "Search in" (any accessible project, the reuse source).
- **Reuse flyout:** the library search feeds a dynamic Blockly "Reuse" category; drag
  a published component onto the canvas to reuse it by `ct_id`.
- **RM membership rules, canon-driven:** only Xd\* leaves + sub-Clusters may sit in a
  Cluster (structural types excluded); a Units attaches only to a number field; a
  ReferenceRange attaches only to an XdOrdered field.
- **Type-color legend:** data types are greens shaded by family (Entry / Ordered /
  Quantified), a Cluster is slate, attachments (Units, ReferenceRange) are amber, the
  Model is indigo; reuse is shown by a ↩ tag, not color.
- **Nested create:** the tree writes a draft DM rooted on a Cluster tree, wiring
  reused components and new stubs by `ct_id`.
- **Local Save / Load** of a draft (structure + reloadable workspace) to the machine,
  not SDCStudio.
- **Hover-description** on reused blocks (the component's published description).
- **Units nullable** at SDCStudio (see FR-0c), so a number-field draft saves without
  units; the modeler finalizes units before publish.

## 2. Non-goals (explicitly deferred)

- **Publishing / binding / finalize** — never on the bench (D15). Drafts only.
- **Constraint modeling of any kind on the bench** — units values, reference-range
  intervals, code-system binding, semantic definition URIs, tier-2 and tier-3. (Rev
  3: the tier-1 constraint editor is removed; the requirement is captured as
  plain-language description instead.)
- **Minting Units / ReferenceRange / XdInterval** — the bench **reuses** published
  Units and ReferenceRanges (drag them in); it does not create them. (Clarifies rev
  2, which read as excluding them entirely.)
- **Structural modeling** (subject/provider/participations/workflow/acs/audit/
  attestation; Party/Participation/Audit/Attestation) — SDCStudio.
- **Authoring/curating the library itself** — the bench consumes the published
  library; contributing/publishing to it is SDCStudio's job.
- **Windows / macOS builds; Ollama-as-default** — the beta ships as a Linux x86-64
  AppImage. A **native Windows** build (`.exe`/`.msi`, WebView2, Windows Credential
  Manager) is documented in [`BUILDING-WINDOWS.md`](BUILDING-WINDOWS.md) and planned
  (must be built on Windows; a Win11 machine is available). **macOS** is deferred
  (needs a Mac + Apple signing). Frontier-key default stands.

## 3. Dependencies

- **FR-0a — Library search API [CONFIRMED live vs prod SDCStudio 4.4.0].**
  `GET /api/v1/dmgen/components/?status=published&search=<query>&page_size=<n>[&project=<ct_id>]`
  (auth `Authorization: Token <key>`). `search` matches label + description; the
  queryset scopes to the user's projects + default-library + published-public
  components, i.e. exactly "the library." Each result (`ComponentListSerializer`) is
  `{ct_id, label, description, type, published, public, project_name,
  project_ct_id, created, updated}`. The `type` drives the data-type badge (FR-8b) and
  the Cluster field / attachment slot the component wires into on create. No
  reuse/reputation signal in this contract (future SDCStudio work); rank by relevance
  + default-library membership.
- **FR-0b — Composition map green [DONE].** `tools/generate_composition.py` produces
  `canon/composition-model.json` passing the full `tests/` suite (families,
  question-groups, api-type badges, cluster-member set, all drift-guarded against
  SDCStudio source). **36 tests pass** (rev 2 read "7 green / 24 red").
- **FR-0c — SDCStudio quantified `units` nullable [DONE, deployed].** `units` is now
  `null=True, blank=True` on XdCount/XdQuantity/XdFloat/XdDouble (migration `0021`,
  PR #485). A number-field **draft** saves without units; **publish still enforces
  units defined + published** (and #484 aligned `publish_XdFloat` with its siblings),
  so the anti-drift rule is intact. This is what lets the bench treat units as
  optional at draft time.

## 4. User flow (rev 3)

1. **Sign in** with an SDCStudio API key (stored in the OS keychain; auto sign-in
   after). Pick the **build project** (your own) and a **search source** (any
   accessible project or library).
2. **Search / browse the library** and **reuse** matching published components by
   dragging them onto the canvas (reuse is the primary, default action). Hover a
   result to read its description.
3. **Assemble** the reused components into **Groups** under the model's root Cluster
   (drop-validity from the map; `XdAdapter` hidden).
4. **Sketch a new component only when required** — choose its data type and write its
   **plain-language requirement**; attach a reused Units / ReferenceRange when one
   exists. No constraint editing.
5. **Create the draft model** — a Cluster tree referencing reused components by
   `ct_id`, plus new stubs, plus the DM, all `published=False`, in your own project.
6. **Hand off to SDCStudio** — a modeler finalizes constraints, units, reference
   ranges, binding, and publishes, using the per-component requirements as the spec.

## 5. Functional requirements — 2a (reuse-first assembly) [essentially complete]

- **FR-1 Library search, plain language [DONE].** Search published components by
  meaning ("blood pressure," "a date of birth"), not by RM type. A result shows the
  **label** and the **data-type badge** (from `type`, FR-8b); **hover shows the
  component's description.** Click-to-SDCStudio-detail is deferred to a later version
  (this user level does not need it).
- **FR-2 Reuse is the primary action [DONE].** Dragging a published component onto the
  canvas is one gesture; it joins by `ct_id` (no mint). Reuse is the obvious default;
  "create new" is the deliberate exception (FR-9).
- **FR-3 Seed from analysis matches [OUT OF SCOPE, rev 3].** The CSV-analyze path is
  set aside; the canvas opens empty (a Model with its root Group). Revisit if the
  analyze path returns.
- **FR-4 Assemble on the canvas [DONE].** Three node kinds (Model / Group / Field);
  drop-validity read from `composition-model.json` node_kinds (root takes exactly one
  Group; a Group takes Groups + Fields; a Field is terminal); `XdAdapter` auto-hidden.
- **FR-5 Live SDC-tree readout [DONE].** Model to Cluster to fields, in the panel.
- **FR-6 Reorganize + reversible [DONE].** Move / regroup / remove (drag a block off to
  remove it); Blockly undo; nothing is written until the single **Create draft model**
  action.
- **FR-7 Create the draft model from the tree [BUILT; pending live verification].**
  Cluster(s) wiring reused components by `ct_id` and new stubs, preserving group
  nesting as nested Clusters, rooted on a draft DM. Reused Units / ReferenceRanges
  wire into the new leaves; server validation errors surface to the offending node.
- **FR-8 Renderer: Blockly v13 [DONE].** Vendored offline. Kind-level drop-validity is
  expressed as connection `check` arrays sourced from the map (default
  `ConnectionChecker`); a custom `ConnectionChecker` is the escape hatch only if
  canDrop ever needs family/role logic beyond kind membership.
- **FR-8a Component block face [DONE, minus click-detail].** A block shows a
  **data-type badge** in scientist terms (Decimal, Integer, Date, Text, Code,
  Boolean, Link, File, List, Range), **never RM vocabulary**; its **label**, color by
  data family; and **hover to a description** (published description for reused; the
  requirement for new, once FR-13 lands). Click-to-detail deferred.
- **FR-8b Display-type map [DONE].** `TYPE_BADGES` in the generator, emitted at
  `canvas.node_kinds.Field.type_badges`. Single display vocabulary.

## 6. Functional requirements — 2b (create only when required) [reduced to requirements capture]

- **FR-9 Create-new is the guarded exception [PARTIAL].** New components are minted
  from the "New" palette; reuse is surfaced first. The soft "did you check the
  library?" nudge is optional and not yet built.
- **FR-10 [REMOVED, rev 3] Tier-1 constraint editor.** Retired by the separation line.
  Constraint modeling belongs to the data modeler in SDCStudio. Superseded by FR-13.
- **FR-11 [REMOVED, rev 3] Answers bind via `binds_to`.** Depended on FR-10. The canon
  `question_groups` / `binds_to` metadata remains in `composition-model.json` for any
  future modeler-side tooling, but the bench does not consume it.
- **FR-12 Units and reference ranges are reuse-first [DONE, reframed].** A new number
  field can take a **reused Units** (drag it into the units slot); an XdOrdered field
  can take **reused ReferenceRanges**. Both are **optional at draft** (FR-0c); the
  modeler finalizes them. The bench never mints a Units or ReferenceRange.
- **FR-13 [PROMOTED, the centerpiece; DONE] The requirement description is the
  handoff artifact.** Every **new** component carries a plain-language requirement
  ("what is this: units, normal/expected values, and any guideline or protocol, e.g.
  'systolic BP in mmHg, adult normal <120, per ACC/AHA 2017'"), edited in a panel when
  the block is selected (block face stays minimal). Stored on the block, shown on
  hover, round-tripped through save/load, and wired into the draft (a field's
  requirement becomes its component description; a group's becomes its cluster
  description). **Required for new fields** (create is blocked, naming any still
  missing one). Reused components already carry their published description (hover,
  FR-8a).
- **FR-14 [REMOVED, rev 3] Automatic `leaf_discriminator`.** Needed the data-analysis
  path; the user picks the number type directly. Revisit with FR-3.

## 7. Why this shape (strategy)

- **Reuse is the moat and the flywheel.** Every reuse leverages the open library and
  (via the planned reuse/reputation metrics) rewards the original author; "create only
  when required" keeps the library the source of truth and minimizes sprawl.
- **The handoff is the funnel.** A sketched draft's finalize work (constraints, units,
  reference ranges, binding, publish) is the **modeler's** job in SDCStudio, which
  pulls users into SDCStudio and onward to VSL. Rev 3 sharpens this: the bench
  deliberately stops at *requirements*, so the modeler's role, and the pull into
  SDCStudio, is structural rather than optional.
- **The canvas makes "the tool is the teacher" real**, whether components come from
  the library or a rare sketch, without teaching the reference model.

## 8. Open questions (carry into design)

- **Reuse trust signal.** Beyond the description-on-hover, what makes reuse
  trustworthy (reuse-count, "used by N models," provenance)? Depends on a future
  SDCStudio reputation-metrics API.
- **Create-new nudge strength.** A soft "no match? create one" vs a firmer "search
  first" before minting (FR-9).
- **Conflict / duplication control on write.** Drafts are private and the modeler is
  the publish-time dedup gate, so heavy control is unwarranted; the one real footgun
  is accidental double-create (a light guard is planned).
- **Onboarding / the empty-canvas first moment** for a non-developer.
- **Second brain (Q9).** Corrections + reuse choices feeding the domain KB so the next
  dataset's matches are smarter.

## 9. Acceptance criteria (rev 3, definition of done)

1. Library search works against SDCStudio (FR-0a) and `composition-model.json` passes
   the `tests/` suite (FR-0b). **[met]**
2. A non-modeler can: **search the published library, add matching components by
   reuse, structure them into a multi-group model, sketch a new component only for a
   genuine gap (choosing its data type and writing a plain-language requirement), and
   create a draft Data Model built mostly from reuse**, with no duplicate minting of
   library components. **[met except FR-13 requirement field]**
3. No RM vocabulary on the surface (no tier-1/2/3 constraint editing; RM type names
   never shown). **[met]**
4. Everything is an editable draft until the single **Create draft model** action;
   the handoff to SDCStudio is clear. **[met]**
5. Verified end-to-end against prod SDCStudio (as Phase 1 was). **[met, v4.0.0b1: the
   full mint, reused + new + nested with requirements, confirmed live in SDCStudio]**

## 10. Remaining work (rev 3)

All acceptance criteria met as of **v4.0.0b1 (beta)**. Optional / next:

- FR-9 reuse nudge (soft "check the library first" before minting).
- Grow the user guide (`docs/USER-GUIDE.md`, surfaced via the in-app **Help** button).
- **Native Windows build** (tracked): instructions in `docs/BUILDING-WINDOWS.md`;
  needs one run on a Windows machine (Win11 available). macOS deferred.

*(Double-create guard: DONE `79bccae`. Wallet name/balance + cost confirmation: DONE.)*

*(FR-13 requirement field: DONE `20af5ae`. Live mint verified; version 4.0.0b1.)*
