// Bridge to the Rust shell. Every frontend call to the backend goes through this
// module; the API token stays in Rust/keychain and never reaches the webview (D3).
import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import * as mock from './mock.js'

// In a browser with no Tauri shell and `?mock` in the URL, every command answers
// from the canned bridge (visual review, screenshots). Inside the app, Tauri answers.
const useMock = typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window) && new URLSearchParams(window.location.search).has('mock')
const invoke = useMock
  ? (cmd, args = {}) => {
      const fn = {
        health: mock.health, sign_in: () => mock.signIn(args.token), whoami: mock.whoami, auth_status: mock.authStatus,
        sign_out: mock.signOut, list_projects: mock.listProjects, wallet: mock.getWallet, open_studio: () => mock.openStudio(args.path),
        save_model: () => mock.saveModel(args.name, args.content), list_models: mock.listModels, read_model: () => mock.readModel(args.name),
        search_components: () => mock.searchComponents(args.query, args.project), create_model: () => mock.createModel(args.payload),
      }[cmd]
      return fn ? fn() : Promise.reject(new Error(`no mock for ${cmd}`))
    }
  : tauriInvoke

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
