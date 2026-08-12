// Bridge to the Rust shell. Every frontend call to the backend goes through this
// module; the API token stays in Rust/keychain and never reaches the webview (D3).
import { invoke } from '@tauri-apps/api/core'

export const health = () => invoke('health')

// Auth + projects (API key only; token stays in Rust/keychain).
export const signIn = (token) => invoke('sign_in', { token })
export const whoami = () => invoke('whoami')
export const authStatus = () => invoke('auth_status')
export const signOut = () => invoke('sign_out')
export const listProjects = () => invoke('list_projects')
// USD wallet state (balance drives the mint-cost display).
export const getWallet = () => invoke('wallet')
export const openStudio = (path) => invoke('open_studio', { path })

// Save the model draft to the local machine, not SDCStudio. Returns the path.
export const saveModel = (name, content) => invoke('save_model', { name, content })
// List saved local drafts ({name, path}); read one back by name.
export const listModels = () => invoke('list_models')
export const readModel = (name) => invoke('read_model', { name })

// Search the published component library (reuse-first). Returns the `results` rows;
// empty `query` browses the library.
export const searchComponents = (query, project) =>
  invoke('search_components', { query, project: project || null })

// Create a draft model from the assembly canvas: a nested root Group -> Cluster tree
// (new + reused components), rooted on a draft DM, all published=False.
// `req` is { project_ct_id, root: GroupNode, dm: DmMeta }.
export const createModel = (req) => invoke('create_model', { payload: req })
