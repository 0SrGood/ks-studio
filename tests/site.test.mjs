import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import assert from 'node:assert/strict'

test('GitHub Pages manifest has scoped app routes and real PNG icon sizes',async()=>{
  const manifest=JSON.parse(await readFile('public/manifest.webmanifest','utf8'))
  assert.equal(manifest.start_url,'./#/')
  assert.equal(manifest.scope,'./')
  assert(manifest.icons.some(icon=>icon.purpose==='maskable'))
  for(const icon of manifest.icons){
    const png=await readFile('public/'+icon.src)
    assert.equal(png.toString('ascii',12,16),'IHDR')
    assert.equal(png.readUInt32BE(16)+'x'+png.readUInt32BE(20),icon.sizes)
  }
})
test('Ornamental button is a PNG with transitions and a reduced-motion fallback',async()=>{
  const png=await readFile('public/media/button-ornament.png')
  assert.equal(png.toString('ascii',12,16),'IHDR')
  assert(png[25]===6||png[25]===3&&png.includes(Buffer.from('tRNS')))
  const style=await readFile('src/styles.css','utf8')
  assert.match(style,/animation:gold-sweep/)
  assert.match(style,/focus-visible/)
  assert.match(style,/prefers-reduced-motion:reduce/)
})

