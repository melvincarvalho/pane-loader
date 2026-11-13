// meetings-pane.js — a year view for a folder of dated documents.
// Applies to a folder where at least three of the listed files have a date in their name
// (2026_11_04.md, 2026-11-04.md, 20261104.md). Shows the year month by month; each day opens that
// document. It imports nothing and fetches nothing: the folder listing is already in SolidOS's store.
const LDP_CONTAINS = 'http://www.w3.org/ns/ldp#contains'
const DATED = /(\d{4})[ _-]?(\d{2})[ _-]?(\d{2})/
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const CSS = `
.mcal { max-width: 1040px; margin: 0 auto; padding: 28px 32px 96px; font: 15px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; color: #1d1d1f }
.mcal-year { display: flex; align-items: baseline; gap: 14px; margin: 0 0 26px }
.mcal-year h3 { margin: 0; font-size: 40px; font-weight: 700; letter-spacing: -.02em }
.mcal-year span { color: #86868b }
.mcal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(215px, 1fr)); gap: 30px 34px; margin-bottom: 40px }
.mcal-month h4 { margin: 0 0 10px; font-size: 19px; font-weight: 600; color: #7c4dff }
.mcal-month.empty h4 { color: #c7c7cc }
.mcal-days { display: flex; flex-wrap: wrap; gap: 8px; min-height: 38px }
.mcal-days a { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: #f1ecff; color: #5b2fe0;
  text-decoration: none; font-weight: 600; font-variant-numeric: tabular-nums; transition: background .15s, color .15s, transform .15s }
.mcal-days a:hover, .mcal-days a:focus-visible { background: #7c4dff; color: #fff; transform: scale(1.08); outline: none }
`

// The dated documents the folder lists, oldest first, each once.
function datedChildren (subject, store) {
  const seen = new Map()
  for (const node of store.each(subject, store.sym(LDP_CONTAINS))) {
    const file = decodeURIComponent(node.value.slice(subject.value.length))
    const m = DATED.exec(file)
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12 || Number(m[3]) < 1 || Number(m[3]) > 31) continue
    seen.set(node.value, { node, file, year: m[1], month: Number(m[2]), day: Number(m[3]) })
  }
  const key = i => Number(i.year) * 10000 + i.month * 100 + i.day
  return [...seen.values()].sort((a, b) => key(a) - key(b))
}

const meetingsPane = {
  name: 'meetings-calendar',
  icon: new URL('meetings.svg', import.meta.url).href,

  // A string means "I can show this", null means no.
  label: function (subject, context) {
    if (!subject || !subject.value || !subject.value.endsWith('/')) return null
    return datedChildren(subject, context.session.store).length >= 3 ? 'Calendar' : null
  },

  render: function (subject, context) {
    const dom = context.dom
    const el = (tag, cls, text) => {
      const e = dom.createElement(tag)
      if (cls) e.setAttribute('class', cls)
      if (text !== undefined) e.textContent = text
      return e
    }
    const items = datedChildren(subject, context.session.store)
    const root = el('div', 'mcal meetings-calendar-pane')
    root.appendChild(el('style', '', CSS))

    for (const year of [...new Set(items.map(i => i.year))]) {
      const inYear = items.filter(i => i.year === year)
      const head = el('div', 'mcal-year')
      head.appendChild(el('h3', '', year))
      head.appendChild(el('span', '', inYear.length + ' documents'))
      root.appendChild(head)

      const grid = el('div', 'mcal-grid')
      for (let m = 1; m <= 12; m++) {
        const inMonth = inYear.filter(i => i.month === m)
        const month = el('div', 'mcal-month' + (inMonth.length ? '' : ' empty'))
        month.appendChild(el('h4', '', MONTHS[m - 1]))
        const days = el('div', 'mcal-days')
        for (const item of inMonth) {
          const a = el('a', '', String(item.day))
          a.setAttribute('href', item.node.value)
          a.setAttribute('title', item.file)
          // open inside SolidOS when we can; the plain link still works without it
          a.addEventListener('click', function (event) {
            try {
              const outliner = context.getOutliner(dom)
              event.preventDefault()
              outliner.GotoSubject(item.node, true, undefined, true, undefined)
            } catch (e) { /* fall back to the link */ }
          })
          days.appendChild(a)
        }
        month.appendChild(days)
        grid.appendChild(month)
      }
      root.appendChild(grid)
    }
    return root
  }
}

export default meetingsPane
