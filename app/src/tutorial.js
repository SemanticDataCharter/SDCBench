// The guided tutorial: the pizza order built one move at a time, with the next move
// shown and highlighted. Each step is a prompt, a target to light up, and a check on
// the live state; the tutorial advances the moment the check passes. Skippable and
// resumable (the step is kept in localStorage); nothing here changes the model for
// the learner, it only watches and points.
import { snapshot } from './canvas.js'

const KEY_STEP = 'sdcbench.tutorial.step'
const KEY_DONE = 'sdcbench.tutorial.done'
const $ = (id) => document.getElementById(id)
const has = (s, re) => !!s && re.test(s)

// A field or group from the snapshot by a name pattern.
const field = (snap, re) => snap.fields.find((f) => has(f.name, re))
const group = (snap, re) => snap.groups.find((g) => has(g.name, re))

export const STEPS = [
  {
    title: 'Name the model',
    prompt: 'Click <b>New model</b> on the navy Model piece and type <b>Pizza Order</b>.',
    target: null,
    check: (snap) => has(snap.model, /pizza/i),
  },
  {
    title: 'Find a published component',
    prompt: 'In <b>Find a component</b>, search for <b>name</b>. Reuse is the first move, every time.',
    target: '#libsearch',
    check: () => has($('libsearch').value, /name/i) && document.querySelectorAll('.result').length > 0,
  },
  {
    title: 'Reuse it',
    prompt: 'Click <b>Full Name (Person)</b> in the results. It lands in the root group, marked <i>reused</i>. Reuse costs nothing.',
    target: '.result',
    check: (snap) => snap.groups.some((g) => g.reused && has(g.name, /full name/i)),
  },
  {
    title: 'Make a group of your own',
    prompt: 'Drag a <b>Group</b> from <b>New</b> into the root group and name it <b>Pizza</b>.',
    target: '.blocklyToolboxCategoryContainer:first-child',
    check: (snap) => !!group(snap, /pizza/i),
  },
  {
    title: 'Sketch a field',
    prompt: 'Drag a <b>Field</b> from <b>New</b> into the Pizza group. Name it <b>Size</b> and choose <b>Integer</b> as its type: a number carries a units slot.',
    target: '.blocklyToolboxCategoryContainer:first-child',
    check: (snap) => { const f = field(snap, /size/i); return !!f && f.kind === 'XdCountType' && has(f.group, /pizza/i) },
  },
  {
    title: 'Say what it is',
    prompt: 'With <b>Size</b> selected, write what it is in <b>Describe</b>: <i>the pizza across, in inches, 10 to 18</i>. The data modeler works from this.',
    target: '#reqtext',
    check: (snap) => { const f = field(snap, /size/i); return !!f && f.requirement.trim().length > 3 },
  },
  {
    title: 'Reuse its units',
    prompt: 'Search for <b>length</b> and drop the <b>Units</b> result onto <b>Size</b>, or click it with Size selected. Published units are reused, never typed.',
    target: '#libsearch',
    check: (snap) => { const f = field(snap, /size/i); return !!f && !!f.units },
  },
  {
    title: 'Describe the model',
    prompt: 'Under <b>Your model</b>, write one sentence about what it captures.',
    target: '#dmdesc',
    check: () => $('dmdesc').value.trim().length > 8,
  },
  {
    title: 'Send it',
    prompt: 'Click <b>Send to SDCStudio</b>. The cost appears before anything is charged: reused pieces are free, sketched ones are not.',
    target: '#createbtn',
    check: () => !$('confirm').classList.contains('hidden'),
  },
]

let step = -1
let timer = null
let lit = null

function light(selector) {
  if (lit) { lit.classList.remove('coach-glow'); lit = null }
  if (!selector) return
  const el = document.querySelector(selector)
  if (el) { el.classList.add('coach-glow'); lit = el }
}

function render() {
  const card = $('coach')
  document.body.classList.toggle('tutorial', step >= 0 && step < STEPS.length)
  if (step < 0) { card.hidden = true; light(null); return }
  card.hidden = false
  if (step >= STEPS.length) {
    $('coachstep').textContent = 'Done'
    $('coachtitle').textContent = 'You built your first model'
    $('coachprompt').innerHTML = 'Accept to create the draft in SDCStudio, or Cancel and keep building. A data modeler finishes it there.'
    $('coachskip').hidden = true
    $('coachquit').textContent = 'Close'
    light(null)
    return
  }
  const s = STEPS[step]
  $('coachstep').textContent = `${step + 1} of ${STEPS.length}`
  $('coachtitle').textContent = s.title
  $('coachprompt').innerHTML = s.prompt
  $('coachskip').hidden = false
  $('coachquit').textContent = 'Quit'
  light(s.target)
}

function tick() {
  if (step < 0 || step >= STEPS.length) return
  let snap
  try { snap = snapshot() } catch { return }
  if (STEPS[step].check(snap)) advance()
}

function advance() {
  step += 1
  localStorage.setItem(KEY_STEP, String(step))
  if (step >= STEPS.length) localStorage.setItem(KEY_DONE, '1')
  render()
}

export function startTutorial(fromStep = 0) {
  step = Math.max(0, Math.min(fromStep, STEPS.length))
  localStorage.setItem(KEY_STEP, String(step))
  render()
  clearInterval(timer)
  timer = setInterval(tick, 500)
}

export function stopTutorial() {
  step = -1
  clearInterval(timer); timer = null
  localStorage.removeItem(KEY_STEP)
  render()
}

export const tutorialDone = () => localStorage.getItem(KEY_DONE) === '1'
export const tutorialResumeStep = () => { const v = localStorage.getItem(KEY_STEP); return v === null ? null : Number(v) }

export function initTutorial() {
  $('coachskip').addEventListener('click', advance)
  $('coachquit').addEventListener('click', stopTutorial)
  $('playbtn').addEventListener('click', () => startTutorial(0))
  $('welcomeplay')?.addEventListener('click', () => startTutorial(0))
}
