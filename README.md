# pane-loader

Load SolidOS panes at run time, from URLs. One file, no dependencies, no build, and no change to SolidOS.

A dynamically loaded pane is an ES module at a URL whose default export is a SolidOS pane: the same members, the same context. Nothing about the pane changes; only how it reaches the registry. The idea is written up as a proposal in [SolidOS Panes, section 7](https://melvincarvalho.github.io/solidos-panes/#dynamic).

## Try it

Online: https://melvincarvalho.github.io/pane-loader/demo.html

Locally:

```sh
node serve.js          # http://localhost:8012/
```

Open http://localhost:8012/demo.html. It runs released SolidOS (mashlib 3.0.0, from a CDN) on the SolidOS team's public 2026 minutes folder. Press **Add a calendar view**, at the bottom: the pane is imported from its URL, registered (36 panes become 37) and shown, and the button becomes a Folder / Calendar switch.

## Use it

```js
import { loadPanes } from './pane-loader.js'

const results = await loadPanes([
  'https://alice.example/public/panes/hello-pane.js'
])
// [{ url, ok: true, name: 'hello-dynamic' }]
```

Or in one line, in the browser console of a page running SolidOS:

```js
import('https://melvincarvalho.github.io/pane-loader/pane-loader.js?pane=https://melvincarvalho.github.io/pane-loader/examples/hello-pane.js&show')
```

| Call | Does |
|---|---|
| `loadPane(url, options)` | Imports one module, checks its default export is a pane, calls `panes.register`. Returns `{ url, ok, name?, already?, reason? }`. Never throws. |
| `loadPanes(urls, options)` | The same for a list, in order, then redraws the current subject. |
| `isPane(object)` | True if the object has `name`, `label` and `render`. |

| Option | Meaning |
|---|---|
| `panes` | The solid-panes module. Default: `window.panes`, which mashlib sets. |
| `refresh` | Redraw the current subject afterwards. Default `true`. |
| `show` | Open the newest loaded pane that applies to the current subject. |
| `subject` | URL of the thing on show, when it is not the page's own URL. |

A pane that fails to import, is not a pane, or clashes with a different pane of the same name is skipped with a console warning; the rest still load. Loading the same module twice is harmless.

## Write a pane

Five examples, each one file that imports nothing:

| Pane | Applies to | Shows |
| --- | --- | --- |
| [hello-pane.js](examples/hello-pane.js) | any folder | the smallest possible pane: how many things the folder lists |
| [meetings-pane.js](examples/meetings-pane.js) | a folder with three or more dated files (`2026_11_04.md`) | the year month by month, each day opening that document |
| [notes-pane.js](examples/notes-pane.js) | a Markdown file (`.md`) | the note as a readable page, with previous / next through the folder; opens first |
| [gallery-pane.js](examples/gallery-pane.js) | a folder with three or more images | a grid, with a large viewer (arrow keys, Escape); opens first when the folder is mostly images |
| [board-pane.js](examples/board-pane.js) | a document describing tasks (`schema:Action` with `actionStatus`) | a To do / Doing / Done board, read from the store; read-only |

Try them together on [JSS](https://jss.live/docs/guides/dynamic-panes) 0.0.227 or later:

```bash
B=https://melvincarvalho.github.io/pane-loader/examples
jss start --mashlib-cdn --panes $B/meetings-pane.js,$B/notes-pane.js,$B/gallery-pane.js,$B/board-pane.js
```

A pane that should be the first view of what it applies to adds `shouldGetFocus (subject) { return true }`; without it the pane is offered in the menu beside the built-in ones.

Rules for a pane that is loaded and not built in:

- Export the pane as the module's default export.
- Import nothing from SolidOS. Take the store, the session and the document from the `context` passed to `label` and `render`. A second copy of solid-logic would have its own empty store and no login.
- Refer to your own files (icon, styles) relative to the module: `new URL('hello.svg', import.meta.url).href`.
- Serve the module as JavaScript with cross-origin access allowed, as GitHub Pages and most pods do.

## Files that belong to SolidOS

`799.js`, `841.js`, `5fb2ef310e691f59285b.js` and `a9c30b64ceaae48b72f0.js` are not part of the loader. They are the extra pieces of mashlib 3.0.0 (MIT, from https://unpkg.com/mashlib@3.0.0/dist/), which SolidOS fetches from the folder of the page that hosts it. They sit here only so that the demo page starts SolidOS without errors. SolidOS asks for them at the root of its site (`/799.js`), and its login check waits five seconds each time its worker file is missing there. The demo lives in a folder, so `demo.html` starts with a few lines that send those four requests to the copies beside the page.

## What is tested, and what is not

Tested 13 November 2026 against mashlib 3.0.0:

- Importing a pane module at run time, registering it and rendering it, on the demo page and, with an in-page module, on the public SolidOS at solidcommunity.net.
- A missing module and a module that is not a pane are skipped.
- The pane reads the folder listing from SolidOS's own store through `context`.

Not done yet:

- **Reading the list of panes from the user's data.** The loader takes URLs; nothing reads a person's preferences.
- **Loading at start-up.** Something has to call the loader: a console line, a bookmarklet, or one script line in the page that hosts SolidOS.
- **Precedence.** `register` appends, so a loaded pane comes after the 36 built-in ones. With `show` the loader opens it directly; without, it was not offered as a visible tab on the demo page.
- **Trust.** A loaded pane runs with the logged-in session and can do whatever the person can. Load only panes you would install as a browser extension.
- **An https page importing from this server.** Browsers stop a public https page from importing from `localhost`, so the console one-liner needs the files on a public host.
