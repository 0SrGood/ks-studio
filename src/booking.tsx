import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, Clock3, Copy, FileCheck2, MapPin, Receipt, Smartphone } from 'lucide-react'
import { db, database, invoke, rpc, useStudio } from './studio'
import { addDays, appointmentStatus, currency, dayLabel, errorText, icon, isBookable, localDay, maps, paymentStatus, time, type Booking, type PixSession, type Slot } from './data'
import { Action, Dialog, DirectionButton, Empty, Intro, Notice, TextLink } from './ui'
import { serviceArtwork } from './catalog'
import './booking-steps.css'
import {QuickService} from './quick-service'
import {AppointmentCountdown} from './appointment-countdown'
import {readContact,saveContact,readDeviceBookings,saveDeviceBookings} from './device-profile'
import { requestInstallation } from './installation'
import { Captcha, captchaSiteKey } from './captcha'

import {ensureVisitor} from './visitor'

const weekdays=['dom','seg','ter','qua','qui','sex','sáb']
function installInvite() {
  if(matchMedia('(display-mode: standalone)').matches) return false
  return !localStorage.getItem('studio-install-invite')
}

export function calendarFile(booking:Booking, address:string) {
  const stamp=(iso:string)=>new Date(iso).toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'')
  const clean=(text:string)=>text.replace(/[\r\n]/g,' ').replace(/([,;\\])/g,'\\$1')
  const blob=new Blob([['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Studio Karyna Santos//Agenda//PT','BEGIN:VEVENT','UID:'+booking.id+'@studio-ks','DTSTAMP:'+stamp(new Date().toISOString()),'DTSTART:'+stamp(booking.starts_at),'DTEND:'+stamp(booking.ends_at),'SUMMARY:'+clean(booking.service_name),'LOCATION:'+clean(address),'END:VEVENT','END:VCALENDAR',''].join('\r\n')],{type:'text/calendar;charset=utf-8'})
  const url=URL.createObjectURL(blob)
  const anchor=document.createElement('a')
  anchor.href=url;anchor.download='Studio-Karyna-Santos.ics';anchor.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),5000)
}

