# SDCBench Tutorial PRD: "The Pizza Order"

**Status:** Draft 1, 2026-09-14, for discussion. Three of the open questions were settled by Tim the same day; see section 8. The tutorial itself is paused behind a usability and visual review of SDCBench. Written from the 11 September strategy session
with Thomas Beale, where the participants agreed on a step-by-step, pizza-ontology-style
tutorial for SDCBench and a two-hour onboarding bar: a new user authors a model, builds a
simple application and sees data in it.

**Owner:** Timothy W. Cook. **Reviewer:** Thomas Beale (his action item is to experiment with
reusable components in SDCStudio; the tutorial is the path he should be able to walk).

---

## 1. Goal

A person who has never seen SDC installs SDCBench, diagrams a small data model by reusing
published components, sketches the few pieces that do not exist, hands the draft to SDCStudio,
finishes and publishes it there, generates the application, runs it on their own machine and
enters and views real records. **Two hours, one sitting, one funded account, no help.**

The tutorial is the on-ramp Beale described: open specifications fail when there is no
accessible ecosystem to deploy and test in. Modern users expect to download and build an app
within an hour or a day. This is the hour.

### What "pizza-ontology style" means here

The Manchester Pizza tutorial for Protégé is the canonical small, memorable, slightly silly
domain that lets a learner exercise every feature of a tool without domain expertise getting in
the way. We borrow the domain and the spirit, not the artifact: **this tutorial builds a data
model and an application, not an ontology.** The ontology appears at exactly one step, where
it belongs in SDC: when the modeler binds the topping codes to concepts, the concepts are the
Pizza ontology's IRIs (`pizza.owl#MozzarellaTopping` and friends). A reader who knows the Pizza
tutorial sees the two-level idea land: the ontology says what a topping *is*; the SDC component
says what a valid topping *value* is in this record, and binds one to the other.

The book Tim wrote the foreword for, *Mastering Ontology Engineering with Protégé and
Pizza.owl*, is the natural cross-reference for readers who want the ontology half.

### One-line success

A first-time user, starting from `sdcstudio.axius-sdc.com` with a $10 wallet, ends with
`http://localhost:8000` showing a list of pizza orders they typed in, backed by a data model
they published, more than half of which they reused rather than wrote, in under two hours and
about 3,000 credits.

## 2. The scenario

**Domain:** a single pizzeria taking orders. One data model, `Pizza Order`.

**Why this domain, checked against the constraints Beale set:**

- **Single domain, simple scenario.** No cross-domain joins, no governance composition, no
  graph store. Those are CordovaOS's job.
- **Recognizable without expertise.** Nobody needs to be told what a topping is.
- **Exercises every SDCBench block type once:** Text, Integer, Decimal with units, Date/Time,
  Code, List of Codes, Boolean, and a nested Group.
- **Exercises reuse hard.** Customer name, address, phone, email, currency, date-time and
  yes/no all exist in the public Default library today, so the model is mostly drag-and-drop.
- **Exercises the modeler step honestly.** The new components need real constraints: a code
  list for sizes, a code list with semantic binding for toppings, units for diameter and bake
  temperature, a price with a currency.

### The model

```
Pizza Order                                   (Model)
└── data                                      (root Group, pre-seeded by SDCBench)
    ├── Customer                              (Group, new)
    │   ├── Full Name (Person)                REUSE  Default library cluster
    │   ├── Phone Number                      REUSE  Default library
    │   ├── Email Address                     REUSE  Default library
    │   └── US Address                        REUSE  Default library cluster
    ├── Pizza                                 (Group, new)
    │   ├── Size                              NEW    Code: small, medium, large
    │   ├── Crust                             NEW    Code: thin, hand-tossed, deep-dish
    │   ├── Toppings                          NEW    List of Codes, bound to pizza.owl
    │   ├── Diameter                          NEW    Decimal, units REUSE "Length/Distance (SI - Metric)"
    │   ├── Vegetarian                        REUSE  "Yes/No Indicator"
    │   └── Quantity                          NEW    Integer, 1 to 10
    ├── Order Time                            REUSE  "DateTime"
    ├── Price                                 REUSE  "Currency Amount" (units: Currency)
    ├── Bake Temperature                      NEW    Decimal, units REUSE "Temperature (SI - Metric)"
    └── Special Instructions                  NEW    Text, up to 500 characters
```

