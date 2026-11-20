import { Clients, Finance, Services, PortfolioEditor, CourseEditor, Campaigns, Badges, Reports, Settings } from './admin-screens'
import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Action, Dialog, Empty, Intro, Notice, TextLink } from './ui'
import { SignIn } from './account'
import { db, database, rpc, invoke, useStudio } from './studio'
import { appointmentStatus, addDays, currency, dayLabel, errorText, localDay, paymentStatus, time, type Booking, type Slot } from './data'
import { dateRange, EditFields, f, getRows, intervalLabel, mediaFile, TableEditor, upsert, useRows, type Row, type Option } from './admin-fields'

const screens=[['','Hoje'],['agenda','Agenda e Programações'],['clientes','Clientes'],['pagamentos','Pagamentos'],['procedimentos','Catálogo'],['portfolio','Portfólio'],['cursos','Cursos'],['campanhas','Campanhas'],['selos','Selos'],['relatorios','Relatórios'],['configuracoes','Configurações']]
const phoneLabel=(number:string)=>number?.replace(/^55(\d{2})(\d+)(\d{4})$/,'($1) $2-$3')
export default function Admin() {
  const {pathname}=useLocation(),{session,admin,loading}=useStudio()
  const screen=pathname.split('/')[2]||''
  if(loading)return <div className="wrap page">Verificando acesso…</div>
  if(!session||session.user.is_anonymous)return <div className="wrap page"><Intro label="STUDIO KARYNA SANTOS" title="Administração"/><SignIn forceLogin/></div>
  if(!admin)return <div className="wrap page"><Intro label="STUDIO KARYNA SANTOS" title="Administração"/><Empty title="Acesso restrito"><TextLink to="/perfil">Voltar ao perfil</TextLink></Empty></div>
  return <div className="wrap page admin-page"><Intro label="GESTÃO DO STUDIO" title={screens.find(([id])=>id===screen)?.[1]||'Administração'}/>
    <div className="admin-layout"><nav className="admin-nav" aria-label="Menu administrativo">{screens.map(([id,label])=><NavLink end={!id} to={'/admin'+(id?'/'+id:'')} key={id}>{label}</NavLink>)}</nav>
      <div className="admin-body">{screen===''?<Agenda today/>:screen==='agenda'?<Agenda/>:screen==='clientes'?<Clients/>:screen==='pagamentos'?<Finance/>:
        screen==='procedimentos'?<Services/>:screen==='portfolio'?<PortfolioEditor/>:screen==='cursos'?<CourseEditor/>:screen==='campanhas'?<Campaigns/>:
        screen==='selos'?<Badges/>:screen==='relatorios'?<Reports/>:screen==='configuracoes'?<Settings/>:<Empty title="Área não encontrada"/>}</div></div></div>
}

