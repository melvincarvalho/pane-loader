// board-pane.js — a task list as a board.
// Applies to a document that describes tasks (things typed Action or Task, e.g. schema:Action).
// Shows them in three columns, To do / Doing / Done, read from the triples SolidOS already has
// in its store. It imports nothing and fetches nothing. Read-only: it does not change the data.
//
// Terms are matched by their local name (the part after the last / or #), so schema.org over
// http or https, and home-made vocabularies that use the same words, all work:
//   type    Action, PlanAction, Task, ToDo
//   title   name, title, summary          notes   description, note, text
//   status  actionStatus (…Potential / …Active / …Completed), status, done (true)
//   who     agent, assignee, owner (a name, or a thing with a name)
//   when    endTime, dueDate, due, date
const TASK_TYPES = ['Action', 'PlanAction', 'Task', 'ToDo']
const COLUMNS = [['todo', 'To do'], ['doing', 'Doing'], ['done', 'Done']]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const ICON = new URL('board.svg', import.meta.url).href

const CSS = `
.board { max-width: 1120px; margin: 0 auto; padding: 28px 32px 96px; font: 15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; color: #1d1d1f }
.board-head h3 { margin: 0; font-size: 34px; font-weight: 700; letter-spacing: -.02em }
.board-head p { margin: 6px 0 0; color: #86868b }
.board-progress { display: flex; align-items: center; gap: 12px; margin: 18px 0 26px; color: #86868b; font-size: 14px }
.board-bar { flex: 1; max-width: 320px; height: 8px; border-radius: 999px; background: #ebe6f7; overflow: hidden }
.board-bar i { display: block; height: 100%; border-radius: 999px; background: #7c4dff }
.board-cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; align-items: start }
@media (max-width: 760px) { .board-cols { grid-template-columns: 1fr } }
.board-col { background: #f4f1fb; border-radius: 16px; padding: 14px }
.board-col h4 { display: flex; align-items: center; gap: 8px; margin: 2px 4px 12px; font-size: 15px; font-weight: 700 }
.board-col h4 b { font-weight: 600; color: #86868b; background: #fff; border-radius: 999px; padding: 1px 9px; font-size: 13px }
.board-col h4::before { content: ""; width: 9px; height: 9px; border-radius: 50%; background: #c7c7cc }
.board-col.doing h4::before { background: #ff9f0a } .board-col.done h4::before { background: #34c759 }
.board-card { background: #fff; border-radius: 12px; padding: 12px 14px; margin: 0 0 10px; box-shadow: 0 1px 2px rgba(60,40,120,.08) }
.board-card:last-child { margin-bottom: 0 }
.board-card strong { display: block; font-size: 15px; font-weight: 650 }
.board-card p { margin: 5px 0 0; color: #515154; font-size: 14px }
.board-meta { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 13px; color: #86868b }
.board-who { display: inline-flex; align-items: center; gap: 6px; color: #1d1d1f }
.board-who i { width: 22px; height: 22px; border-radius: 50%; background: #e4dbff; color: #5b2fe0; font-style: normal; font-weight: 700; font-size: 12px; display: grid; place-items: center }
.board-due { margin-left: auto; font-variant-numeric: tabular-nums }
.board-due.late { color: #d70015; font-weight: 600 }
.board-col.done .board-card strong { color: #86868b; text-decoration: line-through }
.board-empty { color: #b0b0b6; font-size: 14px; margin: 4px }
`

const local = term => { const v = String(term && term.value !== undefined ? term.value : term); return v.slice(Math.max(v.lastIndexOf('/'), v.lastIndexOf('#')) + 1) }

// Every value of the first matching property of a thing, within one document.
function values (store, thing, names, doc) {
  const all = store.statementsMatching(thing, null, null, doc)
  for (const name of names) {
    const hit = all.filter(st => local(st.predicate) === name).map(st => st.object)
    if (hit.length) return hit
  }
  return []
}
const text = (store, thing, names, doc) => { const v = values(store, thing, names, doc)[0]; return v ? String(v.value) : '' }

function status (store, thing, doc) {
  const done = values(store, thing, ['done', 'completed'], doc)[0]
  if (done && /^(true|1|yes)$/i.test(String(done.value))) return 'done'
  const s = local(values(store, thing, ['actionStatus', 'status', 'state'], doc)[0] || '')
  if (/complete|done|closed|finished/i.test(s)) return 'done'
  if (/active|doing|progress|started/i.test(s)) return 'doing'
  return 'todo'
}

