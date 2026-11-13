#!/usr/bin/env node
// serve.js — a static server for trying the loader from a live SolidOS page.
// Sends the headers a cross-site module import needs: the JavaScript content type, open CORS,
// and Access-Control-Allow-Private-Network so an https page may import from http://localhost.
//   node serve.js [port]      default 8012, bound to 127.0.0.1
import http from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const port = Number(process.argv[2]) || 8012
const types = { '.js': 'text/javascript', '.svg': 'image/svg+xml', '.html': 'text/html', '.md': 'text/markdown', '.json': 'application/json' }

http.createServer(async (req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Private-Network': 'true',
    'Cache-Control': 'no-store'
  }
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end() }
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')
  try {
    const body = await readFile(join(root, path === '/' ? 'README.md' : path))
    res.writeHead(200, { ...cors, 'Content-Type': types[extname(path)] || 'text/plain' })
    res.end(body)
  } catch {
    res.writeHead(404, cors); res.end('not found')
  }
}).listen(port, '127.0.0.1', () => console.log('http://localhost:' + port + '/'))
