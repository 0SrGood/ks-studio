import React, {useEffect} from 'react'
import {createRoot} from 'react-dom/client'
import {HashRouter,Link,NavLink,Route,Routes,useLocation} from 'react-router-dom'
import {Camera,MapPin} from 'lucide-react'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/cormorant-garamond'
import '@fontsource-variable/cormorant-garamond/wght-italic.css'
import './styles.css'
import './workflows.css'
import { HomePage, Portfolio, Courses, CourseDetail, Legal } from './public'
import About from './about'
import { Brand } from './ui'
import { StudioProvider,useStudio } from './studio'
import { instagram,maps } from './data'

const appURL=new URL(import.meta.env.BASE_URL,location.href).href
function Presentation(){
  const {settings}=useStudio()
  const {pathname}=useLocation()
  useEffect(()=>{window.scrollTo(0,0)},[pathname])
  return <div className="presentation-site">
    <header className="top"><div className="top-inner">
      <Link to="/" className="home-brand" aria-label="Apresentação do Studio"><Brand/></Link>
      <nav className="desktop-nav" aria-label="Apresentação do Studio"><NavLink to="/" end>Apresentação</NavLink><NavLink to="/sobre">Sobre a Karyna</NavLink><NavLink to="/portfolio">Portfólio</NavLink><NavLink to="/cursos">Cursos</NavLink></nav>
      <a className="action action--outline header-book" href={appURL+'#/agendar'}>Agendar</a>
    </div></header>
    <main><Routes>
      <Route path="/" element={<HomePage/>}/><Route path="/sobre" element={<About/>}/>
      <Route path="/portfolio" element={<Portfolio/>}/><Route path="/cursos" element={<Courses/>}/><Route path="/cursos/:id" element={<CourseDetail/>}/>
      <Route path="/privacidade" element={<Legal privacy/>}/><Route path="/termos" element={<Legal/>}/>
      <Route path="*" element={<HomePage/>}/>
    </Routes></main>
    <footer><div className="wrap footer-grid"><div><Brand full/></div><section><h2>Visite o Studio</h2>
      <a href={maps} target="_blank" rel="noreferrer"><MapPin size={17}/>{settings.address}</a><p>{settings.hours_text}</p>
      {settings.contact_validated&&settings.whatsapp&&<a href={'https://wa.me/'+settings.whatsapp} target="_blank" rel="noreferrer">WhatsApp</a>}
    </section><section><h2>Encontre a Karyna</h2><a href={instagram} target="_blank" rel="noreferrer"><Camera size={17}/>Instagram</a>
      <Link to="/sobre">Biografia</Link><Link to="/portfolio">Portfólio</Link><Link to="/cursos">Cursos</Link><a href={appURL+'#/'}>Abrir aplicativo</a></section></div>
      <div className="wrap footer-bottom"><span>© {new Date().getFullYear()} Studio Karyna Santos</span><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos de uso</Link></div></footer>
  </div>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><HashRouter><StudioProvider><Presentation/></StudioProvider></HashRouter></React.StrictMode>)

