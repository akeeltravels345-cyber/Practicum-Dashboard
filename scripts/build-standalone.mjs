// Inline the standalone build into one double-click-able HTML file.
//
// Nick runs this app on his own machine with no server, so the deliverable is a
// single file he can keep in a folder and open. That only works if everything is
// inlined: a file:// page cannot fetch sibling assets reliably.
//
// The subtle one is `type="module"`. Vite injects it even though this build is
// IIFE, and Chrome refuses to execute module scripts on file:// pages — inline
// ones included. The tag has to be stripped or the file silently renders blank.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist-standalone'
const OUT = 'znkstr-practicum-standalone.html'

const htmlPath = join(DIST, 'index.html')
if (!existsSync(htmlPath)) {
  console.error(`No build found at ${htmlPath}. Run the vite build first.`)
  process.exit(1)
}

const read = (p) => readFileSync(join(DIST, p.replace(/^\//, '')), 'utf8')
let html = readFileSync(htmlPath, 'utf8')

// <script ... src="/local.js" ...></script>  ->  <script>…</script>
html = html.replace(/<script\b[^>]*\bsrc="(\/[^"]+)"[^>]*>\s*<\/script>/g, (_m, src) => `<script>\n${read(src)}\n</script>`)

// <link rel="stylesheet" ... href="/local.css">  ->  <style>…</style>
html = html.replace(
  /<link\b(?=[^>]*\brel="stylesheet")[^>]*\bhref="(\/[^"]+)"[^>]*>/g,
  (_m, href) => `<style>\n${read(href)}\n</style>`,
)

// The favicon would 404 from file://, so carry it as a data URI.
html = html.replace(/<link\b(?=[^>]*\brel="icon")[^>]*\bhref="(\/[^"]+)"[^>]*>/g, (m, href) => {
  try {
    const svg = readFileSync(join(DIST, href.replace(/^\//, '')))
    return `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${svg.toString('base64')}">`
  } catch {
    return '' // no favicon is better than a broken request
  }
})

const moduleScripts = (html.match(/<script[^>]*\btype="module"/g) ?? []).length
html = html.replace(/<script([^>]*)\btype="module"/g, '<script$1').replace(/<script([^>]*)\bcrossorigin\b/g, '<script$1')

// Stripping type="module" also strips its deferral: a classic inline script runs
// the instant it is parsed. Left in <head>, the bundle would call createRoot on a
// #root that does not exist yet and render nothing at all, with only a minified
// React error to explain it. So move the bundle to the end of <body>.
// Note the function-form replacements. Minified JS is full of `$` sequences, and
// string-form replace treats `$'` as "everything after the match", which silently
// quadrupled the file the first time this was written.
const bundle = html.match(/<script>[\s\S]*?<\/script>/)
if (bundle && html.indexOf(bundle[0]) < html.indexOf('<body')) {
  html = html.replace(bundle[0], () => '')
  html = html.replace(/<\/body>/, () => `${bundle[0]}\n</body>`)
}
if (html.indexOf('<script>') < html.indexOf('id="root"')) {
  console.error('Refusing to write: the bundle still runs before #root exists, so the page would render blank.')
  process.exit(1)
}

const leftover = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1])
if (leftover.length > 0) {
  console.error(`Refusing to write: these local assets were not inlined and would 404 from file:// —\n  ${[...new Set(leftover)].join('\n  ')}`)
  process.exit(1)
}
if (/<script[^>]*\bsrc=/.test(html)) {
  console.error('Refusing to write: a <script src> survived, so the file is not self-contained.')
  process.exit(1)
}

writeFileSync(OUT, html)
console.log(
  `Wrote ${OUT} (${Math.round(Buffer.byteLength(html) / 1024)} KB, self-contained)` +
    (moduleScripts > 0 ? `; stripped type="module" from ${moduleScripts} script tag(s) so it runs from file://` : ''),
)
