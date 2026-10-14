import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import injectHTML from 'vite-plugin-html-inject'
import { existsSync, readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { hubAsset } from './worker/hubs'

// In production the Worker serves the hub pages and fills the homepage's
// HOME_EXPLORE/THEORY_DIRECTORY slots; do the same (English only) in dev.
// Not HOME_SIDEBAR: dev styles arrive via JS, so a pre-rendered card would
// flash unstyled (production links the CSS in <head>, so it's fine there).
const devHubPages = (): Plugin => {
  const read = (file: string) => (existsSync(file) ? readFileSync(file, 'utf-8') : null)
  return {
    name: 'dev-hub-pages',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const asset = hubAsset(new URL(req.url ?? '/', 'http://dev').pathname.split('/').filter(Boolean))
        const html = asset && read(`public${asset}${asset.endsWith('/') ? 'index.html' : '.html'}`)
        if (!html) return next()
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(html)
      })
    },
    transformIndexHtml(html) {
      return html
        .replace(/<!--HOME_EXPLORE[^>]*-->/, read('public/_pages/home-explore/en.html') ?? '')
        .replace(/<!--THEORY_DIRECTORY[^>]*-->/, read('public/_pages/home-directory/en.html') ?? '')
    }
  }
}

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    injectHTML(),
    devHubPages()
  ],
  server: {
    port: 8080,
    open: true
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: './index.html',
        paper: './paper.html'
      },
      output: {
        manualChunks: {
          echarts: ['echarts']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    outDir: 'dist',
    emptyOutDir: true
  },
  optimizeDeps: {
    include: ['echarts']
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    // Cache-busting stamp for content JSON requests (src/utils/versioned.ts).
    __BUILD_ID__: JSON.stringify(Date.now().toString(36))
  }
})