Fourteen leaves and two groups. **Seven reused, seven new.** The reuse ratio is the lesson and
it is also what keeps the bill small.

### Verified against production (backup of 14 September 2026)

The Default library holds 75 published public components. The ones this tutorial reuses, by
exact published label: `Full Name (Person)` (cluster), `US Address` (cluster), `Phone Number`,
`Email Address`, `Yes/No Indicator`, `DateTime`, `Currency Amount`, and the units
`Currency`, `Length/Distance (SI - Metric)`, `Temperature (SI - Metric)`. All present and
published. If any is renamed or unpublished, the tutorial breaks at step 3; see FR-9.

## 3. Personas and the two roles

The tutorial is written for **one person playing two roles in sequence**, and says so:

1. **The domain expert at the bench** (SDCBench): reuse, sketch, structure, write a
   plain-language requirement for each new piece. Never meets the reference model.
2. **The same domain expert in SDCStudio**: finish each new component from its own
   requirement (constraints, codes, units, semantic binding), publish bottom-up, generate
   outputs.

**Settled 2026-09-14 (Tim):** SDCStudio is for the domain-expert modeler, not a separate
expert-modeler caste. Step 4 is therefore a teaching step for the same person, and the tutorial
frames SDCStudio as the place where the expert learns what their requirement means in
constraints. The "two people in a real team" note stays as an aside, not the frame.

Beale's reviewer persona is that same domain expert, in both places. Both roles matter for the "template with
archetypes" decision from the meeting: in SDC terms the archetype-like reusable units are the
published Clusters (`Full Name (Person)`, `US Address`), and the template is the Data Model
that composes them with a few local components. The tutorial names this correspondence once,
for readers coming from openEHR, and then stops using openEHR words.

## 4. Non-goals (explicitly out)

- **No CordovaOS, no GraphDB, no SPARQL.** "Visualize data" in the two-hour bar means the
  generated application's list and detail pages plus one generated XML instance. The graph
  story is a separate tutorial that starts where this one ends.
- **No FHIR.** Beale's FHIR-first recommendation is for demonstrations to healthcare buyers.
  This tutorial is for the first hour of any user; a FHIR variant (same shape, FHIR Clinical
  library components) is a candidate sequel, not a chapter.
- **No AI features.** SDCBench has none by design, and the SDCStudio steps use the wizard, not
  the RAG assistant, so cost stays deterministic.
- **No custom code in the generated app.** The app runs as generated. If it does not do
  something, the tutorial says so rather than patching it.
- **No parties, participations or attestations.** They are on the SDCBench roadmap (per the
  meeting) and are not in the bench today.

## 5. Dependencies and prerequisites

| Need | Where it comes from | Tutorial step |
|---|---|---|
| SDCStudio account with a funded wallet | Registration at `sdcstudio.axius-sdc.com`; funding is the last registration step; **$10 minimum = 10,000 credits** | 0 |
| API key | SDCStudio, Account Settings | 0 |
| SDCBench installed | GitHub Release: Linux AppImage or Windows installer (unsigned beta; the tutorial says what the OS warning looks like and why) | 0 |
| A private project of the user's own | Created in SDCStudio ("Building in"); private by default | 0 |
| Docker or Podman with compose | User's machine, for the generated app | 6 |
| Python 3.12 | Only if running the generated app without Docker | 6 |
| The Pizza ontology IRIs | Public, `http://www.co-ode.org/ontologies/pizza/pizza.owl#` | 4 |

### Cost budget, from the published price list

