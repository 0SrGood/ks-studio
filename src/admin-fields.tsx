import { useEffect, useState, type FormEvent } from 'react'
import { db,database } from './studio'
import { dayLabel,errorText,localDay,time } from './data'
import { Action, Dialog, Empty, Notice } from './ui'

export type Row=Record<string,any>
export type Option=[string,string]
export type Field={key:string;label:string;type?:'text'|'number'|'textarea'|'checkbox'|'date'|'time'|'datetime-local'|'select'|'photo'|'video';required?:boolean;options?:Option[];value?:string|number|boolean;min?:number;max?:number;nullable?:boolean;step?:string}
export const f=(key:string,label:string,type?:Field['type'],options:Omit<Field,'key'|'label'|'type'>={}):Field=>({key,label,type,...options})
export const timestamp=(value:unknown)=>new Date(String(value)+'-03:00').toISOString()
export const asLocal=(value:string)=>localDay(new Date(value))+'T'+time(value)
export const dateRange=(from:string,to:string)=>[timestamp(from+'T00:00'),timestamp(to+'T00:00')]

export async function getRows(table:string,sort='id') {
  const {data,error}=await database().from(table).select().order(sort)
  if(error)throw error
  return (data||[]) as Row[]
}
export async function upsert(table:string,values:Row) {
  const result=await database().from(table).upsert(values).select().single()
  if(result.error)throw result.error
  return result.data as Row
}
export function stringRow(row:Row) {return String(row.name||row.title||row.label||row.reason||row.day||row.id)}
function valueOf(form:FormData,field:Field) {
  const raw=form.get(field.key)
  if(field.type==='checkbox')return raw==='on'
  if(raw===''&&field.nullable)return null
  if(field.type==='number')return Number(raw)
  if(field.type==='datetime-local'&&raw)return timestamp(raw)
  return raw||''
}
async function mediaFile(file:File,bucket='studio-media',prefix='') {
  const allowed=['image/jpeg','image/png','image/webp','video/mp4','video/webm']
  if(!allowed.includes(file.type)||file.size>15*1024*1024)throw new Error('Selecione um arquivo JPG, PNG, WebP, MP4 ou WebM de até 15 MB.')
  const path=prefix+crypto.randomUUID()+'.'+file.type.split('/')[1]
  const store=database().storage.from(bucket)
  const {error}=await store.upload(path,file,{contentType:file.type})
  if(error)throw error
  return {path,url:store.getPublicUrl(path).data.publicUrl}
}
export {mediaFile}

export function EditFields({fields,initial={},label='Salvar',submit,children,always=false,bucket='studio-media'}:{fields:Field[];initial?:Row;label?:string;submit:(r:Row)=>Promise<void>;children?:React.ReactNode;always?:boolean;bucket?:string}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('')
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('');setSuccess('')
    const data=new FormData(event.currentTarget),uploads:string[]=[]
    try {
      const values:Row={}
      for(const field of fields) {
        if(field.type==='photo'||field.type==='video') {
          const file=data.get(field.key)
          if(file instanceof File&&file.size){const result=await mediaFile(file,bucket);uploads.push(result.path);values[field.key]=bucket==='portfolio-media'?result.path:result.url}
          else values[field.key]=initial[field.key]||null
        }else values[field.key]=valueOf(data,field)
      }
      await submit(values);setSuccess('Alterações salvas.')
      if(!always)(event.target as HTMLFormElement).reset()
    }catch(err){if(uploads.length)await database().storage.from(bucket).remove(uploads);setError(errorText(err))}
    finally{setBusy(false)}
  }
  return <form className="stack admin-edit" onSubmit={save}>
    <div className="form-grid">{fields.map(field=>{
      const value=initial[field.key]??field.value??''
      if(field.type==='checkbox')return <label key={field.key} className="check"><input name={field.key} type="checkbox" defaultChecked={Boolean(value)}/>{field.label}</label>
      return <label key={field.key} className={'field '+(field.type==='textarea'?'wide':'')}>{field.label}
        {field.type==='textarea'?<textarea name={field.key} defaultValue={String(value)} required={field.required} maxLength={12000}/>:
        field.type==='select'?<select name={field.key} defaultValue={String(value)} required={field.required}><option value="">Selecione</option>{field.options?.map(([id,name])=><option value={id} key={id}>{name}</option>)}</select>:
        field.type==='photo'||field.type==='video'?<><input name={field.key} type="file" accept={field.type==='photo'?'.jpeg,.jpg,.png,.webp':'.mp4,.webm'} required={field.required&&!value}/>{value&&<small>Arquivo cadastrado. Selecione outro para substituir.</small>}</>:
        <input name={field.key} type={field.type||'text'} min={field.min} max={field.max} step={field.step} defaultValue={field.type==='datetime-local'&&value?asLocal(String(value)):String(value)} required={field.required} maxLength={800}/>}
      </label>
    })}</div>
    {children}<Action type="submit" disabled={busy}>{busy?'Salvando…':label}</Action><Notice message={error}/><Notice message={success} success/>
  </form>
}
export function TableEditor({table,title,create,fields,render,pk='id',sort='id',onSaved,remove=false}:{table:string;title:string;create:string;fields:Field[];render?:(r:Row)=>React.ReactNode;pk?:string;sort?:string;onSaved?:()=>void;remove?:boolean}) {
  const [rows,setRows]=useState<Row[]>([]),[current,setCurrent]=useState<Row|null>(null),[error,setError]=useState(''),[deleting,setDeleting]=useState<Row|null>(null),[busy,setBusy]=useState(false)
  function load(){void getRows(table,sort).then(setRows).catch(e=>setError(errorText(e)))}
  useEffect(load,[table,sort])
  return <section className="admin-section"><header className="section-title"><h2>{title}</h2><Action kind="outline" onClick={()=>setCurrent({})}>{create}</Action></header>
    {rows.length?rows.map(row=><div className="data-row" key={row[pk]}><div>{render?.(row)||<strong>{stringRow(row)}</strong>}</div>
      <div className="inline-actions"><Action kind="outline" onClick={()=>setCurrent(row)}>Editar</Action>{remove&&<Action kind="quiet" onClick={()=>setDeleting(row)}>Excluir</Action>}</div></div>):<Empty title="Nenhum registro cadastrado"/>}
    <Notice message={error}/>
    {current&&<Dialog title={current[pk]?'Editar registro':create} onClose={()=>setCurrent(null)}><EditFields initial={current} fields={fields} submit={async values=>{
      if(current[pk]!==undefined)values[pk]=current[pk]
      await upsert(table,values);setCurrent(null);load();onSaved?.()
    }}/></Dialog>}
    {deleting&&<Dialog title="Excluir este registro?" onClose={()=>setDeleting(null)}><p>{stringRow(deleting)}</p><Action disabled={busy} onClick={async()=>{setBusy(true);try{const {error}=await database().from(table).delete().eq(pk,deleting[pk]);if(error)throw error;setDeleting(null);load();onSaved?.()}catch(error){setError(errorText(error));setDeleting(null)}finally{setBusy(false)}}}>Confirmar exclusão</Action></Dialog>}
  </section>
}
export function useRows(table:string,sort='id') {
  const [rows,setRows]=useState<Row[]>([]),[error,setError]=useState('')
  function reload(){if(db)void getRows(table,sort).then(setRows).catch(error=>setError(errorText(error)))}
  useEffect(reload,[table,sort])
  return {rows,error,reload}
}
export const intervalLabel=(r:Row)=>dayLabel(r.starts_at)+' · '+time(r.starts_at)+' – '+time(r.ends_at)

