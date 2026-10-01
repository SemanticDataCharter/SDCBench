# SDCBench Phase 3 PRD: the whole record, and the sketch from data

**Status:** Outline 1, 2026-10-01, for Tim to edit. Claude outlined it from the shipped app, the Phase 2 PRD (rev 3), the composition model, the SDCStudio Assembly API and the SDC Agents assembly toolset as they stand in the repositories today. Every "verified" below was read from code or a live schema, not from memory. Lines marked **[Tim]** are decisions or edits only Tim can make; the recommendation beside each is Claude's.

**Owner:** Timothy W. Cook. **Builds on:** [`PHASE-2-PRD.md`](PHASE-2-PRD.md) (the separation line and the reuse-first canvas), [`COMPOSITION-MODEL.md`](COMPOSITION-MODEL.md) (validity computed from the reference model), [`tutorial/PRD.md`](tutorial/PRD.md) (the two-hour on-ramp).

---

## 0. The two questions this PRD answers

1. **Is SDC Agents functionality in the bench?** No, and by decision. The local LLM, the sidecar and the CSV introspection were removed at open-sourcing (August 2026); the bench runs no LLM and holds no authority. What the agents produce, the bench should be able to **show, edit and hand off**. The agents' Assembly toolset already builds exactly the tree the bench draws, and SDCStudio's Assembly API already accepts the governance parts the bench cannot draw yet. So the answer is a contract, not an embedding: one assembly-tree file format that the agents write, the bench reads and writes, and SDCStudio accepts. Section 4.
2. **Should the bench sketch a diagram directly from data?** Yes, as a source adapter that seeds the canvas, never as the canvas's authority. The person still assembles. Two paths, both without an LLM in the bench: import a proposal an SDC Agents install made locally, or ask SDCStudio to propose from column headers (and optionally samples) the user chose to send. Section 5.

And the gap Tim named: **the bench draws the data tree and nothing else.** A governed record is the data tree plus who it is about, who recorded it, who took part, which lifecycle it is in, what was audited, who attested it, what access rule applies and what protocol was followed. All of that is in the reference model, all of it is on the Assembly API, none of it is on the canvas. Section 3 is the core of this phase.

## 1. What the bench does today, verified

- Signs in with an SDCStudio API key; searches the published library; reuses by `ct_id` on a Blockly canvas; sketches a new Field or Group with a plain data type and a plain-language requirement; saves and loads a draft locally; sends a draft Data Model to SDCStudio. (`app/src/canvas.js`, `app/src/main.js`, `app/src-tauri/src/drafts.rs`.)
- The canvas exposes three node kinds, Model, Group, Field, over 21 of the 52 reference-model types (`canon/composition-model.json`, roles `container` and `leaf`). The eight `structural` types (`DMType`'s slots, `PartyType`, `ParticipationType`, `AuditType`, `AttestationType`, `ReferenceRangeType`, `InvlType`, `InvlUnits`) are held out of the canvas by policy (Phase 2 non-goals: "structural modeling: subject/provider/participations/workflow/acs/audit/attestation: SDCStudio").
- A `DMType` holds, beside the one root Item: `subject` (0..1, Party), `provider` (0..n, Party), `Participation` (0..n), `protocol` (0..1, XdString), `workflow` (0..1, Cluster), `acs` (0..1, XdLink), `Audit` (0..n), `attestation` (0..1), `XdLink` (0..n), and `current-state`. Read from `sdc4.xsd`, `DMType`.
- Server side, the Assembly API (`dmgen/assembly_serializers.py`, `assembly_services.py`) accepts, beside the tree, contextual component references for `audit`, `attestation`, `subject`, `provider`, `participation`, `protocol`, `workflow`, `acs`, each a reuse ref (`ct_id`) or a mint ref (label, data type). The bench does not send them.
- SDC Agents' assembly toolset (`SDC_Agents/src/sdc_agents/toolsets/assembly.py`) has `discover_components`, `propose_cluster_hierarchy` (a tree from a datasource's columns and their component matches, unmatched columns as mint refs), `select_contextual_components` (audit, attestation, party, and so on, by context description) and `assemble_model` (the Assembly API call). The agents hand off through files on disk.
- SDCStudio's `agentic` app holds the server-side "from data" pipeline the bench once fronted: `ParsedData` (columns with data type, units, range, nullability, enumeration, semantic link), column typing by embeddings, string-format and temporal inference, semantic linking.
- Two published governance libraries on production: **ProvGov** (`f5lii3j2ywtxc67bu0g2qkc4`, W3C PROV, the default by decision D14) and **FHIR** (opt-in, healthcare). Every library we have built since composes ProvGov's `prov-activity`, `prov-agent`, `prov-entity` and `audit-event` inside the data tree as a "governed record", and binds a ProvGov workflow (`provgov/order` for the business documents) on the model.

