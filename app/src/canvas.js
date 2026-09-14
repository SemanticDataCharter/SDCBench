// SDCBench reuse-assembly canvas (Phase-2 2a) — Google Blockly, vendored offline.
// The build surface: a scientist assembles a document tree (Model -> Group ->
// Fields / sub-Groups) by dragging blocks. Blockly's snap-where-it-fits is the
// point — you SEE the structure and invalid placements simply won't connect.
//
// Colour is a legend: data types (Xd*) are GREENS (shaded by family), a Cluster is
// slate, attachments (Units, ReferenceRange) are amber, the Model is indigo. Reuse
// is shown by a ↩ tag, not colour (colour encodes the type).
//
// RM rules come from canon/composition-model.json (node_kinds / families), never
// hard-coded: Cluster nesting via connection `check` arrays; a number field
// (XdQuantified) carries a Units slot; an XdOrdered field (Ordinal/Temporal/
// Quantified) carries a reference-range slot. Drafting vs publish: children are
// OPTIONAL to create a draft (reference ranges, etc.) — EXCEPT Units, a null=False
// FK SDCStudio can't save without, so a number field requires one at the bench.
// Client affordance only; SDCStudio's publish/validate API is the gate (D8).
import * as Blockly from 'blockly'
import model from '../../canon/composition-model.json'

const nk = model.canvas.node_kinds
const fam = model.families
const ROOT_ACCEPTS = nk.Model.root_accepts_canvas   // ['Group']
const GROUP_ACCEPTS = nk.Group.accepts_canvas       // ['Group','Field']
const TYPE_BADGES = nk.Field.type_badges
const API_BADGES = model.canvas.api_type_badges
if (typeof window !== 'undefined') window.__apiBadges = API_BADGES
const CLUSTER_MEMBERS = new Set(model.canvas.cluster_member_api_types)
export const canReuse = (type) => CLUSTER_MEMBERS.has(type)
// Units / ReferenceRange aren't Cluster members but ARE reusable — they attach to a
// field's slot. So the search may offer a Cluster member, a Units, or a RefRange.
export const canSearchAdd = (type) => canReuse(type) || type === 'units' || type === 'referencerange'

const CREATABLE = nk.Field.rm_types.filter((t) => !t.endsWith('ListType') && t !== 'XdIntervalType')
const optsFor = (list) => list.map((t) => [TYPE_BADGES[t] || t, t])

// Families drive which slots a field carries + its colour.
const ENTRY = new Set((fam.Entry && fam.Entry.members) || [])
const ORDERED = new Set((fam.Ordered && fam.Ordered.members) || [])
const QUANTIFIED = new Set((fam.Quantified && fam.Quantified.members) || [])
const ORDERED_OR_QUANT = new Set([...ORDERED, ...QUANTIFIED]) // carry a reference-range slot
// api `type` -> RM type (mirror the generator's rule) for colouring reused blocks.
const API_TO_RM = {}
nk.Field.rm_types.forEach((rm) => {
  API_TO_RM[rm === 'XdIntervalType' ? 'interval' : rm.slice(0, -4).toLowerCase()] = rm
})

// House palette. One colour for data, whatever its family: the type badge on the
// block face carries the distinction, and three greens did not read as three.
const COL = {
  entry: '#2ca58d',    // data (every Xd* leaf)
  group: '#3b5578',    // container (Cluster)
  attach: '#f0a500',   // attachments (Units, ReferenceRange): the signal colour
  model: '#5b6ee1',    // the DM root
}
function dataColour(rm) { return COL.entry }
// A small SVG pill used as a block-face marker for reuse. Colour is reserved for the
// data type, so reuse is shown by this word, not by hue.
function pill(text, width) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='16' viewBox='0 0 ${width} 16'>` +
    `<rect x='0.5' y='0.5' width='${width - 1}' height='15' rx='7.5' fill='rgba(255,255,255,0.16)' stroke='rgba(255,255,255,0.45)'/>` +
    `<text x='${width / 2}' y='11.5' text-anchor='middle' font-family='system-ui,sans-serif' font-size='10' font-weight='600' fill='#fff'>${text}</text></svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}
const REUSED_PILL = { type: 'field_image', src: pill('reused', 52), width: 52, height: 16, alt: 'reused' }

