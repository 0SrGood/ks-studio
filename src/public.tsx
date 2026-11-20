import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock3, Camera as Instagram, MapPin, ScanLine, Star, ArrowUpRight, GraduationCap, Heart } from 'lucide-react'
import { address, appHref, coursePost, currency, dayLabel, errorText, instagram, isBookable, maps, media, time, type Cohort, type Service, type Work } from './data'
import { db, invoke, rpc, useStudio } from './studio'
import { Action, Dialog, Empty, Intro, NextArtwork, Notice, TextLink } from './ui'
import { serviceArtwork } from './catalog'
import './catalog.css'
import {QuickService} from './quick-service'

export function HomePage() {
  const {settings,services,works,news,publicError}=useStudio()
  const headline = settings.headline === 'Beleza que valoriza sua essência.' ? <>Beleza que<br/> valoriza sua <em>essência.</em></> : settings.headline
  return <>
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <span className="eyebrow"><span className="rule"/> JOÃO CÂMARA, RN</span>
        <h1 id="hero-title">{headline}</h1>
        <p>Sobrancelhas e micropigmentação em João Câmara.</p>
        <div className="hero-actions"><Action href={appHref('/agendar')}><CalendarDays size={17}/> Agendar meu horário</Action><a className="picture-link" href={appHref('/procedimentos')}>Procedimentos <NextArtwork/></a></div>
      </div>
      <figure className="hero-photo"><picture><source media="(max-width: 600px)" srcSet={media('hero-mobile.webp')}/><img fetchPriority="high" src={media('hero.webp')} alt="Karyna Santos com o uniforme do Studio"/></picture>
        <figcaption><span>Karyna Santos</span><small>DESIGNER E MICROPIGMENTADORA</small></figcaption></figure>
    </section>
    <section className="wrap section">
      <header className="section-title"><h2>Procedimentos</h2><a className="picture-link" href={appHref('/procedimentos')}>Ver catálogo <NextArtwork/></a></header>
      {services.length>0&&<div className="catalog-grid">{services.slice(0,3).map(service=><ServiceCard key={service.id} service={service} external/>)}</div>}
      <Notice message={publicError}/>
    </section>
    {news.length>0&&<section className="wrap section"><header className="section-title"><div><span className="eyebrow">NO STUDIO</span><h2>Novidades</h2></div></header>
      <div className="editorial-grid">{news.map(item=><article key={item.id}>{item.image&&<img src={item.image} alt="" loading="lazy"/>}<h3>{item.title}</h3><p>{item.body}</p></article>)}</div></section>}
    <section className="wrap section gallery-section">
      <header className="section-title"><div><span className="eyebrow">PORTFÓLIO</span><h2>Resultados que <em>falam por si.</em></h2></div><TextLink to="/portfolio">Ver portfólio</TextLink></header>
      <WorkGallery items={works.slice(0,3)}/>
    </section>
    <section className="section about wrap"><img loading="lazy" src={media('about.webp')} alt="Retrato de Karyna Santos"/><div><h2>Conheça<br/><em>Karyna Santos.</em></h2><p>Especialista em sobrancelhas, micropigmentadora e instrutora de cursos VIP.</p><Link to="/sobre" className="picture-link">Minha trajetória <NextArtwork/></Link></div></section>
    <section className="course-feature"><div className="wrap"><div><span className="eyebrow">FORMAÇÃO PROFISSIONAL</span><h2>Aprenda com<br/><em>Karyna Santos.</em></h2><p>Conhecimento, técnica e experiência compartilhados com quem deseja crescer na área da beleza.</p><Action to="/cursos">Conhecer os cursos</Action></div><img loading="lazy" src={media('courses.webp')} alt="Karyna Santos com instrumentos de design de sobrancelhas"/></div></section>
    <section className="wrap section visit"><div><span className="eyebrow">JOÃO CÂMARA, RN</span><h2>Visite o Studio</h2><p>{settings.address || address}</p><a className="text-link" href={maps} target="_blank" rel="noreferrer"><MapPin size={18}/> Como chegar <ArrowUpRight size={15}/></a></div><div><Star size={25}/><h3>Avaliações no Google</h3><p>Leia as experiências compartilhadas por quem já visitou o Studio.</p><a className="text-link" href={settings.google_url||maps} target="_blank" rel="noreferrer">Abrir no Google <ArrowUpRight size={15}/></a></div></section>
  </>
}

