import { useEffect, useRef, useState } from 'react'
import { LogOut, Settings2, ShieldCheck, X } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { errorText } from './data'
import { signOutAccount } from './session-actions'
import { useStudio } from './studio'
import { NextArtwork, Notice } from './ui'

export function MoreSheet({close}:{close:()=>void}) {
  const panel=useRef<HTMLDialogElement>(null)
  const {session,admin,loading}=useStudio()
  const navigate=useNavigate()
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const account=session?.user&&!session.user.is_anonymous ? session.user : null
  useEffect(()=>{
    const sheet=panel.current
    sheet?.showModal()
    return ()=>sheet?.close()
  },[])
  async function signOut() {
    if(!account||busy)return
    setBusy(true);setError('')
    try{
      await signOutAccount(account.id)
      close()
      navigate('/',{replace:true})
    }catch(error){setError(errorText(error))}finally{setBusy(false)}
  }
  return <dialog className="more-sheet" ref={panel} aria-labelledby="more-sheet-title"
    onCancel={event=>{event.preventDefault();close()}}
    onClick={event=>{if(event.target===event.currentTarget)close()}}>
    <div className="more-sheet-inner">
      <div className="sheet-handle" aria-hidden="true"/>
      <header className="sheet-heading"><h2 id="more-sheet-title">Mais</h2><button type="button" className="sheet-close" onClick={close} aria-label="Fechar menu" autoFocus><X size={21}/></button></header>
      <nav aria-label="Opções do aplicativo" className="sheet-options">
        <Link to="/perfil?secao=dados" className="sheet-option next-link" onClick={close}><Settings2 size={20} aria-hidden="true"/><span>Configurações</span><NextArtwork/></Link>
        {!loading&&(!account||admin)&&<Link to="/admin" className="sheet-option next-link" onClick={close}><ShieldCheck size={21} aria-hidden="true"/><span>Painel administrativo</span><NextArtwork/></Link>}
        {account&&<button type="button" className="sheet-option logout-option" disabled={busy} onClick={()=>void signOut()}><LogOut size={20} aria-hidden="true"/><span>{busy?'Saindo…':'Sair da conta'}</span></button>}
      </nav>
      <Notice message={error}/>
    </div>
  </dialog>
}
