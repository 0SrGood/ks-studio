export const media = (file: string) => import.meta.env.BASE_URL + 'media/' + file
export const icon = (file: string) => import.meta.env.BASE_URL + 'icons/' + file
export const instagram = 'https://www.instagram.com/studiokarynasantos_/'
export const coursePost = 'https://www.instagram.com/p/Dd4jr0uGA7D/'
export const address = 'Rua João Joaquim, 39 · João Câmara, RN'
export const maps = 'https://www.google.com/maps/search/?api=1&query=Studio+Karyna+Santos+Rua+João+Joaquim+39+João+Câmara+RN'
export const timezone = 'America/Fortaleza'
export const currency = (cents: number) => new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(cents / 100)
export const localDay = (date = new Date()) => new Intl.DateTimeFormat('sv-SE', {timeZone: timezone}).format(date)
export const addDays = (date: string, days: number) => {
  const d = new Date(date + 'T12:00:00-03:00')
  d.setUTCDate(d.getUTCDate() + days)
  return localDay(d)
}
export const time = (value: string) => new Intl.DateTimeFormat('pt-BR', {timeZone:timezone, hour:'2-digit', minute:'2-digit'}).format(new Date(value))
export const dayLabel = (value: string) => new Intl.DateTimeFormat('pt-BR', {timeZone:timezone, day:'numeric', month:'long', year:'numeric'}).format(new Date(value.length === 10 ? value + 'T12:00:00-03:00' : value))
export const appointmentStatus: Record<string,string> = {
  held:'Reserva provisória', review:'Em análise', confirmed:'Confirmado', completed:'Concluído', cancelled:'Cancelado', no_show:'Falta', expired:'Prazo encerrado',
}
export const paymentStatus: Record<string,string> = {
  waiting:'Aguardando comprovante', received:'Comprovante recebido', processing:'Em análise', bank_review:'Aguardando conferência bancária', manual_review:'Revisão necessária', paid:'Pagamento confirmado', rejected:'Não confirmado', onsite_pending:'Pagamento presencial pendente', expired:'Prazo encerrado',
}
export type Service = { id:string; name:string; category:string; description:string; price_cents:number; duration:number; buffer:number; photo:string|null; active:boolean; position:number; pix:boolean; onsite:boolean; preparation:string; aftercare:string; restrictions:string; return_days:number|null; return_rules:string; payment_conditions:string }
export type StudioSettings = { headline:string; bio:string; address:string; hours_text:string; contact_validated:boolean; whatsapp:string; google_url:string; cancellation_hours:number; reschedule_hours:number; booking_days:number; min_notice:number; hold_review_hours:number; terms:string; privacy:string; referral_benefit:string }
export const defaults: StudioSettings = {
  headline:'Beleza que valoriza sua essência.',
  bio:'Há quase 12 anos, transformo minha paixão pela beleza em cuidado. Sou especialista em sobrancelhas e trabalho com design, técnicas sombreadas, fio a fio e micropigmentação labial. Cada atendimento é pensado para valorizar o que torna você única.',
  address, hours_text:'Atendimento com hora marcada.', contact_validated:false, whatsapp:'', google_url:'', cancellation_hours:24, reschedule_hours:24, booking_days:60, min_notice:120, hold_review_hours:24, terms:'',privacy:'',referral_benefit:'',
}
export type Course = { id:string; name:string; description:string; syllabus:string; workload:string; modality:string; location:string; price_cents:number|null; materials:string; certificate:string; photo:string|null; published:boolean }
export type Cohort = { id:string; course_id:string; starts_at:string; ends_at:string; seats:number; status:string; enrollment_until:string|null; blocks_agenda:boolean }
export type Publication = { id:string; title:string; body:string; image:string|null; starts_at:string; ends_at:string|null; published:boolean }
export type Work = {id:string; title:string; category:string; description:string; before_url:string|null; after_url:string|null; video_url?:string|null; instagram_url:string|null; service_id:string|null; approved:boolean; position:number}
export const localWorks:Work[] = import.meta.env.DEV ? [
  { id:'design', title:'Sobrancelhas em detalhe', category:'Sobrancelhas', description:'Registro de antes e depois fornecido pelo Studio.', before_url:media('gallery-design-before.webp'),after_url:media('gallery-design-after.webp'), instagram_url:null,service_id:null,approved:false,position:0 },
  { id:'brows', title:'Definição de sobrancelhas', category:'Sobrancelhas', description:'Registro de antes e depois fornecido pelo Studio.',before_url:media('gallery-brows-before.webp'),after_url:media('gallery-brows-after.webp'), instagram_url:null,service_id:null,approved:false,position:1 },
  { id:'lips', title:'Lábios em detalhe', category:'Lábios', description:'Registro de antes e depois fornecido pelo Studio.',before_url:media('gallery-lips-before.webp'),after_url:media('gallery-lips-after.webp'), instagram_url:null,service_id:null,approved:false,position:2 },
] : []
export type Profile = { id:string; name:string; phone:string; avatar:string|null; service_alerts:boolean; marketing:boolean; deletion_requested_at:string|null; referral_code:string }
export type Booking = { id:string; customer_id:string; service_id:string; service_name:string; starts_at:string; ends_at:string; duration:number; amount_cents:number; status:string; method:'pix'|'onsite'; payment_state:string; shared_notes:string; hold_until:string|null; paid_at:string|null }
export type PixSession = { booking_id:string; server_now:string; expires_at:string; receiver:string; institution:string; instructions:string; payload:string|null; amount_cents:number; payment_state:string }
export type Slot = { starts_at:string; day:string }
export const errorText = (error:unknown) => error instanceof Error ? error.message : 'Não foi possível completar esta operação.'