| Operation | Credits each | Count | Credits |
|---|---|---|---|
| Mint new component | 100 | 7 fields + 3 groups (Customer, Pizza, and the pre-seeded root group, which is billed too) = 10 | 1,000 |
| Assemble model | 500 | 1 | 500 |
| Download generated app | 1,500 | 1 | 1,500 |
| Validate an XML instance | 1 | up to 5 | 5 |
| Sign an instance (optional last step) | 5 | 1 | 5 |
| **Total** | | | **about 3,000** |

Reuse is free. A $10 wallet covers the tutorial three times over, which matters: a learner who
makes a mistake and rebuilds must not run dry. **FR-8 requires the tutorial to state the
running total at each paid step**, and to confirm the exact figures against the live price
list before publication. Clusters are billed as components (Tim, 2026-09-14), and the bench's
own cost dialog confirms it: the pizza model shows "10 new components".

## 6. User flow with the clock

Times are targets for a first-time user reading as they go. The tutorial prints a checkpoint
("what you should see") at the end of every step.

| Step | Role | What happens | Target | Cumulative |
|---|---|---|---|---|
| 0 | both | Register, fund $10, copy API key, create project `Pizzeria`, install SDCBench, sign in | 15 min | 0:15 |
| 1 | expert | Set "Building in" to `Pizzeria`, "Search in" to `Default`. Reuse: drag the seven published components into place. Make the `Customer` and `Pizza` groups | 15 min | 0:30 |
| 2 | expert | Sketch the seven new fields with types; write a requirement on each (the tutorial supplies model text for each, and asks the user to write one of their own) | 15 min | 0:45 |
| 3 | expert | Save draft locally. Create draft model. Open SDCStudio and find it in `Pizzeria` | 5 min | 0:50 |
| 4 | modeler | Finish the seven new components from their requirements: codes for Size and Crust; codes plus semantic binding for Toppings (pizza.owl IRIs); units for Diameter and Bake Temperature; length limit for Special Instructions; range for Quantity. Save and Publish each | 30 min | 1:20 |
| 5 | modeler | Publish the two groups, then the model. Generate Package (one time). Look at the XSD and the generated XML instance | 10 min | 1:30 |
| 6 | either | Generate App, download, `docker compose up --build`, create the superuser, open `localhost:8000` | 15 min | 1:45 |
| 7 | either | Enter three orders. See the list and detail pages. Generate one XML instance from SDCStudio and validate it. Optional: sign it | 10 min | 1:55 |
| 8 | | What you built, what it cost, where the reuse came from, and what to do next | 5 min | 2:00 |

Step 4 is the long pole and the one most likely to blow the budget. FR-4 addresses it.

## 7. Functional requirements (for the tutorial as a product)

- **FR-1 Format.** Markdown in `docs/tutorial/`, one file per step plus an index, rendered on
  semanticdatacharter.com and in SDCBench's Help overlay. Every step has: goal, do this, what
  you should see, if it did not.
- **FR-2 Screenshots.** One per checkpoint, taken from the shipped SDCBench build and current
  SDCStudio, with the version stated. Retaken on any UI change that moves a control.