function who (store, thing, doc) {
  const v = values(store, thing, ['agent', 'assignee', 'owner'], doc)[0]
  if (!v) return ''
  if (v.termType === 'Literal') return String(v.value)
  return text(store, v, ['name', 'label', 'fn'], doc) || local(v)
}

// The tasks a document describes, each once, earliest due date first.
function tasks (store, doc) {
  const seen = new Map()
  for (const st of store.statementsMatching(null, null, null, doc)) {
    if (local(st.predicate) !== 'type' || !TASK_TYPES.includes(local(st.object)) || seen.has(st.subject.value)) continue
    const thing = st.subject
    seen.set(thing.value, {
      title: text(store, thing, ['name', 'title', 'summary', 'label'], doc) || local(thing),
      notes: text(store, thing, ['description', 'note', 'text'], doc),
      status: status(store, thing, doc),
      who: who(store, thing, doc),
      due: text(store, thing, ['endTime', 'dueDate', 'due', 'date'], doc).slice(0, 10)
    })
  }
  return [...seen.values()].sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || a.title.localeCompare(b.title))
}

function shortDate (iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? Number(m[3]) + ' ' + MONTHS[Number(m[2]) - 1] : iso
}

const isDoc = subject => subject && subject.value && !subject.value.endsWith('/') && typeof subject.doc === 'function'

const boardPane = {
  name: 'task-board',
  icon: ICON,

  label: function (subject, context) {
    if (!isDoc(subject)) return null
    return tasks(context.session.store, subject.doc()).length ? 'Board' : null
  },

  // A document that is mostly a task list opens as a board.
  shouldGetFocus: function (subject) {
    try {
      const store = globalThis.SolidLogic && globalThis.SolidLogic.store
      return !!store && isDoc(subject) && tasks(store, subject.doc()).length >= 3
    } catch (e) { return false }
  },

  render: function (subject, context) {
    const dom = context.dom
    const store = context.session.store
    const doc = subject.doc()
    const el = (tag, cls, text) => {
      const e = dom.createElement(tag)
      if (cls) e.setAttribute('class', cls)
      if (text !== undefined) e.textContent = text
      return e
    }
    const items = tasks(store, doc)
    const today = new Date().toISOString().slice(0, 10)
    const root = el('div', 'board task-board-pane')
    root.appendChild(el('style', '', CSS))

    const head = root.appendChild(el('div', 'board-head'))
    const file = decodeURIComponent(doc.value.split('/').pop()).replace(/\.[a-z]+$/i, '')
    head.appendChild(el('h3', '', text(store, doc, ['name', 'title', 'label'], doc) || file))
    const about = text(store, doc, ['description', 'note'], doc)
    if (about) head.appendChild(el('p', '', about))

    const done = items.filter(t => t.status === 'done').length
    const progress = root.appendChild(el('div', 'board-progress'))
    const bar = progress.appendChild(el('div', 'board-bar')).appendChild(el('i'))
    bar.setAttribute('style', 'width:' + (items.length ? Math.round(done / items.length * 100) : 0) + '%')
    progress.appendChild(el('span', '', done + ' of ' + items.length + ' done'))

    const cols = root.appendChild(el('div', 'board-cols'))
    for (const [key, name] of COLUMNS) {
      const mine = items.filter(t => t.status === key)
      const col = cols.appendChild(el('div', 'board-col ' + key))
      const h = col.appendChild(el('h4', '', name))
      h.appendChild(el('b', '', String(mine.length)))
      if (!mine.length) col.appendChild(el('p', 'board-empty', 'Nothing here'))
      for (const t of mine) {
        const card = col.appendChild(el('div', 'board-card'))
        card.appendChild(el('strong', '', t.title))
        if (t.notes) card.appendChild(el('p', '', t.notes))
        if (t.who || t.due) {
          const meta = card.appendChild(el('div', 'board-meta'))
          if (t.who) {
            const w = meta.appendChild(el('span', 'board-who'))
            w.appendChild(el('i', '', t.who.trim().charAt(0).toUpperCase()))
            w.appendChild(dom.createTextNode(t.who))
          }
          if (t.due) meta.appendChild(el('span', 'board-due' + (key !== 'done' && t.due < today ? ' late' : ''), shortDate(t.due)))
        }
      }
    }
    return root
  }
}

export default boardPane