function ServiceCard({service,external=false}:{service:Service;external?:boolean}) {
  const path='/procedimentos/'+service.id
  const content=<><div className="catalog-image"><img className="catalog-photo" src={serviceArtwork(service)} alt="" width="720" height="540" loading="lazy" decoding="async"/><NextArtwork className="catalog-open"/></div>
    <div className="catalog-card-label"><span className="catalog-category">{service.category}</span><h3>{service.name}</h3>{isBookable(service)&&<small>{currency(service.price_cents)} · {service.duration} min</small>}</div></>
  return <article className="catalog-card">{external?<a className="catalog-card-link" href={appHref(path)}>{content}</a>:<Link className="catalog-card-link" to={path} aria-label={service.name}>{content}</Link>}{!external&&<QuickService service={service}/>}</article>
}
function ServiceInfo({service}:{service:Service}){
  return <div className="metadata">{service.price_cents!==null&&<strong>{currency(service.price_cents)}</strong>}{service.duration!==null&&<span><Clock3 size={15}/>{service.duration} min</span>}
    {!isBookable(service)&&<span>Agenda a confirmar</span>}</div>
}
export function Catalog() {
  const {services,publicError}=useStudio()
  const [filter,setFilter]=useState('')
  const categories=[...new Set(services.map(service=>service.category))]
  return <div className="wrap page catalog-page"><header className="section-title"><h1>Procedimentos</h1><QuickService/></header>
    {categories.length>0&&<div className="catalog-filters" role="group" aria-label="Categorias de procedimentos">
      <button type="button" aria-pressed={!filter} onClick={()=>setFilter('')}>Todos</button>
      {categories.map(name=><button key={name} type="button" aria-pressed={filter===name} onClick={()=>setFilter(name)}>{name}</button>)}
    </div>}
    {services.length?<><div className="catalog-grid">{services.filter(s=>!filter||s.category===filter).map(service=><ServiceCard key={service.id} service={service}/>)}</div>
      <p className="catalog-note">{services.some(s=>!s.photo)&&'Imagens de apoio ilustrativas.'}{!services.some(isBookable)&&' Horários a confirmar.'}</p></>:<Empty title="Catálogo em preparação"/>}
    <Notice message={publicError}/></div>
}
export function Procedure() {
  const {id}=useParams()
  const {services,session,works}=useStudio()
  const service=services.find(s=>s.id===id)
  const [status,setStatus]=useState('')
  if(!service)return <div className="wrap page"><Empty title="Procedimento indisponível"><TextLink to="/procedimentos">Ver procedimentos</TextLink></Empty></div>
  const details=[['Preparação',service.preparation],['Cuidados posteriores',service.aftercare],['Observações',service.restrictions],['Retorno',service.return_rules],['Pagamento',service.payment_conditions]]
  async function save() {
    try{const added=await rpc<boolean>('toggle_favorite',{p_id:id});setStatus(added?'Procedimento salvo nos favoritos.':'Procedimento retirado dos favoritos.')}
    catch(error){setStatus(errorText(error))}
  }
  return <div className="wrap page catalog-detail">
    <Link to="/procedimentos" className="catalog-back"><ArrowLeft size={18}/> Procedimentos</Link>
    <div className="catalog-detail-grid"><figure><img className="catalog-detail-image" src={serviceArtwork(service)} width="720" height="540" alt={service.photo?service.name:''}/>
      {!service.photo&&<figcaption className="catalog-note">Imagem ilustrativa</figcaption>}</figure>
    <div>
      <Intro label={service.category} title={service.name} description={service.description}/>
      <ServiceInfo service={service}/>
      <div className="inline-actions">{isBookable(service)&&<Action to={'/agendar?servico='+service.id}><CalendarDays size={18}/> Agendar</Action>}{session&&<Action kind="outline" onClick={save}><Heart size={17}/> Favorito</Action>}</div>
      <Notice message={status} success/>
      {details.filter(([,body])=>body).map(([title,body])=><details className="catalog-detail-note" key={title}><summary>{title}</summary><p>{body}</p></details>)}
    </div></div>
    {works.some(work=>work.service_id===id)&&<section className="section"><h2>Resultados</h2><WorkGallery items={works.filter(work=>work.service_id===id)}/></section>}</div>
}