const dataColourApi = (apiType) => dataColour(API_TO_RM[apiType] || '')

// --- The new-field mutator: shows a Units slot for quantified types and a
// reference-range slot for XdOrdered types, and colours the block by family. ---
// The ranges bay is not shown by default: ranges are optional at the bench and the
// modeler adds them in SDCStudio, so an empty bay on every number field only made
// the block taller. It appears when a range is dropped (see attachToField) and is
// remembered in the block's extra state. The units socket keeps a shadow block
// that reads "none yet" instead of a bare notch.
const FIELD_MIXIN = {
  saveExtraState() { return { kind: this.getFieldValue('KIND'), ranges: !!this.getInput('REFRANGES') } },
  loadExtraState(state) { this.updateShape_((state && state.kind) || this.getFieldValue('KIND'), !!(state && state.ranges)) },
  updateShape_(kind, ranges) {
    const wantUnits = QUANTIFIED.has(kind)
    const mayRange = ORDERED_OR_QUANT.has(kind)
    const wantRanges = mayRange && (ranges === undefined ? !!this.getInput('REFRANGES') : ranges)
    if (wantUnits && !this.getInput('UNITS')) {
      const inp = this.appendValueInput('UNITS').setCheck('Units').appendField('units')
      inp.connection.setShadowState({ type: 'sdc_units_empty' })
    }
    if (!wantUnits && this.getInput('UNITS')) this.removeInput('UNITS')
    if (wantRanges && !this.getInput('REFRANGES')) this.appendStatementInput('REFRANGES').setCheck('RefRange').appendField('ranges')
    if (!wantRanges && this.getInput('REFRANGES')) this.removeInput('REFRANGES')
    this.setColour(dataColour(kind))
  },
  showRanges_() { if (ORDERED_OR_QUANT.has(this.getFieldValue('KIND'))) this.updateShape_(this.getFieldValue('KIND'), true) },
}
function fieldHelper() {
  this.setInputsInline(true)
  this.getField('KIND').setValidator((v) => { this.updateShape_(v); return v })
  this.updateShape_(this.getFieldValue('KIND'))
}
Blockly.Extensions.registerMutator('sdc_field_ext', FIELD_MIXIN, fieldHelper)

// Every component block hover-shows its human text: a reused component's published
// description, or a new component's requirement (FR-13). Falls back to the static
// type tooltip when neither is set.
Blockly.Extensions.register('sdc_desc', function () {
  const fallback = this.tooltip
  this.setTooltip(() => {
    const d = reuseData(this)
    return (d && (d.description || d.requirement)) || fallback
  })
})

