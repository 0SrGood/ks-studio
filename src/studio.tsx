import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient, type Session } from '@supabase/supabase-js'
import { defaults, localWorks, type Profile, type StudioSettings, type Service, type Work, type Course, type Publication } from './data'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const db = url && key ? createClient(url, key, {auth:{flowType:'pkce'}}) : null

export function database() {
  if (!db) throw new Error('O serviço online ainda está em configuração.')
  return db
}

export async function rpc<T>(name:string,args:Record<string, unknown> = {}):Promise<T> {
  const {data,error} = await database().rpc(name,args)
  if (error) throw new Error(error.message)
  return data as T
}

export async function invoke<T>(name:string,body:Record<string,unknown>|FormData):Promise<T> {
  const {data,error} = await database().functions.invoke(name,{body})
  if (error) {
    const details = error.context instanceof Response ? await error.context.json().catch(() => null) : null
    throw new Error(details?.error ?? 'O servidor não conseguiu concluir a solicitação. Tente novamente.')
  }
  return data as T
}

const Studio = createContext<{
  session:Session|null; profile:Profile|null; admin:boolean; loading:boolean; settings:StudioSettings;
  services:Service[]; courses:Course[]; works:Work[]; news:Publication[]; refresh:()=>Promise<void>;
  publicError:string; authEvent:string; clearAuthEvent:()=>void;
}>({session:null,profile:null,admin:false,loading:true,settings:defaults,services:[],courses:[],works:localWorks,news:[],refresh:async()=>{},publicError:'',authEvent:'',clearAuthEvent:()=>{}})

export const useStudio = () => useContext(Studio)
export function StudioProvider({children}:{children:ReactNode}) {
  const [session,setSession] = useState<Session|null>(null)
  const [profile,setProfile] = useState<Profile|null>(null)
  const [admin,setAdmin] = useState(false)
  const [loading,setLoading] = useState(Boolean(db))
  const [settings,setSettings] = useState(defaults)
  const [services,setServices] = useState<Service[]>([])
  const [courses,setCourses] = useState<Course[]>([])
  const [works,setWorks] = useState<Work[]>(localWorks)
  const [news,setNews] = useState<Publication[]>([])
  const [publicError,setPublicError] = useState('')
  const [authEvent,setAuthEvent] = useState('')
  const userId = session?.user.id
  async function refreshPublic() {
    if (!db) return
    const [config,catalog,portfolio,classes,campaigns] = await Promise.all([
      db.from('studio_settings').select().eq('id',true).single(),
      db.from('services').select().eq('active',true).order('position'),
      db.from('portfolio').select('id,title,category,description,before_url,after_url,video_url,instagram_url,service_id,approved,position').eq('approved',true).order('position'),
      db.from('courses').select().eq('published',true).order('name'),
      db.from('publications').select().eq('published',true).lte('starts_at',new Date().toISOString()).or('ends_at.is.null,ends_at.gt.'+new Date().toISOString()).order('starts_at',{ascending:false}),
    ])
    setPublicError([config,catalog,portfolio,classes,campaigns].some(result=>result.error) ? 'Algumas informações estão temporariamente indisponíveis.' : '')
    if (config.data) setSettings({...defaults,...config.data})
    if (catalog.data) setServices(catalog.data)
    if (portfolio.data) {
      const source=(workId:string,variant:string)=>url.replace(/\/$/,'')+'/functions/v1/portfolio-media?work='+encodeURIComponent(workId)+'&type='+variant
      const works=portfolio.data.map(work=>({...work,before_url:work.before_url?source(work.id,'before'):null,
        after_url:work.after_url?source(work.id,'after'):null,video_url:work.video_url?source(work.id,'video'):null}))
      setWorks(works.length ? works : localWorks)
    }
    if (classes.data) setCourses(classes.data)
    if (campaigns.data) setNews(campaigns.data)
  }
  async function refreshProfile() {
    if (!db || !userId) return
    const [data,role] = await Promise.all([
      db.from('profiles').select().eq('id',userId).maybeSingle(),
      db.rpc('is_admin'),
    ])
    const current=await db.auth.getSession()
    if(current.data.session?.user.id!==userId)return
    setProfile(data.data)
    setAdmin(role.data === true && !current.data.session.user.is_anonymous)
  }
  async function refresh() { await Promise.all([refreshPublic(),refreshProfile()]) }
  useEffect(() => {
    if (!db) return
    const {data} = db.auth.onAuthStateChange((event,current) => {
      setSession(current)
      if (event === 'PASSWORD_RECOVERY') setAuthEvent(event)
    })
    void db.auth.getSession().catch(()=>setLoading(false))
    void refreshPublic()
    return () => data.subscription.unsubscribe()
  },[])
  useEffect(() => {
    setProfile(null)
    setAdmin(false)
    if (!userId) {setLoading(false);return}
    setLoading(true)
    void refreshProfile().finally(()=>setLoading(false))
  },[userId])
  return <Studio.Provider value={{session,profile,admin,loading,settings,services,courses,works,news,refresh,publicError,authEvent,clearAuthEvent:()=>setAuthEvent('')}}>{children}</Studio.Provider>
}
