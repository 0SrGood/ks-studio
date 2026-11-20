import { ArrowUpRight, Camera } from 'lucide-react'
import { Action, Intro, TextLink } from './ui'
import { instagram, media } from './data'
import { useStudio } from './studio'

export default function About() {
  const {settings}=useStudio()
  return <article className="wrap page about-page">
    <section className="course-intro">
      <div><Intro label="A PROFISSIONAL" title="Conheça Karyna Santos" description="Designer de sobrancelhas, micropigmentadora e instrutora em João Câmara, RN."/>
        <div className="inline-actions"><Action to="/portfolio">Conhecer meu trabalho</Action><TextLink to="/agendar">Agendar um horário</TextLink></div>
      </div>
      <img src={media('hero.webp')} alt="Retrato de Karyna Santos com o uniforme do Studio"/>
    </section>
    <section className="section about-story">
      <span className="eyebrow">MINHA TRAJETÓRIA</span><h2>O cuidado por trás de cada detalhe.</h2>
      <p className="preserve">{settings.bio}</p>
      <p>No Studio, trabalho com design personalizado de sobrancelhas, Flow Design, henna, Flow Brows e micropigmentação labial. Também ministro cursos VIP para quem quer desenvolver a técnica e construir sua própria trajetória na área da beleza.</p>
      <div className="inline-actions"><Action to="/cursos" kind="outline">Conhecer os cursos</Action><a className="text-link" href={instagram} target="_blank" rel="noreferrer"><Camera size={16}/> Acompanhe no Instagram <ArrowUpRight size={15}/></a></div>
    </section>
  </article>
}