## 2. Goal

A domain expert sketches the **whole governed record**, not only its data: the tree, and around it who the record is about, who recorded it and who took part, which lifecycle it moves through, what is audited, who attests, what access rule and protocol apply. They do it by reusing published governance components first (ProvGov by default), sketching only what is missing, in plain language, and never meeting a reference-model name. And when the data already exists as a file or a table, the canvas can start from a proposal rather than from nothing.

**One-line success:** a non-modeler opens a CSV of pizza orders, accepts a proposed tree, drags "the customer" onto *About whom*, "the kitchen" onto *Recorded by*, picks the published *Order* lifecycle for *Lifecycle*, drops the default audit trail and an attestation onto the record, writes one requirement for the field the library did not have, and sends a draft Data Model whose governance a modeler finishes in SDCStudio without adding a single structural part. Under thirty minutes from the file to the draft.

**[Tim]** Is thirty minutes the right bar, and is "the whole record in the first sitting" the goal, or is governance a second sitting after the data tree? Recommendation: one sitting; the point of the bench is that the record is one thing.

## 3. The record ring: governance on the canvas

### 3.1 What appears

The Model block grows **slots**, drawn as a ring around the data tree, one per reference-model slot, each with a plain name and a question:

| Slot | RM | Cardinality | Plain name on the block | The question the block asks |
|---|---|---|---|---|
| subject | Party | 0..1 | **About whom or what** | Whose record is this? |
| provider | Party | 0..n | **Recorded by** | Who or what system produced it? |
| Participation | Participation | 0..n | **Who took part** | Who else was involved, and in what role? |
| workflow | Cluster | 0..1 | **Lifecycle** | What states can this record be in, and which moves are allowed? |
| Audit | Audit | 0..n | **Audit trail** | What is logged about access and change? |
| attestation | Attestation | 0..1 | **Attested by** | Who signs off, and how? |
| acs | XdLink | 0..1 | **Access rules** | Which access-control scheme applies? |
| protocol | XdString | 0..1 | **Protocol followed** | Under which written procedure was it made? |
| XdLink | XdLink | 0..n | **Related records** | What does this record point to? |
| current-state | enumeration | 0..1 | (shown on the Lifecycle slot) | the states the lifecycle allows |

**[Tim]** The plain names. These are the words a domain expert sees; the RM names never appear. Edit freely.

### 3.2 Two ways governance lives in a model, and the bench offers both

- **The RM slots** (the table above): the model's own subject, providers, participations, workflow, audits, attestation, access rule, protocol. These are what the Assembly API's contextual refs fill. First-class slots on the Model block.
- **The governed-record pattern**: ProvGov's PROV Activity, PROV Agent, PROV Entity and Audit Event composed *inside* the data tree, the way every library since the FAIR demo does it, so the provenance is in the instance's bytes and travels in the document. On the canvas these are ordinary reusable Groups from the ProvGov project, offered first in a **Provenance** flyout beside Reuse.

**[Tim]** Both, or one? Recommendation: both, because the libraries use both and a bench that draws only the slots cannot draw the models we actually ship. The flyout makes the pattern cheap: drag "PROV Activity" into the tree as a Group like any other.

### 3.3 Reuse first, as always

- Every slot searches the published library filtered to the slot's type: a Party slot shows published Parties, the Lifecycle slot shows published workflows (ProvGov's `order`, and whatever else is published), the Audit slot shows published Audits. ProvGov first, then the user's projects, then everything public. FHIR's governance components appear only when the user searches in the FHIR project (D14 stands).
- A slot can be sketched when nothing fits: the block asks the slot's question and takes a plain-language requirement. A sketched Party is a label and a requirement; a sketched workflow is a list of state names and the moves allowed between them, typed as words, nothing else.
- The canon's `structural` role splits into `slot` (the nine above) and `held-out` (`ReferenceRangeType`, `InvlType`, `InvlUnits`, which stay attachments or SDCStudio's). `tools/generate_composition.py` emits the slot cardinalities from `DMType`; the canvas's `connectionChecker` enforces them (one subject, many providers, one lifecycle).

