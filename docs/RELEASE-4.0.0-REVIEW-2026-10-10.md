# SDCBench 4.0.0: release review and Windows signing

*Written 2026-10-10 against `main` at 4.0.0-beta.4 (tag 2026-10-03). Bracketed items are
decisions for Tim. Annotate inline; the build follows the annotations.*

## 1. Where the bench stands

| Piece | State |
|---|---|
| Shipped | 4.0.0-beta.4, Linux AppImage and Windows NSIS installer, built and published by CI on the tag |
| Visual refresh, tablet-first, light and dark | Shipped in beta.3, Tim's keyboard pass: "The new UI looks great" |
| Built-in nine-move tutorial | Shipped in beta.4 (Size as Integer with units, units drop fixed) |
| Release guard | One `VERSION` file, `tools/set_version.py`, canon tests, tag must equal VERSION and sit on `main` |
| CI actions | Already on the Node 24 lines (checkout v5, setup-node v5, upload v6, download v8) |
| Windows signing | Hooked for SignPath Foundation, never configured; every beta shipped unsigned |
| The Pizza Order tutorial | PRD draft 2; the `pizza_tutorial/` step files not started |
| Open PRs and issues | None |
| `dev` vs `main` | Identical |

Downloads of the four betas total five Windows installers and three AppImages, from the
GitHub release assets. The bench has one star and no watchers. That number matters for one
of the signing options below.

## 2. What 4.0.0 means

A 4.0.0 says the bench is finished enough to hand to a domain expert without an apology on
the download page. Three things separate beta.4 from that:

1. **A signed Windows installer.** The download page and the in-app help both carry the
   "unknown publisher" caveat. That is the one visible difference between a beta and a
   product for the people the bench is for.
2. **Docs and the site say 4.0.0, not beta.** `README.md`, `docs/BUILDING-WINDOWS.md`,
   `docs/CI-SIGNING.md`, the site's `sdcbench.html` download cards and its "A note on the
   Windows warning" panel, the AI files fact sheet, both `ai.txt` and `llms.txt`.
3. **The AppImage keeps building after 19 October.** The Linux job is pinned to
   `ubuntu-22.04`, which is right (an AppImage built on a newer glibc fails on older
   desktops). The `checks` and `release` jobs run on `ubuntu-latest`, which flips to Ubuntu
   26.04 on the 19th; neither installs webkit packages, so nothing should break, but the
   release build is the first to find out. Pin both to `ubuntu-24.04` so the flip is a
   deliberate move later.

**Not in 4.0.0:** The Pizza Order step files. They are tutorial content, not an app change,
and they need a tagged build to screenshot. They land as `pizza_tutorial/` in a 4.0.x after
the signed build exists, which is the order the resume notes already set.

**[Decision 1]** 4.0.0 = beta.4 plus the signed installer plus the de-beta pass. The tutorial
follows in 4.0.1 or 4.1.0 with its own screenshots. Agree, or hold 4.0.0 for the tutorial?

## 3. Windows signing options, priced

The constraint that rules out most of the market: since June 2023 every public code-signing
key must live in a hardware token or a cloud HSM. A token cannot sit in a GitHub-hosted
runner, so for a project that builds in CI the choice is between the cloud services. Prices
checked 2026-10-10.

| Option | Cost | Publisher name on the certificate | Signs from CI | SmartScreen | Verdict |
|---|---|---|---|---|---|
| **Azure Artifact Signing** (Microsoft, was Trusted Signing), Basic tier | $9.99 a month, 5,000 signatures | Axius SDC, Inc. | Yes, official GitHub action, Windows runner, OIDC, no stored secret | Reputation is tied to the validated identity, so a fresh build is clean from the first download | **Recommended** |
| Certum Open Source Code Signing in the Cloud | about €49 a year | "Open Source Developer, Timothy W. Cook" (individuals only; company name not allowed) | No: SimplySign needs a one-time code from a phone for every signing session | Earned per certificate by download volume, the standard OV curve | Cheapest, but the wrong name and no unattended signing |
| SSL.com OV certificate plus eSigner cloud | $129 a year plus $15 a month, about $309 a year | Axius SDC, Inc. | Yes, with stored credentials and a TOTP secret | Earned by download volume | Works, costs more than Azure, less to show for it |
| Sectigo or DigiCert OV on a USB token (via resellers) | from about $219 a year | Axius SDC, Inc. | No, the token is on a desk | Earned | Out for a CI project |
| EV certificate | $300 to $500 a year | Axius SDC, Inc. | Cloud variants only | Microsoft no longer grants EV an instant-reputation advantage | No reason to pay for it |
| SignPath Foundation | Free | Axius SDC, Inc. or the project | Yes, the hooks are already in `build.yml` | Earned | Requires "a certain verifiable reputation" with a required field for it on the form. One star and five downloads will not pass. Keep the hooks; do not wait on it |

**Why Azure wins on both of Tim's criteria.** It is the cheapest option that puts the
company's legal name on the certificate, and the only one at that price where the signature
comes with reputation attached rather than earned. It is also the simplest to run: nothing
to store but an endpoint and three names, no secret to rotate when OIDC is used, certificates
rotated daily by the service, and the CI change is one step after the NSIS build.

