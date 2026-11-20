import {useState,type FormEvent} from 'react'
import {useNavigate} from 'react-router-dom'
import {ArrowLeft,CalendarDays,History,UserRound,UserRoundPlus} from 'lucide-react'
import {db,database,rpc,useStudio} from './studio'
import {media,errorText} from './data'
import {Action,Notice} from './ui'
import {Captcha,captchaSiteKey} from './captcha'
import {ensureVisitor} from './visitor'
import './customer-entry.css'
import {readContact,saveContact} from './device-profile'

export function CustomerEntry({welcome=false}:{welcome?:boolean}){
  const {session,profile,refresh}=useStudio()
  const navigate=useNavigate()
  const [step,setStep]=useState<'choose'|'new'|'phone'>('choose')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const [captcha,setCaptcha]=useState('')
  const [captchaVersion,setCaptchaVersion]=useState(0)
  const known=Boolean(session&&profile?.name&&profile.phone)
  const needsCaptcha=Boolean(captchaSiteKey&&step==='new'&&!session)
  const first=profile?.name.trim().split(/\s+/)[0]
  const saved=readContact()
  function back(){setError('');setStep('choose');setCaptcha('')}
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError('')
    const values=new FormData(event.currentTarget)
    try{
      if(step==='new'){
        saveContact({name:String(values.get('name')).trim(),phone:String(values.get('phone')).trim()})
        if(!db){navigate('/agendar');return}
        await ensureVisitor(captcha||undefined)
        await rpc('save_profile',{p_name:values.get('name'),p_phone:values.get('phone'),p_avatar:null,p_alerts:null,p_marketing:null,p_referral:localStorage.getItem('studio-referral')})
        await rpc('save_customer_details',{p_instagram:values.get('instagram')||null,p_birthday:values.get('birthday')||null})
        await refresh()
        navigate('/agendar')
      }else if(step==='phone'){
        let digits=String(values.get('phone')).replace(/\D/g,'')
        if(digits.length===10||digits.length===11)digits='55'+digits
        if(!/^55[1-9]\d{9,10}$/.test(digits))throw new Error('Informe seu telefone com DDD.')
        sessionStorage.setItem('studio-booking-phone',digits)
        navigate('/agendar')
      }
    }catch(error){setError(errorText(error))}finally{setBusy(false);setCaptcha('');setCaptchaVersion(v=>v+1)}
  }
  return <section className="customer-entry">
    <div className="entry-cover"><img src={media('catalog/flow-brows.webp')} alt=""/></div>
    <img className="entry-portrait" src={media('hero-mobile.webp')} width="100" height="100" alt="Karyna Santos"/>
    <div className="entry-content">
      <h1>{known&&welcome?'Olá, '+first:'Seu atendimento no Studio'}</h1>
      <p className="entry-brand">Karyna Santos</p>
      {known&&welcome?<div className="entry-actions">
        <Action to="/agendar"><CalendarDays size={18}/> Agendar atendimento</Action>
        <Action to="/perfil?secao=agenda" kind="outline"><History size={18}/> Meus agendamentos</Action>
      </div>:step==='choose'?<div className="entry-actions">
        <Action onClick={()=>{if(known||saved)navigate('/agendar');else setStep('phone')}}><UserRound size={18}/> Já sou cliente</Action>
        <Action kind="outline" onClick={()=>setStep('new')}><UserRoundPlus size={18}/> Primeiro atendimento</Action>
      </div>:<form className="stack" onSubmit={submit}>
        {step==='new'?<>
          <label className="field">Nome e sobrenome<input name="name" autoComplete="name" required maxLength={120} defaultValue={profile?.name}/></label>
          <label className="field">Telefone<input name="phone" type="tel" autoComplete="tel" required maxLength={24} placeholder="(84) 99999-9999" defaultValue={profile?.phone}/></label>
          <label className="field">Instagram <small>opcional</small><input name="instagram" maxLength={31} placeholder="@seunome"/></label>
          <label className="field">Data de nascimento <small>opcional</small><input name="birthday" type="date" max={new Date().toISOString().slice(0,10)}/></label>
        </>:<label className="field">Telefone<input name="phone" type="tel" autoComplete="tel" required maxLength={24} placeholder="(84) 99999-9999"/></label>}
        {needsCaptcha&&<Captcha key={captchaVersion} onToken={setCaptcha}/>}
        <Action type="submit" disabled={busy||(needsCaptcha&&!captcha)}>{busy?'Aguarde…':'Continuar'}</Action>
      </form>}
      <Notice message={error}/>
      {step!=='choose'&&<button type="button" className="entry-back" onClick={back}><ArrowLeft size={17}/> Voltar</button>}
    </div>
  </section>
}
