import {database} from './studio'

export async function ensureVisitor(captchaToken?:string){
  const auth=database().auth
  const current=await auth.getSession()
  if(current.data.session)return current.data.session
  const {data,error}=await auth.signInAnonymously({options:{captchaToken}})
  if(error||!data.session)throw new Error('Não foi possível iniciar sua sessão de agendamento. Tente novamente.')
  return data.session
}