**The one thing to verify before paying.** During the 2025 preview, organization validation
required three years of verifiable tax history. Axius SDC, Inc. is one year old this month.
The current quickstart (updated 2026-10-08) lists no age or history requirement, and a
Microsoft engineer answered a 2025-formed LLC's question on Microsoft Q&A with "no minimum
org age restrictions." The validator (AU10TIX) still needs public records to match: EIN or
DUNS, the legal name as the state registered it, the business address, a domain the company
owns, and a monitored mailbox on that domain. Validation is quoted at 1 to 20 business days.
If it fails, the fallback is Azure's **individual** validation (US developers are eligible),
which signs as Timothy W. Cook for the same $9.99 a month, and the company name moves to the
certificate on a later validation. Either way nothing is paid until the account is created,
and the account can be deleted if validation fails.

**[Decision 2]** Go with Azure Artifact Signing, Basic tier, organization validation under
Axius SDC, Inc. Yes, or prefer individual validation from the start to skip the company
paperwork?

## 4. What only Tim can do (Azure side)

In order. Steps 1 to 4 are a portal session; 5 is a wait.

1. **Azure subscription.** Create one at portal.azure.com with the company's billing
   details (pay-as-you-go; the Basic tier is the only charge). A Microsoft Entra tenant
   comes with it. Use an @axius-sdc.com identity, since validation emails must land on the
   company domain.
2. **Register the resource provider** `Microsoft.CodeSigning` on the subscription
   (Subscriptions, Resource providers, Register).
3. **Create the Artifact Signing account.** Resource group of your choosing, region
   East US (endpoint `https://eus.codesigning.azure.net`), pricing Basic. Name it
   `axiussdc` or similar (3 to 24 characters, globally unique).
4. **Assign yourself** the role *Artifact Signing Identity Verifier* on the account, then
   open Identity validations, Organization, New identity, Public. Fields:
   organization name exactly as the state registered it; website `https://axius-sdc.com`;
   primary and secondary emails on axius-sdc.com; business identifier = EIN (the IRS form
   of the name, without punctuation, is a known mismatch source, so have the articles of
   incorporation ready as the supporting document); your name as it appears on your
   driver's license. The individual step follows by email: AU10TIX, phone camera, ID,
   Microsoft Authenticator.
5. **Wait for Completed.** Then create a certificate profile of type *Public Trust* against
   that validation, name `sdcbench-release`.
6. **Federated credential for GitHub.** Entra ID, App registrations, New registration
   (`sdcbench-ci`), then Certificates and secrets, Federated credentials, GitHub Actions
   deploying Azure resources: organization `SemanticDataCharter`, repository `SDCBench`,
   entity *Tag*, pattern `v*` (and a second one for *Branch* `main` if you want manual runs
   signed). On the Artifact Signing account, assign the app registration the role
   *Artifact Signing Certificate Profile Signer*.
7. **Four repository variables** on SemanticDataCharter/SDCBench (none are secrets):
   `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_SIGNING_ENDPOINT`
   (`https://eus.codesigning.azure.net`), `AZURE_SIGNING_ACCOUNT` (the account name),
   `AZURE_CERT_PROFILE` (`sdcbench-release`).

Add a calendar note: the identity validation expires after two years.

## 5. What the bench does (my side), in order

1. **`build.yml`:** after the NSIS build, `azure/login` with OIDC, then
   `azure/artifact-signing-action@v2` on `*-setup.exe` with the Microsoft timestamp server,
   gated on `vars.AZURE_SIGNING_ACCOUNT != ''` the way the SignPath step is gated today.
   Signed installer becomes the release asset; unsigned stays the fallback. SignPath hooks
   stay beside it. `checks` and `release` jobs pinned to `ubuntu-24.04`.
2. **Sign the inner executable too.** The action signs the installer. The app's own
   `SDCBench.exe` inside it is signed through Tauri's `bundle.windows.signCommand`, pointed
   at the same action's `signtool` wrapper, so the installed program carries the company
   name as well, not only the download. If that proves awkward on the runner, 4.0.0 ships
   with the installer signed and the inner binary follows in 4.0.1.
3. **De-beta pass:** `docs/CI-SIGNING.md` rewritten for Azure (SignPath kept as a
   paragraph); `README.md` and `docs/BUILDING-WINDOWS.md` examples at 4.0.0; the site's
   two download cards and the warning panel replaced by one line that the installer is
   signed by Axius SDC, Inc.; fact sheet, `ai.txt`, `llms.txt` on both sites to 4.0.0.
4. **Release:** `tools/set_version.py 4.0.0`, `dev` to `main` PR with
   `set_version.py --check`, Tim tags `v4.0.0` on `main`, CI builds, signs, publishes.
   First run on a signed build: download the installer on a Windows machine and confirm
   no SmartScreen interstitial and "Axius SDC, Inc." in the file's Digital Signatures tab.
5. **Then the tutorial** picks up at step 1 of the resume notes with screenshots from the
   signed 4.0.0.

**[Decision 3]** The signed inner executable (5.2) in 4.0.0, or installer-only and move on?

## 6. Sources

- Azure Artifact Signing quickstart, prerequisites and identity validation
  (learn.microsoft.com/en-us/azure/artifact-signing/quickstart, updated 2026-10-08).
- Microsoft Q&A, "is a US LLC formed in 2025 eligible", answered by Microsoft staff.
- Azure/artifact-signing-action v2 README (Windows runners only, OIDC supported).
- Certum: shop.certum.eu Open Source Code Signing in the Cloud; support.certum.eu
  code-signing required documents ("issued only for individuals").
- SSL.com: OV code signing and eSigner pricing pages.
- SignPath Foundation terms (signpath.org/terms.html).
