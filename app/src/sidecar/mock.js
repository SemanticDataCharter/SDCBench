// A canned bridge for the browser: the app rendered by Vite with `?mock` in the URL
// and no Tauri shell around it. Used for visual review and screenshots, never in a
// build the user runs (bridge.js only reaches for it when Tauri is absent and the
// URL asks). Shapes mirror the Rust commands; values are the pizza tutorial's.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const reused = (ct_id, type, label, description = '') => ({ ct_id, type, description, label })
const field = (name, kind, req, extra = {}) => ({ type: 'sdc_field', fields: { NAME: name, KIND: kind }, data: req ? JSON.stringify({ requirement: req }) : '', extraState: { kind, ranges: false }, ...extra })
const rfield = (r) => ({ type: 'sdc_field_reused', data: JSON.stringify({ ct_id: r.ct_id, type: r.type, description: r.description }), fields: { BADGE: { xdstring: 'Text', xdtoken: 'Code', xdtemporal: 'Date / time', xdboolean: 'Boolean' }[r.type] || r.type, LABEL: r.label } })
const rgroup = (r) => ({ type: 'sdc_group_reused', data: JSON.stringify({ ct_id: r.ct_id, type: r.type, description: r.description }), fields: { LABEL: r.label } })
const chain = (blocks) => blocks.reduceRight((next, b) => (next ? { ...b, next: { block: next } } : b), null)
const SAMPLE_WORKSPACE = { blocks: { blocks: [{
  type: 'sdc_model', x: 40, y: 30, fields: { NAME: 'Pizza Order' },
  inputs: { ROOT: { block: { type: 'sdc_group', fields: { NAME: 'data' }, inputs: { ITEMS: { block: chain([
    { type: 'sdc_group', fields: { NAME: 'Customer' }, inputs: { ITEMS: { block: chain([
      rgroup(reused('c01', 'cluster', 'Full Name (Person)')), rfield(reused('c05', 'xdstring', 'Phone Number')), rfield(reused('c06', 'xdstring', 'Email Address')), rgroup(reused('c09', 'cluster', 'US Address')),
    ]) } } },
    { type: 'sdc_group', fields: { NAME: 'Pizza' }, inputs: { ITEMS: { block: chain([
      field('Size', 'XdTokenType', 'Small, medium or large.'),
      field('Crust', 'XdTokenType', ''),
      field('Toppings', 'XdTokenType', ''),
      field('Diameter', 'XdQuantityType', '', { inputs: { UNITS: { block: { type: 'sdc_units_reused', data: JSON.stringify({ ct_id: 'c08', type: 'units' }), fields: { LABEL: 'Length/Distance (SI - Metric)' } } } } }),
      rfield(reused('c10', 'xdboolean', 'Yes/No Indicator')),
      field('Quantity', 'XdCountType', '', { inputs: { UNITS: { shadow: { type: 'sdc_units_empty' } } } }),
    ]) } } },
    rfield(reused('c07', 'xdtemporal', 'DateTime')),
  ]) } } } } },
}] } }

const ME = { email: 'tom.beale@example.com', name: 'Tom Beale', default_project_ct_id: 'proj_pizzeria', sample_workspace: SAMPLE_WORKSPACE }
const PROJECTS = [
  { ct_id: 'proj_pizzeria', name: 'Pizzeria', owner_email: ME.email, is_public: false, is_default_library: false },
  { ct_id: 'proj_default', name: 'Default', owner_email: 'library@axius-sdc.com', is_public: true, is_default_library: true },
  { ct_id: 'proj_provgov', name: 'ProvGov', owner_email: 'library@axius-sdc.com', is_public: true, is_default_library: false },
]
const LIBRARY = [
  { ct_id: 'c01', type: 'cluster', label: 'Full Name (Person)', description: 'A person\'s name as given, family and other names, each optional.' },
  { ct_id: 'c02', type: 'xdstring', label: 'Given Name (Person)', description: 'The given, or first, name of a person.' },
  { ct_id: 'c03', type: 'xdstring', label: 'Surname (Person)', description: 'The family name of a person.' },
  { ct_id: 'c04', type: 'xdtoken', label: 'Name Use', description: 'How a name is used: official, usual, nickname, maiden, anonymous.' },
  { ct_id: 'c05', type: 'xdstring', label: 'Phone Number', description: 'A telephone number, in the national or international form.' },
  { ct_id: 'c06', type: 'xdstring', label: 'Email Address', description: 'An email address.' },
  { ct_id: 'c07', type: 'xdtemporal', label: 'DateTime', description: 'A date with a time of day.' },
  { ct_id: 'c08', type: 'units', label: 'Length/Distance (SI - Metric)', description: 'Metres and their multiples.' },
  { ct_id: 'c09', type: 'cluster', label: 'US Address', description: 'A postal address in the United States.' },
  { ct_id: 'c10', type: 'xdboolean', label: 'Yes/No Indicator', description: 'A yes or no answer.' },
  { ct_id: 'c11', type: 'units', label: 'Temperature', description: 'Degrees Celsius, Fahrenheit and kelvin.' },
  { ct_id: 'c12', type: 'party', label: 'Organization (Party)', description: 'A structural type that cannot sit in a model.' },
]
let drafts = {}
let signedIn = true

export const health = async () => ({ app: 'SDCBench', ok: true })
export const signIn = async (token) => { await sleep(300); if (!token) throw new Error('No key'); signedIn = true; return ME }
export const whoami = async () => { if (!signedIn) throw new Error('not signed in'); return ME }
export const authStatus = async () => ({ connected: signedIn && !location.search.includes('gate') })
export const signOut = async () => { signedIn = false }
export const listProjects = async () => PROJECTS
export const getWallet = async () => ({ balance_credits: 9700 })
export const openStudio = async (path) => { console.log('openStudio', path) }
export const saveModel = async (name, content) => { drafts[name] = content; return `~/Documents/SDCBench/${name}.json` }
export const listModels = async () => Object.keys(drafts).map((name) => ({ name, path: `~/Documents/SDCBench/${name}.json` }))
export const readModel = async (name) => drafts[name]
export const searchComponents = async (query) => {
  await sleep(150)
  const q = (query || '').toLowerCase()
  return LIBRARY.filter((r) => !q || r.label.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
}
export const createModel = async () => { await sleep(600); return { dm_ct_id: 'dm_mock', created_count: 10, error_count: 0 } }
