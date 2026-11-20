import {useEffect,useState} from 'react'
import {Clock3} from 'lucide-react'
import {dayLabel,time} from './data'

export function AppointmentCountdown({startsAt,endsAt}:{startsAt:string;endsAt?:string}){
  const [now,setNow]=useState(Date.now())
  useEffect(()=>{const tick=()=>setNow(Date.now());const id=window.setInterval(tick,1000);window.addEventListener('focus',tick);return()=>{clearInterval(id);window.removeEventListener('focus',tick)}},[])
  const remaining=Math.max(0,Math.floor((Date.parse(startsAt)-now)/1000))
  if(!Number.isFinite(remaining))return null
  const days=Math.floor(remaining/86400),hours=Math.floor(remaining%86400/3600),minutes=Math.floor(remaining%3600/60),seconds=remaining%60
  const finished=endsAt&&Date.parse(endsAt)<=now
  return <section className="appointment-countdown" aria-label="Tempo até o atendimento">
    <span><Clock3 size={18}/>{remaining?'Seu atendimento começa em':finished?'Horário do atendimento encerrado':'Chegou o horário do seu atendimento'}</span>
    {remaining>0&&<div className="countdown-digits" aria-label={days+' dias, '+hours+' horas, '+minutes+' minutos'}>
      {[[days,'dias'],[hours,'horas'],[minutes,'min'],[seconds,'seg']].map(([value,label])=><div key={label}><strong>{String(value).padStart(2,'0')}</strong><small>{label}</small></div>)}
    </div>}
    <p>{dayLabel(startsAt)} · {time(startsAt)}</p>
  </section>
}