function WorkGallery({items}:{items:Work[]}) {
  const [work,setWork]=useState<Work|null>(null)
  const [compare,setCompare]=useState(50)
  if (!items.length) return <Empty title="Portfólio em curadoria"><a className="text-link" href={instagram} target="_blank" rel="noreferrer"><Instagram size={16}/> Acompanhe os trabalhos no Instagram</a></Empty>
  return <><div className="gallery-grid">{items.map(item=><figure key={item.id}><button className="work-button" type="button" onClick={()=>{setCompare(50);setWork(item)}} aria-label={'Ampliar '+item.title}>
    {item.after_url?<img src={item.after_url} alt={item.title} loading="lazy"/>:<div className="work-placeholder"><ScanLine size={30}/></div>}<span className="work-expand"><ScanLine size={18}/></span></button>
    <figcaption><span>{item.title}</span><small>{item.category}</small></figcaption></figure>)}</div>
    {work&&<Dialog title={work.title} onClose={()=>setWork(null)}>
      {work.after_url&&<div className="comparison"><img src={work.after_url} alt="Depois"/>{work.before_url&&<img src={work.before_url} alt="Antes" style={{clipPath:'inset(0 '+(100-compare)+'% 0 0)'}}/>}
      {work.before_url&&<span className="comparison-line" style={{left:compare+'%'}} aria-hidden="true"/>}</div>}
      {work.before_url&&<label className="field">Comparar antes e depois<input type="range" min="0" max="100" value={compare} onChange={event=>setCompare(+event.target.value)}/></label>}
      <p>{work.description}</p>{work.video_url&&<video controls preload="metadata" src={work.video_url}/>}
      <div className="inline-actions">{work.instagram_url&&<a className="text-link" href={work.instagram_url} target="_blank" rel="noreferrer">Publicação original</a>}{work.service_id&&<Action href={appHref('/agendar?servico='+work.service_id)}>Agendar</Action>}</div>
    </Dialog>}</>
}
export function Portfolio() {
  const {works}=useStudio()
  const [filter,setFilter]=useState('')
  const categories=[...new Set(works.map(work=>work.category))]
  return <div className="wrap page"><Intro label="TRABALHOS DO STUDIO" title="Resultados que falam por si" description="Explore os registros do Studio e veja os detalhes de cada resultado."/>
    {categories.length>0&&<div className="chips" aria-label="Categorias">{['',...categories].map(category=><button type="button" aria-pressed={filter===category} onClick={()=>setFilter(category)} key={category}>{category||'Todos'}</button>)}</div>}
    <WorkGallery items={works.filter(work=>!filter||work.category===filter)}/></div>
}

