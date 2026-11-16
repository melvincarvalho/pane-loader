// gallery-pane.js — a folder of images as a gallery.
// Applies to a folder that lists at least three image files. Shows them as a grid; a click
// opens one large, with previous / next (arrow keys work, Escape closes). It imports nothing
// and reads only the folder listing SolidOS already has.
// Images are shown with plain <img> tags, so a private folder needs the browser to be allowed
// to read it (a public folder, or a session cookie); it does not use the logged-in fetch.
const LDP_CONTAINS = 'http://www.w3.org/ns/ldp#contains'
const IS_IMAGE = /\.(jpe?g|png|gif|webp|avif|svg|bmp)$/i
const ICON = new URL('gallery.svg', import.meta.url).href

const CSS = `
.gal { max-width: 1120px; margin: 0 auto; padding: 28px 32px 96px; font: 15px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; color: #1d1d1f }
.gal-head { display: flex; align-items: baseline; gap: 14px; margin: 0 0 22px }
.gal-head h3 { margin: 0; font-size: 34px; font-weight: 700; letter-spacing: -.02em }
.gal-head span { color: #86868b }
.gal-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px }
.gal-item { position: relative; display: block; aspect-ratio: 1; border-radius: 14px; overflow: hidden; background: #f1ecff; cursor: zoom-in; padding: 0; border: 0 }
.gal-item img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .25s }
.gal-item:hover img, .gal-item:focus-visible img { transform: scale(1.05) }
.gal-item:focus-visible { outline: 3px solid #7c4dff; outline-offset: 2px }
.gal-item span { position: absolute; left: 0; right: 0; bottom: 0; padding: 22px 12px 9px; color: #fff; font-size: 13px; font-weight: 600; text-align: left;
  background: linear-gradient(transparent, rgba(0,0,0,.55)); opacity: 0; transition: opacity .2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
.gal-item:hover span, .gal-item:focus-visible span { opacity: 1 }
.gal-box { position: fixed; inset: 0; z-index: 9999; background: rgba(18,16,28,.92); display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 14px; padding: 24px }
.gal-box img { max-width: min(calc(100vw - 170px), 1400px); max-height: 80vh; border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,.5); background: #fff }
.gal-box p { margin: 0; color: #fff; font: 600 15px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif }
.gal-box p small { color: #b9b4c9; font-weight: 400; margin-left: 10px }
.gal-box button { position: absolute; border: 0; background: rgba(255,255,255,.14); color: #fff; width: 46px; height: 46px; border-radius: 50%; font-size: 22px; line-height: 1; cursor: pointer }
.gal-box button:hover, .gal-box button:focus-visible { background: #7c4dff; outline: none }
.gal-box .gal-prev { left: 22px; top: 50%; transform: translateY(-50%) } .gal-box .gal-next { right: 22px; top: 50%; transform: translateY(-50%) } .gal-box .gal-close { right: 22px; top: 22px }
`

// The image files the folder lists, by name, each once.
function images (subject, store) {
  const seen = new Map()
  for (const node of store.each(subject, store.sym(LDP_CONTAINS))) {
    const name = decodeURIComponent(node.value.slice(subject.value.length))
    if (IS_IMAGE.test(name) && !name.includes('/')) seen.set(node.value, { node, name })
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
}

const title = name => name.replace(IS_IMAGE, '').replace(/[_-]+/g, ' ')

const galleryPane = {
  name: 'gallery',
  icon: ICON,

  label: function (subject, context) {
    if (!subject || !subject.value || !subject.value.endsWith('/')) return null
    return images(subject, context.session.store).length >= 3 ? 'Gallery' : null
  },

  // A folder that is mostly images opens as a gallery.
  shouldGetFocus: function (subject) {
    try {
      const store = globalThis.SolidLogic && globalThis.SolidLogic.store
      if (!store || !subject.value.endsWith('/')) return false
      const all = new Set(store.each(subject, store.sym(LDP_CONTAINS)).map(n => n.value)).size
      const pics = images(subject, store).length
      return pics >= 3 && pics >= all * 0.8
    } catch (e) { return false }
  },

  render: function (subject, context) {
    const dom = context.dom
    const el = (tag, cls, text) => {
      const e = dom.createElement(tag)
      if (cls) e.setAttribute('class', cls)
      if (text !== undefined) e.textContent = text
      return e
    }
    const items = images(subject, context.session.store)
    const root = el('div', 'gal gallery-pane')
    root.appendChild(el('style', '', CSS))

    const head = root.appendChild(el('div', 'gal-head'))
    const folder = decodeURIComponent(subject.value.replace(/\/$/, '').split('/').pop() || 'Gallery')
    head.appendChild(el('h3', '', title(folder)))
    head.appendChild(el('span', '', items.length + ' images'))

    // the large view
    let box = null
    let at = 0
    const close = () => { if (box) { box.remove(); box = null; dom.removeEventListener('keydown', onKey, true) } }
    const show = i => {
      at = (i + items.length) % items.length
      const item = items[at]
      box.querySelector('img').setAttribute('src', item.node.value)
      box.querySelector('img').setAttribute('alt', title(item.name))
      const p = box.querySelector('p')
      p.textContent = title(item.name)
      p.appendChild(el('small', '', (at + 1) + ' of ' + items.length))
    }
    function onKey (event) {
      if (event.key === 'Escape') close()
      else if (event.key === 'ArrowRight') show(at + 1)
      else if (event.key === 'ArrowLeft') show(at - 1)
      else return
      event.preventDefault()
      event.stopPropagation()
    }
    const open = i => {
      box = el('div', 'gal-box')
      box.setAttribute('role', 'dialog')
      box.setAttribute('aria-label', 'Image viewer')
      box.appendChild(el('style', '', CSS))
      box.appendChild(el('img'))
      box.appendChild(el('p'))
      const button = (cls, text, name, fn) => {
        const b = box.appendChild(el('button', cls, text))
        b.setAttribute('type', 'button')
        b.setAttribute('aria-label', name)
        b.addEventListener('click', e => { e.stopPropagation(); fn() })
        return b
      }
      button('gal-prev', '‹', 'Previous image', () => show(at - 1))
      button('gal-next', '›', 'Next image', () => show(at + 1))
      const x = button('gal-close', '×', 'Close', close)
      box.addEventListener('click', e => { if (e.target === box) close() })
      dom.addEventListener('keydown', onKey, true)
      dom.body.appendChild(box)
      show(i)
      x.focus()
    }

    const grid = root.appendChild(el('div', 'gal-grid'))
    items.forEach((item, i) => {
      const b = grid.appendChild(el('button', 'gal-item'))
      b.setAttribute('type', 'button')
      b.setAttribute('title', item.name)
      const img = b.appendChild(el('img'))
      img.setAttribute('src', item.node.value)
      img.setAttribute('alt', title(item.name))
      img.setAttribute('loading', 'lazy')
      b.appendChild(el('span', '', title(item.name)))
      b.addEventListener('click', () => open(i))
    })
    return root
  }
}

export default galleryPane
