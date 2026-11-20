import { lazy, Suspense, useEffect } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, Home, Camera as Instagram, MapPin, Sparkles, UserRound, BookOpen, Menu } from 'lucide-react'
import { HomePage, Catalog, Procedure, Portfolio, Courses, CourseDetail, Legal } from './public'
import { Action, Brand } from './ui'
import { useStudio } from './studio'
import { instagram, maps } from './data'
import About from './about'

const Booking = lazy(()=>import('./booking'))
const Account = lazy(()=>import('./account'))
const Admin = lazy(()=>import('./admin'))

const tabs = [
  ['/', 'Início', Home],
  ['/procedimentos','Procedimentos', Sparkles],
  ['/agendar','Agendar', CalendarDays],
  ['/minha-jornada','Minha Jornada', BookOpen],
  ['/perfil','Perfil', UserRound],
] as const
export function App() {
  const {pathname} = useLocation()
  const {session,admin,settings,authEvent} = useStudio()
  const navigate=useNavigate()
  const management=pathname.startsWith('/admin')
  useEffect(()=>{window.scrollTo(0,0)},[pathname])
  useEffect(()=>{if(authEvent==='PASSWORD_RECOVERY')navigate('/perfil',{replace:true})},[authEvent,navigate])
  useEffect(()=>{
    const referral=new URLSearchParams(location.hash.split('?')[1]).get('indicacao')
    if(referral&&/^[a-f0-9]{32}$/.test(referral))localStorage.setItem('studio-referral',referral)
  },[])
  return <>
    <a className="skip" href="#main" onClick={event=>{event.preventDefault();document.getElementById('main')?.focus()}}>Pular para o conteúdo</a>
    <header className="top"><div className="top-inner">
      <Link to="/" className="home-brand" aria-label="Studio Karyna Santos, início"><Brand/></Link>
      <nav className="desktop-nav" aria-label="Navegação principal">
        <NavLink end to="/">Início</NavLink><NavLink to="/sobre">Sobre</NavLink><NavLink to="/procedimentos">Procedimentos</NavLink><NavLink to="/portfolio">Portfólio</NavLink><NavLink to="/cursos">Cursos</NavLink>
      </nav>
      <div className="header-actions">
        {admin&&<Link className="header-account" to="/admin">Administração</Link>}
        <Link className="header-account" to="/perfil"><UserRound size={17}/>{session?'Meu perfil':'Entrar'}</Link>
        <Action className="header-book" to="/agendar" kind="outline">Agendar</Action>
        <details className="mobile-menu"><summary aria-label="Abrir menu"><Menu size={24}/></summary><nav>
          <Link to="/sobre" onClick={e=>e.currentTarget.closest('details')?.removeAttribute('open')}>Sobre a Karyna</Link>
          <Link to="/cursos" onClick={e=>e.currentTarget.closest('details')?.removeAttribute('open')}>Cursos</Link>
          <Link to="/portfolio" onClick={e=>e.currentTarget.closest('details')?.removeAttribute('open')}>Portfólio</Link>
          {admin&&<Link to="/admin" onClick={e=>e.currentTarget.closest('details')?.removeAttribute('open')}>Administração</Link>}
        </nav></details>
      </div>
    </div></header>
    <main id="main" tabIndex={-1}>
      <Suspense fallback={<p className="wrap loading" role="status">Carregando…</p>}>
        <Routes>
          <Route path="/" element={<HomePage/>}/>
          <Route path="/sobre" element={<About/>}/>
          <Route path="/procedimentos" element={<Catalog/>}/><Route path="/procedimentos/:id" element={<Procedure/>}/>
          <Route path="/portfolio" element={<Portfolio/>}/><Route path="/cursos" element={<Courses/>}/><Route path="/cursos/:id" element={<CourseDetail/>}/>
          <Route path="/agendar" element={<Booking/>}/><Route path="/pagamentos" element={<Booking/>}/>
          <Route path="/perfil" element={<Account/>}/><Route path="/minha-jornada" element={<Account journey/>}/>
          <Route path="/privacidade" element={<Legal privacy/>}/><Route path="/termos" element={<Legal/>}/>
          <Route path="/admin/*" element={<Admin/>}/>
          <Route path="*" element={<div className="wrap page"><h1>Página indisponível</h1><Action to="/">Voltar ao início</Action></div>}/>
        </Routes>
      </Suspense>
    </main>
    {!management&&<footer><div className="wrap footer-grid"><div><Brand full/></div><section><h2>Visite o Studio</h2>
      <a href={maps} target="_blank" rel="noreferrer"><MapPin size={17}/>{settings.address}</a><p>{settings.hours_text}</p>
    </section><section><h2>Encontre a Karyna</h2><a href={instagram} target="_blank" rel="noreferrer"><Instagram size={17}/>Instagram</a>
      {settings.contact_validated&&settings.whatsapp&&<a href={'https://wa.me/'+settings.whatsapp.replace(/\D/g,'')} target="_blank" rel="noreferrer">WhatsApp</a>}
      <Link to="/cursos">Cursos</Link></section></div>
      <div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Studio Karyna Santos</span><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos de uso</Link></div></footer>}
    {!management&&<nav className="mobile-tabs" aria-label="Atalhos">{tabs.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==='/'}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>}
  </>
}