// --- Block definitions (shapes + connection checks all sourced from the map) ---
Blockly.defineBlocksWithJsonArray([
  {
    type: 'sdc_model',
    message0: 'Model %1', args0: [{ type: 'field_input', name: 'NAME', text: 'New model' }],
    message1: 'root %1', args1: [{ type: 'input_statement', name: 'ROOT', check: ROOT_ACCEPTS }],
    colour: COL.model,
    tooltip: 'Your data model. Its root is one Group.',
  },
  {
    type: 'sdc_group',
    message0: 'Group %1', args0: [{ type: 'field_input', name: 'NAME', text: 'group' }],
    message1: 'contains %1', args1: [{ type: 'input_statement', name: 'ITEMS', check: GROUP_ACCEPTS }],
    previousStatement: 'Group', nextStatement: GROUP_ACCEPTS,
    colour: COL.group,
    tooltip: 'A new group of fields and sub-groups; nests freely.',
    extensions: ['sdc_desc'],
  },
  {
    // One field block; the mutator adds a units/ranges slot for the chosen type.
    type: 'sdc_field',
    message0: '%1 %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'field' },
      { type: 'field_dropdown', name: 'KIND', options: optsFor(CREATABLE) },
    ],
    previousStatement: 'Field', nextStatement: GROUP_ACCEPTS, // not in ROOT_ACCEPTS: a Field can't be a model root
    colour: COL.entry,
    mutator: 'sdc_field_ext',
    tooltip: 'A new data field, shown by its data type. Auto-wrapped inside a Group.',
    extensions: ['sdc_desc'],
  },
  // The empty units socket: a shadow that says so, replaced when Units are dropped.
  {
    type: 'sdc_units_empty',
    message0: 'none yet',
    output: 'Units',
    colour: COL.attach,
    tooltip: 'Drop a published Units here. The modeler can also add it in SDCStudio.',
  },
  // Reused published component. Carries its ct_id in block.data; the pill marks reuse.
  {
    type: 'sdc_field_reused',
    message0: '%1 %2 %3',
    args0: [
      REUSED_PILL,
      { type: 'field_label_serializable', name: 'BADGE', text: '' },
      { type: 'field_label_serializable', name: 'LABEL', text: '' },
    ],
    previousStatement: 'Field', nextStatement: GROUP_ACCEPTS,
    colour: COL.entry, // refined per-family after creation
    tooltip: 'A published component reused by reference.',
    extensions: ['sdc_desc'],
  },
  {
    type: 'sdc_group_reused',
    message0: '%1 Group %2',
    args0: [REUSED_PILL, { type: 'field_label_serializable', name: 'LABEL', text: '' }],
    previousStatement: 'Group', nextStatement: GROUP_ACCEPTS, // opaque: no ITEMS slot
    colour: COL.group,
    tooltip: 'A published Cluster reused by reference; edit its internals in SDCStudio.',
    extensions: ['sdc_desc'],
  },
  // Reused Units — a VALUE block (output 'Units'): snaps only into a number field's
  // units slot, never a Cluster.
  {
    type: 'sdc_units_reused',
    message0: '%1 %2',
    args0: [REUSED_PILL, { type: 'field_label_serializable', name: 'LABEL', text: '' }],
    output: 'Units',
    colour: COL.attach,
    tooltip: 'A published Units — drops into a number field’s units slot.',
    extensions: ['sdc_desc'],
  },
  // Reused ReferenceRange — a STATEMENT block (RefRange): stacks in an XdOrdered
  // field's ranges slot (M2M, so several may stack).
  {
    type: 'sdc_refrange_reused',
    message0: '%1 range %2',
    args0: [REUSED_PILL, { type: 'field_label_serializable', name: 'LABEL', text: '' }],
    previousStatement: 'RefRange', nextStatement: 'RefRange',
    colour: COL.attach,
    tooltip: 'A published reference range — stacks in a field’s ranges slot.',
    extensions: ['sdc_desc'],
  },
])

const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category', name: 'New', colour: COL.entry,
      contents: [
        { kind: 'block', type: 'sdc_group' },
        { kind: 'block', type: 'sdc_field' },
        { kind: 'sep', gap: '12' },
        { kind: 'block', type: 'sdc_model' },
      ],
    },
    { kind: 'category', name: 'Reuse', colour: COL.attach, custom: 'REUSE' },
  ],
}

const theme = Blockly.Theme.defineTheme('sdcdark', {
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#050b14',
    toolboxBackgroundColour: '#0a1a30',
    flyoutBackgroundColour: '#0b1f3a',
    flyoutForegroundColour: '#e8eef6',
    scrollbarColour: '#2a3a55',
    insertionMarkerColour: '#2ca58d',
    insertionMarkerOpacity: 0.5,
    cursorColour: '#2ca58d',
  },
  fontStyle: { family: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', weight: '500', size: 11 },
})

let ws = null
let reuseRows = []

// Dynamic "Reuse" flyout: the current library-search results as draggable blocks.
function reuseFlyout() {
  if (!reuseRows.length) {
    return [{ kind: 'label', text: 'Search the library in the panel on the right' }]
  }
  return reuseRows.filter((r) => canSearchAdd(r.type)).map((r) => {
    // description rides along so the block can hover-show it (flyout + canvas).
    const data = JSON.stringify({ ct_id: r.ct_id, type: r.type, description: r.description || '' })
    if (r.type === 'units') return { kind: 'block', type: 'sdc_units_reused', data, fields: { LABEL: r.label } }
    if (r.type === 'referencerange') return { kind: 'block', type: 'sdc_refrange_reused', data, fields: { LABEL: r.label } }
    if (r.type === 'cluster') return { kind: 'block', type: 'sdc_group_reused', data, fields: { LABEL: r.label } }
    return {
      kind: 'block', type: 'sdc_field_reused', data,
      fields: { BADGE: API_BADGES[r.type] || r.type, LABEL: r.label },
    }
  })
}

