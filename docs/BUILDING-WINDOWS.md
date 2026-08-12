# Building SDCBench for Windows (native)

The Linux `.AppImage` does **not** run on Windows (or under WSL in any practical
way, the app stores its token in the Linux Secret Service, which WSL lacks). Windows
needs a **native** build, which produces a normal installer (`.exe` / `.msi`) using
Microsoft's **WebView2**. The app code is already cross-platform: on Windows the
API-key token is stored in the **Windows Credential Manager** automatically
(`keyring` `windows-native` in `Cargo.toml`), so there is nothing to change in code.

**The build must run on a Windows machine.** You cannot cross-compile a Windows
build from Linux (it needs the MSVC toolchain and WebView2). A Windows 11 machine is
ideal (WebView2 is preinstalled).

## 1. Prerequisites (install once)

1. **Rust** via [rustup](https://rustup.rs/). On Windows this installs the MSVC
   target (`x86_64-pc-windows-msvc`) by default.
2. **Microsoft C++ Build Tools** — the Visual Studio 2022 Build Tools with the
   **"Desktop development with C++"** workload (provides the MSVC linker Rust needs).
   Download: <https://visualstudio.microsoft.com/downloads/> (Build Tools for Visual
   Studio).
3. **Node.js LTS** (includes npm): <https://nodejs.org/>.
4. **WebView2 Runtime** — already present on Windows 11. On older Windows, install the
   Evergreen runtime from Microsoft (or let the installer fetch it, see below).

Verify in a fresh terminal:

```
rustc --version
node --version
npm --version
```

## 2. Get the source

Copy or clone the repository to the Windows machine (the whole repo, so `canon/` and
`docs/` resolve). Then:

```
cd SDCBench\app
npm install
```

## 3. Build the installer

Run the Tauri build, explicitly asking for the Windows bundlers (the default config
targets the Linux AppImage, so override it here):

```
npx tauri build --bundles nsis,msi
```

- `nsis` produces a **`.exe` setup** installer (recommended, flexible).
- `msi` produces a **`.msi`** (WiX, good for enterprise / group-policy deploys).

Use `--bundles nsis` alone if you only want the `.exe`.

> Do **not** run `npm run dist` on Windows, that script calls a bash
> `copy-appimage.sh` step which is Linux-only and will fail. Use `npx tauri build`
> directly.

## 4. Output

The installers land in:

```
app\src-tauri\target\release\bundle\
    nsis\SDCBench_4.0.0-beta.1_x64-setup.exe
    msi\SDCBench_4.0.0-beta.1_x64_en-US.msi
```

(The version in the filename tracks `src-tauri/tauri.conf.json`.)

## 5. WebView2 handling

The NSIS installer defaults to the **download bootstrapper**: if a target machine is
missing WebView2, the installer fetches it during install. On Windows 11 it is
already there, so installs are quick. To change this, see `bundle.windows.webviewInstallMode`
in the Tauri config docs.

## 6. Signing (for distribution)

An unsigned Windows app triggers a **SmartScreen** warning on other machines. For
real distribution, sign the installer with an **Authenticode** certificate (an EV or
OV code-signing cert). Tauri supports this via `bundle.windows.certificateThumbprint`
/ `signCommand`. For local testing or a trusted internal machine, signing is
optional.

## Notes

- Same app, same behavior as the Linux build: canvas-first sign-in with an SDCStudio
  API key, reuse-first assembly, "Send to SDCStudio" with the wallet cost confirmation.
- The Windows icon is already configured (`icons/icon.ico`).

---

### Other platforms

- **macOS** is deferred for now. It would likewise need to be **built on a Mac**
  (Tauri produces a `.app` / `.dmg`), plus an Apple Developer ID signature +
  notarization for distribution. The code is macOS-ready (`keyring` `apple-native`),
  it just needs a build machine when we decide to support it.