export default function BookingPage() {
  const [params,setParams]=useSearchParams()
  const {services,settings,profile,session}=useStudio()
  const today=localDay()
  const requestedDay=params.get('dia')||''
  const validDay=/^\d{4}-\d{2}-\d{2}$/.test(requestedDay)&&requestedDay>=today&&requestedDay<=addDays(today,settings.booking_days)&&Number.isFinite(Date.parse(requestedDay))?requestedDay:today
  const [confirmStep,setConfirmStep]=useState(false)
  const [selected,setSelected]=useState(params.get('servico')||'')
  const [week,setWeek]=useState(validDay)
  const [day,setDay]=useState(validDay)
  const [slot,setSlot]=useState(params.get('horario')||'')
  const [slots,setSlots]=useState<Slot[]>([])
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(false)
  const [availablePix,setAvailablePix]=useState(false)
  const [calendar,setCalendar]=useState(false)
  const [waitlist,setWaitlist]=useState(false)
  const [warning,setWarning]=useState(false)
  const [invite,setInvite]=useState(false)
  const [error,setError]=useState('')
  const [feedback,setFeedback]=useState('')
  const [confirmed,setConfirmed]=useState<Booking|null>(null)
  const [formDetails,setFormDetails]=useState<{name:string;phone:string;method:string}|null>(null)
  const [captchaToken,setCaptchaToken]=useState('')
  const needsCaptcha=Boolean(captchaSiteKey&&!session)
  const bookingId=params.get('pix')
  const reschedule=params.get('reagendar')
  const requestId=useRef(crypto.randomUUID())
  const bookableServices=services.filter(isBookable)
  const service=bookableServices.find(item=>item.id===selected)
  const requestedService=services.find(item=>item.id===params.get('servico'))
  useEffect(()=>{
    if(!bookableServices.some(s=>s.id===selected))setSelected(bookableServices[0]?.id||'')
  },[services,selected])
  useEffect(()=>{if(db)void rpc<boolean>('pix_enabled').then(setAvailablePix).catch(()=>setAvailablePix(false))},[])
  useEffect(()=>{
    let active=true
    if(!service||!db)return
    setLoading(true);setSlots([]);setError('')
    void rpc<Slot[]>('availability',{p_service:selected,p_from:week,p_to:addDays(week,6)}).then(items=>{if(active)setSlots(items)}).catch(error=>{if(active)setError(errorText(error))}).finally(()=>{if(active)setLoading(false)})
    return()=>{active=false}
  },[selected,week,confirmed])
  const holding=useRef(false)
  async function reserve(details:{name:string;phone:string;method:string}) {
    if(holding.current)return
    holding.current=true;setBusy(true);setError('')
    try{
      await ensureVisitor(captchaToken||undefined)
      if(reschedule){
        const result=await rpc<Booking>('change_booking',{p_booking:reschedule,p_action:'reschedule',p_start:slot})
        setConfirmed(result);return
      }
      await rpc('save_profile',{p_name:details.name,p_phone:details.phone,p_avatar:null,p_alerts:null,p_marketing:null,p_referral:localStorage.getItem('studio-referral')})
      saveContact({name:details.name,phone:details.phone})
      const result=await rpc<Booking>('reserve',{p_service:selected,p_start:slot,p_method:details.method,p_request:requestId.current})
      const owner=(await database().auth.getSession()).data.session?.user.id
      if(owner)saveDeviceBookings(owner,[result,...readDeviceBookings<Booking>(owner).filter(item=>item.id!==result.id)])
      if(details.method==='pix') {setParams({pix:result.id});setWarning(false)}
      else {setConfirmed(result);if(installInvite())setInvite(true)}
    }catch(error){setError(errorText(error))}
    finally{holding.current=false;setBusy(false)}
  }
  function advance(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if(!slots.some(item=>item.starts_at===slot&&item.day===day)){setError('Escolha um horário disponível.');return}
    const data=new FormData(event.currentTarget)
    const details={name:String(data.get('name')||''),phone:String(data.get('phone')||''),method:String(data.get('method')||'onsite')}
    if(details.method==='pix'&&!reschedule) {setFormDetails(details);setError('');setWarning(true)}
    else void reserve(details)
  }
  async function addWaitlist(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setError('')
    const fields=new FormData(event.currentTarget)
    try {
      await ensureVisitor(captchaToken||undefined)
      await rpc('save_profile',{p_name:fields.get('name'),p_phone:fields.get('phone'),p_avatar:null,p_alerts:null,p_marketing:null})
      await rpc('join_waitlist',{p_service:selected,p_day:day,p_period:fields.get('period')})
      setWaitlist(false);setFeedback('Você entrou na lista de espera. Se surgir um horário, o aviso ficará na sua área de agendamentos.')
    }catch(error){setError(errorText(error))}finally{setBusy(false)}
  }
  function changeWeek(value:string){setWeek(value);setDay(value);setSlot('');requestId.current=crypto.randomUUID()}
  const dismissInvite=()=>{localStorage.setItem('studio-install-invite','1');setInvite(false)}
  const onReceipt=()=>{if(installInvite())setInvite(true)}
  const qualifier={invite,dismissInvite}
  if(bookingId) return <div className="wrap page narrow"><PixCheckout id={bookingId} onReceipt={onReceipt}/><InstallInvite {...qualifier}/></div>
  if(confirmed) return <div className="wrap page narrow"><Confirmation booking={confirmed}/><InstallInvite {...qualifier}/></div>
  if(location.hash.startsWith('#/pagamentos')) return <div className="wrap page narrow"><Intro label="ÁREA DA CLIENTE" title="Pagamentos"/><BookingList onlyPayments/></div>
  const days=Array.from({length:7},(_,i)=>addDays(week,i))
  const daySlots=slots.filter(s=>s.day===day)
  return <div className="wrap page booking-page"><Intro label="" title={reschedule?'Reagendar atendimento':confirmStep?'Confirme seu atendimento':'Agende seu atendimento'}/>
    {requestedService&&!isBookable(requestedService)&&<Notice message={'A agenda de '+requestedService.name+' ainda está a confirmar.'}/>}
    <div className="booking-layout simple-booking"><section className="booking-calendar" hidden={confirmStep}>
      <div className="week-heading"><h2>{dayLabel(day)}</h2><div className="inline-actions">
        <DirectionButton label="Semana anterior" previous disabled={week<=today} onClick={()=>changeWeek(addDays(week,-7)<today?today:addDays(week,-7))}/>
        <DirectionButton label="Próxima semana" disabled={addDays(week,7)>addDays(today,settings.booking_days)} onClick={()=>changeWeek(addDays(week,7))}/>
      </div></div>
      <div className="week-strip">{days.map(d=><button type="button" key={d} aria-pressed={d===day} disabled={d>addDays(today,settings.booking_days)} onClick={()=>{setDay(d);setSlot('');requestId.current=crypto.randomUUID()}}>
        {weekdays[new Date(d+'T12:00:00-03:00').getUTCDay()]}<strong>{d.slice(-2)}</strong><span aria-label={loading?'Consultando disponibilidade':slots.some(s=>s.day===d)?'Com disponibilidade':'Sem disponibilidade'} className={slots.some(s=>s.day===d)?'free':''}/></button>)}</div>
      <button className="calendar-link" type="button" onClick={()=>setCalendar(true)}><CalendarDays size={18}/> Ver outras datas</button>
      <section className="booking-procedures"><header className="section-title"><h2>Procedimentos de Karyna</h2><QuickService/></header>
      <div className="booking-service-list" role="group" aria-label="Procedimentos">
        {services.map(item=><div key={item.id}><button className="booking-service" type="button" aria-pressed={selected===item.id} disabled={!isBookable(item)||Boolean(reschedule&&item.id!==selected)}
          onClick={()=>{setSelected(item.id);setSlot('');requestId.current=crypto.randomUUID()}}>
          <span className="selection-circle" aria-hidden="true"/><span className="booking-service-copy"><strong>{item.name}</strong>
          <small>{item.duration!==null?item.duration+' min':'Duração a confirmar'}</small><span>{item.price_cents!==null?currency(item.price_cents):'Valor a confirmar'}</span>
          {!isBookable(item)&&<small>Agenda a confirmar</small>}</span>
          <img src={serviceArtwork(item)} alt="" width="82" height="82"/>
        </button><QuickService service={item}/></div>)}
      </div></section>
      {service&&<section className="booking-times"><h2>Escolha o horário</h2>
      {loading?<p role="status">Consultando horários…</p>:daySlots.length?<div className="slots" aria-label="Horários disponíveis">{daySlots.map(item=><button type="button" aria-pressed={item.starts_at===slot} onClick={()=>{setSlot(item.starts_at);requestId.current=crypto.randomUUID()}} key={item.starts_at}>{time(item.starts_at)}</button>)}</div>:<Empty title="Sem horários neste dia"><button className="calendar-link" type="button" onClick={()=>{setError('');setWaitlist(true)}}>Avise-me quando surgir uma vaga</button></Empty>}
      </section>}
      <Notice message={feedback} success/>
      <Action disabled={!slot||!service} onClick={()=>setConfirmStep(true)}>Continuar</Action>
    </section>
    {service&&<section className="booking-summary" hidden={!confirmStep}><button type="button" className="calendar-link" onClick={()=>setConfirmStep(false)}>Voltar à escolha do horário</button><h2>Seu atendimento</h2><div className="detail-note"><strong>{service.name}</strong><p>{currency(service.price_cents)} · {service.duration} min</p><p>{dayLabel(day)}{slot&&' · '+time(slot)}</p>
      <p>{settings.address}</p><p>Prazo para cancelar: {settings.cancellation_hours} h. Para reagendar: {settings.reschedule_hours} h antes do atendimento.</p>
      {service.payment_conditions&&<p>{service.payment_conditions}</p>}</div>
      <form className="stack" onSubmit={advance} key={selected}>
        {!reschedule&&<><label className="field">Nome completo<input key={profile?.name||''} autoComplete="name" name="name" defaultValue={profile?.name||readContact()?.name} maxLength={120} required/></label>
        <label className="field">WhatsApp com DDD<input key={profile?.phone||''} autoComplete="tel" type="tel" name="phone" defaultValue={profile?.phone||readContact()?.phone||sessionStorage.getItem('studio-booking-phone')||''} required maxLength={24}/></label>
        <fieldset><legend>Forma de pagamento</legend>
          {service.onsite&&<label className="check"><input name="method" type="radio" value="onsite" defaultChecked required/> Pagar no local</label>}
          {service.pix&&availablePix&&<label className="check"><input name="method" type="radio" value="pix" defaultChecked={!service.onsite} required/> Pagar com Pix</label>}
          {!service.onsite&&(!service.pix||!availablePix)&&<p>O pagamento ainda está indisponível neste procedimento.</p>}
        </fieldset>
        <label className="check"><input type="checkbox" required/> Li o resumo e aceito a política de cancelamento.</label></>}
        {needsCaptcha&&slot&&!waitlist&&<Captcha onToken={setCaptchaToken}/>}
        <Action type="submit" disabled={busy||!slot||(needsCaptcha&&!captchaToken)||(!reschedule&&!service.onsite&&(!service.pix||!availablePix))}>{busy?'Confirmando…':reschedule?'Confirmar novo horário':'Continuar com agendamento'}</Action>
      </form>
      <Notice message={warning||waitlist?'':error}/>
    </section>}</div>
    {calendar&&<Dialog title="Ver outras datas" onClose={()=>setCalendar(false)}><MonthPicker initial={day} min={today} max={addDays(today,settings.booking_days)} select={value=>{changeWeek(value);setCalendar(false)}}/></Dialog>}
    {waitlist&&<Dialog title="Lista de espera" onClose={()=>setWaitlist(false)}><p>{dayLabel(day)}</p>
      <form className="stack" onSubmit={addWaitlist}><label className="field">Nome completo<input name="name" defaultValue={profile?.name} required maxLength={120}/></label><label className="field">WhatsApp<input name="phone" type="tel" defaultValue={profile?.phone} required maxLength={24}/></label>
        <label className="field">Período<select name="period"><option value="any">Qualquer período</option><option value="morning">Manhã</option><option value="afternoon">Tarde</option><option value="evening">Noite</option></select></label>
        {needsCaptcha&&<Captcha onToken={setCaptchaToken}/>}
        <Action type="submit" disabled={busy||(needsCaptcha&&!captchaToken)}>Entrar na lista de espera</Action><Notice message={error}/>
      </form></Dialog>}
    {warning&&<PixWarning disabled={busy} message={error} onClose={()=>{if(!busy)setWarning(false)}} onContinue={()=>{if(formDetails)void reserve(formDetails)}}/>}
    {session&&<p className="booking-footer"><TextLink to="/perfil">Ver meus agendamentos</TextLink></p>}
  </div>
}

