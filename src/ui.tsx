import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { media } from './data'

export function Brand({full=false}:{full?:boolean}) {
  return full ? <img className="brand-full" src={media('logo.webp')} alt="Karyna Santos Micropigmentadora"/> :
  <span className="brand"><img className="brand-mark" src={media('monogram.webp')} width="44" height="40" alt=""/><img className="brand-wordmark" src={media('brand-wordmark.webp')} width="500" height="81" alt="Karyna Santos Micropigmentadora"/></span>
}

export function NextArtwork({className=''}:{className?:string}) {
  return <img className={'next-art '+className} src={media('button-chevron.png')} alt="" width="42" height="42"/>
}

export function DirectionButton({label,previous=false,...props}:ButtonHTMLAttributes<HTMLButtonElement> & {label:string;previous?:boolean}) {
  return <button type="button" className="small-control direction-control" aria-label={label} {...props}>
    <NextArtwork className={previous?'next-art--reverse':''}/>
  </button>
}

export function Action({to,href,children,kind='ornate',className='',...props}:ButtonHTMLAttributes<HTMLButtonElement> & {to?:string;href?:string;children:ReactNode;kind?:'ornate'|'outline'|'quiet'}) {
  const cls = 'action action--' + kind + ' ' + className
  const body = <><span className="action-decoration" aria-hidden="true"/><span className="action-label">{children}</span></>
  return href ? <a href={href} className={cls}>{body}</a> : to ? <Link to={to} className={cls}>{body}</Link> : <button type="button" {...props} className={cls}>{body}</button>
}

export function TextLink({to,children}:{to:string;children:ReactNode}) {
  return <Link className="text-link" to={to}>{children}<ChevronRight size={16} aria-hidden="true"/></Link>
}

export function Intro({label,title,description}:{label:string;title:string;description?:string}) {
  return <header className="intro"><span className="eyebrow">{label}</span><h1>{title}</h1>{description&&<p>{description}</p>}</header>
}

export function Empty({title,children}:{title:string;children?:ReactNode}) {
  return <div className="empty"><h3>{title}</h3>{children&&<div>{children}</div>}</div>
}

export function Dialog({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null)
  useEffect(()=>{const dialog=ref.current;dialog?.showModal();return()=>dialog?.close()},[])
  return <dialog ref={ref} aria-label={title} onCancel={event=>{event.preventDefault();onClose()}} onClick={event=>{if(event.target===event.currentTarget)onClose()}}>
    <div className="dialog-content"><button className="dismiss" type="button" onClick={onClose} aria-label="Fechar">×</button><h2>{title}</h2>{children}</div>
  </dialog>
}

export const Notice=({message,success=false}:{message:string;success?:boolean})=> message ? <p role={success?'status':'alert'} className={'notice '+(success?'success':'')}>{message}</p> : null