// Seed Model -> root Group. An SDC data model always has exactly one root Cluster,
// so we start with it in place: the user fills the root Group (the path that works)
// rather than connecting a Group to a bare root. The skeleton is locked so the
// model can't be left rootless.
function seedModel() {
  Blockly.serialization.workspaces.load({
    blocks: { blocks: [{
      type: 'sdc_model', x: 40, y: 30, fields: { NAME: 'New model' },
      inputs: { ROOT: { block: { type: 'sdc_group', fields: { NAME: 'data' } } } },
    }] },
  }, ws)
  const m = ws.getTopBlocks(false).find((b) => b.type === 'sdc_model')
  if (m) {
    m.setDeletable(false)
    const root = m.getInputTargetBlock('ROOT')
    if (root) { root.setDeletable(false); root.setMovable(false) }
  }
}

// --- Serialize the canvas back to SDC structure (+ show the auto-wrap) ---
const stackFrom = (b) => { const out = []; for (; b; b = b.getNextBlock()) out.push(b); return out }
const inputStack = (blk, name) => {
  const t = blk.getInput(name)?.connection?.targetBlock()
  return t ? stackFrom(t) : []
}
function reuseData(b) {
  try { return JSON.parse(b.data || 'null') || {} } catch { return {} }
}
// FR-13: a new component's plain-language requirement, stored in block.data.
const reqOf = (b) => reuseData(b).requirement || ''
function setReq(b, text) {
  const d = reuseData(b)
  if (text) d.requirement = text; else delete d.requirement
  b.data = Object.keys(d).length ? JSON.stringify(d) : ''
}
const unitsCt = (b) => {
  const u = b.getInput('UNITS')?.connection?.targetBlock()
  return (u && !u.isShadow()) ? (reuseData(u).ct_id || '') : ''
}
const refrangeCts = (b) => inputStack(b, 'REFRANGES').map((r) => reuseData(r).ct_id || '').filter(Boolean)

function serField(b) {
  if (b.type === 'sdc_field_reused') {
    return {
      field: b.getFieldValue('LABEL'), meaning: b.getFieldValue('BADGE'),
      reuse_ct_id: reuseData(b).ct_id || '', wrapped_in: 'XdAdapterType',
    }
  }
  const kind = b.getFieldValue('KIND')
  const out = {
    field: b.getFieldValue('NAME'), meaning: TYPE_BADGES[kind] || kind,
    rm_type: kind, wrapped_in: 'XdAdapterType',
  }
  if (b.getInput('UNITS')) out.units_ct_id = unitsCt(b)
  if (b.getInput('REFRANGES')) out.reference_ranges = refrangeCts(b)
  return out
}
function serGroup(g) {
  if (g.type === 'sdc_group_reused') {
    return { group: g.getFieldValue('LABEL'), rm_type: 'ClusterType', reuse_ct_id: reuseData(g).ct_id || '', items: [] }
  }
  return { group: g.getFieldValue('NAME'), rm_type: 'ClusterType', items: inputStack(g, 'ITEMS').map(serItem) }
}
const isGroupBlock = (b) => b.type === 'sdc_group' || b.type === 'sdc_group_reused'
function serItem(b) { return isGroupBlock(b) ? serGroup(b) : serField(b) }

export function serialize() {
  const models = ws.getTopBlocks(true).filter((b) => b.type === 'sdc_model')
  return models.map((m) => {
    const roots = inputStack(m, 'ROOT')
    return { model: m.getFieldValue('NAME'), rm_type: 'DMType', root: roots.map(serItem) }
  })
}

// --- Build the nested create-draft payload the Rust `create_model` consumes ---
function fieldNode(b) {
  if (b.type === 'sdc_field_reused') {
    const r = reuseData(b)
    return { label: b.getFieldValue('LABEL'), reuse_ct_id: r.ct_id || '', cluster_field: r.type || '' }
  }
  const node = { label: b.getFieldValue('NAME'), rm_type: b.getFieldValue('KIND'), description: reqOf(b) }
  if (b.getInput('UNITS')) node.units_ct_id = unitsCt(b)
  if (b.getInput('REFRANGES')) node.reference_ranges = refrangeCts(b)
  return node
}
function groupNode(g) {
  if (g.type === 'sdc_group_reused') {
    return { label: g.getFieldValue('LABEL'), reuse_ct_id: reuseData(g).ct_id || '', fields: [], groups: [] }
  }
  const children = inputStack(g, 'ITEMS')
  return {
    label: g.getFieldValue('NAME'),
    description: reqOf(g),
    fields: children.filter((c) => !isGroupBlock(c)).map(fieldNode),
    groups: children.filter(isGroupBlock).map(groupNode),
  }
}

