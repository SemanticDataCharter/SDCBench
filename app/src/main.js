// SDCBench frontend — canvas-first. The app opens to the Blockly assembly canvas
// behind a key-only login gate; once signed in you build into your own SDCStudio
// project. Email/password and the CSV/LLM path are set aside for now (reuse-first).
import {
  health, signIn, whoami, authStatus, signOut, listProjects, openStudio,
  searchComponents, createModel, saveModel, listModels, readModel, getWallet,
} from './sidecar/bridge.js'
import {
  initCanvas, resizeCanvas, setReuseResults, draftPayload, hasContent,
  canSearchAdd, saveState, loadState, missingRequirements, mintCount,
} from './canvas.js'

// Wallet prices in CREDITS (mirror SDCStudio settings: mint 100, assemble 500).
// The server charge is authoritative; this is the pre-flight estimate for the
// popup. Credits are the unit the user sees everywhere else, so showing dollars
// here made SDCBench contradict SDCStudio for the same wallet.
const MINT_COST = 100
const ASSEMBLE_COST = 500
const fmtCredits = (n) => Number(n).toLocaleString('en-US')
import guideMd from '../../docs/USER-GUIDE.md?raw'

const VERSION = '4.0.0b2'

const $ = (id) => document.getElementById(id)
const gate = (show) => $('gate').classList.toggle('hidden', !show)