- **FR-3 A pre-built draft file.** A saved SDCBench draft of the finished step-2 canvas ships
  with the tutorial. The primary path builds it by hand; the file is the recovery path ("load
  this and continue") and the demo path for someone who wants to see the end in ten minutes.
- **FR-4 Requirement text supplied.** For each new component the tutorial gives the exact
  plain-language requirement to paste, and in step 4 gives the modeler the exact constraint to
  set. The learner is meant to experience the handoff, not to invent a code system. One field
  (`Special Instructions`) is left to the learner to write, so they do it once.
- **FR-5 Semantic binding, once, concretely.** The Toppings component's definitions bind to
  the Pizza ontology IRIs, with the exact URIs listed. This is the single ontology step and the
  tutorial explains in three sentences why it is there and why it is in SDCStudio, not the
  bench.
- **FR-6 The reuse lesson is measured.** Step 8 shows the count: 7 of 14 fields reused, 0
  credits for those, and what the same model would have cost with no reuse.
- **FR-7 The two-role framing is explicit.** Steps 1 to 3 are labelled "you are the domain
  expert"; 4 and 5 "you are the data modeler"; the tutorial says that in a real team these are
  two people and the requirement text is what passes between them.
- **FR-8 Running cost.** Each paid step states its price and the cumulative total. Figures
  verified against the live price list at publication and dated.
- **FR-9 A pre-flight check.** A short script (or a documented SDCStudio search) that confirms
  the ten reused components still exist and are published under the labels the tutorial uses.
  Run before every release of the tutorial; the labels are pinned by `ct_id` in the draft file
  from FR-3 so the recovery path survives a relabel.
- **FR-10 Failure modes named.** Unsigned installer warning; "Building in" showing no
  projects (create one); a block that will not snap (wrong parent); "cannot create draft"
  (a new field without a requirement); publish refused (a child still in draft; a quantified
  type without units); Docker not running; port 8000 in use.
- **FR-11 Time and cost are the acceptance test, not just the promise.** See section 9.

## 8. Open questions for discussion

1. **Who finishes the components in step 4?** **Settled: the learner does.** SDCStudio is
   a teaching tool for the domain expert, so step 4 stays, with the exact values supplied
   (FR-4). The pre-finished short version is optional, not a substitute.
2. **Public `Tutorial` library or Default only?** The model reuses Default only, which keeps
   "Search in" simple. A public `Tutorial` project would let us pin the pizza-specific codes for
   the short version above. It also means one more public project to maintain. Tim's call.
3. **Group minting cost.** **Settled: Clusters are billed.** The budget in section 5 already
   assumes 100 credits per new group. The price list should say so; that is a docs fix in
   SDCStudio, not a tutorial question.
4. **Which SDCBench version does the tutorial target?** 4.0.0-beta.2 is current. If the party,
   participation and attestation work lands before the tutorial ships, the model gains nothing
   from them and the screenshots change. Suggest pinning to the beta that exists and retaking
   screenshots per FR-2 when the next release lands.
5. **Where does it live publicly?** `docs/tutorial/` in this repo is the source. Rendered copies
   on semanticdatacharter.com (the on-ramp) and inside SDCBench Help (offline). The
   axius-sdc.com practitioner pages should link to it, not copy it.
6. **Does "visualize data" need more than the generated app's pages?** **Settled: no, for
   now.** The connected blocks on the canvas are the visualization of the model, and the
   generated app's pages are the view of the data. Charts would be an AppGen change and are
   not in this tutorial.
7. **Sequel order.** Candidates: the FHIR variant (Beale's demo priority), the CordovaOS graph
   tutorial (starts from the generated app's data), and the multi-model project (two models
   sharing the `Customer` group). Recommendation: FHIR variant second, because it reuses this
   tutorial's shape with a different library and serves the demo audience.

## 9. Acceptance criteria

1. **Three fresh users**, none of them us, complete the tutorial from a new account with a $10
   wallet, on their own machine, with no help beyond the text. Measured: elapsed time and
   credits spent, from the wallet history. Pass if all three finish under 2 hours 15 minutes
   and under 4,000 credits, and at least two finish under 2 hours.
2. **Beale walks it** and his notes become the first revision.
3. The FR-9 pre-flight passes against production on the day of publication.
4. The FR-3 draft file loads in the shipped SDCBench and creates the draft model unchanged.
5. Every screenshot matches the shipped build named in the tutorial.

## 10. Deliverables and order of work

0. **A usability and visual review of SDCBench itself, before any tutorial work** (Tim,
   2026-09-14). The tutorial will put the bench in front of new users for the first time;
   anything that would embarrass it should be fixed first, and the review is cheaper before
   the screenshots exist. Findings and fixes are tracked outside this PRD.
1. This PRD, agreed.
2. Build the model ourselves end to end, timing each step and recording the credits. The
   numbers in section 6 are targets; the run replaces them with measurements.
3. The FR-3 draft file and the FR-9 pre-flight script.
4. The eight step files and the index, with screenshots.
5. The Help overlay and semanticdatacharter.com rendering.
6. The three-user test (section 9), then revision, then publication and the announcement.
