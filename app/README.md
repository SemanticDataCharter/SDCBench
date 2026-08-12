# SDCBench app (Tauri shell + Vite frontend)

Canvas-first desktop client for SDCStudio. See the top-level
[`README.md`](../README.md) for what it does and [`../docs/USER-GUIDE.md`](../docs/USER-GUIDE.md)
for the walkthrough.

## Layout

```
app/
  index.html            Vite entry (login gate + canvas + panel + modals)
  src/
    main.js             app flow: sign in -> projects -> search/reuse -> assemble -> send
    canvas.js           the Google Blockly assembly canvas
    style.css
    sidecar/bridge.js   wraps invoke() (auth, projects, library, create, wallet, save/load)
  src-tauri/
    src/lib.rs          #[command] health, open_studio, save_model/list_models/read_model
    src/auth.rs         #[command] sign_in/whoami/auth_status/sign_out/list_projects/wallet
    src/library.rs      #[command] search_components
    src/drafts.rs       #[command] create_model (nested draft: leaves -> Cluster -> DM)
    tauri.conf.json     v2 config
    capabilities/       v2 permissions
    Cargo.toml
```

All SDCStudio calls are made from Rust, so the API token stays in the OS keychain and
the webview never sees it (and there is no CORS to fight).

## Run (desktop)

Prereqs: Node + Rust, and the platform webview libs. On Debian/Ubuntu:

```sh
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev \
                 libsoup-3.0-dev build-essential curl wget file
```

Then:

```sh
cd app
npm install
npm run tauri dev      # builds the Rust shell, starts Vite, opens the window
npm run tauri build    # release bundle (Linux AppImage)
```

Google Blockly's media assets are vendored offline into `public/blockly-media/`
automatically before dev/build (see `scripts/copy-blockly-media.mjs`).

Server base defaults to the public `sdcstudio.axius-sdc.com`; override with the
`SDCSTUDIO_BASE_URL` environment variable to point at another SDCStudio instance.

## Frontend only (no Rust)

```sh
npm install && npm run dev    # UI renders; invoke() is a no-op outside Tauri
```
