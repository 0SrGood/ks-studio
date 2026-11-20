import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
const browser=await chromium.launch({channel:'msedge',headless:true})
const base=process.env.STUDIO_TEST_URL||'http://127.0.0.1:5173/'
try{
  for(const device of [
    {userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',instruction:'Abra este endereço no Safari.'},
    {userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36',instruction:'Abra este endereço no Chrome.'}
  ]){
    const page=await browser.newPage({viewport:{width:393,height:852},userAgent:device.userAgent})
    await page.goto(base,{waitUntil:'networkidle'})
    const continueButton=page.getByRole('button',{name:'Continuar no navegador',exact:true})
    assert(await continueButton.isEnabled())
    { const sheet=page.locator('.install-sheet'); await sheet.evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished))); const bounds=await sheet.boundingBox(); assert(bounds.height<852*.75&&Math.abs(bounds.y+bounds.height-852)<3) }
    await page.getByRole('button',{name:'Baixar aplicativo',exact:true}).click()
    await page.getByText(device.instruction,{exact:true}).waitFor()
    await page.screenshot({path:'test-results/install-'+(device.instruction.includes('Safari')?'iphone':'android')+'.png'})
    await continueButton.click()
    await page.getByRole('button',{name:'Primeiro atendimento',exact:true}).click()
    await page.getByRole('textbox',{name:'Nome e sobrenome'}).fill('Cliente lembrada')
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})))
    await continueButton.click()
    assert.equal(await page.getByRole('textbox',{name:'Nome e sobrenome'}).inputValue(),'Cliente lembrada')
    await page.reload()
    await continueButton.waitFor()
    assert(await continueButton.isEnabled())
    { const sheet=page.locator('.install-sheet'); await sheet.evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished))); const bounds=await sheet.boundingBox(); assert(bounds.height<852*.75&&Math.abs(bounds.y+bounds.height-852)<3) }
    await continueButton.click()
    await page.evaluate(()=>{
      const event=new Event('beforeinstallprompt',{cancelable:true})
      event.prompt=async()=>{window.installWasPrompted=true}
      event.userChoice=Promise.resolve({outcome:'accepted'})
      window.dispatchEvent(event)
      window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))
    })
    await page.getByRole('button',{name:'Baixar aplicativo',exact:true}).click()
    assert(await page.evaluate(()=>window.installWasPrompted))
    await page.close()
  }
  const standalone=await browser.newPage()
  await standalone.addInitScript(()=>{const match=window.matchMedia.bind(window);window.matchMedia=query=>query==='(display-mode: standalone)'?Object.assign(match(query),{matches:true}):match(query)})
  await standalone.goto(base,{waitUntil:'networkidle'})
  assert.equal(await standalone.getByRole('button',{name:'Continuar no navegador',exact:true}).count(),0)
  await standalone.close()
  const response=await fetch(new URL('manifest.webmanifest',base))
  assert.equal((await response.json()).name,'Ks Studio')
  console.log('Instalação imediata, tutoriais iPhone/Android, retorno, recarga, dados preservados e modo instalado verificados.')
}finally{await browser.close()}
