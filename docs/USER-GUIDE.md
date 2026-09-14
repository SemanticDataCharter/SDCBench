# SDCBench User Guide

SDCBench helps you **diagram a data model** and hand it to a data modeler to finish
in SDCStudio. You reuse components that already exist, sketch new ones only when you
need to, and say in plain language what each piece is. You never have to learn the
underlying reference model.

## What you produce

A **draft data model** in your SDCStudio project, plus a plain-language
**requirement** on each piece you sketch. A data modeler opens the draft in
SDCStudio and finishes it: adding the precise constraints, units, and reference
ranges, and publishing it.

## 1. Sign in

SDCBench signs in with your **SDCStudio API key**.

- If you already have an SDCStudio account, open **Account Settings** in SDCStudio,
  copy your API key, and paste it into the sign-in box.
- If you do not have an account yet, click **Create an SDCStudio account**, sign up,
  then come back and paste your key.

Your key is stored securely on this machine, so you stay signed in until you sign
out. It never leaves your computer.

## 2. Choose your projects

Two selectors, and they can be different projects:

- **Building in** is where your new draft model will be saved. This is one of your
  own projects.
- **Search in** is where you look for components to reuse. It starts on **Everything I
  can see**, which searches your projects, your team's, and every public library at once.
  Pick one project to narrow the search.

## 3. Find and reuse components

Reuse is the main way you build. In the **Reuse** panel, search by meaning, for
example "blood pressure" or "date of birth", not by any technical type.

- Matches appear as a list under the search box.
- **Hover** a match to read its description so you know what it is.
- **Click** a match to add it to the selected group (or the root group), or **drag** it
  onto the canvas. Reused blocks carry a small **reused** pill.
- The **Reuse** tab on the canvas holds the same matches if you prefer to drag from there.

Reusing a published component is always better than making a new one: it keeps your
model consistent with everyone else's and saves the modeler work.

## 4. Assemble your model

Your model is a tree. It starts with a **Model** and a root **Group** (named "data").
You fill the group.

- Drag a **Group** from the **New** tab to make a sub-group. Groups can nest.
- Drag a **Field** for a piece of data, and pick its type: Text, Integer, Decimal,
  Date, Code, Boolean, and so on.
- Blocks only snap where they are allowed. If a block will not connect, it does not
  belong there.
- Colors are a legend: data fields are teal, a group is slate, units and ranges are
  amber, the model is indigo. The word on the block says what kind of data it is.
- To remove a block, drag it to the bin at the bottom of the canvas, or off to the left.
- A new field that still needs a requirement shows a small warning icon.

## 5. Describe each new component

Every **new** piece you sketch needs a plain-language **requirement**. This is the
most important thing you write, because it is what tells the modeler what to build.

- Click a new field or group. The **Requirement** box appears in the panel.
- Write what it is: units, normal or expected values, and any guideline. For example:
  *"systolic BP in mmHg, adult normal below 120, per ACC/AHA 2017."*
- You cannot create the draft until every new field has a requirement.

Reused components already carry their published description, so you do not need to
describe them.

## 6. Numbers, units, and ranges

- A **number** field (Integer or Decimal) has a **units** slot that reads "none yet".
  Search for the units (for example "mmHg"), select the field, and click the match, or
  drag it into the slot. Most units already exist, so you usually reuse one.
- **Ordered** fields (a ranking, a date, or a number) can take **reference ranges**.
  Select the field and click a range match; the field grows a **ranges** slot to hold it.
- Units and ranges are optional while you draft. If you leave a unit off, the modeler
  adds it in SDCStudio before publishing.

## 7. Save and reopen a draft

- **Save draft locally** writes your work to a file on this machine (under a SDCBench
  folder in your home or documents directory). It is not sent anywhere.
- **Saved drafts** lists your local files; pick one and click **Load** to reopen it
  on the canvas exactly as you left it.

## 8. Create the draft model

When your model is ready:

1. Write a short **Model description**.
2. Click **Create draft model**.

SDCBench creates the draft in your **Building in** project: your reused components are
referenced, your new components are created as drafts with their requirements, and
they are grouped into the model. Nothing is published.

## 9. Hand off to SDCStudio

Open your project in SDCStudio. A data modeler finalizes each new component
(constraints, units, reference ranges, semantic links), using the requirements you
wrote as the specification, and publishes the model. That is where the modeling
knowledge lives; SDCBench got you the structure and the intent.

## Advanced

The **Advanced** disclosure in the panel shows the structure SDCBench will send, the way
a data modeler sees it. You never need it to build a model.

## Tips

- **Reuse first.** Search before you sketch a new component.
- **Write good requirements.** They are the handoff. Be specific about units and
  expected values.
- **Save often.** Local saves are quick and let you reopen exactly where you were.
