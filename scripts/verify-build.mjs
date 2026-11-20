import { access, readFile, readdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'))
assert.equal(manifest.start_url,'./#/')
for(const icon of manifest.icons)await access('dist/'+icon.src)
for(const path of ['index.html','sw.js','media/hero.webp','media/button-ornament.png'])await access('dist/'+path)
assert(!(await readdir('dist/media')).some(path=>path.startsWith('gallery-')))
const index=await readFile('dist/index.html','utf8')
assert.match(index,/\.\/assets\//)
assert.match(await readFile('dist/sw.js','utf8'),/studio-ks-[0-9a-f]{16}/)

