import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const browser=await chromium.launch({channel:'msedge',headless:true})
try{
  const base=process.env.STUDIO_TEST_URL||'http://127.0.0.1:5173/'
  const issues=[]
  await mkdir('test-results',{recursive:true})
  for(const viewport of [{width:1440,height:1000},{width:393,height:852}]){
    const page=await browser.newPage({viewport,deviceScaleFactor:1})
    page.on('pageerror',error=>issues.push(error.message))
    page.on('response',event=>{if(event.status()>=400&&event.url().startsWith(base))issues.push(event.status()+' '+event.url())})
    await page.goto(base+'#/',{waitUntil:'networkidle'})
    await page.getByRole('heading',{name:'Início',exact:true}).waitFor()
    assert.equal(await page.getByRole('heading',{name:/conheça|beleza que/i}).count(),0)
    assert.equal(await page.getByRole('link',{name:/^Meus agendamentos/}).count(),1)
    assert.equal(await page.locator('.app-links').getByRole('link',{name:'Histórico',exact:true}).count(),1)
    assert.equal(await page.locator('.app-top img.brand-wordmark').count(),1)
    const action=page.getByRole('link',{name:'Agendar meu horário'})
    assert.match(await action.locator('.action-decoration').evaluate(el=>getComputedStyle(el).borderImageSource),/button-ornament\.png/)
    if(viewport.width===1440){
      await action.hover()
      assert.equal(await action.evaluate(el=>getComputedStyle(el,'::after').animationName),'gold-sweep')
      await page.mouse.move(1,1)
    }
    await page.screenshot({path:'test-results/app-inicio-'+viewport.width+'.png',fullPage:true})
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    await action.click()
    await page.getByRole('heading',{name:'Agende seu horário'}).waitFor()
    assert(!await page.getByRole('heading',{name:'Acesse sua conta'}).count())
    await page.goto(base+'#/procedimentos')
    await page.getByRole('link',{name:'Micropigmentação labial'}).waitFor()
    assert.equal(await page.locator('.catalog-photo').count(),6)
    await page.waitForFunction(()=>[...document.querySelectorAll('.catalog-photo')].every(image=>image.complete&&image.naturalWidth>0))
    assert.equal(await page.locator('.catalog-card .next-art').count(),6)
    await page.getByRole('button',{name:'Micropigmentação',exact:true}).click()
    assert.equal(await page.locator('.catalog-card').count(),3)
    await page.getByRole('link',{name:'Micropigmentação labial',exact:true}).click()
    await page.getByRole('heading',{name:'Micropigmentação labial',exact:true}).waitFor()
    assert.equal(await page.locator('.catalog-detail-image').count(),1)
    await page.goto(base+'studio.html#/')
    await page.getByRole('heading',{name:'Beleza que valoriza sua essência.'}).waitFor()
    assert.equal(await page.getByRole('navigation',{name:'Navegação do aplicativo'}).count(),0)
    assert.equal(await page.getByRole('link',{name:'Agendar meu horário'}).getAttribute('href'),base+'#/agendar')
    await page.goto(base+'studio.html#/sobre')
    await page.getByRole('heading',{name:'Conheça Karyna Santos'}).waitFor()
    await page.goto(base+'studio.html#/portfolio')
    await page.getByRole('heading',{name:'Resultados que falam por si'}).waitFor()
    const result=page.getByRole('button',{name:/Ampliar/}).first()
    if(await result.count()){
      await result.click()
      const slider=page.getByRole('slider',{name:'Comparar antes e depois'})
      await slider.fill('70')
      assert.equal(await slider.inputValue(),'70')
      await page.keyboard.press('Escape')
      assert.equal(await page.getByRole('dialog').count(),0)
    }
    await page.goto(base+'#/admin/financeiro')
    await page.getByRole('heading',{name:'Acesse sua conta'}).waitFor()
    assert(!await page.getByRole('heading',{name:'Resultado mensal'}).count())
    await page.close()
  }
  assert.deepEqual(issues,[])
  console.log('Aplicativo e apresentação em endereços separados, catálogo, responsividade e acesso da administração verificados.')
} finally {await browser.close()}