### 3.4 What the handoff sends

The draft Data Model as today, plus the contextual refs the Assembly API already takes: each slot either `{ct_id}` for a reused component or `{label, data_type, requirement}` for a sketched one. Server behavior is unchanged: pure reuse returns the model synchronously, any sketch mints drafts and returns a task. The cost dialog lists sketched governance parts beside sketched groups and fields.

**[Tim]** Are structural components billed like clusters? If so the cost dialog needs the line; if not, say so and the reuse-first nudge is softer here.

### 3.5 Diagram out

The canvas exports the whole record as a diagram (SVG and PNG, house palette, every mark a drawn path): the data tree in the middle, the ring of slots around it, reused parts tagged, sketched parts dashed. This is the "sketch out" Tim asked for in the literal sense, and it is the figure a PRD, a paper or a buyer deck needs. It also runs the other way: open any published model from the catalog on the canvas read-only, slots filled, so the governance of a model somebody else published can be seen before it is reused.

## 4. SDC Agents and the bench: a contract, not an embedding

- **The assembly tree is the shared artifact.** One JSON shape, the Assembly API's request body: the tree (groups and fields, reuse refs by `ct_id`, mint refs by label and type, requirements), the contextual refs (the nine slots), and provenance of the proposal (which adapter or agent made it, from what source, with what confidence per node). The bench's local draft file becomes this shape, versioned. SDC Agents' `propose_cluster_hierarchy` and `select_contextual_components` already produce the two halves; `assemble_model` already sends it.
- **Import.** *File > Open proposal* loads an assembly tree from disk onto the canvas, every node marked proposed until the person touches it. This is how SDC Agents, SDC Agents SMB (local LLM) and SDC Agents Sov (air-gapped) reach the bench without the bench running any of them: the agent writes `.sdc-cache/assemblies/<name>.json`, the person opens it.
- **Export.** *File > Save proposal* writes the same shape, so an agent, or SDCStudio, or a colleague's bench can take it up.
- **The bench stays the review gate.** Every mint in a proposal is visible, priced and removable before anything is sent; nothing an agent proposed is sent without a person seeing it on the canvas. This is the HITL gate the agents' README promises, made visible.

**[Tim]** The agents' three editions each write the file; does the bench need to know which one did, beyond recording it in the proposal's provenance? Recommendation: no.

## 5. Sketch from data: source adapters

A source adapter turns a source into an assembly tree with confidence and provenance per node, and seeds the canvas. The adapter never decides; it proposes. Order of delivery:

1. **CSV, local, through the agents (no data leaves the machine).** The SMB or Sov edition introspects the file, matches columns to published components, proposes the hierarchy and the contextual components, writes the proposal; the bench opens it (section 4). Nothing new in the bench beyond import.
2. **CSV, hosted, through SDCStudio.** The bench sends the column headers and inferred types, and optionally a sample the person chose, to a new or existing SDCStudio endpoint over the `agentic` pipeline (`ParsedData` → typing, string-format and temporal inference, semantic linking → component matches → proposal), and renders the proposal. Credits as metered. The consent screen says exactly what leaves the machine; headers only by default.
3. **Later adapters, the convergence thesis as product:** XMI (near-deterministic nesting, mostly review), maDMP (dataset skeletons), a prose DMP (narrative, needs an LLM, so it is an agents job, not a bench job). Each is an adapter that emits the same assembly tree.

**[Tim]** Data residency for path 2: headers only by default, samples by explicit choice per file? And is path 2 worth building before the agents' local path is proven on the pizza CSV? Recommendation: ship 1 first, measure, then 2.

**[Tim]** Should the hosted proposal also propose governance (subject, provider, lifecycle) from the data, or only the tree? The agents' `select_contextual_components` does it from a context description; a CSV rarely says who recorded it. Recommendation: propose the tree from the data and ask the person the ring's questions.

