import {useState,type FormEvent} from 'react'
import {database,useStudio} from './studio'
import {errorText,type Service} from './data'
import {Action,Dialog,Notice} from './ui'

export function QuickService({service,onSaved}:{service?:Service;onSaved?:()=>void}){
  const {admin,refresh}=useStudio()
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
  if(!admin)return null
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError('')
    const fields=new FormData(event.currentTarget)
    try{
      const raw=String(fields.get('price')).trim().replace(',','.')
      if(!/^\d+(\.\d{1,2})?$/.test(raw)||Number(raw)<=0)throw new Error('Informe o valor em reais.')
      const category=String(fields.get('category')).trim()
      const client=database()
      const {error:catError}=await client.from('categories').upsert({name:category})
      if(catError)throw catError
      const values={...(service?{id:service.id}:{}),name:fields.get('name'),category,price_cents:Math.round(Number(raw)*100),
        duration:Number(fields.get('duration')),active:fields.has('active'),booking_enabled:fields.has('booking'),
        ...(service?{}:{onsite:true,pix:false,position:100})}
      const {error}=await client.from('services').upsert(values)
      if(error)throw error
      await refresh();onSaved?.();setOpen(false)
    }catch(error){setError(errorText(error))}finally{setBusy(false)}
  }
  return <><Action kind="outline" onClick={()=>{setError('');setOpen(true)}}>{service?'Editar':'Adicionar'}</Action>
    {open&&<Dialog title={service?'Editar procedimento':'Adicionar procedimento'} onClose={()=>{if(!busy)setOpen(false)}}><form className="stack" onSubmit={submit}>
      <label className="field">Nome<input name="name" defaultValue={service?.name} required maxLength={120}/></label>
      <label className="field">Categoria<input name="category" defaultValue={service?.category||'Sobrancelhas'} required maxLength={80}/></label>
      <div className="form-grid"><label className="field">Valor em reais<input name="price" inputMode="decimal" defaultValue={service?.price_cents!==null&&service?.price_cents!==undefined?(service.price_cents/100).toFixed(2):''} required/></label>
      <label className="field">Duração em minutos<input name="duration" type="number" min="5" max="720" defaultValue={service?.duration||''} required/></label></div>
      <label className="check"><input name="active" type="checkbox" defaultChecked={service?.active??true}/> Exibir procedimento</label>
      <label className="check"><input name="booking" type="checkbox" defaultChecked={service?.booking_enabled??true}/> Liberar agendamento</label>
      <Action type="submit" disabled={busy}>{busy?'Salvando…':'Salvar'}</Action><Notice message={error}/>
    </form></Dialog>}
  </>
}