// --- Help: render the bundled user guide (offline) and toggle the overlay ---
function mdToHtml(md) {
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  let html = ''
  let inList = false
  const closeList = () => { if (inList) { html += '</ul>'; inList = false } }
  for (const raw of md.split('\n')) {
    const line = raw.replace(/\s+$/, '')
    const h = line.match(/^(#{1,4})\s+(.*)/)
    const li = line.match(/^[-*]\s+(.*)/)
    if (h) { closeList(); html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>` }
    else if (li) { if (!inList) { html += '<ul>'; inList = true } html += `<li>${inline(li[1])}</li>` }
    else if (!line.trim()) { closeList() }
    else { closeList(); html += `<p>${inline(line)}</p>` }
  }
  closeList()
  return html
}
$('helpbody').innerHTML = mdToHtml(guideMd)
const showHelp = (on) => $('help').classList.toggle('hidden', !on)
$('helpbtn').addEventListener('click', () => showHelp(true))
$('helpclose').addEventListener('click', () => showHelp(false))
$('help').addEventListener('click', (e) => { if (e.target === $('help')) showHelp(false) })
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') showHelp(false) })

// --- Health badge (proves the shell<->bridge wiring) ---
health()
  .then((h) => {
    $('health').textContent = `${h.app} ${VERSION}`
    $('health').className = 'badge ok'
  })
  .catch((e) => { $('health').textContent = `bridge error: ${e}` })

// --- Session ---
let me = null
let selectedProject = null // build target (own + team only)
let searchProject = null   // reuse source (any accessible project)
const myEmail = () => (me?.email || '').toLowerCase()

// Own + team only — never public / default-library. In SDCStudio's accessible set,
// team projects are exactly the ones that are neither public, default-library, nor
// owned; owned projects match on email (even if the user made them public).
function ownedOrTeam(p) {
  const owner = (p.owner_email || '').toLowerCase()
  if (owner && owner === myEmail()) return true
  return !p.is_public && !p.is_default_library
}

async function onConnected(info) {
  me = info
  $('gatemsg').textContent = ''
  $('apikey').value = ''
  gate(false)
  $('session').hidden = false
  renderWhoami(null)
  refreshWallet()
  await loadProjects(info?.default_project_ct_id)
  initCanvas()
  resizeCanvas()
  refreshDrafts()
}

// Name + wallet balance in the header. Balance drives what minting will cost.
function renderWhoami(balance) {
  const name = me?.name || me?.email || 'Signed in'
  const bal = (balance != null && balance !== '') ? ` · ${fmtCredits(balance)} credits` : ''
  $('whoami').textContent = name + bal
}
let walletBalance = null // last-known balance (drives the cost check)
async function refreshWallet() {
  try {
    const w = await getWallet()
    // balance_credits is authoritative. Fall back to converting the USD field
    // for servers older than the credits fields.
    walletBalance = (w?.balance_credits != null)
      ? Number(w.balance_credits)
      : ((w?.balance != null && w.balance !== '') ? Math.round(Number(w.balance) * 1000) : null)
    renderWhoami(walletBalance)
  } catch { /* keep the name-only display */ }
}

// Populate the "Saved drafts" picker from ~/Documents/SDCBench/.
async function refreshDrafts(selectName) {
  const sel = $('loadselect')
  let items = []
  try { items = await listModels() } catch (e) { /* leave placeholder */ }
  sel.innerHTML = `<option value="">${items.length ? 'Saved drafts…' : 'No saved drafts'}</option>`
  items.forEach((m) => {
    const opt = document.createElement('option')
    opt.value = m.name
    opt.textContent = m.name
    sel.appendChild(opt)
  })
  if (selectName) sel.value = selectName
}

const ctOf = (p) => p.ct_id ?? p.id

function fillSelect(sel, list, preferCt) {
  sel.innerHTML = ''
  list.forEach((p) => {
    const opt = document.createElement('option')
    opt.value = ctOf(p)
    opt.textContent = p.name ?? ctOf(p)
    sel.appendChild(opt)
  })
  const wanted = list.some((p) => ctOf(p) === preferCt) ? preferCt : (list[0] ? ctOf(list[0]) : null)
  if (wanted) sel.value = wanted
  return wanted
}

async function loadProjects(defaultCt) {
  let items = []
  try { items = await listProjects() } catch (e) { items = [] }

  // Build target: own + team only (you can only build in your own projects).
  const mine = items.filter(ownedOrTeam)
  if (!mine.length) {
    selectedProject = null
    $('projects').hidden = true
    $('libmsg').innerHTML = 'No project of your own yet. <a id="mkproj" href="#">Create one in SDCStudio →</a>'
    $('mkproj')?.addEventListener('click', (e) => { e.preventDefault(); openStudio('/app/projects') })
  } else {
    $('projects').hidden = false
    selectedProject = fillSelect($('projects'), mine, defaultCt)
  }

  // Reuse source: any accessible project (own + team + public + default library),
  // so you can pull components from a shared library while building in your own.
  searchProject = fillSelect($('searchproject'), items, defaultCt)
}

$('projects').addEventListener('change', (e) => { selectedProject = e.target.value || null })
$('searchproject').addEventListener('change', (e) => {
  searchProject = e.target.value || null
  const q = $('libsearch').value.trim()
  if (q) runSearch(q) // re-search the newly chosen source
})

// --- Login gate: API key only ---
$('usekey').addEventListener('click', async () => {
  const token = $('apikey').value.trim()
  if (!token) return
  $('gatemsg').textContent = 'Signing in…'
  try { await onConnected(await signIn(token)) }
  catch (e) { $('gatemsg').textContent = `${e}` }
})
$('apikey').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('usekey').click() })
$('signuplink').addEventListener('click', (e) => { e.preventDefault(); openStudio('/app/signup') })

$('signout').addEventListener('click', async () => {
  await signOut()
  me = null
  selectedProject = null
  searchProject = null
  $('whoami').textContent = ''
  $('session').hidden = true
  $('searchproject').innerHTML = ''
  $('libsearch').value = ''
  $('libmsg').textContent = ''
  setReuseResults([])
  gate(true)
})

// Resume a stored session on launch (stored key => auto sign-in).
authStatus().then(async (s) => {
  if (s?.connected) {
    try { await onConnected(await whoami()) } catch (e) { gate(true) }
  } else {
    gate(true)
  }
})

// --- Library search (reuse-first). Results display here; dragging them onto the
// canvas to reuse lands next. ---
let libTimer = null
let libSeq = 0
$('libsearch').addEventListener('input', (e) => {
  const q = e.target.value.trim()
  clearTimeout(libTimer)
  libTimer = setTimeout(() => runSearch(q), 250)
})

async function runSearch(q) {
  const seq = ++libSeq
  $('libmsg').textContent = q ? 'Searching…' : ''
  if (!q) { setReuseResults([]); return }
  try {
    const rows = await searchComponents(q, searchProject)
    if (seq !== libSeq) return
    const all = Array.isArray(rows) ? rows : []
    // Cluster members (Xd* leaves + Clusters) plus Units (which attach to a number
    // field); structural types (Party/Audit/…) have no place on the canvas.
    const list = all.filter((r) => canSearchAdd(r.type))
    setReuseResults(list)
    const hidden = all.length - list.length
    $('libmsg').textContent = list.length
      ? `${list.length} component${list.length === 1 ? '' : 's'} — drag from the Reuse tab` +
        (hidden ? ` (${hidden} not usable in a model hidden)` : '')
      : (hidden ? `${hidden} match(es), but none can sit in a model.` : 'No published components match.')
  } catch (err) {
    if (seq !== libSeq) return
    setReuseResults([])
    $('libmsg').textContent = `${err}`
  }
}

// --- Create the draft model from the canvas ---
let creating = false        // in-flight guard (blocks rapid double-clicks)
let lastCreatedSig = null   // signature of the last successful create (blocks re-creating the same model)
let pendingCreate = null    // { req, sig } awaiting the cost-confirmation Accept

// Clicking "Send to SDCStudio" validates, estimates the cost, and asks to confirm.
$('createbtn').addEventListener('click', async () => {
  if (creating) return
  if (!selectedProject) { $('createstatus').textContent = 'Pick a project first.'; return }
  const p = draftPayload()
  if (!p) { $('createstatus').textContent = 'Your model needs a root group.'; return }
  if (!hasContent()) { $('createstatus').textContent = 'Add at least one field to your model.'; return }
  // FR-13: every new field needs a plain-language requirement (the handoff artifact).
  const noReq = missingRequirements()
  if (noReq.length) {
    $('createstatus').className = 'muted warn'
    $('createstatus').textContent = `Describe your new field${noReq.length === 1 ? '' : 's'}: ${noReq.join(', ')}. Select each on the canvas and fill in its Requirement.`
    return
  }
  const description = $('dmdesc').value.trim()
  if (!description) { $('createstatus').textContent = 'Add a model description.'; return }

  const req = { project_ct_id: selectedProject, root: p.root, dm: { title: p.title, description } }
  // Double-create guard: refuse to re-create an identical model. Any change to the
  // canvas or the title/description makes a new signature and re-enables it.
  const sig = JSON.stringify(req)
  if (sig === lastCreatedSig) {
    $('createstatus').className = 'muted warn'
    $('createstatus').textContent = 'You just created this model. Change something (or the title/description) to create another.'
    return
  }

  // Cost = 500 credits model + 100 per new component (reused is free). Confirm first.
  await refreshWallet()
  const count = mintCount()
  const cost = ASSEMBLE_COST + MINT_COST * count
  const short = walletBalance != null && walletBalance < cost
  $('confirmcost').textContent = `${fmtCredits(cost)} credits`
  $('confirmdetail').textContent =
    `${count} new component${count === 1 ? '' : 's'} × ${fmtCredits(MINT_COST)} + ${fmtCredits(ASSEMBLE_COST)} data model.` +
    (walletBalance != null ? ` Wallet balance: ${fmtCredits(walletBalance)} credits.` : '') +
    ' Reused components are free.'
  const warn = $('confirmwarn')
  warn.hidden = !short
  if (short) warn.innerHTML = 'Not enough credits. <a id="fundlink2" href="#">Add credits →</a>'
  $('fundlink2')?.addEventListener('click', (e) => { e.preventDefault(); openStudio('/app/settings?tab=wallet') })
  $('confirmaccept').disabled = short
  pendingCreate = { req, sig }
  $('confirm').classList.remove('hidden')
})

$('confirmcancel').addEventListener('click', () => { $('confirm').classList.add('hidden'); pendingCreate = null })
$('confirmaccept').addEventListener('click', () => {
  $('confirm').classList.add('hidden')
  if (pendingCreate) doCreate(pendingCreate.req, pendingCreate.sig)
})

async function doCreate(req, sig) {
  if (creating) return
  creating = true
  $('createbtn').disabled = true
  $('createstatus').className = 'muted'
  $('createstatus').textContent = 'Sending to SDCStudio…'
  try {
    const r = await createModel(req)
    const ok = r.created_count ?? 0
    const bad = r.error_count ?? 0
    if (r.insufficient_funds) {
      // Wallet ran short (HTTP 402). Offer to fund it.
      $('createstatus').className = 'muted warn'
      $('createstatus').innerHTML = 'Not enough credits to mint your new components. <a id="fundlink" href="#">Add credits →</a>'
      $('fundlink')?.addEventListener('click', (e) => { e.preventDefault(); openStudio('/app/settings?tab=wallet') })
    } else if (r.dm_ct_id) {
      lastCreatedSig = sig // only a fully-created model counts as "done"
      $('createstatus').className = 'muted ok'
      $('createstatus').textContent = `✓ Draft model created — ${ok} component${ok === 1 ? '' : 's'}${bad ? `, ${bad} issue(s)` : ''}. Finalize and publish in SDCStudio.`
    } else {
      $('createstatus').className = 'muted warn'
      const first = (r.errors && r.errors[0]) ? ` (${r.errors[0].error})` : ''
      $('createstatus').textContent = `Could not create the model${first}. ${ok} component(s) made.`
    }
    refreshWallet() // balance may have changed
  } catch (e) {
    $('createstatus').className = 'muted warn'
    $('createstatus').textContent = `${e}`
  } finally {
    creating = false
    $('createbtn').disabled = false
  }
}

// --- Save the draft locally (to disk, not SDCStudio) ---
$('savebtn').addEventListener('click', async () => {
  const p = draftPayload()
  const name = (p && p.title) || 'model'
  $('createstatus').className = 'muted'
  $('createstatus').textContent = 'Saving locally…'
  try {
    const path = await saveModel(name, saveState())
    $('createstatus').className = 'muted ok'
    $('createstatus').textContent = `✓ Saved to ${path}`
    refreshDrafts(name) // surface the just-saved draft in the picker
  } catch (e) {
    $('createstatus').className = 'muted warn'
    $('createstatus').textContent = `${e}`
  }
})

// --- Load a saved draft back into the canvas ---
$('loadbtn').addEventListener('click', async () => {
  const name = $('loadselect').value
  if (!name) { $('createstatus').className = 'muted'; $('createstatus').textContent = 'Pick a saved draft to load.'; return }
  $('createstatus').className = 'muted'
  $('createstatus').textContent = 'Loading…'
  try {
    loadState(await readModel(name))
    $('createstatus').className = 'muted ok'
    $('createstatus').textContent = `✓ Loaded "${name}".`
  } catch (e) {
    $('createstatus').className = 'muted warn'
    $('createstatus').textContent = `${e}`
  }
})

window.addEventListener('resize', resizeCanvas)
