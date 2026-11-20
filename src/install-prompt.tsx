import { useEffect, useState } from 'react'
import { Download, Smartphone } from 'lucide-react'
import { Action, Dialog } from './ui'
import { requestInstallation } from './installation'
import './install-prompt.css'

function installed() {
  return matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & {standalone?:boolean}).standalone)
}

export function InstallPrompt() {
  const [open,setOpen]=useState(()=>!installed())
  const [tutorial,setTutorial]=useState(false)
  const [busy,setBusy]=useState(false)
  const apple=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)
  const android=/Android/i.test(navigator.userAgent)
  useEffect(()=>{
    const show=()=>{if(!installed()){setTutorial(false);setOpen(true)}}
    const visibility=()=>{if(document.visibilityState==='visible')show()}
    const done=()=>setOpen(false)
    window.addEventListener('pageshow',show)
    document.addEventListener('visibilitychange',visibility)
    window.addEventListener('appinstalled',done)
    const mode=matchMedia('(display-mode: standalone)')
    const modeChanged=()=>{if(installed())done()}
    mode.addEventListener('change',modeChanged)
    return ()=>{
      window.removeEventListener('pageshow',show)
      document.removeEventListener('visibilitychange',visibility)
      window.removeEventListener('appinstalled',done)
      mode.removeEventListener('change',modeChanged)
    }
  },[])
  async function install() {
    setBusy(true)
    try{
      const started=await requestInstallation()
      if(started)setOpen(false)
      else setTutorial(true)
    }catch{setTutorial(true)}finally{setBusy(false)}
  }
  if(!open)return null
  return <Dialog className="install-sheet" title={tutorial?'Como instalar o Ks Studio':'Tenha o Ks Studio no celular'} onClose={()=>setOpen(false)}>
    <div className="install-prompt">
      <img src={import.meta.env.BASE_URL+'icons/icon-192.png'} width="76" height="76" alt="" className="install-app-icon"/>
      {!tutorial?<p>Baixe o aplicativo para receber avisos de agendamentos e não perca o horário!</p>:<>
        <ol>{apple?<>
          <li>Abra este endereço no Safari.</li>
          <li>Toque em Compartilhar, o ícone do quadrado com uma seta para cima.</li>
          <li>Escolha “Adicionar à Tela de Início” e toque em “Adicionar”.</li>
        </>:android?<>
          <li>Abra este endereço no Chrome.</li>
          <li>Toque nos três pontinhos do navegador.</li>
          <li>Escolha “Instalar aplicativo” ou “Adicionar à tela inicial” e confirme.</li>
        </>:<>
          <li>Abra este endereço no Chrome ou Microsoft Edge.</li>
          <li>Toque no ícone de instalação na barra de endereço ou abra o menu do navegador.</li>
          <li>Escolha “Instalar Ks Studio” ou “Instalar esta página como aplicativo”.</li>
        </>}</ol>
        <p className="install-help">Se estiver no Instagram ou WhatsApp, abra o menu e escolha abrir no navegador.</p>
      </>}
      <p className="install-help">Após instalar, permita as notificações quando solicitado. Os avisos dependem dessa permissão e da disponibilidade no aparelho.</p>
      {!tutorial&&<Action onClick={()=>void install()} disabled={busy}><Download size={20}/>{busy?'Abrindo instalação…':'Baixar aplicativo'}</Action>}
      {tutorial&&<Smartphone size={27} aria-hidden="true"/>}
      <Action kind="outline" onClick={()=>setOpen(false)}>Continuar no navegador</Action>
    </div>
  </Dialog>
}
