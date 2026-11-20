import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Action, Dialog, Empty, Notice, TextLink } from './ui'
import { db, database, invoke, rpc, useStudio } from './studio'
import { appointmentStatus,addDays,currency,dayLabel,errorText,localDay,paymentStatus,time,type Booking } from './data'
import { dateRange,EditFields,f,getRows,intervalLabel,mediaFile,TableEditor,upsert,useRows,type Row,type Option } from './admin-fields'

const phoneLabel=(number:string)=>number?.replace(/^55(\d{2})(\d+)(\d{4})$/,'($1) $2-$3')
export function Clients() {
  const [params,setParams]=useSearchParams()
  const [query,setQuery]=useState('')
  const {rows,error}=useRows('profiles','name')
  const selected=rows.find(p=>p.id===params.get('cliente'))
  const q=query.toLocaleLowerCase('pt-BR').trim(),digits=q.replace(/\D/g,'')
  const matches=rows.filter(row=>row.name&&(!q||row.name.toLocaleLowerCase('pt-BR').includes(q)||(digits&&row.phone.includes(digits))))
  return <><label className="field filter">Buscar por nome ou WhatsApp<input type="search" value={query} onChange={event=>setQuery(event.target.value)}/></label>
    {matches.length?matches.map(p=><div key={p.id} className="data-row"><div><strong>{p.name}</strong><p>{phoneLabel(p.phone)}{p.deletion_requested_at&&' · Exclusão solicitada'}</p></div><Action kind="outline" onClick={()=>setParams({cliente:p.id})}>Ver cliente</Action></div>):<Empty title="Nenhuma cliente encontrada"/>}
    <Notice message={error}/>{selected&&<Dialog title={selected.name} onClose={()=>setParams({})}><ClientRecord customer={selected}/></Dialog>}</>
}
function ClientRecord({customer}:{customer:Row}) {
  const [bookings,setBookings]=useState<Booking[]>([]),[note,setNote]=useState(''),[error,setError]=useState(''),[awards,setAwards]=useState<Row[]>([])
  const {rows:badges}=useRows('badges','name')
  useEffect(()=>{if(db)void Promise.all([
    db.from('bookings').select().eq('customer_id',customer.id).order('starts_at',{ascending:false}),
    db.from('client_notes').select('note').eq('customer_id',customer.id).maybeSingle(),
    db.from('achievements').select().eq('customer_id',customer.id),
  ]).then(([b,n,a])=>{setBookings(b.data||[]);setNote(n.data?.note||'');setAwards(a.data||[]);setError(b.error?.message||n.error?.message||a.error?.message||'')})},[customer.id])
  const next=bookings.filter(b=>b.status==='confirmed'&&+new Date(b.starts_at)>Date.now()).at(-1)
  return <div className="stack"><p>{phoneLabel(customer.phone)} · {bookings.filter(b=>b.status==='completed').length} visita(s) concluída(s)</p>
    {next&&<p>Próximo atendimento · {dayLabel(next.starts_at)} às {time(next.starts_at)}</p>}
    {customer.deletion_requested_at&&<Notice message={'Exclusão solicitada em '+dayLabel(customer.deletion_requested_at)+'.'}/>}
    {bookings.map(b=><div className="data-row" key={b.id}><div><strong>{b.service_name}</strong><p>{dayLabel(b.starts_at)} · {appointmentStatus[b.status]} · {paymentStatus[b.payment_state]}</p></div><TextLink to={'/admin/pagamentos?reserva='+b.id}>Pagamento</TextLink></div>)}
    <h3>Observações internas</h3><EditFields key={note} initial={{note}} fields={[f('note','Observações','textarea')]} submit={async value=>{await upsert('client_notes',{customer_id:customer.id,note:value.note});setNote(value.note)}} always/>
    <h3>Selos</h3><p>{awards.map(a=>badges.find(b=>b.id===a.badge_id)?.name).filter(Boolean).join(' · ')||'Nenhum selo concedido.'}</p>
    <EditFields label="Conceder selo" fields={[f('badge','Selo','select',{required:true,options:badges.map(b=>[b.id,b.name])})]} submit={async value=>{await rpc('grant_badge',{p_customer:customer.id,p_badge:value.badge});setAwards(await getAwards(customer.id))}}/>
    {bookings.filter(b=>b.status==='completed').length>0&&<><h3>Fotografias privadas</h3><PrivatePhoto customer={customer.id} bookings={bookings.filter(b=>b.status==='completed')}/></>}
    <Notice message={error}/></div>
}
async function getAwards(id:string) {const {data,error}=await database().from('achievements').select().eq('customer_id',id);if(error)throw error;return data||[]}
function PrivatePhoto({customer,bookings}:{customer:string;bookings:Booking[]}) {
  const [notice,setNotice]=useState(''),[success,setSuccess]=useState(false),[busy,setBusy]=useState(false)
  return <form className="stack" onSubmit={async event=>{
    event.preventDefault();setBusy(true);setSuccess(false);setNotice('')
    const fields=new FormData(event.currentTarget)
    const paths:string[]=[]
    try {
      const before=fields.get('before'),after=fields.get('after')
      if(!(after instanceof File)||!after.size)throw new Error('Informe a foto de depois.')
      let beforePath=null
      if(before instanceof File&&before.size){beforePath=(await mediaFile(before,'journey',customer+'/')).path;paths.push(beforePath)}
      const afterPath=(await mediaFile(after,'journey',customer+'/')).path;paths.push(afterPath)
      const consent=await upsert('image_consents',{booking_id:fields.get('booking'),scope:'private',reference:fields.get('reference')})
      await upsert('journey_photos',{booking_id:fields.get('booking'),customer_id:customer,before_path:beforePath,after_path:afterPath,consent_id:consent.id})
      setNotice('Fotos vinculadas à jornada privada.');setSuccess(true)
    }catch(error){if(paths.length)await database().storage.from('journey').remove(paths);setNotice(errorText(error))}finally{setBusy(false)}
  }}>
    <label className="field">Atendimento<select name="booking" required>{bookings.map(b=><option key={b.id} value={b.id}>{b.service_name} · {dayLabel(b.starts_at)}</option>)}</select></label>
    <label className="field">Referência da autorização<input name="reference" required minLength={3}/></label>
    <label className="field">Antes<input name="before" type="file" accept=".jpg,.jpeg,.png,.webp"/></label>
    <label className="field">Depois<input name="after" type="file" accept=".jpg,.jpeg,.png,.webp" required/></label>
    <Action type="submit" disabled={busy}>Salvar fotos privadas</Action><Notice message={notice} success={success}/>
  </form>
}
export function Finance() {
  const [params,setParams]=useSearchParams(),[day,setDay]=useState(''),[state,setState]=useState(''),[service,setService]=useState(''),[bookings,setBookings]=useState<Booking[]>([]),[error,setError]=useState('')
  const {rows:profiles}=useRows('profiles','name'),{rows:services}=useRows('services','name')
  const selected=bookings.find(b=>b.id===params.get('reserva'))
  async function load() {
    try{
      let query=database().from('bookings').select().order('starts_at',{ascending:false}).limit(500)
      if(day){const [start,end]=dateRange(day,addDays(day,1));query=query.gte('starts_at',start).lt('starts_at',end)}
      if(service)query=query.eq('service_id',service)
      if(state)query=query.eq('payment_state',state)
      if(params.get('reserva'))query=query.eq('id',params.get('reserva')!)
      const {data,error}=await query
      if(error)throw error
      setBookings(data||[]);setError('')
    }catch(error){setError(errorText(error))}
  }
  useEffect(()=>{void load()},[day,state,service,params.get('reserva')])
  const received=bookings.filter(b=>b.payment_state==='paid').reduce((sum,b)=>sum+b.amount_cents,0)
  const invoiced=bookings.filter(b=>['confirmed','completed','no_show'].includes(b.status)||b.payment_state==='paid').reduce((sum,b)=>sum+b.amount_cents,0)
  return <><div className="form-grid finance-filter"><label className="field">Data do atendimento<input type="date" value={day} onChange={e=>setDay(e.target.value)}/></label>
  <label className="field">Situação<select value={state} onChange={e=>setState(e.target.value)}><option value="">Todas</option>{Object.entries(paymentStatus).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
  <label className="field">Procedimento<select value={service} onChange={e=>setService(e.target.value)}><option value="">Todos</option>{services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
  <dl className="metrics"><div><dt>Valor dos atendimentos firmes</dt><dd>{currency(invoiced)}</dd></div><div><dt>Recebimento confirmado</dt><dd>{currency(received)}</dd></div></dl>
  {bookings.length?bookings.map(b=><div className="data-row" key={b.id}><div><strong>{profiles.find(p=>p.id===b.customer_id)?.name||'Cliente'} · {b.service_name}</strong><p>{dayLabel(b.starts_at)} · {currency(b.amount_cents)} · {paymentStatus[b.payment_state]}</p></div><Action kind="outline" onClick={()=>setParams({reserva:b.id})}>Revisar</Action></div>):<Empty title="Sem pagamentos para os filtros"/>}
  <Notice message={error}/>
  {selected&&<Dialog title="Conferência de pagamento" onClose={()=>setParams({})}><Review booking={selected} person={profiles.find(p=>p.id===selected.customer_id)} reload={load}/></Dialog>}</>
}
function Review({booking,person,reload}:{booking:Booking;person?:Row;reload:()=>Promise<void>}) {
  const [receipts,setReceipts]=useState<Row[]>([]),[audit,setAudit]=useState<Row[]>([]),[pixSession,setPixSession]=useState<Row|null>(null),[error,setError]=useState('')
  function read() {
    const client=db;if(!client)return
    void Promise.all([client.from('receipts').select().eq('booking_id',booking.id).order('uploaded_at',{ascending:false}),client.from('audit').select().eq('record_id',booking.id).order('created_at',{ascending:false}),
      booking.method==='pix'?rpc<Row>('admin_pix_session',{p_booking:booking.id}).catch(()=>null):Promise.resolve(null)]).then(([d,a,s])=>{
      setReceipts(d.data||[]);setAudit(a.data||[]);setPixSession(s);setError(d.error?.message||a.error?.message||'')
    })
  }
  useEffect(read,[booking.id,booking.payment_state])
  return <div className="stack"><p>{person?.name} · {booking.service_name} · {currency(booking.amount_cents)}</p>
    <p>{dayLabel(booking.starts_at)} · {time(booking.starts_at)} · {paymentStatus[booking.payment_state]}</p>
    {pixSession&&<p>Sessão Pix · {dayLabel(pixSession.opened_at)} · {time(pixSession.opened_at)} até {time(pixSession.expires_at)}</p>}
    {receipts.map(r=><section className="detail-note" key={r.id}><strong>Documento recebido · {time(r.uploaded_at)}</strong>
      <p>{paymentStatus[r.state]||'Conferência registrada'}</p>
      {r.object_path&&<Action kind="outline" onClick={async()=>{const child=window.open('about:blank','_blank');if(child)child.opener=null
        const result=await database().storage.from('receipts').createSignedUrl(r.object_path,60,{download:true})
        if(result.data&&child)child.location.href=result.data.signedUrl;else {child?.close();setError(result.error?.message||'Permita a abertura de janelas para acessar o documento.')}
      }}>Baixar comprovante privado</Action>}{r.extracted&&<details><summary>Resultado da triagem</summary><pre className="receipt-json">{JSON.stringify(r.extracted,null,2)}</pre></details>}</section>)}
    {booking.payment_state!=='paid'&&<EditFields label="Registrar decisão" fields={[
      f('action','Decisão','select',{required:true,options:booking.method==='pix'?[['confirm','Confirmar crédito bancário'],['review','Encaminhar à revisão'],['request','Solicitar reenvio'],['reject','Não confirmar']]:[['confirm','Registrar valor recebido presencialmente']]}),
      f('checked','Conferi o recebimento','checkbox'),f('note','Justificativa interna','textarea',{required:true}),
    ]} submit={async result=>{await rpc('financial_decision',{p_booking:booking.id,p_action:result.action,p_note:result.note,p_bank_checked:result.checked});await reload();read()}}/>}
    <details><summary>Histórico de decisões</summary>{audit.map(row=><div className="detail-note" key={row.id}><strong>{dayLabel(row.created_at)} · {time(row.created_at)}</strong><p>{auditLabel(row.action)}{row.note?' · '+row.note:''}</p></div>)}</details><Notice message={error}/>
  </div>
}
const auditLabel=(value:string)=>({payment_confirm:'Recebimento registrado',payment_review:'Encaminhado à revisão',payment_request:'Reenvio solicitado',payment_reject:'Recebimento indefinido',receipt_received:'Comprovante recebido',receipt_screened:'Triagem concluída',booking_created:'Reserva criada',reservation_expired:'Prazo de reserva encerrado'} as Record<string,string>)[value]||'Alteração registrada'

export function Services() {
  const {refresh}=useStudio()
  const {rows:categories,reload}=useRows('categories','name')
  return <><TableEditor table="categories" sort="name" pk="name" title="Categorias" create="Nova categoria" fields={[f('name','Nome','text',{required:true})]} onSaved={reload}/>
    <TableEditor table="services" sort="position" title="Procedimentos" create="Novo procedimento" fields={[
      f('name','Nome','text',{required:true}),f('category','Categoria','select',{options:categories.map(c=>[c.name,c.name]),required:true}),
      f('description','Descrição','textarea'),f('price_cents','Valor em centavos','number',{required:true,min:1}),f('duration','Duração em minutos','number',{required:true,min:5,max:720}),
      f('buffer','Pausa após atendimento (minutos)','number',{value:0,min:0,max:180}),f('photo','Fotografia','photo'),
      f('preparation','Preparação','textarea'),f('aftercare','Cuidados posteriores','textarea'),f('restrictions','Observações e contraindicações','textarea'),
      f('return_rules','Regras de retorno','textarea'),f('return_days','Lembrete de retorno em dias','number',{min:1,nullable:true}),f('payment_conditions','Condições de pagamento','textarea'),
      f('position','Ordem no catálogo','number',{value:0}),f('active','Publicar no catálogo','checkbox'),f('onsite','Aceitar pagamento presencial','checkbox',{value:true}),f('pix','Aceitar Pix','checkbox'),
    ]} render={r=><><strong>{r.name}</strong><p>{currency(r.price_cents)} · {r.duration} min · {r.active?'Publicado':'Oculto'}</p></>} onSaved={()=>void refresh()}/></>
}
export function PortfolioEditor() {
  const {refresh}=useStudio(),{rows:services}=useRows('services','name')
  const {rows,reload}=useRows('portfolio','position')
  const [current,setCurrent]=useState<Row|null>(null),[error,setError]=useState('')
  async function save(values:Row) {
    const {reference,publish,...work}=values
    await rpc('save_work',{p_id:current?.id||null,p_work:work,p_reference:reference,p_publish:publish})
    const replaced=['before_url','after_url','video_url'].flatMap(key=>current?.[key]&&current[key]!==work[key]?[current[key]]:[])
    if(replaced.length)await database().storage.from('portfolio-media').remove(replaced)
    setCurrent(null);reload();await refresh()
  }
  return <section className="admin-section"><header className="section-title"><h2>Galeria de resultados</h2><Action onClick={()=>setCurrent({})}>Adicionar trabalho</Action></header>
    <p>Envie imagens e vídeos com autorização para publicação. Informe o procedimento somente depois de confirmar a técnica.</p>
    {rows.length?rows.map(row=><div className="data-row" key={row.id}><div><strong>{row.title}</strong><p>{row.category} · {row.approved?'Publicado':'Oculto'}</p></div><div className="inline-actions"><Action kind="outline" onClick={async()=>{try{const result=await database().from('image_consents').select('id,reference').eq('work_id',row.id).maybeSingle();if(result.error)throw result.error;setCurrent({...row,publish:row.approved,reference:result.data?.reference,consent_id:result.data?.id})}catch(error){setError(errorText(error))}}}>Editar</Action>
    {row.approved&&<Action kind="quiet" onClick={async()=>{try{await rpc('withdraw_work',{p_id:row.id});reload();await refresh()}catch(error){setError(errorText(error))}}}>Retirar publicação</Action>}</div></div>):<Empty title="Nenhum resultado publicado"/>}
    {current&&<Dialog title={current.id?'Editar resultado':'Adicionar resultado'} onClose={()=>setCurrent(null)}><EditFields initial={current} bucket="portfolio-media" fields={[
      f('title','Título','text',{required:true}),f('category','Categoria','text',{required:true}),f('description','Descrição','textarea'),f('service_id','Procedimento confirmado','select',{nullable:true,options:services.map(s=>[s.id,s.name])}),
      f('before_url','Foto de antes','photo'),f('after_url','Foto de depois','photo'),f('video_url','Vídeo','video'),f('instagram_url','Link da publicação original','text',{nullable:true}),
      f('position','Ordem','number',{value:0}),f('reference','Referência da autorização de publicação'),f('publish','Publicar conteúdo autorizado','checkbox'),
    ]} submit={save}/></Dialog>}<Notice message={error}/></section>
}
export function CourseEditor() {
  const {refresh}=useStudio(),{rows:courses,reload}=useRows('courses','name'),{rows:interests,reload:reloadInterests}=useRows('interests','created_at')
  const [selected,setSelected]=useState<Row|null>(null)
  return <><TableEditor table="courses" title="Cursos" create="Novo curso" sort="name" onSaved={()=>{reload();void refresh()}} fields={[
    f('name','Nome','text',{required:true}),f('description','Descrição','textarea'),f('syllabus','Conteúdo programático','textarea'),
    f('workload','Carga horária'),f('modality','Modalidade'),f('location','Local'),f('price_cents','Preço em centavos','number',{min:0,nullable:true}),
    f('materials','Materiais','textarea'),f('certificate','Certificado'),f('photo','Foto','photo'),f('published','Publicar','checkbox'),
  ]}/>
  <TableEditor table="cohorts" title="Turmas" create="Nova turma" sort="starts_at" fields={[
    f('course_id','Curso','select',{required:true,options:courses.map(c=>[c.id,c.name])}),
    f('starts_at','Início','datetime-local',{required:true}),f('ends_at','Fim','datetime-local',{required:true}),f('enrollment_until','Inscrições até','datetime-local',{nullable:true}),
    f('seats','Vagas','number',{required:true,min:1}),f('status','Estado','select',{required:true,value:'draft',options:[['draft','Rascunho'],['open','Aberta'],['closed','Encerrada'],['cancelled','Cancelada']]}),f('blocks_agenda','Bloquear agenda do Studio','checkbox',{value:true}),
  ]} render={r=><><strong>{courses.find(c=>c.id===r.course_id)?.name||'Turma'}</strong><p>{intervalLabel(r)} · {r.seats} vagas · {({draft:'Rascunho',open:'Aberta',closed:'Encerrada',cancelled:'Cancelada'} as Row)[r.status]}</p></>}/>
  <section className="admin-section"><h2>Interessadas</h2>{interests.length?interests.map(i=><div className="data-row" key={i.id}><div><strong>{i.name} · {courses.find(c=>c.id===i.course_id)?.name||'Avisos de novas turmas'}</strong><p>{phoneLabel(i.phone)} · {i.email}</p><p>{interestLabels[i.status]}</p></div><Action kind="outline" onClick={()=>setSelected(i)}>Gerenciar</Action></div>):<Empty title="Nenhum interesse registrado"/>}
    {selected&&<Dialog title="Gerenciar interesse" onClose={()=>setSelected(null)}><EditFields fields={[f('status','Situação','select',{required:true,options:Object.entries(interestLabels)})]} initial={selected} submit={async values=>{await rpc('set_interest_status',{p_interest:selected.id,p_status:values.status});setSelected(null);reloadInterests()}}/></Dialog>}
  </section></>
}
const interestLabels:Record<string,string>={new:'Aguardando contato',contacted:'Contato realizado',enrolled:'Matrícula confirmada',declined:'Não inscrita'}
export function Campaigns() {const {refresh}=useStudio();return <TableEditor table="publications" title="Novidades e campanhas" create="Nova publicação" sort="starts_at" remove fields={[
  f('title','Título','text',{required:true}),f('body','Mensagem','textarea',{required:true}),f('image','Imagem','photo'),f('starts_at','Publicar a partir de','datetime-local',{required:true,value:new Date().toISOString()}),f('ends_at','Encerrar em','datetime-local',{nullable:true}),f('published','Ativar publicação','checkbox'),
]} onSaved={()=>void refresh()} render={r=><><strong>{r.title}</strong><p>{dayLabel(r.starts_at)} · {r.published?'Ativada':'Rascunho'}</p></>}/>}
export function Badges(){return <TableEditor table="badges" title="Selos Karyna" create="Novo selo" sort="threshold" fields={[
  f('name','Nome','text',{required:true}),f('threshold','Visitas necessárias','number',{min:1,nullable:true}),f('anniversary','Comemorar 1 ano da primeira visita','checkbox'),f('benefit','Benefício','textarea'),
]}/>}
export function Reports() {
  const [from,setFrom]=useState(localDay().slice(0,7)+'-01'),[to,setTo]=useState(localDay()),[data,setData]=useState<Row|null>(null),[error,setError]=useState('')
  useEffect(()=>{if(from&&to&&from<=to)void rpc<Row>('business_report',{p_from:from,p_to:to}).then(setData).catch(error=>setError(errorText(error)))},[from,to])
  const metrics=data?[
    ['Agendamentos',data.bookings],['Receita recebida',currency(data.received)],['Ocupação',data.occupancy===null?'Sem horário cadastrado':data.occupancy+'%'],['Clientes recorrentes',data.recurring],
    ['Cancelamentos',data.cancelled],['Faltas',data.missed],['Pagamentos pendentes',data.pending],['Interesses em cursos',data.interests],['Matrículas',data.enrolled],
  ]:[]
  function chart(label:string,items:Row[],display:(value:number)=>string) {
    const max=Math.max(1,...items.map(item=>item.value))
    return <section className="admin-section"><h3>{label}</h3>{items.length?items.map(item=><div className="report-bar" key={item.name}><span>{item.name}</span><meter min="0" max={max} value={item.value}/><strong>{display(item.value)}</strong></div>):<p>Sem dados neste período.</p>}</section>
  }
  return <><div className="form-grid"><label className="field">De<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label className="field">Até<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>
    {data&&<><dl className="metrics">{metrics.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    {chart('Procedimentos mais procurados',data.services,String)}{chart('Recebimentos por mês',data.monthly,currency)}{chart('Matrículas por turma',data.cohorts,String)}</>}
    <Notice message={error}/></>
}

export function Settings() {
  const {refresh}=useStudio()
  const [settings,setSettings]=useState<Row|null>(null),[pix,setPix]=useState<Row|null>(null),[error,setError]=useState(''),[test,setTest]=useState<{payload:string;qr:string}|null>(null)
  useEffect(()=>{void Promise.all([getRows('studio_settings'),getRows('pix_config')]).then(([s,p])=>{setSettings(s[0]);setPix(p[0])}).catch(error=>setError(errorText(error)))},[])
  return <><section className="admin-section"><h2>Perfil e políticas do Studio</h2>{settings&&<EditFields initial={settings} always fields={[
    f('headline','Frase de abertura','text',{required:true}),f('bio','Biografia','textarea',{required:true}),f('address','Endereço','text',{required:true}),f('hours_text','Informações sobre funcionamento'),
    f('whatsapp','WhatsApp com país e DDD (somente números)'),f('contact_validated','Confirmei o WhatsApp empresarial','checkbox'),f('google_url','Link do perfil no Google'),
    f('min_notice','Antecedência mínima em minutos','number',{min:10,required:true}),f('booking_days','Aceitar reservas até quantos dias à frente','number',{min:7,max:180,required:true}),
    f('cancellation_hours','Antecedência mínima para cancelar (h)','number',{min:0,required:true}),f('reschedule_hours','Antecedência mínima para reagendar (h)','number',{min:0,required:true}),
    f('hold_review_hours','Reserva provisória em revisão (h)','number',{min:1,max:168,required:true}),f('retention_days','Retenção de comprovantes decididos (dias)','number',{min:30,required:true}),
    f('privacy','Política de privacidade','textarea'),f('terms','Termos de uso','textarea'),f('referral_benefit','Benefício por indicação','textarea'),
  ]} submit={async values=>{await upsert('studio_settings',{id:true,...values});await refresh()}}/>}</section>
  <section className="admin-section"><h2>Pix do Studio</h2><p>Preencha os dados e gere uma prévia para conferir o recebedor antes de ativar o Pix nos procedimentos.</p>
  {pix&&<EditFields initial={pix} always label="Salvar configuração Pix" fields={[
    f('pix_key','Chave Pix (telefone com +55, CPF, CNPJ, e-mail ou chave aleatória)'),f('receiver','Nome do recebedor'),f('city','Cidade do recebedor'),f('institution','Instituição financeira'),f('instructions','Instruções','textarea'),f('enabled','Habilitar Pix','checkbox'),
  ]} submit={async values=>{await upsert('pix_config',{id:true,...values});setPix(values);setTest(null)}}/>}
  <Action kind="outline" onClick={async()=>{try{const {payload}=await invoke<{payload:string}>('pix',{test:true});const {default:qrCode}=await import('qrcode');setTest({payload,qr:await qrCode.toDataURL(payload,{width:240})});setError('')}catch(error){setError(errorText(error))}}}>Prévia do QR para conferência</Action>
  {test&&<div className="detail-note"><p>Prévia de R$ 0,01. Abra o leitor Pix do seu banco para conferir os dados e feche antes da confirmação.</p><img src={test.qr} width="240" height="240" alt="Prévia do QR Pix"/><label className="field">Pix copia e cola<input readOnly value={test.payload}/></label></div>}
  </section><Notice message={error}/></>
}

