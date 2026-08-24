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

const COL = {
  entry: '#2e8b57',   // data — plain (XdString/Token/Boolean/Link/File…)
  ordered: '#2f9e8f',  // data — ordered (Ordinal/Temporal)
  quant: '#6a9a3f',    // data — quantified (Count/Quantity/Float/Double)
  group: '#475569',    // container (Cluster)
  attach: '#d9a441',   // attachments (Units, ReferenceRange)
  model: '#4f5bd5',    // the DM root
}
function dataColour(rm) {
  if (QUANTIFIED.has(rm)) return COL.quant
  if (ORDERED.has(rm)) return COL.ordered
  return COL.entry
}
const dataColourApi = (apiType) => dataColour(API_TO_RM[apiType] || '')

// --- The new-field mutator: shows a Units slot for quantified types and a
// reference-range slot for XdOrdered types, and colours the block by family. ---
const FIELD_MIXIN = {
  saveExtraState() { return { kind: this.getFieldValue('KIND') } },
  loadExtraState(state) { this.updateShape_((state && state.kind) || this.getFieldValue('KIND')) },
  updateShape_(kind) {
    const wantUnits = QUANTIFIED.has(kind)
    const wantRanges = ORDERED_OR_QUANT.has(kind)
    if (wantUnits && !this.getInput('UNITS')) this.appendValueInput('UNITS').setCheck('Units').appendField('units')
    if (!wantUnits && this.getInput('UNITS')) this.removeInput('UNITS')
    if (wantRanges && !this.getInput('REFRANGES')) this.appendStatementInput('REFRANGES').setCheck('RefRange').appendField('ranges')
    if (!wantRanges && this.getInput('REFRANGES')) this.removeInput('REFRANGES')
    this.setColour(dataColour(kind))
  },
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
  // Reused published component — carries its ct_id in block.data; ↩ marks reuse.
  {
    type: 'sdc_field_reused',
    message0: '↩ %1 · %2',
    args0: [
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
    message0: '↩ Group · %1',
    args0: [{ type: 'field_label_serializable', name: 'LABEL', text: '' }],
    previousStatement: 'Group', nextStatement: GROUP_ACCEPTS, // opaque: no ITEMS slot
    colour: COL.group,
    tooltip: 'A published Cluster reused by reference; edit its internals in SDCStudio.',
    extensions: ['sdc_desc'],
  },
  // Reused Units — a VALUE block (output 'Units'): snaps only into a number field's
  // units slot, never a Cluster.
  {
    type: 'sdc_units_reused',
    message0: '↩ units · %1',
    args0: [{ type: 'field_label_serializable', name: 'LABEL', text: '' }],
    output: 'Units',
    colour: COL.attach,
    tooltip: 'A published Units — drops into a number field’s units slot.',
    extensions: ['sdc_desc'],
  },
  // Reused ReferenceRange — a STATEMENT block (RefRange): stacks in an XdOrdered
  // field's ranges slot (M2M, so several may stack).
  {
    type: 'sdc_refrange_reused',
    message0: '↩ range · %1',
    args0: [{ type: 'field_label_serializable', name: 'LABEL', text: '' }],
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
      kind: 'category', name: 'New', colour: '#6a9a3f',
      contents: [
        { kind: 'block', type: 'sdc_group' },
        { kind: 'block', type: 'sdc_field' },
        { kind: 'sep', gap: '12' },
        { kind: 'block', type: 'sdc_model' },
      ],
    },
    { kind: 'category', name: 'Reuse', colour: '#d9a441', custom: 'REUSE' },
  ],
}

const theme = Blockly.Theme.defineTheme('sdcdark', {
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#0f1115',
    toolboxBackgroundColour: '#171a21',
    flyoutBackgroundColour: '#1c2029',
    scrollbarColour: '#39404d',
    insertionMarkerColour: '#4f8cff',
    insertionMarkerOpacity: 0.4,
  },
})

let ws = null
let reuseRows = []

// Dynamic "Reuse" flyout: the current library-search results as draggable blocks.
function reuseFlyout() {
  if (!reuseRows.length) {
    return [{ kind: 'label', text: 'Search your library in the panel →' }]
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
  return u ? (reuseData(u).ct_id || '') : ''
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
  if (status) {
    const w = warnings(structs)
    if (w.length) { status.className = 'muted warn'; status.textContent = '⚠ ' + w.join('  ') }
    else { status.className = 'muted ok'; status.textContent = '✓ Your model is valid.' }
  }
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
    media: '/blockly-media/',
    trashcan: false, // drag a block off to the left to remove it
    scrollbars: true,
    zoom: { controls: true, wheel: false, startScale: 0.95 },
    grid: { spacing: 24, length: 2, colour: '#20242d', snap: true },
  })
  ws.registerToolboxCategoryCallback('REUSE', reuseFlyout)
  ws.addChangeListener((e) => {
    // Colour a freshly-dropped reused field by its data family (its ct_id/type is
    // in block.data by the time BLOCK_CREATE fires).
    if (e?.type === Blockly.Events.BLOCK_CREATE && e.blockId) {
      const b = ws.getBlockById(e.blockId)
      if (b && b.type === 'sdc_field_reused') b.setColour(dataColourApi(reuseData(b).type))
    }
    if (e?.type === Blockly.Events.SELECTED) {
      if (e.newElementId) {
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
  const reuse = tb.getToolboxItems?.().find((i) => i.getName?.() === 'Reuse')
  if (reuse && tb.getSelectedItem?.() !== reuse) tb.setSelectedItem(reuse)
  else tb.refreshSelection()
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
