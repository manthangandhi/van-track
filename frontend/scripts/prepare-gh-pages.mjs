import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, '..', 'dist')

if (!fs.existsSync(dist)) {
  console.error('dist/ not found — run vite build first')
  process.exit(1)
}

// SPA fallback for GitHub Pages (refresh on /dashboard, /admin, etc.)
fs.copyFileSync(path.join(dist, 'index.html'), path.join(dist, '404.html'))
fs.writeFileSync(path.join(dist, '.nojekyll'), '')
console.log('Prepared dist/ for GitHub Pages (404.html + .nojekyll)')