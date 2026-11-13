// hello-pane.js — the smallest useful dynamically loaded pane.
// Applies to containers (folders) and says how many things the folder lists, read from the
// store SolidOS already has. It imports nothing: everything comes from the context it is handed.
const LDP_CONTAINS = 'http://www.w3.org/ns/ldp#contains'

const helloPane = {
  name: 'hello-dynamic',
  icon: new URL('hello.svg', import.meta.url).href,

  // The "can I show this?" test: a string means yes, null means no. Keep it cheap.
  label: function (subject, context) {
    return subject && subject.uri && subject.uri.endsWith('/') ? 'Hello (dynamic)' : null
  },

  // Build the view and return one element.
  render: function (subject, context) {
    const dom = context.dom
    const store = context.session.store
    // the same listing can be in the store from more than one fetch: count distinct things
    const count = new Set(store.each(subject, store.sym(LDP_CONTAINS)).map(n => n.value)).size
    const div = dom.createElement('div')
    div.setAttribute('class', 'hello-dynamic-pane')
    div.setAttribute('style', 'padding: 1em; font: 16px system-ui, sans-serif')
    const h = dom.createElement('h3')
    h.textContent = 'Hello from a dynamically loaded pane'
    const p = dom.createElement('p')
    p.textContent = 'This folder lists ' + count + ' thing' + (count === 1 ? '' : 's') +
      '. This pane was not built into SolidOS: it was loaded from ' + import.meta.url
    div.appendChild(h)
    div.appendChild(p)
    return div
  }
}

export default helloPane