function MonthPicker({initial,min,max,select}:{initial:string;min:string;max:string;select:(v:string)=>void}) {
  const [offset,setOffset]=useState(0)
  const base=new Date(initial.slice(0,7)+'-01T12:00:00-03:00')
  base.setUTCMonth(base.getUTCMonth()+offset)
  const start=localDay(base)
  const display=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'America/Fortaleza'}).format(base)
  const count=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0)).getUTCDate()
  return <><div className="data-row">
    <DirectionButton label="Mês anterior" previous disabled={start.slice(0,7)<=min.slice(0,7)} onClick={()=>setOffset(current=>current-1)}/>
    <strong>{display}</strong>
    <DirectionButton label="Próximo mês" disabled={start.slice(0,7)>=max.slice(0,7)} onClick={()=>setOffset(current=>current+1)}/>
  </div>
    <div className="month-grid">{weekdays.map(d=><small key={d}>{d}</small>)}{Array.from({length:base.getUTCDay()},(_,i)=><span key={'gap'+i}/>)}{Array.from({length:count},(_,i)=>{const date=addDays(start,i);return <button key={date} type="button" disabled={date<min||date>max} aria-label={dayLabel(date)} onClick={()=>select(date)}>{i+1}</button>})}</div></>
}

export function PixWarning({onContinue,onClose,disabled,message}:{onContinue:()=>void;onClose:()=>void;disabled:boolean;message:string}) {
  const [seconds,setSeconds]=useState(3)
  useEffect(()=>{
    const start=performance.now()
    const tick=window.setInterval(()=>{const remaining=Math.max(0,3-Math.floor((performance.now()-start)/1000));setSeconds(remaining);if(!remaining)clearInterval(tick)},100)
    return()=>clearInterval(tick)
  },[])
  return <Dialog title="Antes de realizar seu Pix" onClose={onClose}><Receipt className="accent-icon" size={29}/>
    <p>Para concluir seu agendamento, será necessário realizar o pagamento e anexar o comprovante nesta plataforma.</p>
    <p>Após continuar, você terá <strong>5 minutos</strong> para realizar o Pix e enviar o comprovante.</p>
    <p>Guarde o comprovante gerado pelo seu banco. Ele será obrigatório para a verificação do pagamento.</p>
    <p>A confirmação definitiva ocorrerá após a conferência do recebimento pelo Studio.</p>
    <Action disabled={seconds>0||disabled} onClick={onContinue}>{disabled?'Abrindo sessão…':seconds?'Continuar em '+seconds+'s':'Entendi, continuar...'}</Action><Notice message={message}/>
  </Dialog>
}

