import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Bell, BookOpen, CalendarDays, Clock3, ReceiptText, Sparkles } from 'lucide-react'
import { appointmentStatus, dayLabel, media, time, type Booking } from './data'
import { db,useStudio } from './studio'
import { Action, NextArtwork } from './ui'
import { CustomerEntry } from './customer-entry'

const shortcuts=[
  [CalendarDays,'Meus agendamentos','/perfil?secao=agenda'],
  [BookOpen,'Histórico','/minha-jornada'],
  [Sparkles,'Procedimentos','/procedimentos'],
  [ReceiptText,'Pagamentos','/pagamentos'],
  [Bell,'Notificações','/perfil?secao=notificacoes'],
] as const

export function AppHome(){
  const {session,profile,admin}=useStudio()
  const customerId=session?.user.id
  const [upcoming,setUpcoming]=useState<{owner:string;booking:Booking|null}|null>(null)
  useEffect(()=>{
    const client=db
    if(!client||!customerId)return
    let active=true
    void client.from('bookings').select('id,service_name,starts_at,status')
      .eq('customer_id',customerId).in('status',['confirmed','review','held'])
      .gte('starts_at',new Date().toISOString()).order('starts_at').limit(1).maybeSingle()
      .then(({data})=>{if(active)setUpcoming({owner:customerId,booking:data as Booking|null})})
    return ()=>{active=false}
  },[customerId])
  const item=upcoming?.owner===customerId?upcoming?.booking:null
  const firstName=profile?.name.trim().split(/\s+/)[0]
  if(!admin)return <CustomerEntry welcome/>
  return <div className="wrap app-home">
    <header className="app-greeting"><h1>{firstName?'Olá, '+firstName:'Início'}</h1></header>
    <section className="app-booking" aria-labelledby="app-booking-title">
      <div className="app-booking-copy">
        <span className="app-booking-kicker"><CalendarDays size={18}/> Agenda online</span>
        <h2 id="app-booking-title">Agende seu horário</h2>
        <Action to="/agendar">Agendar meu horário <ArrowRight size={16}/></Action>
      </div>
      <img src={media('catalog/flow-brows.webp')} className="app-booking-photo" alt="" width="720" height="540"/>
    </section>
    {item&&<section className="app-next" aria-labelledby="app-next-title"><Clock3 size={23}/><div><h2 id="app-next-title">Próximo atendimento</h2><strong>{item.service_name}</strong><p>{dayLabel(item.starts_at)} às {time(item.starts_at)} · {appointmentStatus[item.status]}</p></div><Link to="/perfil?secao=agenda" className="next-link" aria-label="Ver próximo atendimento"><NextArtwork/></Link></section>}
    {admin&&<div className="app-manage"><Action to="/admin" kind="outline">Abrir administração</Action></div>}
    <section aria-labelledby="app-links-title" className="app-links"><h2 id="app-links-title">Sua área</h2>
      <div className="app-link-grid">
        {shortcuts.map(([Icon,title,to])=><Link key={to} to={to} className="app-link">
          <span className="app-link-icon"><Icon size={23} aria-hidden="true"/></span><strong>{title}</strong><NextArtwork/>
        </Link>)}
      </div>
    </section>
  </div>
}