// Count the NEW (minted, billable) components in the tree: new fields + new
// clusters, excluding anything reused by ct_id. The root cluster is always new.
export function mintCount() {
  const p = draftPayload()
  if (!p) return 0
  const countGroup = (g) => {
    if (g.reuse_ct_id) return 0 // reused cluster: opaque, not minted
    let n = 1 // this new cluster is minted
    n += g.fields.filter((f) => !f.reuse_ct_id).length // new fields minted; reused are free
    for (const sub of g.groups) n += countGroup(sub)
    return n
  }
  return countGroup(p.root)
}

// New fields with no requirement — FR-13 requires one (the handoff to the modeler).
export function missingRequirements() {
  if (!ws) return []
  return ws.getBlocksByType('sdc_field', false)
    .filter((b) => !reqOf(b).trim())
    .map((b) => b.getFieldValue('NAME') || '(unnamed)')
}

export function draftPayload() {
  const m = ws.getTopBlocks(false).find((b) => b.type === 'sdc_model')
  if (!m) return null
  const roots = inputStack(m, 'ROOT')
  if (roots.length !== 1 || !isGroupBlock(roots[0])) return null
  return { title: m.getFieldValue('NAME'), root: groupNode(roots[0]) }
}

export function hasContent() {
  const p = draftPayload()
  if (!p) return false
  const count = (g) => g.fields.length + g.groups.reduce((n, s) => n + 1 + count(s), 0)
  return count(p.root) > 0
}

function warnings(structs) {
  const w = []
  if (!structs.length) w.push('Add a Model to start.')
  structs.forEach((s) => {
    if (s.root.length !== 1) w.push(`Model "${s.model}": root must be exactly one Group.`)
  })
  return w
}

function refresh() {
  const structs = serialize()
  const out = document.getElementById('cvout')
  const status = document.getElementById('cvstatus')
  if (out) out.textContent = JSON.stringify(structs.length === 1 ? structs[0] : structs, null, 2)
  const empty = !hasContent()
  const hint = document.getElementById('canvashint')
  if (hint) hint.hidden = !empty
  if (status) {
    const w = warnings(structs)
    if (w.length) { status.className = 'muted warn'; status.textContent = w.join('  ') }
    else if (empty) { status.className = 'muted'; status.textContent = 'Empty. Add fields to the root group.' }
    else {
      const missing = missingRequirements().length
      if (missing) { status.className = 'muted warn'; status.textContent = `${missing} new field${missing === 1 ? ' needs' : 's need'} a requirement before sending.` }
      else { status.className = 'muted ok'; status.textContent = 'Ready to send.' }
    }
  }
  // A new field without a requirement wears a warning icon on the canvas, so the
  // reader does not have to hunt from the status text.
  ws.getBlocksByType('sdc_field', false).forEach((b) => b.setWarningText(reqOf(b).trim() ? null : 'Needs a requirement before sending. Select it and write one in the panel.'))
}

// --- FR-13 requirement editor: shows for the selected NEW component (field/group).
// The requirement is edited in the panel so the block face stays minimal. ---
let currentReqBlock = null
function updateReqEditor(id) {
  const ed = document.getElementById('reqeditor')
  if (!ed) return
  const b = id ? ws.getBlockById(id) : null
  const editable = b && (b.type === 'sdc_field' || b.type === 'sdc_group')
  if (!editable) { ed.hidden = true; currentReqBlock = null; return }
  currentReqBlock = b
  const forEl = document.getElementById('reqfor')
  if (forEl) forEl.textContent = b.getFieldValue('NAME') || (b.type === 'sdc_group' ? 'group' : 'field')
  const txt = document.getElementById('reqtext')
  if (txt) txt.value = reqOf(b)
  ed.hidden = false
}

