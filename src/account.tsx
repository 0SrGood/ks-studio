import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bell, CalendarDays, LockKeyhole, UserRound } from 'lucide-react'
import { Action, Brand, Dialog, Empty, Intro, Notice, TextLink } from './ui'
import { BookingList } from './booking'
import { db,database,rpc,useStudio } from './studio'
import { dayLabel,errorText,localDay,media, time, type Booking } from './data'
import { PushToggle, releasePush } from './push'
import { Captcha, captchaSiteKey } from './captcha'

const redirect=()=>location.origin+location.pathname
type AuthMode='login'|'signup'|'reset'|'recover'
type Message={text:string;success:boolean}
const initial:Message={text:'',success:false}

export function SignIn({forceLogin=false}:{forceLogin?:boolean}) {
  const {authEvent,session,clearAuthEvent}=useStudio()
  const [standaloneMode,setMode]=useState<AuthMode>('login')
  const [recovered,setRecovered]=useState(false)
  const mode=authEvent==='PASSWORD_RECOVERY'&&!recovered?'recover':standaloneMode
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState(initial)
  const [captchaToken,setCaptchaToken]=useState('')
  const [captchaKey,setCaptchaKey]=useState(0)
  const needsCaptcha=Boolean(captchaSiteKey)&&mode!=='recover'
  useEffect(()=>{setMessage(initial);setCaptchaToken('')},[mode])
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage(initial)
    const data=new FormData(event.currentTarget)
    const email=String(data.get('email')||'').trim(),password=String(data.get('password')||'')
    try{
      const auth=database().auth
      if(mode==='reset'){
        const {error}=await auth.resetPasswordForEmail(email,{redirectTo:redirect(),captchaToken:captchaToken||undefined});if(error)throw error
        setMessage({text:'Se houver uma conta com esse e-mail, você receberá o link de recuperação.',success:true})
      }else if(mode==='recover'){
        const {error}=await auth.updateUser({password});if(error)throw error
        setMessage({text:'Senha atualizada.',success:true});setRecovered(true);clearAuthEvent()
      }else if(mode==='signup'){
        const result=await auth.signUp({email,password,options:{emailRedirectTo:redirect(),captchaToken:captchaToken||undefined}});if(result.error)throw result.error
        if(!result.data.session)setMessage({text:'Verifique sua caixa de entrada para confirmar o e-mail.',success:true})
      }else{
        const {error}=await auth.signInWithPassword({email,password,options:{captchaToken:captchaToken||undefined}});if(error)throw new Error('Confira o e-mail e a senha ou solicite a recuperação.')
      }
    }catch(error){setMessage({text:errorText(error),success:false})}finally{setBusy(false);setCaptchaToken('');setCaptchaKey(n=>n+1)}
  }
  const labels={login:'Entrar',signup:'Criar conta',reset:'Enviar link de recuperação',recover:'Salvar nova senha'}
  return <section className="signin"><Brand full/><h2>{mode==='signup'?'Crie sua conta':mode==='reset'?'Recuperar senha':mode==='recover'?'Escolha sua nova senha':'Acesse sua conta'}</h2>
  <p>{forceLogin?'Entre com a conta administrativa do Studio.':'Use sua conta para acompanhar seu histórico em outros dispositivos.'}</p>
  {!db?<Notice message="O acesso à conta ainda está em configuração."/>:<>
    <form className="stack" onSubmit={submit}>
      {mode!=='recover'&&<label className="field">E-mail<input autoComplete="email" type="email" name="email" required maxLength={254}/></label>}
      {mode!=='reset'&&<label className="field">Senha<input minLength={mode==='login'?1:8} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} type="password" name="password" required/></label>}
      {needsCaptcha&&<Captcha key={mode+'-'+captchaKey} onToken={setCaptchaToken}/>}
      <Action disabled={busy||(needsCaptcha&&!captchaToken)} type="submit">{busy?'Aguarde…':labels[mode]}</Action>
    </form>
    <div className="inline-actions">{mode==='login'?<>
      {!forceLogin&&!session?.user.is_anonymous&&<Action kind="quiet" onClick={()=>setMode('signup')}>Criar conta</Action>}
      <Action kind="quiet" onClick={()=>setMode('reset')}>Esqueci a senha</Action>
      {import.meta.env.VITE_GOOGLE_SIGN_IN==='true'&&!session?.user.is_anonymous&&<Action kind="outline" onClick={async()=>{const {error}=await database().auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect()}});if(error)setMessage({text:error.message,success:false})}}>Entrar com Google</Action>}</>:mode!=='recover'&&<Action kind="quiet" onClick={()=>setMode('login')}>Voltar a entrar</Action>}</div>
  </>}
  <Notice message={message.text} success={message.success}/></section>
}

