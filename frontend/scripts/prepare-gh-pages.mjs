import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, '..', 'dist')

if (!fs.existsSync(dist)) {
  console.error('dist/ not found — run vite build first')
  process.exit(1)
}

// Project site base path, e.g. /van-track/ → keep 1 segment in redirect
const basePath = process.env.VITE_BASE_PATH || '/van-track/'
const pathSegmentsToKeep = basePath.split('/').filter(Boolean).length

// SPA fallback for GitHub Pages project sites (BrowserRouter deep links).
// Plain index.html copy returns HTTP 404 on refresh; this redirect trick serves index with 200.
// https://github.com/rafgraph/spa-github-pages
const redirect404 = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>VanTrack</title>
    <script type="text/javascript">
      var pathSegmentsToKeep = ${pathSegmentsToKeep};
      var l = window.location;
      l.replace(
        l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
        l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + '/?/' +
        l.pathname.slice(1).split('/').slice(pathSegmentsToKeep).join('/').replace(/&/g, '~and~') +
        (l.search ? '&' + l.search.slice(1).replace(/&/g, '~and~') : '') +
        l.hash
      );
    </script>
  </head>
  <body>
    <!-- GitHub Pages requires 404.html to be at least 512 bytes -->
    <p>Redirecting…</p>
  </body>
</html>
`

fs.writeFileSync(path.join(dist, '404.html'), redirect404)
fs.writeFileSync(path.join(dist, '.nojekyll'), '')
console.log(
  `Prepared dist/ for GitHub Pages (404 redirect, pathSegmentsToKeep=${pathSegmentsToKeep})`
)