// --- Public API ---
export function initCanvas() {
  if (ws) { Blockly.svgResize(ws); return }
  ws = Blockly.inject('blocklyDiv', {
    toolbox,
    theme,
    renderer: 'zelos', // rounded, quieter connectors than the classic puzzle notches
    media: '/blockly-media/',
    trashcan: true, // dragging off to the left still works; the can is the visible way
    scrollbars: true,
    zoom: { controls: true, wheel: false, startScale: 0.9 },
    grid: { spacing: 24, length: 2, colour: '#12213a', snap: true },
  })
  ws.registerToolboxCategoryCallback('REUSE', reuseFlyout)
  ws.addChangeListener((e) => {
    // Colour a freshly-dropped reused field by its data family (its ct_id/type is
    // in block.data by the time BLOCK_CREATE fires).
    if (e?.type === Blockly.Events.BLOCK_CREATE && e.blockId) {
      const b = ws.getBlockById(e.blockId)
      if (b && b.type === 'sdc_field_reused') b.setColour(dataColourApi(reuseData(b).type))
    }
    // A click on a block also counts as selecting it (Blockly 13 reports clicks and
    // selection separately, and a panel click can clear the selection first).
    if (e?.type === Blockly.Events.CLICK && e.blockId) { lastSelectedId = e.blockId; updateReqEditor(e.blockId) }
    if (e?.type === Blockly.Events.SELECTED) {
      if (e.newElementId) {
        lastSelectedId = e.newElementId
        updateReqEditor(e.newElementId)
      } else {
        // Deselected. Close the editor only if focus moved to the canvas, not the
        // panel — clicking the Requirement box must not dismiss it.
        const panel = document.getElementById('panel')
        if (!panel || !panel.contains(document.activeElement)) updateReqEditor(null)
      }
    }
    // If the block being edited was removed, close the editor.
    if (currentReqBlock && !ws.getBlockById(currentReqBlock.id)) updateReqEditor(null)
    refresh()
  })
  // Edit the selected new component's requirement (FR-13).
  const reqEl = document.getElementById('reqtext')
  if (reqEl) reqEl.addEventListener('input', () => {
    if (currentReqBlock) { setReq(currentReqBlock, reqEl.value); refresh() }
  })
  seedModel()
  refresh()
}

export function resizeCanvas() { if (ws) Blockly.svgResize(ws) }

export function setReuseResults(rows) {
  reuseRows = Array.isArray(rows) ? rows : []
  if (!ws) return
  const tb = ws.getToolbox()
  if (!tb) return
  // The panel list is the primary surface; the Reuse flyout mirrors it but is not
  // opened for the user, so results never cover the model.
  const reuse = tb.getToolboxItems?.().find((i) => i.getName?.() === 'Reuse')
  if (reuse && tb.getSelectedItem?.() === reuse) tb.refreshSelection()
}

// --- Add a search result to the canvas from the panel (click or drop). ---
function blockStateFor(r) {
  const data = JSON.stringify({ ct_id: r.ct_id, type: r.type, description: r.description || '' })
  if (r.type === 'units') return { type: 'sdc_units_reused', data, fields: { LABEL: r.label } }
  if (r.type === 'referencerange') return { type: 'sdc_refrange_reused', data, fields: { LABEL: r.label } }
  if (r.type === 'cluster') return { type: 'sdc_group_reused', data, fields: { LABEL: r.label } }
  return { type: 'sdc_field_reused', data, fields: { BADGE: API_BADGES[r.type] || r.type, LABEL: r.label } }
}
const lastInStack = (b) => { while (b && b.getNextBlock()) b = b.getNextBlock(); return b }
// The block the user last selected. Blockly clears its own selection when focus
// moves to the panel, which is exactly when the panel needs to know it.
let lastSelectedId = null
function selectedBlock() {
  const sel = (Blockly.common && Blockly.common.getSelected) ? Blockly.common.getSelected() : (Blockly.getSelected && Blockly.getSelected())
  const b = sel && ws.getBlockById(sel.id)
  return b || (lastSelectedId ? ws.getBlockById(lastSelectedId) : null)
}
function targetGroup() {
  let b = selectedBlock()
  // The selected block, or the group it sits in, or the root group.
  while (b && b.type !== 'sdc_group') b = b.getParent()
  if (!b) { const m = ws.getTopBlocks(false).find((x) => x.type === 'sdc_model'); b = m && m.getInputTargetBlock('ROOT') }
  return b || null
}
function targetField(check) {
  const b = selectedBlock()
  return (b && b.type === 'sdc_field' && check(b.getFieldValue('KIND'))) ? b : null
}
/**
 * Add a published component to the model. `at` is a client point (a drop) or null
 * (a click). Fields and groups join the selected group, or the root group. Units and
 * ranges attach to the selected number/ordered field. Returns a status sentence.
 */