## 6. Non-goals

- No LLM in the bench, local or remote. Proposals come from the agents or from SDCStudio.
- No publishing, binding, constraint modeling, units or reference ranges on the bench (Phase 2 non-goals stand).
- No authoring of the governance libraries themselves; ProvGov and FHIR are consumed.
- No workflow *execution*: the bench draws which lifecycle a model binds and which states exist; transitions are governed at the VSL and in the generated applications.
- No macOS build in this phase.

## 7. Dependencies, verified

- SDCStudio Assembly API: contextual refs accepted today (`audit`, `attestation`, `subject`, `provider`, `participation`, `protocol`, `workflow`, `acs`; `party` as an alias of `subject`). To check: that a mint ref for a Party, Audit or Attestation creates a draft of that structural type, and what it bills.
- SDCStudio library search: `GET /api/v1/dmgen/components/?status=published&search=…` returns `type`; the slot filters need `type` to name the structural types (Party, Participation, Audit, Attestation, Cluster for workflow, XdLink, XdString). To check against the live schema.
- SDCStudio catalog API: a published model's component tree and skeleton, for "diagram from a published model".
- SDC Agents: the proposal file written by `propose_cluster_hierarchy` plus `select_contextual_components`, in the Assembly API's shape. To agree: one file name and a version field.
- The canon generator: `tools/generate_composition.py` extended to emit slots and their cardinalities from `DMType`; the canon tests in CI extended to them.
- ProvGov on production: `f5lii3j2ywtxc67bu0g2qkc4`; the published workflows it holds (at least `order`); the Audit, Party and Attestation components published there, by label.

## 8. Phasing and measurement

| Phase | Ships | One-line success | Measured by |
|---|---|---|---|
| 3a | The record ring: nine slots, reuse from ProvGov first, sketch with a requirement, handoff with contextual refs; the canon's slot roles | the pizza model gets its customer, kitchen, Order lifecycle, audit and attestation from ProvGov with no sketch | the Pizza Order tutorial step added; the draft arrives in SDCStudio with every slot filled |
| 3b | The assembly-tree file; open and save proposals; diagram export; open a published model read-only | an SDC Agents SMB proposal from `pizza-orders.csv` opens on the canvas and is sent after one edit | time from file to draft; count of proposed nodes kept unchanged |
| 3c | Hosted proposal from headers through SDCStudio, with the consent screen | the same CSV, no agents installed, proposal in under a minute | credits per proposal; headers-only share of proposals |
| 3d | XMI and maDMP adapters | a Sparx export opens as a near-complete tree | review time per node |

## 9. Decisions for Tim

1. One sitting for the whole record, or governance as a second sitting (section 2). Recommended: one.
2. The plain names of the nine slots (3.1).
3. Both governance patterns on the canvas, slots and the governed-record flyout, or slots only (3.2). Recommended: both.
4. Billing of structural components in the cost dialog (3.4).
5. Data residency for the hosted proposal (section 5). Recommended: headers only by default.
6. Order of 3b and 3c; whether 3c is built before the local path is measured (section 5). Recommended: 3a, 3b, measure, then 3c.
7. Whether "diagram from a published model" (3.5) is in 3b or later. Recommended: 3b; it is the cheapest teaching tool we have.
8. The tutorial: does "The Pizza Order" gain a governance step in this phase, or stay as scoped (two hours, data only) with a sequel? Recommended: one added step, kept under the two-hour bar; measured.

## 10. Risks

- **Overexposing the reference model.** Nine slots with RM-shaped cardinalities is the richest surface the bench has shown. The plain names and the questions are the guard; if a user sees "Participation", the design failed.
- **A structural mint the server cannot finish.** A sketched Party or Audit may need more than a label and a requirement to become a draft; the server contract for structural mints needs checking before 3a is promised.
- **Proposals that look finished.** A proposed tree with confidence marks can be sent as-is; the review gate (every mint priced and visible) and the "proposed until touched" marking are the counter.
- **Data leaving the machine.** Path 2 is the first time the bench sends anything but a search string; the consent screen is a feature, not a dialog.
- **Scope against the parked tutorial.** The tutorial is still the on-ramp Beale asked for; 3a should land as one step in it, not displace it.
