import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'
import { Form, Question } from '../../lib/types'

const DARK = '#031D38'
const HDR = `linear-gradient(135deg,#031D38 0%,#052E5A 60%,#0A3F7A 100%)`

const AzumiLogo = () => (
  <div style={{ display:'flex', alignItems:'center', gap:9, flexShrink:0 }}>
    <svg width="28" height="22" viewBox="0 0 120 96" fill="none">
      <defs>
        <linearGradient id="lg2" x1="0" y1="0" x2="120" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4A90D9"/><stop offset="100%" stopColor="#6EB3F7"/>
        </linearGradient>
      </defs>
      <circle cx="44" cy="48" r="34" fill="url(#lg2)" opacity=".95"/>
      <circle cx="76" cy="48" r="34" fill="url(#lg2)" opacity=".7"/>
    </svg>
    <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:20, color:'#fff' }}>azumi</span>
    <span style={{ fontFamily:'Poppins,sans-serif', fontStyle:'italic', fontWeight:400, fontSize:20, color:'#93C5FD' }}>RH</span>
  </div>
)

export default function FormPage() {
  const router = useRouter()
  const { id } = router.query as { id: string }

  const [form, setForm] = useState<Form|null>(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [answers, setAnswers] = useState<Record<string,string>>({})
  const [identity, setIdentity] = useState({ cpf:'', nome:'', empresa:'', filial:'' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [cpfError, setCpfError] = useState('')

  useEffect(() => { if (id) loadForm() }, [id])

  async function loadForm() {
    const { data, error } = await supabase.from('forms').select('*').eq('id', id).single()
    setLoading(false)
    if (error || !data) { setNotFound(true); return }
    if (data.expiry) {
      if (new Date() > new Date(data.expiry + 'T23:59:59')) { setExpired(true); setForm(data); return }
    }
    setForm(data)
  }

  function formatCPF(v: string) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/(\d{3})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d{1,2})$/,'$1-$2')
  }

  function setAnswer(qId: string, value: string) { setAnswers(prev => ({ ...prev, [qId]: value })) }

  async function handleSubmit() {
    if (!form) return
    setCpfError('')
    const rawCPF = identity.cpf.replace(/\D/g,'')
    if (rawCPF.length !== 11) { setCpfError('CPF inválido.'); return }
    if (!identity.nome.trim()) { setCpfError('Informe o nome completo.'); return }
    if (!identity.empresa.trim()) { setCpfError('Informe a empresa.'); return }

    const { data: existing } = await supabase.from('responses')
      .select('id').eq('form_id', form.id).eq('cpf', rawCPF).maybeSingle()
    if (existing) { setCpfError('Este CPF já respondeu este formulário.'); return }

    const missing: string[] = []
    form.questions.forEach(q => { if (q.required && !answers[q.id]?.trim()) missing.push(q.id) })
    if (missing.length) { setErrors(missing); return }
    setErrors([])
    setSubmitting(true)

    const answersPayload: Record<string,{question:string;answer:string}> = {
      _cpf: { question:'CPF', answer: rawCPF },
      _nome: { question:'Nome completo', answer: identity.nome },
      _empresa: { question:'Empresa', answer: identity.empresa },
      _filial: { question:'Filial', answer: identity.filial },
    }
    form.questions.forEach(q => { answersPayload[q.id] = { question: q.text, answer: answers[q.id]||'' } })

    await fetch('/api/submit', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ form_id: form.id, form_name: form.name, client: form.client, answers: answersPayload, cpf: rawCPF }),
    })
    setSubmitting(false)
    setSubmitted(true)
  }

  const Header = () => (
    <div style={{ background:HDR, borderRadius:'12px 12px 0 0', padding:'22px 28px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 50% 80% at 100% 50%,rgba(74,144,217,.15) 0%,transparent 60%)', pointerEvents:'none' }}/>
      <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:'#fff', fontFamily:'Sora,sans-serif', marginBottom:3 }}>{form?.name}</div>
          <div style={{ fontSize:11, color:'rgba(147,197,253,.75)', fontFamily:'monospace', letterSpacing:'.1em', textTransform:'uppercase' }}>{form?.client}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          {(form as any)?.logo_url && <img src={(form as any).logo_url} alt="Logo cliente" style={{ height:36, borderRadius:6, objectFit:'contain', background:'rgba(255,255,255,.1)', padding:4 }}/>}
          <AzumiLogo/>
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f2f7' }}>
      <div style={{ color:'#778082', fontFamily:'monospace', fontSize:12 }}>Carregando...</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f2f7' }}>
      <div style={{ textAlign:'center', color:'#778082' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'#222' }}>Formulário não encontrado</div>
        <div style={{ fontSize:13, marginTop:6 }}>Verifique o link com a Azumi RH.</div>
      </div>
    </div>
  )

  if (expired) return (
    <div style={{ minHeight:'100vh', background:'#f0f2f7', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ maxWidth:520, width:'100%', margin:'0 16px' }}>
        <Header/>
        <div style={{ background:'#fff', borderRadius:'0 0 12px 12px', padding:'32px 28px', textAlign:'center' }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Formulário encerrado</div>
          <div style={{ fontSize:13, color:'#778082' }}>Este formulário não está mais disponível. Entre em contato com a Azumi RH.</div>
        </div>
      </div>
    </div>
  )

  if (submitted) return (
    <div style={{ minHeight:'100vh', background:'#f0f2f7', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Head><title>Obrigado · Azumi RH</title></Head>
      <div style={{ maxWidth:520, width:'100%', margin:'0 16px' }}>
        <Header/>
        <div style={{ background:'#fff', borderRadius:'0 0 12px 12px', padding:'40px 28px', textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'#e9faf2', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Resposta enviada com sucesso</div>
          <div style={{ fontSize:13, color:'#778082', lineHeight:1.7 }}>Obrigado. Suas respostas foram registradas pela <strong>Azumi RH</strong>.</div>
          <div style={{ marginTop:24, fontSize:10, color:'#aaa', fontFamily:'monospace' }}>contato@azumirh.com.br · azumirh.com.br</div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#f0f2f7', padding:'24px 16px' }}>
      <Head><title>{form?.name} · Azumi RH</title></Head>

      {showWelcome && (form as any)?.welcome_message && (
        <div style={{ position:'fixed', inset:0, background:'rgba(3,29,56,.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'#fff', borderRadius:16, maxWidth:440, width:'100%', overflow:'hidden', boxShadow:'0 8px 40px rgba(0,0,0,.25)' }}>
            <div style={{ background:HDR, padding:'22px 28px' }}>
              <AzumiLogo/>
              {(form as any).logo_url && <img src={(form as any).logo_url} alt="Logo" style={{ height:32, marginTop:12, borderRadius:4, objectFit:'contain' as const }}/>}
            </div>
            <div style={{ padding:'24px 28px' }}>
              <div style={{ fontSize:15, fontWeight:700, color:'#222', marginBottom:10 }}>Bem-vindo</div>
              <div style={{ fontSize:13, color:'#555', lineHeight:1.7, marginBottom:24 }}>{(form as any).welcome_message}</div>
              {form?.expiry && (
                <div style={{ background:'#fff8e1', border:'1px solid #ffd54f', borderRadius:8, padding:'8px 12px', fontSize:11, color:'#7c6200', marginBottom:16 }}>
                  Disponível até {new Date(form.expiry+'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              )}
              <button onClick={() => setShowWelcome(false)}
                style={{ width:'100%', padding:13, background:HDR, color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Começar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth:600, margin:'0 auto' }}>
        <Header/>
        <div style={{ background:'#fff', borderRadius:'0 0 12px 12px', border:'1px solid #EDEDED', borderTop:'none', padding:'24px 28px' }}>

          {form?.description && (
            <div style={{ fontSize:13, color:'#778082', marginBottom:20, lineHeight:1.7 }}>{form.description}</div>
          )}

          <div style={{ background:'#f8f9fb', borderRadius:10, padding:16, marginBottom:24, border:'1px solid #EDEDED' }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase' as const, color:'#034C8B', marginBottom:12 }}>Identificação</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={{ fontSize:11, color:'#778082', display:'block', marginBottom:4 }}>CPF *</label>
                <input value={identity.cpf} onChange={e => setIdentity(p => ({ ...p, cpf: formatCPF(e.target.value) }))}
                  placeholder="000.000.000-00"
                  style={{ width:'100%', padding:'9px 11px', border:'1.5px solid #EDEDED', borderRadius:8, fontSize:13, fontFamily:'inherit' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#778082', display:'block', marginBottom:4 }}>Nome completo *</label>
                <input value={identity.nome} onChange={e => setIdentity(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Seu nome"
                  style={{ width:'100%', padding:'9px 11px', border:'1.5px solid #EDEDED', borderRadius:8, fontSize:13, fontFamily:'inherit' }}/>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={{ fontSize:11, color:'#778082', display:'block', marginBottom:4 }}>Empresa *</label>
                <input value={identity.empresa} onChange={e => setIdentity(p => ({ ...p, empresa: e.target.value }))}
                  placeholder="Nome da empresa"
                  style={{ width:'100%', padding:'9px 11px', border:'1.5px solid #EDEDED', borderRadius:8, fontSize:13, fontFamily:'inherit' }}/>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#778082', display:'block', marginBottom:4 }}>Filial</label>
                <input value={identity.filial} onChange={e => setIdentity(p => ({ ...p, filial: e.target.value }))}
                  placeholder="Filial (se houver)"
                  style={{ width:'100%', padding:'9px 11px', border:'1.5px solid #EDEDED', borderRadius:8, fontSize:13, fontFamily:'inherit' }}/>
              </div>
            </div>
            {cpfError && <div style={{ color:'#b91c1c', fontSize:12, marginTop:8, fontWeight:600 }}>{cpfError}</div>}
          </div>

          {form?.questions.map((q, i) => (
            <QuestionRenderer key={q.id} q={q} index={i} value={answers[q.id]||''} onChange={v=>setAnswer(q.id,v)} hasError={errors.includes(q.id)}/>
          ))}

          {errors.length > 0 && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 13px', color:'#b91c1c', fontSize:12, marginBottom:14 }}>
              Responda todas as perguntas obrigatórias (*).
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting}
            style={{ width:'100%', padding:14, background:HDR, color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:submitting?'not-allowed':'pointer', opacity:submitting?.7:1, fontFamily:'inherit', marginTop:8 }}>
            {submitting ? 'Enviando...' : 'Enviar respostas'}
          </button>

          <div style={{ textAlign:'center', marginTop:16, fontSize:10, color:'#aaa', fontFamily:'monospace' }}>
            AZUMI RH · contato@azumirh.com.br · azumirh.com.br
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionRenderer({ q, index, value, onChange, hasError }: { q:Question; index:number; value:string; onChange:(v:string)=>void; hasError:boolean }) {
  const border = (sel: boolean) => `1.5px solid ${sel?'#3B82F6':hasError?'#fecaca':'#EDEDED'}`
  const btnBase: React.CSSProperties = { cursor:'pointer', fontFamily:'inherit', transition:'all .12s', border:'none' }

  return (
    <div style={{ marginBottom:22 }}>
      <div style={{ fontSize:13, fontWeight:600, marginBottom:10, color:'#222', display:'flex', gap:4 }}>
        <span style={{ color:'#778082' }}>{index+1}.</span>
        <span>{q.text}</span>
        {q.required && <span style={{ color:'#e24b4a' }}>*</span>}
      </div>
      {hasError && <div style={{ fontSize:11, color:'#b91c1c', marginBottom:6 }}>Campo obrigatório</div>}
      {q.type==='text' && (
        <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder="Sua resposta..."
          style={{ width:'100%', padding:'10px 12px', border:border(false), borderRadius:8, fontSize:13, fontFamily:'inherit', minHeight:80, resize:'vertical', outline:'none' }}/>
      )}
      {q.type==='mc' && q.options?.map(opt => (
        <button key={opt} onClick={()=>onChange(opt)}
          style={{ ...btnBase, display:'block', width:'100%', textAlign:'left', padding:'10px 14px', border:border(value===opt), borderRadius:8, fontSize:13, background:value===opt?'#eff6ff':'#fff', color:value===opt?'#034C8B':'#222', marginBottom:6, fontWeight:value===opt?600:400 }}>
          {opt}
        </button>
      ))}
      {q.type==='scale' && (
        <div style={{ display:'flex', gap:6 }}>
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={()=>onChange(String(n))}
              style={{ ...btnBase, flex:1, padding:'10px 4px', border:border(value===String(n)), borderRadius:8, fontSize:14, fontWeight:700, background:value===String(n)?'#eff6ff':'#fff', color:value===String(n)?'#034C8B':'#222' }}>
              {n}
            </button>
          ))}
        </div>
      )}
      {q.type==='yn' && (
        <div style={{ display:'flex', gap:8 }}>
          {['Sim','Não'].map(opt => (
            <button key={opt} onClick={()=>onChange(opt)}
              style={{ ...btnBase, flex:1, padding:10, border:border(value===opt), borderRadius:8, fontSize:14, fontWeight:700, background:value===opt?'#eff6ff':'#fff', color:value===opt?'#034C8B':'#222' }}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
