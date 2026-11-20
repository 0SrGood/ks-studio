import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const desktop=await chromium.launch({channel:'msedge',headless:true})
try{
  const base=process.env.STUDIO_TEST_URL||'http://127.0.0.1:5173/'
  const issues=[]
  await mkdir('test-results',{recursive:true})
  for(const viewport of [{width:1440,height:1050},{width:393,height:852}]){
    const page=await desktop.newPage({viewport,deviceScaleFactor:1})
    page.on('pageerror',error=>issues.push(error.message))
    page.on('response',event=>{if(event.status()>=400&&event.url().startsWith(base))issues.push(event.status()+' '+event.url())})
    await page.goto(base,{waitUntil:'networkidle'})
    await page.getByRole('heading',{name:'Beleza que valoriza sua essência.'}).waitFor()
    const action=page.getByRole('link',{name:'Agendar meu horário'})
    assert.match(await action.locator('.action-decoration').evaluate(el=>getComputedStyle(el).borderImageSource),/button-ornament\.png/)
    if(viewport.width===1440){
      await action.hover()
      assert.equal(await action.evaluate(el=>getComputedStyle(el,'::after').animationName),'gold-sweep')
      await page.mouse.move(1,1)
    }
    await page.screenshot({path:'test-results/home-'+viewport.width+'.png',fullPage:true})
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))
    await action.click()
    await page.getByRole('heading',{name:'Agende seu horário'}).waitFor()
    assert(!await page.getByRole('heading',{name:'Acesse sua conta'}).count())
    await page.goto(base+'#/sobre')
    await page.getByRole('heading',{name:'Conheça Karyna Santos'}).waitFor()
    await page.screenshot({path:'test-results/sobre-'+viewport.width+'.png',fullPage:true})
    await page.goto(base+'#/portfolio')
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
    await page.goto(base+'#/cursos')
    await page.getByRole('button',{name:'Avise-me sobre novas turmas'}).click()
    await page.getByRole('dialog',{name:'Avisos de novas turmas'}).waitFor()
    await page.getByRole('button',{name:'Fechar'}).click()
    await page.goto(base+'#/admin/agenda')
    await page.getByRole('heading',{name:'Acesse sua conta'}).waitFor()
    assert(!await page.getByRole('heading',{name:'Linha do tempo'}).count())
    await page.close()
  }
  assert.deepEqual(issues,[])
  console.log('Visões de desktop e celular, botão PNG animado, navegação pública, biografia, agenda sem login, galeria, cursos e proteção da administração verificados.')
} finally {await desktop.close()}

