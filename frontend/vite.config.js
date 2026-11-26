import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

/*
 * Dev-only helper for tools/render-watch.html: the page renders the 3D watch turntable
 * in the browser and POSTs each frame here, which writes it to public/sequence/.
 * Never included in production builds (apply: 'serve').
 */
function saveSequenceFrames() {
  const outDir = path.resolve(__dirname, 'public/sequence')
  return {
    name: 'save-sequence-frames',
    apply: 'serve',
    configureServer(server) {
      // catalogue photos fetched by the browser (licensed Commons images) -> backend/media/watches_raw/
      server.middlewares.use('/__save-media', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end() }
        const name = new URL(req.url, 'http://x').searchParams.get('name') || ''
        if (!/^[a-z0-9-]+\.(jpg|png)$/.test(name)) { res.statusCode = 400; return res.end('bad name') }
        const dir = path.resolve(__dirname, '../backend/media/watches_raw')
        const chunks = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', () => {
          fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks))
          res.end('ok')
        })
      })
      // tools/render-products.html: renders 3D de cada reloj -> backend/media/watches/3d/
      server.middlewares.use('/__save-render', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end() }
        const name = new URL(req.url, 'http://x').searchParams.get('name') || ''
        if (!/^[a-z0-9-]+-(hero|detail|side)\.webp$/.test(name)) { res.statusCode = 400; return res.end('bad name') }
        const dir = path.resolve(__dirname, '../backend/media/watches/3d')
        const chunks = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', () => {
          fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(path.join(dir, name), Buffer.concat(chunks))
          res.end('ok')
        })
      })
      // backend/scripts/render_queue.json para la página de render
      server.middlewares.use('/__render-queue', (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(fs.readFileSync(path.resolve(__dirname, '../backend/scripts/render_queue.json')))
      })
      server.middlewares.use('/__save-frame', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; return res.end() }
        const name = new URL(req.url, 'http://x').searchParams.get('name') || ''
        if (!/^(watch_\d{3}|poster)\.webp$/.test(name)) { res.statusCode = 400; return res.end('bad name') }
        const chunks = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', () => {
          fs.mkdirSync(outDir, { recursive: true })
          fs.writeFileSync(path.join(outDir, name), Buffer.concat(chunks))
          res.end('ok')
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), saveSequenceFrames()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
