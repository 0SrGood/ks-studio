import { lazy, Suspense, useEffect } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, CalendarDays, House, Settings2, Sparkles, UserRound } from 'lucide-react'
import { Catalog, Procedure, Courses, CourseDetail, Legal } from './public'
import { Action, Brand } from './ui'
import { useStudio } from './studio'
import { AppHome } from './app-home'
import './app-shell.css'

const Booking = lazy(()=>import('./booking'))
const Account = lazy(()=>import('./account'))
const Admin = lazy(()=>import('./admin'))
const studioURL = new URL('studio.html',new URL(import.meta.env.BASE_URL,location.href))

const tabs = [
  ['/', 'Início', House],
  ['/agendar','Agendar', CalendarDays],
  ['/procedimentos','Procedimentos', Sparkles],
  ['/minha-jornada','Histórico', BookOpen],
  ['/perfil','Perfil', UserRound],
] as const

function StudioRedirect({path=''}:{path?:string}) {
  const target=studioURL.href+'#/'+path
  useEffect(()=>{window.location.replace(target)},[target])
  return <div className="wrap page"><a href={target}>Abrir apresentação do Studio</a></div>
}
export function App() {
  const {pathname} = useLocation()
  const {admin,authEvent} = useStudio()
  const navigate=useNavigate()
  const management=pathname.startsWith('/admin')
  useEffect(()=>{window.scrollTo(0,0)},[pathname])
  useEffect(()=>{
    if(['PASSWORD_RECOVERY','ADMIN_INVITE','INVITE_INVALID'].includes(authEvent)&&pathname!=='/perfil')navigate('/perfil',{replace:true})
  },[authEvent,navigate,pathname])
  useEffect(()=>{
    const referral=new URLSearchParams(location.hash.split('?')[1]).get('indicacao')
    if(referral&&/^[a-f0-9]{32}$/.test(referral))localStorage.setItem('studio-referral',referral)
  },[])
  return <div className={'app-shell'+(management?' is-management':'')}>
    <a className="skip" href="#main" onClick={event=>{event.preventDefault();document.getElementById('main')?.focus()}}>Pular para o conteúdo</a>
    <header className="top app-top"><div className="top-inner">
      <Link to="/" className="home-brand" aria-label="Studio Karyna Santos, início"><Brand/></Link>
      {!management&&<nav className="desktop-nav" aria-label="Navegação do aplicativo">
        <NavLink end to="/">Início</NavLink><NavLink to="/agendar">Agendar</NavLink><NavLink to="/procedimentos">Procedimentos</NavLink><NavLink to="/minha-jornada">Histórico</NavLink>
      </nav>}
      <div className="header-actions">
        {!management&&<Link to="/perfil" className="app-header-link"><UserRound size={18}/><span>Perfil</span></Link>}
        {management?<Link className="app-header-link" to="/">Voltar ao app</Link>:<Link aria-label="Administração" title="Administração" className="app-header-link" to="/admin"><Settings2 size={18}/>{admin&&<span>Administração</span>}</Link>}
      </div>
    </div></header>
    <main id="main" tabIndex={-1}>
      <Suspense fallback={<p className="wrap loading" role="status">Carregando…</p>}>
        <Routes>
          <Route path="/" element={<AppHome/>}/>
          <Route path="/sobre" element={<StudioRedirect path="sobre"/>}/>
          <Route path="/portfolio" element={<StudioRedirect path="portfolio"/>}/>
          <Route path="/procedimentos" element={<Catalog/>}/><Route path="/procedimentos/:id" element={<Procedure/>}/>
          <Route path="/cursos" element={<Courses/>}/><Route path="/cursos/:id" element={<CourseDetail/>}/>
          <Route path="/agendar" element={<Booking/>}/><Route path="/pagamentos" element={<Booking/>}/>
          <Route path="/perfil" element={<Account/>}/><Route path="/minha-jornada" element={<Account journey/>}/>
          <Route path="/privacidade" element={<Legal privacy/>}/><Route path="/termos" element={<Legal/>}/>
          <Route path="/admin/*" element={<Admin/>}/>
          <Route path="*" element={<div className="wrap page"><h1>Página indisponível</h1><Action to="/">Voltar ao início</Action></div>}/>
        </Routes>
      </Suspense>
    </main>
    {!management&&<nav className="mobile-tabs" aria-label="Navegação do aplicativo">{tabs.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==='/'}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>}
  </div>
}