function useBookings(from:string,to:string) {
  const [items,setItems]=useState<Booking[]>([]),[error,setError]=useState('')
  async function load(){
    if(!db)return
    const [start,end]=dateRange(from,to)
    const {data,error}=await db.from('bookings').select().gte('starts_at',start).lt('starts_at',end).order('starts_at').limit(2500)
    setItems(data||[]);setError(error?.message||'')
  }
  useEffect(()=>{void load()},[from,to])
  return {items,error,load}
}
type Mode='day'|'week'|'month'
function Agenda({today=false}:{today?:boolean}) {
  const [day,setDay]=useState(localDay()),[mode,setMode]=useState<Mode>('day'),[event,setEvent]=useState<Booking|null>(null),[manual,setManual]=useState(false)
  const from=mode==='month'?day.slice(0,7)+'-01':day
  const dayCount=mode==='month'?new Date(+day.slice(0,4),+day.slice(5,7),0).getDate():mode==='week'?7:1
  const {items,error,load}=useBookings(from,addDays(from,dayCount))
  const {rows:people}=useRows('profiles','name'),{rows:services}=useRows('services','position')
  const [available,setAvailable]=useState<Slot[]>([]),[service,setService]=useState('')
  useEffect(()=>{
    const id=service||services.find(s=>s.active)?.id
    if(today&&id)void rpc<Slot[]>('availability',{p_service:id,p_from:day,p_to:day}).then(setAvailable).catch(()=>setAvailable([]))
  },[services,service,day,items,today])
  const [open,setOpen]=useState('agenda')
  const summary=[['Agendamentos',items.length],['Comprovantes em análise',items.filter(b=>b.status==='review').length],['Pagamentos pendentes',items.filter(b=>!['paid','expired','rejected'].includes(b.payment_state)).length],['Concluídos',items.filter(b=>b.status==='completed').length],['Cancelados',items.filter(b=>b.status==='cancelled').length]] as const
  const next=items.find(item=>item.status==='confirmed'&&new Date(item.starts_at).getTime()>Date.now())
  return <>{!today&&<div className="chips">{[['agenda','Agenda'],['horarios','Horários de funcionamento'],['bloqueios','Bloqueios']].map(([id,name])=><button key={id} type="button" aria-pressed={open===id} onClick={()=>setOpen(id)}>{name}</button>)}</div>}
  {open==='agenda'?<><header className="section-title"><h2>{dayLabel(day)}</h2><Action onClick={()=>setManual(true)}>Agendamento manual</Action></header>
    {today?<><dl className="metrics">{summary.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{next&&<p>Próxima cliente · {time(next.starts_at)} · {people.find(person=>person.id===next.customer_id)?.name || 'Cliente'} · {next.service_name}</p>}
      {services.some(s=>s.active)&&<div className="detail-note"><label className="field filter">Horários livres por procedimento<select value={service||services.find(s=>s.active)?.id||''} onChange={e=>setService(e.target.value)}>{services.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><p>{available.map(s=>time(s.starts_at)).join(' · ')||'Sem horários livres neste dia.'}</p></div>}</>:
    <div className="inline-actions"><label className="field">Data<input type="date" value={day} onChange={e=>{if(e.target.value)setDay(e.target.value)}}/></label><div className="chips">{([['day','Dia'],['week','Semana'],['month','Mês']] as const).map(([id,label])=><button key={id} type="button" aria-pressed={mode===id} onClick={()=>setMode(id)}>{label}</button>)}</div></div>}
    {mode!=='day'&&<div className={mode==='month'?'admin-month':'admin-week'}>{Array.from({length:dayCount},(_,i)=>addDays(from,i)).map(d=><button key={d} aria-pressed={d===day} onClick={()=>setDay(d)}><strong>{d.slice(-2)}</strong><small>{items.filter(b=>localDay(new Date(b.starts_at))===d).length} atend.</small></button>)}</div>}
    <section className="admin-section"><h3>Linha do tempo</h3>{items.some(b=>localDay(new Date(b.starts_at))===day)?items.filter(b=>localDay(new Date(b.starts_at))===day).map(b=><div className="data-row" key={b.id}><div><strong>{time(b.starts_at)} · {b.service_name}</strong><p>{people.find(p=>p.id===b.customer_id)?.name} · {appointmentStatus[b.status]}</p></div><Action kind="outline" onClick={()=>setEvent(b)}>Detalhes</Action></div>):<Empty title="Nenhum atendimento para esta data"/>}</section>
    <Notice message={error}/></>:open==='horarios'?<TableEditor table="hours" title="Janelas de atendimento" create="Adicionar horário" remove fields={[
      f('weekday','Dia da semana','select',{nullable:true,options:['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'].map((day,index)=>[String(index),day])}),
      f('day','Data específica (substitui o horário semanal)','date',{nullable:true}),f('opens','Abertura','time',{required:true}),f('closes','Encerramento','time',{required:true}),
    ]} render={r=><><strong>{r.day?dayLabel(r.day):['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][r.weekday]}</strong><p>{r.opens.slice(0,5)} – {r.closes.slice(0,5)}</p></>}/>:
    <><TableEditor table="blocks" title="Bloqueios e pausas" create="Adicionar bloqueio" remove fields={[f('label','Motivo','text',{required:true}),f('starts_at','Início','datetime-local',{required:true}),f('ends_at','Fim','datetime-local',{required:true})]} render={r=><><strong>{r.label}</strong><p>{intervalLabel(r)}</p></>}/>
    <TableEditor table="closed_days" pk="day" title="Folgas e feriados" create="Bloquear dia inteiro" remove fields={[f('day','Data','date',{required:true}),f('reason','Motivo')]} sort="day"/></>}
    {event&&<BookingDetails booking={event} person={people.find(p=>p.id===event.customer_id)} close={()=>setEvent(null)} update={load}/>}
    {manual&&<Dialog title="Agendamento manual" onClose={()=>setManual(false)}><ManualBooking people={people} services={services} close={()=>{setManual(false);void load()}}/></Dialog>}
  </>
}
function BookingDetails({booking,person,close,update}:{booking:Booking;person?:Row;close:()=>void;update:()=>Promise<void>}) {
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[action,setAction]=useState('')
  const {settings}=useStudio()
  async function change(fields:Row={}) {
    await rpc('change_booking',{p_booking:booking.id,p_action:action,p_start:fields.starts_at||null,p_note:fields.note||''})
    await update();close()
  }
  return <Dialog title={booking.service_name} onClose={close}>
    <p>{person?.name} · {phoneLabel(person?.phone)}</p><p>{dayLabel(booking.starts_at)} · {time(booking.starts_at)} · {appointmentStatus[booking.status]}</p><p>{paymentStatus[booking.payment_state]} · {currency(booking.amount_cents)}</p>
    {person?.phone&&settings.contact_validated&&<a target="_blank" rel="noreferrer" className="text-link" href={'https://wa.me/'+person.phone}>Abrir WhatsApp da cliente</a>}
    <label className="field separated">Operação<select value={action} onChange={e=>setAction(e.target.value)}><option value="">Selecione</option>{[['checked_in','Marcar comparecimento'],['completed','Concluir'],['no_show','Marcar falta'],['shared_notes','Observações compartilhadas'],['reschedule','Reagendar'],['cancel','Cancelar']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    {action==='reschedule'?<EditFields fields={[f('starts_at','Nova data e hora','datetime-local',{required:true})]} submit={change}/>:action==='shared_notes'?<EditFields initial={{note:booking.shared_notes}} fields={[f('note','Observação para a cliente','textarea')]} submit={change}/>:action&&<Action disabled={busy} onClick={async()=>{setBusy(true);try{await change()}catch(err){setError(errorText(err))}finally{setBusy(false)}}}>Confirmar operação</Action>}
    <div className="inline-actions"><TextLink to={'/admin/pagamentos?reserva='+booking.id}>Consultar pagamento</TextLink><TextLink to={'/admin/clientes?cliente='+booking.customer_id}>Histórico da cliente</TextLink></div><Notice message={error}/>
  </Dialog>
}
function ManualBooking({people,services,close}:{people:Row[];services:Row[];close:()=>void}) {
  const [date,setDate]=useState(localDay()),[service,setService]=useState(''),[method,setMethod]=useState(''),[customer,setCustomer]=useState(''),[times,setTimes]=useState<Slot[]>([]),[error,setError]=useState('')
  useEffect(()=>{setTimes([]);if(date&&service)void rpc<Slot[]>('availability',{p_service:service,p_from:date,p_to:date}).then(setTimes).catch(e=>setError(errorText(e)))},[service,date])
  return <div className="stack"><label className="field">Cliente<select value={customer} onChange={e=>setCustomer(e.target.value)}><option value="">Selecione</option>{people.filter(p=>p.phone&&p.name).map(p=><option key={p.id} value={p.id}>{p.name} · {phoneLabel(p.phone)}</option>)}</select></label>
  <label className="field">Procedimento<select value={service} onChange={e=>{setService(e.target.value);setMethod('')}}><option value="">Selecione</option>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
  <label className="field">Data<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
  <label className="field">Forma de pagamento<select value={method} onChange={e=>setMethod(e.target.value)}><option value="">Selecione</option>{services.find(s=>s.id===service)?.onsite&&<option value="onsite">Pagamento presencial</option>}</select></label>
  {times.length&&method&&customer?<EditFields label="Confirmar reserva" fields={[f('start','Horário','select',{required:true,options:times.map(t=>[t.starts_at,time(t.starts_at)])})]} submit={async values=>{
    await rpc('reserve',{p_service:service,p_start:values.start,p_method:method,p_customer:customer,p_request:crypto.randomUUID()});close()
  }}/>:null}<Notice message={error}/></div>
}