function Interest({course,cohort}:{course?:string;cohort?:string}) {
  const {profile,session}=useStudio()
  const [status,setStatus]=useState('')
  const [sent,setSent]=useState(false)
  const [busy,setBusy]=useState(false)
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();setBusy(true);setStatus('')
    const fields=new FormData(event.currentTarget)
    try {await invoke('interest',{name:fields.get('name'),phone:fields.get('phone'),email:fields.get('email'),course:course||null,cohort:cohort||null,consent:fields.get('consent')==='on'});setSent(true);setStatus('Interesse registrado. O Studio poderá avisar você sobre a turma.')}
    catch(error){setStatus(errorText(error))}finally{setBusy(false)}
  }
  if(!db)return <><p>O formulário de interesse está em configuração. Acompanhe os avisos do Studio no Instagram.</p><a className="text-link" href={coursePost} target="_blank" rel="noreferrer">Ver cursos no Instagram</a></>
  return <form className="stack" onSubmit={submit}>
    <label className="field">Nome completo<input required maxLength={120} name="name" defaultValue={profile?.name}/></label>
    <label className="field">WhatsApp<input required type="tel" name="phone" maxLength={24} defaultValue={profile?.phone}/></label>
    <label className="field">E-mail<input required type="email" name="email" defaultValue={session?.user.email}/></label>
    <label className="check"><input required name="consent" type="checkbox"/> Autorizo o Studio a me contatar sobre cursos.</label>
    <Action type="submit" disabled={busy||sent}>{busy?'Enviando…':'Registrar interesse'}</Action><Notice message={status} success={sent}/>
  </form>
}
export function Courses() {
  const {courses}=useStudio()
  const [interest,setInterest]=useState(false)
  return <div className="wrap page"><section className="course-intro"><div><Intro label="CURSOS VIP" title="Aprenda com Karyna Santos" description="Conhecimento, técnica e experiência compartilhados com quem deseja crescer na área da beleza."/>
    <Action onClick={()=>setInterest(true)}>Avise-me sobre novas turmas</Action><a className="text-link" href={coursePost} target="_blank" rel="noreferrer"><Instagram size={17}/> Cursos no Instagram <ArrowUpRight size={14}/></a></div>
    <img src={media('courses.webp')} alt="Retrato de Karyna Santos com instrumentos de design"/></section>
    <section className="section"><h2>Cursos disponíveis</h2>{courses.length?<div className="editorial-grid">{courses.map(course=><article className="service-card" key={course.id}>{course.photo&&<img src={course.photo} alt="" loading="lazy"/>}<h3>{course.name}</h3><p>{course.description}</p><TextLink to={'/cursos/'+course.id}>Conhecer o curso</TextLink></article>)}</div>:<Empty title="Aguardando novas turmas">Registre seu interesse para receber as próximas datas quando o Studio abrir inscrições.</Empty>}</section>
    {interest&&<Dialog title="Avisos de novas turmas" onClose={()=>setInterest(false)}><Interest/></Dialog>}</div>
}
export function CourseDetail() {
  const {id}=useParams()
  const {courses}=useStudio()
  const course=courses.find(c=>c.id===id)
  const [cohorts,setCohorts]=useState<Cohort[]>([])
  const [interest,setInterest]=useState<string|null>(null)
  useEffect(()=>{if(db&&id)void db.from('cohorts').select().eq('course_id',id).gte('ends_at',new Date().toISOString()).in('status',['open','closed']).order('starts_at').then(({data})=>setCohorts(data||[]))},[id])
  if(!course)return <div className="wrap page"><Empty title="Curso indisponível"><TextLink to="/cursos">Ver cursos</TextLink></Empty></div>
  return <div className="wrap page"><Intro label="FORMAÇÃO PROFISSIONAL" title={course.name} description={course.description}/><div className="detail-grid">
    <div>{course.photo&&<img src={course.photo} alt="" className="detail-photo"/>}
      <div className="metadata"><GraduationCap size={21}/>{[course.workload,course.modality,course.location,course.price_cents!==null?currency(course.price_cents):''].filter(Boolean).join(' · ')}</div>
      <Action onClick={()=>setInterest('general')}>Tenho interesse neste curso</Action></div>
    <div>{[['Conteúdo programático',course.syllabus],['Materiais',course.materials],['Certificado',course.certificate]].filter(([,value])=>value).map(([name,value])=><section className="detail-note" key={name}><h3>{name}</h3><p>{value}</p></section>)}</div></div>
    <section className="section"><h2>Próximas turmas</h2>{cohorts.length?cohorts.map(c=><div className="data-row" key={c.id}><span>{dayLabel(c.starts_at)} · {time(c.starts_at)} · até {c.seats} vagas</span>{c.status==='open'&&(!c.enrollment_until||new Date(c.enrollment_until).getTime()>Date.now())?<Action kind="outline" onClick={()=>setInterest(c.id)}>Pré-inscrição</Action>:<span>Inscrições encerradas</span>}</div>):<Empty title="Sem turmas abertas">Você pode registrar seu interesse neste curso.</Empty>}</section>
    {interest&&<Dialog title="Interesse no curso" onClose={()=>setInterest(null)}><Interest course={id} cohort={interest==='general'?undefined:interest}/></Dialog>}</div>
}
export function Legal({privacy=false}:{privacy?:boolean}) {
  const {settings}=useStudio()
  return <div className="wrap page narrow"><Intro label="STUDIO KARYNA SANTOS" title={privacy?'Política de privacidade':'Termos de uso'}/><p className="preserve">{(privacy?settings.privacy:settings.terms)||'O texto oficial será publicado pelo Studio.'}</p></div>
}
