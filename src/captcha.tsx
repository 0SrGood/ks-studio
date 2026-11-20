import { useEffect, useRef, useState } from 'react'

export const captchaSiteKey=import.meta.env.VITE_TURNSTILE_SITE_KEY||''
type Widget={
  render:(target:HTMLElement,options:Record<string,string|((token:string)=>void)>)=>string
  remove:(id:string)=>void
}
declare global{interface Window{turnstile?:Widget}}
let script:Promise<Widget>|null=null
function loadWidget() {
  if(window.turnstile)return Promise.resolve(window.turnstile)
  if(!script)script=new Promise<Widget>((resolve,reject)=>{
    const tag=document.createElement('script')
    tag.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    tag.async=true
    tag.onload=()=>window.turnstile?resolve(window.turnstile):reject(new Error())
    tag.onerror=reject
    document.head.appendChild(tag)
  })
  return script
}
export function Captcha({onToken}:{onToken:(token:string)=>void}) {
  const target=useRef<HTMLDivElement>(null)
  const [failed,setFailed]=useState(false)
  useEffect(()=>{
    let remove:()=>void=()=>{}
    let active=true
    if(captchaSiteKey)void loadWidget().then(widget=>{
      if(!active||!target.current)return
      const id=widget.render(target.current,{sitekey:captchaSiteKey,size:'flexible',language:'pt-br',callback:onToken,
        'expired-callback':()=>onToken(''),'error-callback':()=>{onToken('');setFailed(true)}})
      remove=()=>widget.remove(id)
    }).catch(()=>{if(active)setFailed(true)})
    return()=>{active=false;remove()}
  },[onToken])
  return <div><div ref={target}/>{failed&&<p role="alert">A verificação não carregou. Confira a conexão e recarregue a página.</p>}</div>
}
