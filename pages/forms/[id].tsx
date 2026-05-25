import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'

const AzumiLogo = () => (
  <div style={{ display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
    <svg width="24" height="19" viewBox="0 0 120 96" fill="none">
      <defs>
        <linearGradient id="lg2" x1="0" y1="0" x2="120" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4A90D9"/><stop offset="100%" stopColor="#6EB3F7"/>
        </linearGradient>
      </defs>
      <circle cx="44" cy="48" r="34" fill="url(#lg2)" opacity=".95"/>
      <circle cx="76" cy="48" r="34" fill="url(#lg2)" opacity=".7"/>
    </svg>
    <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:17, color:'#fff' }}>azumi</span>
    <span style={{ fontFamily:'Poppins,sans-serif', fontStyle:'italic', fontWeight:400, fontSize:17, color:'#93C5FD' }}>RH</span>
  </div>
)

// Renderiza campo de texto: se contém HTML usa dangerouslySetInnerHTML, senão white-space:pre-wrap
function RichContent({ html, style }: { html: string; style?: React.CSSProperties }) {
  const isHtml = html && (html.includes('<p') || html.includes('<br') || html.includes('<ul') || html.includes('<b>') || html.includes('<strong') || html.includes('<em') || html.includes('<u>'))
  if (isHtml) {
    return (
      <>
        <style>{`
          .rich-content p { margin: 0 0 8px 0; }
          .rich-content p:last-child { margin-bottom: 0; }
          .rich-content ul { margin: 4px 0 8px 18px; padding: 0; }
          .rich-content li { margin-bottom: 4px; }
          .rich-content br { display: block; content: ''; margin-bottom: 4px; }
        `}</style>
        <div className="rich-content" style={style} dangerouslySetInnerHTML={{ __html: html }} />
      </>
    )
  }
  // Legado: texto puro — preserva quebras de linha
  return <div style={{ ...style, whiteSpace: 'pre-wrap' }}>{html}</div>
}