export function addReusedToCanvas(r, at) {
  if (!ws) return 'Canvas not ready.'
  const state = blockStateFor(r)
  if (r.type === 'units') {
    const f = targetField((k) => QUANTIFIED.has(k))
    if (!f) return 'Select a number field first, then add the units.'
    const u = Blockly.serialization.blocks.append(state, ws)
    f.getInput('UNITS').connection.connect(u.outputConnection)
    return `Units "${r.label}" set on ${f.getFieldValue('NAME')}.`
  }
  if (r.type === 'referencerange') {
    const f = targetField((k) => ORDERED_OR_QUANT.has(k))
    if (!f) return 'Select a number, date or ranked field first, then add the range.'
    f.showRanges_()
    const rb = Blockly.serialization.blocks.append(state, ws)
    const inp = f.getInput('REFRANGES').connection
    const tail = inp.targetBlock() ? lastInStack(inp.targetBlock()) : null
    if (tail) tail.nextConnection.connect(rb.previousConnection); else inp.connect(rb.previousConnection)
    return `Range "${r.label}" added to ${f.getFieldValue('NAME')}.`
  }
  const g = targetGroup()
  if (!g) return 'Your model needs a root group.'
  const nb = Blockly.serialization.blocks.append(state, ws)
  if (nb.type === 'sdc_field_reused') nb.setColour(dataColourApi(r.type))
  const items = g.getInput('ITEMS').connection
  const tail = items.targetBlock() ? lastInStack(items.targetBlock()) : null
  if (tail) tail.nextConnection.connect(nb.previousConnection); else items.connect(nb.previousConnection)
  if (at) { /* dropped: the block is already in place; a drop point is advisory */ }
  ws.scrollBlockIntoView?.(nb.id)
  return `Added "${r.label}" to ${g.getFieldValue('NAME')}.`
}

// New groups and fields the send will mint, for the cost line.
export function mintBreakdown() {
  const p = draftPayload()
  if (!p) return { groups: 0, fields: 0 }
  let groups = 0, fields = 0
  const walk = (g) => { if (g.reuse_ct_id) return; groups += 1; fields += g.fields.filter((f) => !f.reuse_ct_id).length; g.groups.forEach(walk) }
  walk(p.root)
  return { groups, fields }
}

export function resetCanvas() {
  if (!ws) return
  ws.clear()
  updateReqEditor(null)
  seedModel()
  refresh()
}

// A local-save snapshot: the human-readable structure + the Blockly workspace
// (so it can be reloaded later). Stays on the machine; never sent to SDCStudio.
export function saveState() {
  return JSON.stringify({
    app: 'SDCBench',
    version: '4.0.0b2',
    model: draftPayload(),
    workspace: Blockly.serialization.workspaces.save(ws),
  }, null, 2)
}

// Reopen a saved draft: replace the canvas with the saved Blockly workspace, then
// re-apply the root skeleton locks and reused-block colours (both are runtime, not
// serialized).
export function loadState(jsonText) {
  if (!ws) return
  const data = JSON.parse(jsonText)
  const wsState = data.workspace || data // tolerate a bare workspace too
  ws.clear()
  updateReqEditor(null)
  Blockly.serialization.workspaces.load(wsState, ws)
  const m = ws.getTopBlocks(false).find((b) => b.type === 'sdc_model')
  if (m) {
    m.setDeletable(false)
    const root = m.getInputTargetBlock('ROOT')
    if (root) { root.setDeletable(false); root.setMovable(false) }
  }
  ws.getBlocksByType('sdc_field_reused', false).forEach((b) => b.setColour(dataColourApi(reuseData(b).type)))
  refresh()
}