const receiptTypes=['image/jpeg','image/png','image/webp','application/pdf']
async function uploadReceipt(bookingId:string,file:File,progress:(n:number)=>void) {
  const {data:{session}}=await database().auth.getSession()
  if(!session)throw new Error('Sua sessão foi encerrada. Abra o agendamento no dispositivo onde foi iniciado.')
  return new Promise<void>((resolve,reject)=>{
    const body=new FormData();body.set('booking',bookingId);body.set('file',file)
    const xhr=new XMLHttpRequest()
    xhr.open('POST',import.meta.env.VITE_SUPABASE_URL.replace(/\/$/,'')+'/functions/v1/receipt')
    xhr.timeout=60000
    xhr.setRequestHeader('authorization','Bearer '+session.access_token)
    xhr.setRequestHeader('apikey',import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
    xhr.upload.onprogress=event=>{if(event.lengthComputable)progress(Math.floor(100*event.loaded/event.total))}
    xhr.onload=()=>{if(xhr.status>=200&&xhr.status<300){resolve();return}try{reject(new Error(JSON.parse(xhr.responseText).error||'Não foi possível enviar.'))}catch{reject(new Error('Não foi possível enviar.'))}}
    xhr.onerror=xhr.ontimeout=()=>reject(new Error('A conexão falhou. Confira a internet e tente enviar o mesmo comprovante.'))
    xhr.send(body)
  })
}
function PixCheckout({id,onReceipt}:{id:string;onReceipt:()=>void}) {
  const [session,setPayment]=useState<PixSession|null>(null)
  const [booking,setBooking]=useState<Booking|null>(null)
  const [qr,setQr]=useState('')
  const [remaining,setRemaining]=useState(0)
  const [file,setFile]=useState<File|null>(null)
  const [preview,setPreview]=useState('')
  const [progress,setProgress]=useState<number|null>(null)
  const [status,setStatus]=useState('')
  const [error,setError]=useState('')
  const [manual,setManual]=useState(false)
  const anchor=useRef({server:0,base:0})
  async function reload() {
    try{
      const started=performance.now()
      const data=await invoke<PixSession>('pix',{booking:id})
      anchor.current={server:new Date(data.server_now).getTime(),base:(started+performance.now())/2}
      setRemaining(Math.max(0,Math.ceil((new Date(data.expires_at).getTime()-anchor.current.server)/1000)))
      setPayment(data)
      const result=await database().from('bookings').select().eq('id',id).single()
      if(result.data)setBooking(result.data)
    }catch(error){setError(errorText(error))}
  }
  useEffect(()=>{void reload();const visible=()=>{if(document.visibilityState==='visible')void reload()};document.addEventListener('visibilitychange',visible);return()=>document.removeEventListener('visibilitychange',visible)},[id])
  useEffect(()=>{
    if(!session)return
    const due=new Date(session.expires_at).getTime()
    const tick=()=>setRemaining(Math.max(0,Math.ceil((due-anchor.current.server-(performance.now()-anchor.current.base))/1000)))
    const interval=window.setInterval(tick,200);tick()
    return()=>clearInterval(interval)
  },[session])
  useEffect(()=>{
    let active=true
    if(session?.payload)void import('qrcode').then(({default:qrCode})=>qrCode.toDataURL(session.payload!,{width:310,margin:3})).then(url=>{if(active)setQr(url)}).catch(()=>setError('Não foi possível desenhar o QR Code. Use o código copia e cola.'))
    return()=>{active=false}
  },[session?.payload])
  useEffect(()=>{if(!file||file.type==='application/pdf'){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file])
  if(!session)return <><Intro label="PAGAMENTO" title="Pagamento Pix"/><Notice message={error}/>{!error&&<p role="status">Carregando sessão de pagamento…</p>}<TextLink to="/pagamentos">Meus pagamentos</TextLink></>
  const minutes=String(Math.floor(remaining/60)).padStart(2,'0')
  const seconds=String(remaining%60).padStart(2,'0')
  const active=session.payment_state==='waiting'&&remaining>0&&session.payload
  const uploadable=Boolean(active)||manual||['manual_review','rejected'].includes(session.payment_state)
  async function upload(event:FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if(!file||progress!==null)return
    setProgress(0);setError('')
    try{await uploadReceipt(id,file,setProgress);setFile(null);setStatus('Comprovante recebido. O Studio vai conferir o recebimento.');setManual(false);await reload();onReceipt()}
    catch(error){setError(errorText(error))}finally{setProgress(null)}
  }
  return <><Intro label="PAGAMENTO DO STUDIO" title="Pagamento Pix"/>
    <div className="pix-sheet"><div className="data-row"><div><h3>{currency(session.amount_cents)}</h3><p>{session.receiver}{session.institution&&' · '+session.institution}</p></div>{active&&<time className="pix-clock" aria-label={'Tempo restante '+minutes+' minutos e '+seconds+' segundos'}>{minutes}:{seconds}</time>}</div>
    {booking&&<p>{booking.service_name} · {dayLabel(booking.starts_at)} · {time(booking.starts_at)}</p>}
    {active?<>{qr&&<img className="pix-qr" src={qr} alt="QR Code para realizar pagamento Pix"/>}
      <label className="field">Pix copia e cola<input readOnly value={session.payload||''} onFocus={event=>event.currentTarget.select()}/></label>
      <Action kind="outline" onClick={()=>void navigator.clipboard.writeText(session.payload!).then(()=>setStatus('Código Pix copiado.')).catch(()=>setError('Selecione e copie o código acima.'))}><Copy size={17}/> Copiar código Pix</Action><p>{session.instructions}</p></>:
      <div className="detail-note"><h3>{session.payment_state==='waiting'||session.payment_state==='expired'?'O prazo desta etapa foi encerrado.':paymentStatus[session.payment_state]}</h3>
      {(session.payment_state==='waiting'||session.payment_state==='expired')&&<><p>Se você já realizou o Pix, envie o comprovante para conferência antes de tentar pagar novamente.</p><Action kind="outline" onClick={()=>setManual(true)}>Já paguei, preciso de ajuda</Action><TextLink to="/agendar">Voltar à agenda</TextLink></>}</div>}
      {uploadable&&<form className="stack receipt-form" onSubmit={upload}>
        <label className="field"><span><FileCheck2 size={20}/> Anexe seu comprovante de pagamento</span><input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" required onChange={e=>{
          const choice=e.target.files?.[0]
          if(choice&&receiptTypes.includes(choice.type)&&choice.size>0&&choice.size<=8*1024*1024){setFile(choice);setError('')}
          else {setFile(null);e.target.value='';setError(choice?'Selecione uma imagem JPG, PNG, WebP ou PDF de até 8 MB.':'')}
        }}/></label>
        {preview&&<img className="receipt-preview" src={preview} alt="Prévia do comprovante selecionado"/>}
        {file?.type==='application/pdf'&&<p>PDF selecionado · {file.name}</p>}
        {progress!==null&&<label className="field">{progress===100?'Conferindo o envio…':'Enviando '+progress+'%'}<progress value={progress} max="100"/></label>}
        <Action type="submit" disabled={!file||progress!==null}>{manual?'Enviar para revisão':'Enviar comprovante'}</Action>
      </form>}
    </div>
    <Notice message={status} success/><Notice message={error}/><TextLink to="/pagamentos">Meus pagamentos</TextLink></>
}

