import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, ReceiptText, Wallet } from 'lucide-react'
import { currency, dayLabel, errorText, localDay } from './data'
import { rpc } from './studio'
import { Action, Dialog, Empty, Notice, TextLink } from './ui'

const categories = {
  materials:'Materiais',rent:'Aluguel',utilities:'Contas fixas',taxes:'Impostos',fees:'Taxas',marketing:'Divulgação',other:'Outras despesas',
}
type Expense={id:string;paid_on:string;description:string;category:keyof typeof categories;amount_cents:number;voided_at:string|null;void_reason:string|null}
type Receipt={id:string;paid_at:string;service_name:string;method:string;amount_cents:number}
type MonthData={received:number;spent:number;profit:number;pending:number;expenses:Expense[];receipts:Receipt[]}

function toCents(input:string){
  const cleaned=input.trim().replace(',','.')
  if(!/^\d{1,8}(?:\.\d{1,2})?$/.test(cleaned))throw new Error('Informe o valor em reais com até duas casas decimais.')
  const [reais,centavos='']=cleaned.split('.')
  const amount=Number(reais)*100+Number(centavos.padEnd(2,'0'))
  if(amount<=0)throw new Error('O valor da despesa deve ser maior que zero.')
  return amount
}

export function MonthlyFinance({summary=false}:{summary?:boolean}){
  const [month,setMonth]=useState(localDay().slice(0,7))
  const [data,setData]=useState<{month:string;value:MonthData}|null>(null)
  const [error,setError]=useState('')
  const [success,setSuccess]=useState('')
  const [formError,setFormError]=useState('')
  const [record,setRecord]=useState(false)
  const [voided,setVoided]=useState<Expense|null>(null)
  const [busy,setBusy]=useState(false)
  const value=data?.month===month?data.value:null
  async function read(){setData({month,value:await rpc<MonthData>('monthly_finance',{p_month:month+'-01'})})}
  useEffect(()=>{
    let active=true
    setError('')
    void rpc<MonthData>('monthly_finance',{p_month:month+'-01'}).then(result=>{if(active)setData({month,value:result})})
      .catch(error=>{if(active)setError(errorText(error))})
    return ()=>{active=false}
  },[month])
  async function addExpense(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    setBusy(true);setFormError('')
    const fields=new FormData(event.currentTarget)
    try{
      const paidOn=String(fields.get('paid_on'))
      await rpc('record_expense',{p_date:paidOn,p_description:fields.get('description'),p_category:fields.get('category'),p_amount:toCents(String(fields.get('amount')))})
      setRecord(false);setSuccess('Despesa lançada.')
      if(paidOn.startsWith(month))await read();else setMonth(paidOn.slice(0,7))
    }catch(error){setFormError(errorText(error))}finally{setBusy(false)}
  }
  async function voidExpense(event:FormEvent<HTMLFormElement>){
    event.preventDefault()
    if(!voided)return
    setBusy(true);setFormError('')
    try{
      await rpc('void_expense',{p_id:voided.id,p_reason:new FormData(event.currentTarget).get('reason')})
      setVoided(null);setSuccess('Despesa estornada. O lançamento permanece no histórico.')
      await read()
    }catch(error){setFormError(errorText(error))}finally{setBusy(false)}
  }
  const metrics=value?[
    [ArrowDownLeft,'Recebimentos confirmados',value.received],
    [ArrowUpRight,'Despesas pagas',value.spent],
    [Wallet,'Lucro do mês',value.profit],
    [ReceiptText,'A receber',value.pending],
  ] as const:[]
  return <section className="admin-section monthly-finance" aria-labelledby={summary?'finance-summary-title':'finance-month-title'}>
    <header className="section-title"><h2 id={summary?'finance-summary-title':'finance-month-title'}>{summary?'Resultado do mês':'Resultado mensal'}</h2>
      {summary?<TextLink to="/admin/financeiro">Abrir financeiro</TextLink>:<Action onClick={()=>{setRecord(true);setFormError('');setSuccess('')}}>Lançar despesa</Action>}
    </header>
    {!summary&&<label className="field filter">Mês de referência<input type="month" max={localDay().slice(0,7)} value={month} onChange={event=>{if(/^\d{4}-\d{2}$/.test(event.target.value))setMonth(event.target.value)}}/></label>}
    {value?<dl className="metrics monthly-metrics">{metrics.map(([Icon,label,amount])=><div key={label} data-negative={amount<0}>
      <dt><Icon size={17} aria-hidden="true"/>{label}</dt><dd>{currency(amount)}</dd></div>)}</dl>:!error&&<p role="status">Consultando o resultado mensal…</p>}
    <p className="monthly-caption">Lucro apurado pelos recebimentos confirmados menos as despesas pagas lançadas no mês.</p>
    <Notice message={error}/><Notice message={success} success/>
    {!summary&&value&&<>
      <section className="admin-section section"><h3>Despesas do mês</h3>
        {value.expenses.length?value.expenses.map(item=><div key={item.id} className="data-row">
          <div><strong>{item.description}</strong><p>{categories[item.category]} · {dayLabel(item.paid_on)}{item.voided_at?' · Estornada':''}</p>{item.void_reason&&<p>Motivo do estorno: {item.void_reason}</p>}</div>
          <div className="inline-actions"><strong>{currency(item.amount_cents)}</strong>{!item.voided_at&&<Action kind="quiet" onClick={()=>{setVoided(item);setFormError('');setSuccess('')}}>Estornar</Action>}</div>
        </div>):<Empty title="Nenhuma despesa lançada neste mês"/>}
      </section>
      <section className="admin-section"><h3>Recebimentos do mês</h3>
        {value.receipts.length?value.receipts.map(entry=><div key={entry.id} className="data-row"><div><strong>{entry.service_name}</strong><p>{dayLabel(entry.paid_at)} · {entry.method==='pix'?'Pix':'Presencial'}</p></div><strong>{currency(entry.amount_cents)}</strong></div>):<Empty title="Nenhum recebimento confirmado neste mês"/>}
      </section>
    </>}
    {record&&<Dialog title="Lançar despesa" onClose={()=>{if(!busy)setRecord(false)}}><form className="stack" onSubmit={addExpense}>
      <label className="field">Descrição<input name="description" required minLength={3} maxLength={160}/></label>
      <div className="form-grid">
        <label className="field">Data do pagamento<input name="paid_on" type="date" defaultValue={month===localDay().slice(0,7)?localDay():month+'-01'} max={localDay()} required/></label>
        <label className="field">Categoria<select name="category">{Object.entries(categories).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
        <label className="field">Valor em reais<input name="amount" inputMode="decimal" placeholder="0,00" required maxLength={11}/></label>
      </div>
      <Action type="submit" disabled={busy}>{busy?'Salvando…':'Salvar despesa'}</Action><Notice message={formError}/>
    </form></Dialog>}
    {voided&&<Dialog title="Estornar despesa" onClose={()=>{if(!busy)setVoided(null)}}><form className="stack" onSubmit={voidExpense}>
      <p>{voided.description} · {currency(voided.amount_cents)}</p>
      <label className="field">Motivo<textarea name="reason" minLength={3} maxLength={300} required/></label>
      <Action type="submit" disabled={busy}>Confirmar estorno</Action><Notice message={formError}/>
    </form></Dialog>}
  </section>
}
