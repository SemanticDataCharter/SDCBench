# SDCBench

**SDCBench** is a desktop tool for **diagramming a data model** and handing it to a
data modeler to finish in [SDCStudio](https://sdcstudio.axius-sdc.com). A domain
expert reuses published components that already *mean* what their data means,
sketches a new one only when needed, and says in plain language what each piece is,
without ever learning the underlying [Semantic Data Charter](https://semanticdatacharter.com)
reference model.

## What it does

You sign in with your SDCStudio API key, then:

- **Search the published library** and **reuse** components by dragging them onto a
  canvas (reuse is the default, and the cheap path).
- **Assemble** them into a document tree (Model → Group → Fields) on a Google Blockly
  canvas, where blocks only snap where the reference model allows.
- **Sketch a new component** only when nothing fits: pick a plain data type (Text,
  Integer, Decimal, Date, Code, …) and write a plain-language **requirement**.
- **Send to SDCStudio**: it creates a draft data model in your project, referencing
  reused components and creating new ones as drafts.

A data modeler then finalizes the constraints, units, reference ranges, and semantic
bindings, and publishes, in SDCStudio.

## The separation line

| | SDCBench (domain expert) | SDCStudio (data modeler) |
|---|---|---|
| Does | reuse published components, sketch new ones, structure the tree, **state requirements in plain language** | constraints, units, reference ranges, semantic binding, **publish** |
| Produces | a draft model (reuse by `ct_id` + new drafts) with per-component requirements | the finished, published model |

## Requirements

- An **SDCStudio account** and API key (create one from the sign-in screen).
- A running [SDCStudio](https://sdcstudio.axius-sdc.com) instance (the public one by
  default; configurable via `SDCSTUDIO_BASE_URL`).

## Build and run

SDCBench is a [Tauri](https://tauri.app/) app (Rust core + a Vite/vanilla-JS
frontend). You need [Rust](https://rustup.rs/) and [Node.js](https://nodejs.org/).

```bash
cd app
npm install
npx tauri dev      # run in development
npx tauri build    # build a release bundle (Linux AppImage)
```

- **Windows:** see [`docs/BUILDING-WINDOWS.md`](docs/BUILDING-WINDOWS.md).
- macOS is not yet supported.

CI (GitHub Actions) builds the Linux AppImage and a Windows installer on tags.
Beta installers are not yet code-signed; Windows code signing is wired into CI and
turns on once configured. See [`docs/CI-SIGNING.md`](docs/CI-SIGNING.md).

## Documentation

- [`docs/USER-GUIDE.md`](docs/USER-GUIDE.md) — the end-to-end walkthrough (also in-app
  via the **Help** button).
- [`docs/COMPOSITION-MODEL.md`](docs/COMPOSITION-MODEL.md) — how the canvas's
  drop-validity is derived from the reference model.
- [`docs/PHASE-2-PRD.md`](docs/PHASE-2-PRD.md) — the product design.

## License

Apache License 2.0. Copyright 2026 Axius SDC, Inc. See [`LICENSE`](LICENSE).