export function Confirmation({booking}:{booking:Booking}) {
  const {settings}=useStudio()
  return <><Intro label="AGENDA DO STUDIO" title="Seu agendamento" description={appointmentStatus[booking.status]}/>{booking.status==='confirmed'&&<AppointmentCountdown startsAt={booking.starts_at} endsAt={booking.ends_at}/>}<section className="empty"><h3>{booking.service_name}</h3>
    <p>{dayLabel(booking.starts_at)} · {time(booking.starts_at)} · {booking.duration} min</p><p>{settings.address}</p><p>{currency(booking.amount_cents)} · {booking.method==='pix'?'Pix':'Pagar no local'}</p><p>{paymentStatus[booking.payment_state]}</p>
    <div className="inline-actions"><Action to="/perfil">Ver meus agendamentos</Action><Action kind="outline" onClick={()=>calendarFile(booking,settings.address)}><CalendarDays size={17}/> Adicionar ao calendário</Action></div>
    <a href={maps} className="text-link" target="_blank" rel="noreferrer"><MapPin size={17}/> Abrir localização</a>{settings.contact_validated&&settings.whatsapp&&<a className="text-link" href={'https://wa.me/'+settings.whatsapp}>Falar com o Studio</a>}</section></>
}
function InstallInvite({invite,dismissInvite}:{invite:boolean;dismissInvite:()=>void}) {
  const [instructions,setInstructions]=useState(false)
  if(!invite)return null
  return <Dialog title="O Studio agora pode estar sempre com você." onClose={dismissInvite}>
    <img width="64" height="64" src={icon('icon-192.png')} alt=""/><p>Instale nosso aplicativo para acompanhar seus agendamentos, receber lembretes, conhecer novidades e aproveitar suas conquistas.</p>
    {instructions&&<p>No iPhone, abra no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Em outros navegadores, procure “Instalar aplicativo” no menu.</p>}
    <div className="inline-actions"><Action onClick={()=>void requestInstallation().then(started=>{if(started)dismissInvite();else setInstructions(true)}).catch(()=>setInstructions(true))}><Smartphone size={17}/> Instalar aplicativo</Action><Action kind="quiet" onClick={dismissInvite}>Agora não</Action></div>
  </Dialog>
}
export function BookingList({onlyPayments=false}:{onlyPayments?:boolean}) {
  const {session,settings}=useStudio()
  const [items,setItems]=useState<Booking[]>([])
  const [error,setError]=useState('')
  const [cancel,setCancel]=useState<string|null>(null)
  const [busy,setBusy]=useState(false)
  const [loading,setLoading]=useState(Boolean(session))
  function load(){
    if(!db||!session)return
    const owner=session.user.id
    setItems(readDeviceBookings<Booking>(owner))
    void db.from('bookings').select().eq('customer_id',owner).order('starts_at',{ascending:false}).then(({data,error})=>{
      if(data){setItems(data);saveDeviceBookings(owner,data)}
      setError(error?'Não foi possível atualizar o histórico. Exibindo a cópia deste aparelho.':'')
      setLoading(false)
    })
  }
  useEffect(load,[session?.user.id])
  if(!session)return <Empty title="Seus agendamentos"><p>Abra esta página no navegador onde você agendou ou entre para consultar sua conta.</p><TextLink to="/perfil">Meu perfil</TextLink></Empty>
  const now=Date.now()
  if(loading)return <p role="status">Carregando agendamentos…</p>
  return <>{items.length?items.map(item=><div className="data-row" key={item.id}><div><h3>{item.service_name}</h3><p><Clock3 size={14}/> {dayLabel(item.starts_at)} · {time(item.starts_at)} · {currency(item.amount_cents)}</p>
    <p>{appointmentStatus[item.status]} · {paymentStatus[item.payment_state]}</p>{item.status==='confirmed'&&new Date(item.ends_at).getTime()>now&&<AppointmentCountdown startsAt={item.starts_at} endsAt={item.ends_at}/>}</div>
    {item.method==='pix'&&item.payment_state!=='paid'&&item.status!=='cancelled'&&<Action to={'/pagamentos?pix='+item.id} kind="outline">Ver Pix</Action>}
    {!onlyPayments&&item.status==='confirmed'&&new Date(item.starts_at).getTime()>now&&<div className="inline-actions">
      <Action kind="quiet" onClick={()=>calendarFile(item,settings.address)}>Calendário</Action><Action kind="outline" to={'/agendar?servico='+item.service_id+'&reagendar='+item.id}>Reagendar</Action>
      <Action kind="quiet" onClick={()=>setCancel(item.id)}>Cancelar</Action></div>}</div>):<Empty title="Nenhum atendimento por aqui"><TextLink to="/agendar">Consultar a agenda</TextLink></Empty>}
    <Notice message={error}/>{cancel&&<Dialog title="Cancelar atendimento?" onClose={()=>setCancel(null)}><p>O horário será liberado e o cancelamento ficará no seu histórico.</p><Action disabled={busy} onClick={async()=>{setBusy(true);try{await rpc('change_booking',{p_booking:cancel,p_action:'cancel'});setCancel(null);load()}catch(error){setError(errorText(error))}finally{setBusy(false)}}}>Confirmar cancelamento</Action><Notice message={error}/></Dialog>}
  </>
}