export default function Account({journey=false}:{journey?:boolean}) {
  const {session,profile,loading,settings,admin,authEvent}=useStudio()
  const [params,setParams]=useSearchParams()
  const [next,setNext]=useState<Booking|null>(null)
  useEffect(()=>{
    if(!db||!session)return
    void db.from('bookings').select().eq('customer_id',session.user.id).eq('status','confirmed').gte('starts_at',new Date().toISOString()).order('starts_at').limit(1).maybeSingle().then(({data})=>setNext(data))
  },[session?.user.id])
  if(loading)return <div className="wrap page">Carregando seu perfil…</div>
  const tab=params.get('secao')||'agenda'
  const setTab=(tab:string)=>setParams({secao:tab})
  return <div className="wrap page account-page"><Intro label="ÁREA DA CLIENTE" title={journey?'Minha Jornada':profile?.name?'Olá, '+profile.name.trim().split(' ')[0]:'Meu perfil'} description={journey?'Acompanhe suas visitas, seus cuidados e as conquistas no Studio.':'Gerencie seus atendimentos e suas preferências.'}/>
    {!session||authEvent==='PASSWORD_RECOVERY'?<SignIn/>:journey?<Journey customer={session.user.id}/>:<>
    {next&&<div className="next-visit"><CalendarDays size={25}/><div><span className="eyebrow">PRÓXIMO ATENDIMENTO</span><h3>{next.service_name}</h3><p>{dayLabel(next.starts_at)} · {time(next.starts_at)} · {settings.address}</p></div></div>}
    <nav className="chips" aria-label="Seções do perfil">{[['agenda','Agendamentos'],['notificacoes','Notificações'],['dados','Meus dados'],['favoritos','Favoritos']].map(([id,label])=><button key={id} type="button" aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
    {tab==='agenda'&&<><BookingList/><div className="inline-actions"><TextLink to="/pagamentos">Pagamentos</TextLink><TextLink to="/minha-jornada">Minha Jornada</TextLink>{admin&&<TextLink to="/admin">Administração</TextLink>}</div></>}
    {tab==='notificacoes'&&<Notifications customer={session.user.id}/>}
    {tab==='dados'&&<ProfileForm/>}
    {tab==='favoritos'&&<Favorites customer={session.user.id}/>}
    </>}
  </div>
}
function ProfileForm() {
  const {profile,session,settings,refresh}=useStudio()
  const [message,setMessage]=useState(initial)
  const [avatar,setAvatar]=useState('')
  const [confirm,setConfirm]=useState('')
  const [busy,setBusy]=useState(false)
  useEffect(()=>{if(db&&profile?.avatar)void db.storage.from('avatars').createSignedUrl(profile.avatar,600).then(({data})=>setAvatar(data?.signedUrl||''))},[profile?.avatar])
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setMessage(initial)
    const data=new FormData(event.currentTarget),file=data.get('photo'),id=session?.user.id
    let path:string|null=null
    try{
      if(file instanceof File&&file.size){
        if(!id||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024)throw new Error('Escolha uma foto JPG, PNG ou WebP de até 2 MB.')
        path=id+'/'+crypto.randomUUID()+'.'+file.type.split('/')[1]
        const result=await database().storage.from('avatars').upload(path,file)
        if(result.error)throw result.error
      }
      try{await rpc('save_profile',{p_name:data.get('name'),p_phone:data.get('phone'),p_avatar:path,p_alerts:data.has('service'),p_marketing:data.has('marketing')})}
      catch(error){if(path)await database().storage.from('avatars').remove([path]);throw error}
      if(path&&profile?.avatar)await database().storage.from('avatars').remove([profile.avatar])
      await refresh();setMessage({text:'Dados salvos.',success:true})
    }catch(error){setMessage({text:errorText(error),success:false})}finally{setBusy(false)}
  }
  async function updateEmail(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true)
    const values=new FormData(event.currentTarget)
    try{const {error}=await database().auth.updateUser({email:String(values.get('email'))},{emailRedirectTo:redirect()});if(error)throw error;setMessage({text:'Abra o link recebido por e-mail para confirmar. Depois você poderá configurar uma senha.',success:true})}
    catch(error){setMessage({text:errorText(error),success:false})}finally{setBusy(false)}
  }
  async function updatePassword(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true)
    const values=new FormData(event.currentTarget)
    try{const {error}=await database().auth.updateUser({password:String(values.get('password'))});if(error)throw error;setMessage({text:'Senha atualizada.',success:true})}
    catch(error){setMessage({text:errorText(error),success:false})}finally{setBusy(false)}
  }
  return <section className="narrow"><div className="profile-picture">{avatar?<img src={avatar} alt="Foto de perfil"/>:<UserRound size={35}/>}</div>
  <form className="stack" onSubmit={save} key={profile?.id||'new'}>
    <div className="form-grid"><label className="field">Nome completo<input name="name" autoComplete="name" defaultValue={profile?.name} required maxLength={120}/></label><label className="field">WhatsApp<input name="phone" type="tel" defaultValue={profile?.phone} required maxLength={24}/></label></div>
    <label className="field">Foto de perfil<input type="file" accept=".jpeg,.jpg,.png,.webp" name="photo"/></label>
    <label className="check"><input type="checkbox" name="service" defaultChecked={profile?.service_alerts??true}/> Lembretes de atendimento e retorno</label>
    <label className="check"><input type="checkbox" name="marketing" defaultChecked={profile?.marketing}/> Novidades e campanhas</label>
    <Action disabled={busy} type="submit">Salvar perfil</Action>
  </form>
  <details className="consult"><summary>{session?.user.email?'Atualizar e-mail ou senha':'Vincular e-mail a este perfil'}</summary>
    {session?.user.is_anonymous&&<p>Vincule um e-mail antes de sair, para poder recuperar seus agendamentos em outro aparelho.</p>}
    <form className="stack" onSubmit={updateEmail}><label className="field">E-mail<input name="email" type="email" required defaultValue={session?.user.email}/></label><Action kind="outline" type="submit" disabled={busy}>Enviar confirmação</Action></form>
    {session?.user.email_confirmed_at&&<form className="stack separated" onSubmit={updatePassword}><label className="field">Nova senha<input type="password" name="password" minLength={8} maxLength={128} autoComplete="new-password" required/></label><Action kind="outline" type="submit" disabled={busy}>Salvar senha</Action></form>}
  </details>
  {profile?.referral_code&&<section className="detail-note"><h3>Indique o Studio</h3>{settings.referral_benefit&&<p>{settings.referral_benefit}</p>}<Action kind="outline" onClick={()=>void navigator.clipboard.writeText(redirect()+'#/?indicacao='+profile.referral_code).then(()=>setMessage({text:'Link de indicação copiado.',success:true})).catch(()=>setMessage({text:'Não foi possível copiar o link.',success:false}))}>Copiar link de indicação</Action></section>}
  <div className="inline-actions"><Action kind="quiet" onClick={()=>setConfirm('signout')}>Sair</Action>{profile?.deletion_requested_at?<p>Exclusão solicitada em {dayLabel(profile.deletion_requested_at)}.</p>:<Action kind="quiet" onClick={()=>setConfirm('delete')}>Solicitar exclusão da conta</Action>}</div>
  <Notice message={message.text} success={message.success}/>
  {confirm&&<Dialog title={confirm==='signout'?'Sair deste dispositivo?':'Solicitar exclusão?'} onClose={()=>setConfirm('')}>
    {confirm==='signout'&&session?.user.is_anonymous&&<p>Seu acesso de visitante está vinculado a este navegador. Vincule um e-mail para poder voltar a acessar o histórico.</p>}
    {confirm==='delete'&&<p>O Studio receberá sua solicitação e poderá responder pelo contato do perfil.</p>}
    <Action disabled={busy} onClick={async()=>{setBusy(true);try{if(confirm==='signout'){if(session)await releasePush(session.user.id);const {error}=await database().auth.signOut();if(error)throw error}else{await rpc('request_deletion');await refresh()}setConfirm('')}catch(error){setMessage({text:errorText(error),success:false})}finally{setBusy(false)}}}>Confirmar</Action><Notice message={message.text} success={message.success}/>
  </Dialog>}</section>
}
type News={id:number;title:string;body:string;created_at:string;read_at:string|null}
function Notifications({customer}:{customer:string}) {
  const [items,setItems]=useState<News[]>([])
  const [error,setError]=useState('')
  function load(){if(db)void db.from('notifications').select('id,title,body,created_at,read_at').eq('customer_id',customer).order('created_at',{ascending:false}).limit(80).then(({data,error})=>{setItems(data||[]);setError(error?.message||'')})}
  useEffect(load,[customer])
  return <section><h2>Notificações</h2><PushToggle customer={customer}/>{items.length?items.map(item=><div className="data-row" key={item.id}><div><strong><Bell size={16}/> {item.title}</strong><p>{item.body}</p><small>{dayLabel(item.created_at)}</small></div>{!item.read_at&&<Action kind="outline" onClick={()=>void rpc('read_notice',{p_id:item.id}).then(load).catch(error=>setError(errorText(error)))}>Marcar como lida</Action>}</div>):<Empty title="Você está em dia">Os avisos do Studio aparecerão aqui.</Empty>}<Notice message={error}/></section>
}
function Favorites({customer}:{customer:string}) {
  const {services}=useStudio()
  const [ids,setIds]=useState<string[]>([])
  useEffect(()=>{if(db)void db.from('favorites').select('service_id').eq('customer_id',customer).then(({data})=>setIds(data?.map(item=>item.service_id)||[]))},[customer])
  const selected=services.filter(service=>ids.includes(service.id))
  return <section><h2>Favoritos</h2>{selected.length?selected.map(s=><div className="data-row" key={s.id}><TextLink to={'/procedimentos/'+s.id}>{s.name}</TextLink></div>):<Empty title="Nenhum favorito salvo"><TextLink to="/procedimentos">Conhecer procedimentos</TextLink></Empty>}</section>
}
type Badge={id:string;name:string;threshold:number|null;anniversary:boolean;benefit:string}
type Photo={id:string;before:string;after:string;date:string}
function Journey({customer}:{customer:string}) {
  const {profile,services,settings}=useStudio()
  const [history,setHistory]=useState<Booking[]>([])
  const [badges,setBadges]=useState<Badge[]>([])
  const [awards,setAwards]=useState<Record<string,string>>({})
  const [photos,setPhotos]=useState<Photo[]>([])
  const [referrals,setReferrals]=useState(0)
  const [photo,setPhoto]=useState<Photo|null>(null)
  const [position,setPosition]=useState(50)
  const [error,setError]=useState('')
  useEffect(()=>{
    const client=db
    if(!client)return
    let active=true
    void (async()=>{
      await rpc('refresh_badges')
      const [visits,definitions,earned,mediaRows,invites]=await Promise.all([
        client.from('bookings').select().eq('customer_id',customer).eq('status','completed').order('starts_at',{ascending:false}),
        client.from('badges').select().order('threshold',{nullsFirst:false}),
        client.from('achievements').select().eq('customer_id',customer),
        client.from('journey_photos').select().eq('customer_id',customer),
        client.from('referrals').select('converted_at').eq('inviter_id',customer).not('converted_at','is',null),
      ])
      if(!active)return
      setHistory(visits.data||[]);setBadges(definitions.data||[]);setAwards(Object.fromEntries((earned.data||[]).map(a=>[a.badge_id,a.awarded_at])));setReferrals(invites.data?.length||0)
      const list=await Promise.all((mediaRows.data||[]).map(async item=>{
        const [before,after]=await Promise.all([item.before_path?client.storage.from('journey').createSignedUrl(item.before_path,300):null,client.storage.from('journey').createSignedUrl(item.after_path,300)])
        return {id:item.id,before:before?.data?.signedUrl||'',after:after.data?.signedUrl||'',date:visits.data?.find(v=>v.id===item.booking_id)?.starts_at||localDay()}
      }))
      if(active)setPhotos(list.filter(item=>item.after))
    })().catch(error=>{if(active)setError(errorText(error))})
    return()=>{active=false}
  },[customer])
  return <><div className="journey-card"><img src={media('monogram.webp')} width="73" height="68" alt=""/><div><span className="eyebrow">CLUBE DO STUDIO</span><h3>{profile?.name||'Minha Jornada'}</h3><p>{history.length} atendimento(s) · {Object.keys(awards).length} selo(s){referrals>0?' · '+referrals+' indicação(ões) concluída(s)':''}</p></div></div>
  <section className="section"><h2>Linha do tempo</h2>{history.length?<ol className="visits">{history.map(item=>{
    const service=services.find(s=>s.id===item.service_id)
    return <li key={item.id}><h3>{item.service_name}</h3><p>{dayLabel(item.starts_at)} · Karyna Santos</p>{item.shared_notes&&<p>{item.shared_notes}</p>}{service?.aftercare&&<details><summary>Cuidados posteriores</summary><p className="preserve">{service.aftercare}</p></details>}{settings.google_url&&<a className="text-link" href={settings.google_url} target="_blank" rel="noreferrer">Compartilhar minha avaliação</a>}</li>
  })}</ol>:<Empty title="Sua jornada começa no Studio">Visitas concluídas aparecerão aqui.</Empty>}</section>
  {photos.length>0&&<section className="section"><h2>Meus resultados</h2><div className="editorial-grid">{photos.map(item=><button className="work-button" aria-label={'Ver foto '+dayLabel(item.date)} key={item.id} onClick={()=>{setPhoto(item);setPosition(50)}}><img src={item.after} alt="Foto privada do atendimento"/></button>)}</div></section>}
  <section className="section"><h2>Selos Karyna</h2><div className="badges">{badges.map(b=><article key={b.id} className={awards[b.id]?'earned':''}>{awards[b.id]?<img width="50" height="45" src={media('monogram.webp')} alt="Conquistado"/>:<LockKeyhole size={24} aria-label="A conquistar"/>}<h3>{b.name}</h3><p>{awards[b.id]?'Conquistado em '+dayLabel(awards[b.id]):b.threshold?Math.min(history.length,b.threshold)+' de '+b.threshold+' visitas':b.anniversary?'Um ano desde a primeira visita':'Concedido pelo Studio'}</p>{b.benefit&&<p>{b.benefit}</p>}</article>)}</div></section>
  {photo&&<Dialog title="Meu resultado" onClose={()=>setPhoto(null)}><div className="comparison"><img src={photo.after} alt="Depois"/>{photo.before&&<img src={photo.before} alt="Antes" style={{clipPath:'inset(0 '+(100-position)+'% 0 0)'}}/>}</div>{photo.before&&<label className="field">Comparar antes e depois<input type="range" value={position} onChange={e=>setPosition(+e.target.value)}/></label>}</Dialog>}<Notice message={error}/></>
}