export default function FormPage() {
  const router = useRouter()
  const { id } = router.query as { id: string }

  const [form, setForm] = useState<any>(null)
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
    if (data.expiry && new Date() > new Date(data.expiry + 'T23:59:59')) {
      setExpired(true); setForm(data); return
    }
    setForm(data)
  }

  function formatCPF(v: string) {
    return v.replace(/\D/g,'').slice(0,11)
      .replace(/(\d{3})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d)/,'$1.$2')
      .replace(/(\d{3})(\d{1,2})$/,'$1-$2')
  }

  function setAnswer(qId: string, value: string) {
    setAnswers(prev => ({ ...prev, [qId]: value }))
  }

  async function handleSubmit() {
    if (!form) return
    setCpfError('')
    const rawCPF = identity.cpf.replace(/\D/g,'')
    if (rawCPF.length !== 11) { setCpfError('CPF inválido.'); return }
    if (!identity.nome.trim()) { setCpfError('Informe o nome completo.'); return }
    if (!identity.empresa.trim()) { setCpfError('Informe a empresa.'); return }

    const missing: string[] = []
    form.questions.forEach((q: any) => {
      if (q.required && !answers[q.id]?.trim()) missing.push(q.id)
    })
    if (missing.length) { setErrors(missing); return }
    setErrors([])
    setSubmitting(true)

    const answersPayload: Record<string,{question:string;answer:string}> = {
      _cpf: { question:'CPF', answer: rawCPF },
      _nome: { question:'Nome completo', answer: identity.nome },
      _empresa: { question:'Empresa', answer: identity.empresa },
      _filial: { question:'Filial', answer: identity.filial },
    }
    form.questions.forEach((q: any) => {
      answersPayload[q.id] = { question: q.text, answer: answers[q.id]||'' }
    })

    const res = await fetch('/api/submit', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ form_id: form.id, form_name: form.name, client: form.client, answers: answersPayload, cpf: rawCPF }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (res.status === 409 || data.error === 'CPF_DUPLICADO') {
      setCpfError('Este CPF já respondeu este formulário.')
      return
    }
    setSubmitted(true)
  }

  const bgColor = form?.bg_color || '#031D38'
  const headerGradient = `linear-gradient(135deg, ${bgColor} 0%, #052E5A 60%, #0A3F7A 100%)`

  const inpStyle: React.CSSProperties = {
    width:'100%', padding:'11px 12px',
    border:'1.5px solid #EDEDED', borderRadius:8,
    fontSize:15, fontFamily:'inherit', outline:'none',
    boxSizing:'border-box' as const
  }

  const Header = () => (
    <div style={{ background: headerGradient, borderRadius:'12px 12px 0 0', padding:'16px 18px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 50% 80% at 100% 50%,rgba(74,144,217,.15) 0%,transparent 60%)', pointerEvents:'none' }}/>
      <div style={{ position:'relative', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
          {form?.logo_url && (
            <img src={form.logo_url} alt="Logo cliente"
              style={{ height:38, maxWidth:80, borderRadius:6, objectFit:'contain' as const, background:'rgba(255,255,255,.12)', padding:'3px 6px', flexShrink:0 }}/>
          )}
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:17, fontWeight:800, color:'#fff', fontFamily:'Sora,sans-serif', lineHeight:1.2, wordBreak:'break-word' }}>{form?.name}</div>
            <div style={{ fontSize:10, color:'rgba(147,197,253,.75)', fontFamily:'monospace', letterSpacing:'.08em', textTransform:'uppercase', marginTop:2 }}>{form?.client}</div>
          </div>
        </div>
        <AzumiLogo/>
      </div>
    </div>
  )

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f2f7' }}>
      <div style={{ color:'#778082', fontFamily:'monospace', fontSize:13 }}>Carregando...</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f2f7', padding:16 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:16, fontWeight:700, color:'#222' }}>Formulário não encontrado</div>
        <div style={{ fontSize:13, marginTop:6, color:'#778082' }}>Verifique o link com a Azumi RH.</div>
      </div>
    </div>
  )

  if (expired) return (
    <div style={{ minHeight:'100vh', background:'#f0f2f7', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ width:'100%', maxWidth:540 }}>
        <Header/>
        <div style={{ background:'#fff', borderRadius:'0 0 12px 12px', padding:'28px 20px', textAlign:'center' }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>Formulário encerrado</div>
          <div style={{ fontSize:13, color:'#778082' }}>Este formulário não está mais disponível. Entre em contato com a Azumi RH.</div>
        </div>
      </div>
    </div>
  )

  if (submitted) return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#031D38 0%,#052E5A 60%,#0A3F7A 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <Head><title>Obrigado · Azumi RH</title></Head>
      <div style={{ width:'100%', maxWidth:440, textAlign:'center' }}>
        <svg width="48" height="38" viewBox="0 0 120 96" fill="none" style={{ margin:'0 auto 16px', display:'block' }}>
          <defs>
            <linearGradient id="lgs" x1="0" y1="0" x2="120" y2="96" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4A90D9"/><stop offset="100%" stopColor="#6EB3F7"/>
            </linearGradient>
          </defs>
          <circle cx="44" cy="48" r="34" fill="url(#lgs)" opacity=".95"/>
          <circle cx="76" cy="48" r="34" fill="url(#lgs)" opacity=".7"/>
        </svg>
        <div style={{ fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:26, color:'#fff', letterSpacing:'-.01em', marginBottom:2 }}>
          azumi<span style={{ fontStyle:'italic', fontWeight:400, color:'#93C5FD' }}>RH</span>
        </div>
        <div style={{ width:36, height:2, background:'linear-gradient(90deg,#4A90D9,#6EB3F7)', borderRadius:100, margin:'14px auto 22px' }}></div>
        <div style={{ width:58, height:58, borderRadius:'50%', background:'rgba(255,255,255,.1)', border:'2px solid rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 18px' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div style={{ fontSize:22, fontWeight:700, color:'#fff', marginBottom:10 }}>Resposta enviada!</div>
        <div style={{ fontSize:14, color:'rgba(147,197,253,.85)', lineHeight:1.75, marginBottom:28 }}>
          Obrigado pela sua participação. Suas respostas foram registradas com sucesso pela <strong style={{ color:'#fff' }}>Azumi RH</strong>.
        </div>
        <div style={{ background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.12)', borderRadius:12, padding:'18px 20px', marginBottom:20 }}>
          <div style={{ fontSize:11, color:'rgba(147,197,253,.7)', fontFamily:'monospace', letterSpacing:'.1em', textTransform:'uppercase', marginBottom:12 }}>Siga a Azumi RH</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <a href="https://instagram.com/azumirh" target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)', borderRadius:100, padding:'10px 16px', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              @azumirh
            </a>
            <a href="https://www.linkedin.com/company/azumirh/" target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)', borderRadius:100, padding:'10px 16px', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
              LinkedIn
            </a>
            <a href="https://azumirh.com.br" target="_blank" rel="noreferrer"
              style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.1)', border:'1px solid rgba(255,255,255,.15)', borderRadius:100, padding:'10px 16px', color:'#fff', textDecoration:'none', fontSize:13, fontWeight:600 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              azumirh.com.br
            </a>
          </div>
        </div>
        <div style={{ fontSize:10, color:'rgba(147,197,253,.5)', fontFamily:'monospace' }}>contato@azumirh.com.br · azumirh.com.br</div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#f0f2f7', padding:'16px 12px', boxSizing:'border-box' as const }}>
      <Head><title>{form?.name} · Azumi RH</title></Head>

      {/* WELCOME POPUP */}
      {showWelcome && form?.welcome_message && (
        <div style={{ position:'fixed', inset:0, background:'rgba(3,29,56,.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
          <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:440, overflow:'hidden', boxShadow:'0 8px 40px rgba(0,0,0,.3)' }}>
            <div style={{ background: headerGradient, padding:'20px 22px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              {form.logo_url && (
                <img src={form.logo_url} alt="Logo"
                  style={{ height:36, maxWidth:80, borderRadius:6, objectFit:'contain' as const, background:'rgba(255,255,255,.15)', padding:'3px 6px' }}/>
              )}
              <AzumiLogo/>
            </div>
            <div style={{ padding:'22px 22px 20px', textAlign:'center' }}>
              <div style={{ fontSize:26, marginBottom:8 }}>👋</div>
              <div style={{ fontSize:17, fontWeight:700, color:'#031D38', marginBottom:10 }}>Bem-vindo(a)!</div>
              <RichContent
                html={form.welcome_message}
                style={{ fontSize:14, color:'#555', lineHeight:1.75, marginBottom:18, textAlign:'left' }}
              />
              {form.expiry && (
                <div style={{ background:'#fff0f0', border:'1.5px solid #ffb3b3', borderRadius:8, padding:'8px 14px', fontSize:12, color:'#b91c1c', fontWeight:600, marginBottom:18 }}>
                  Prazo: até {new Date(form.expiry+'T00:00:00').toLocaleDateString('pt-BR')}
                </div>
              )}
              <button onClick={() => setShowWelcome(false)}
                style={{ width:'100%', padding:14, background: headerGradient, color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
                Começar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth:620, margin:'0 auto' }}>
        <Header/>
        <div style={{ background:'#fff', borderRadius:'0 0 12px 12px', border:'1px solid #EDEDED', borderTop:'none', padding:'18px 16px' }}>

          {form?.description && (
            <div style={{ marginBottom:20, background:'#f8f9fb', borderRadius:8, padding:'12px 14px', borderLeft:'3px solid #3B82F6' }}>
              <RichContent
                html={form.description}
                style={{ fontSize:13, color:'#555', lineHeight:1.75 }}
              />
            </div>
          )}

          {/* IDENTIFICAÇÃO */}
          <div style={{ background:'#f8f9fb', borderRadius:10, padding:14, marginBottom:22, border:'1px solid #EDEDED' }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase' as const, color:'#034C8B', marginBottom:14, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ display:'inline-block', width:3, height:13, borderRadius:100, background:'linear-gradient(#034C8B,#3B82F6)', flexShrink:0 }}></span>
              Identificação
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:12, color:'#778082', display:'block', marginBottom:5 }}>CPF *</label>
              <input value={identity.cpf} onChange={e => setIdentity(p => ({ ...p, cpf: formatCPF(e.target.value) }))}
                placeholder="000.000.000-00" style={inpStyle}/>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:12, color:'#778082', display:'block', marginBottom:5 }}>Nome completo *</label>
              <input value={identity.nome} onChange={e => setIdentity(p => ({ ...p, nome: e.target.value }))}
                placeholder="Seu nome completo" style={inpStyle}/>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:12, color:'#778082', display:'block', marginBottom:5 }}>Empresa *</label>
              <input value={identity.empresa} onChange={e => setIdentity(p => ({ ...p, empresa: e.target.value }))}
                placeholder="Nome da empresa" style={inpStyle}/>
            </div>
            <div>
              <label style={{ fontSize:12, color:'#778082', display:'block', marginBottom:5 }}>Filial</label>
              <input value={identity.filial} onChange={e => setIdentity(p => ({ ...p, filial: e.target.value }))}
                placeholder="Filial (se houver)" style={inpStyle}/>
            </div>
            {cpfError && (
              <div style={{ color:'#b91c1c', fontSize:13, marginTop:10, fontWeight:600, background:'#fef2f2', borderRadius:6, padding:'8px 12px' }}>
                {cpfError}
              </div>
            )}
          </div>

          {/* PERGUNTAS */}
          {form?.questions.map((q: any, i: number) => (
            <div key={q.id} style={{ marginBottom:24 }}>
              <div style={{ fontSize:14, fontWeight:600, marginBottom:10, color:'#222', lineHeight:1.4, wordBreak:'break-word' }}>
                <span style={{ color:'#778082', marginRight:4 }}>{i+1}.</span>
                {q.text}
                {q.required && <span style={{ color:'#e24b4a', marginLeft:3 }}>*</span>}
              </div>
              {errors.includes(q.id) && (
                <div style={{ fontSize:12, color:'#b91c1c', marginBottom:7, background:'#fef2f2', borderRadius:6, padding:'5px 10px' }}>Campo obrigatório</div>
              )}
              {q.type==='text' && (
                <textarea value={answers[q.id]||''} onChange={e=>setAnswer(q.id,e.target.value)} placeholder="Sua resposta..."
                  style={{ ...inpStyle, minHeight:90, resize:'vertical' as const }}/>
              )}
              {q.type==='mc' && q.options?.map((opt: string) => (
                <button key={opt} onClick={()=>setAnswer(q.id,opt)}
                  style={{ display:'block', width:'100%', textAlign:'left', padding:'12px 14px', border:`1.5px solid ${answers[q.id]===opt?'#3B82F6':'#EDEDED'}`, borderRadius:8, fontSize:14, cursor:'pointer', background:answers[q.id]===opt?'#eff6ff':'#fff', color:answers[q.id]===opt?'#034C8B':'#222', marginBottom:7, fontWeight:answers[q.id]===opt?600:400, fontFamily:'inherit', wordBreak:'break-word' }}>
                  {opt}
                </button>
              ))}
              {q.type==='scale' && (
                <div style={{ display:'flex', gap:6 }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={()=>setAnswer(q.id,String(n))}
                      style={{ flex:1, padding:'12px 4px', border:`1.5px solid ${answers[q.id]===String(n)?'#3B82F6':'#EDEDED'}`, borderRadius:8, fontSize:15, fontWeight:700, cursor:'pointer', background:answers[q.id]===String(n)?'#eff6ff':'#fff', color:answers[q.id]===String(n)?'#034C8B':'#222', fontFamily:'inherit' }}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
              {q.type==='yn' && (
                <div style={{ display:'flex', gap:8 }}>
                  {['Sim','Não'].map(opt => (
                    <button key={opt} onClick={()=>setAnswer(q.id,opt)}
                      style={{ flex:1, padding:'12px', border:`1.5px solid ${answers[q.id]===opt?'#3B82F6':'#EDEDED'}`, borderRadius:8, fontSize:15, fontWeight:700, cursor:'pointer', background:answers[q.id]===opt?'#eff6ff':'#fff', color:answers[q.id]===opt?'#034C8B':'#222', fontFamily:'inherit', textAlign:'center' }}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {errors.length > 0 && (
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 13px', color:'#b91c1c', fontSize:13, marginBottom:16 }}>
              Responda todas as perguntas obrigatórias (*).
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting}
            style={{ width:'100%', padding:15, background: headerGradient, color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:submitting?'not-allowed':'pointer', opacity:submitting?0.7:1, fontFamily:'inherit', marginTop:4 }}>
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
