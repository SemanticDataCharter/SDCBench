# CI and code signing

SDCBench builds on GitHub Actions (`.github/workflows/build.yml`): a Linux AppImage
and a Windows `.exe` installer. The Windows installer is **Authenticode code-signed
by [SignPath Foundation](https://signpath.org/), which signs open-source projects for
free**. Until SignPath is configured the signing step is skipped and the workflow
still produces an unsigned installer.

macOS is not built here; it needs a Mac and an Apple Developer signature (deferred).

## What the workflow does

- **Manual run** (Actions → build → Run workflow) or **pull request**: builds Linux +
  Windows, uploads the installers as run artifacts.
- **Tag `v*`** (e.g. `git tag v4.0.0-beta.1 && git push --tags`): builds, signs (if
  configured), and publishes a **GitHub Release** with both installers attached.

The signing step is gated on the `SIGNPATH_ORGANIZATION_ID` repo **variable**: empty =
skipped, set = signing runs. So nothing breaks before SignPath is approved.

## One-time SignPath Foundation setup

1. **Apply** at <https://signpath.org/foundation> and add the project, pointing it at
   `github.com/SemanticDataCharter/SDCBench` (public, OSI-licensed, builds in CI, all
   required). Wait for approval.
2. In the SignPath web console, note/create:
   - your **Organization ID** (Settings),
   - a **Project** (its slug),
   - a **Signing Policy** (e.g. `release-signing`, its slug),
   - a **CI user API token** (for the GitHub Action).
3. Register the GitHub Actions workflow as a **trusted build** for the project (SignPath
   verifies the artifact came from this repo's CI before signing).

## Configure the GitHub repo

In **Settings → Secrets and variables → Actions**:

**Secret:**
| Name | Value |
|---|---|
| `SIGNPATH_API_TOKEN` | the SignPath CI user API token |

**Variables:**
| Name | Value |
|---|---|
| `SIGNPATH_ORGANIZATION_ID` | your SignPath organization ID |
| `SIGNPATH_PROJECT_SLUG` | the SignPath project slug |
| `SIGNPATH_SIGNING_POLICY_SLUG` | the signing policy slug (e.g. `release-signing`) |

Once `SIGNPATH_ORGANIZATION_ID` is set, the next tagged build signs the Windows
installer automatically; the release then carries a signed `.exe` (no SmartScreen
warning) alongside the Linux AppImage.

## Notes

- The Windows token backend is the OS Credential Manager, already wired in `Cargo.toml`
  (`keyring` `windows-native`), so a native Windows build needs no code changes.
- To cut a release: `git tag vX.Y.Z && git push origin vX.Y.Z`.
