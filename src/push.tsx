import { useEffect, useState } from 'react'
import { errorText } from './data'
import { database } from './studio'
import { Action, Notice } from './ui'

const vapidKey=import.meta.env.VITE_PUSH_PUBLIC_KEY||''
const capable=Boolean(vapidKey)&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window&&import.meta.env.PROD
const registration=()=>navigator.serviceWorker.getRegistration()
const scopeKey=()=>{
  const ascii=atob(vapidKey.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(vapidKey.length/4)*4,'='))
  return Uint8Array.from(ascii,character=>character.charCodeAt(0))
}
export function PushToggle({customer}:{customer:string}) {
  const [subscribed,setSubscribed]=useState(false)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  useEffect(()=>{
    if(capable)void registration().then(reg=>reg?.pushManager.getSubscription()).then(sub=>setSubscribed(Boolean(sub))).catch(()=>{})
  },[customer])
  if(!capable)return null
  async function toggle() {
    setBusy(true);setMessage('')
    try{
      const reg=await registration()
      if(!reg?.active)throw new Error('Reabra o aplicativo antes de configurar as notificações.')
      const existing=await reg.pushManager.getSubscription()
      if(subscribed&&existing){
        const {error}=await database().from('push_subscriptions').delete().eq('endpoint',existing.endpoint).eq('customer_id',customer)
        if(error)throw error
        await existing.unsubscribe();setSubscribed(false)
      }else{
        const permission=await Notification.requestPermission()
        if(permission!=='granted')throw new Error('Ative as notificações nas configurações do navegador para continuar.')
        const subscription=existing||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:scopeKey()})
        const {error}=await database().from('push_subscriptions').upsert({customer_id:customer,endpoint:subscription.endpoint,subscription:subscription.toJSON()})
        if(error){if(!existing)await subscription.unsubscribe();throw error}
        setSubscribed(true)
      }
    }catch(error){setMessage(errorText(error))}finally{setBusy(false)}
  }
  return <div className="detail-note"><Action kind="outline" disabled={busy} onClick={toggle}>{subscribed?'Desativar avisos neste dispositivo':'Ativar avisos neste dispositivo'}</Action><Notice message={message}/></div>
}
export async function releasePush(customer:string) {
  if(!capable)return
  const reg=await registration()
  const existing=await reg?.pushManager.getSubscription()
  if(!existing)return
  const {error}=await database().from('push_subscriptions').delete().eq('endpoint',existing.endpoint).eq('customer_id',customer)
  if(error)throw error
  await existing.unsubscribe()
}
