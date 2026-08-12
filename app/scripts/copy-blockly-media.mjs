// Vendor Blockly's media assets into public/ so the desktop app is fully offline
// (no CDN, no network at runtime). Runs automatically before dev/build.
import { cpSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../node_modules/blockly/media')
const dest = resolve(here, '../public/blockly-media')

mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
console.log('copied Blockly media ->', dest)
