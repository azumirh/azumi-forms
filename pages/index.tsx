import { useState, useRef } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

const DARK = '#031D38'
const HDR = `linear-gradient(135deg,#031D38 0%,#052E5A 60%,#0A3F7A 100%)`

const FORM_TYPES = ['Pesquisa', 'Questionário', 'Avaliação', 'Diagnóstico', 'Outro']

const Logo = () => (
  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
    <svg width="32" height="26" viewBox="0 0 120 96" fill="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="120" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4A90D9"/>
          <stop offset="100%" stopColor="#6EB3F7"/>
        </linearGradient>
      </defs>
      <circle cx="44" cy="48" r="34" fill="url(#lg)" opacity=".95"/>
      <circle cx="76" cy="48" r="34" fill="url(#lg)" opacity=".7"/>
    </svg>
    <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:22, color:'#fff', letterSpacing:'-.01em' }}>azumi</span>
    <span style={{ fontFamily:'Poppins,sans-serif', fontStyle:'italic', fontWeight:400, fontSize:22, color:'#93C5FD' }}>RH</span>
  </div>
)

function gerarProtocolo() {
  const now = new Date()
  const ano = now.getFullYear()
  const mes = String(now.getMonth()+1).padStart(2,'0')
  const rand = Math.floor(Math.random()*90000)+10000
  return `AZ-${ano}${mes}-${rand}`
}

export default function Admin() {
  const [auth, setAuth] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [adminName, setAdminNameState] = useState('')
  const [forms, setForms] = useState<any[]>([])
  const [view, setView] = useState<'list'|'new'|'responses'>('list')
  const [selectedFormId, setSelectedFormId] = useState<string|null>(null)
  const [responses, setResponses] = useState<any[]>([])

  const [fName, setFName] = useState('')
  const [fType, setFType] = useState('Pesquisa')
  const [fClient, setFClient] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fExpiry, setFExpiry] = useState('')
  const [fLogoUrl, setFLogoUrl] = useState('')
  const [fBgColor, setFBgColor] = useState('#031D38')
  const [fWelcome, setFWelcome] = useState('Este formulário foi preparado pela Azumi RH. Sua participação é muito importante!')
  const [questions, setQuestions] = useState<any[]>([])

  const [qType, setQType] = useState('text')
  const [qText, setQText] = useState('')
  const [qOpts, setQOpts] = useState('')
  const [qReq, setQReq] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [showQR, setShowQR] = useState<any>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  function handleLogin() {
    const pwd = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'azumi2024'
    if (password === pwd) {
      setAuth(true); loadForms()
    } else { setAuthError('Senha incorreta.') }
  }

  async function loadForms() {
    const { data } = await supabase.from('forms').select('*').order('created_at', { ascending: false })
    if (data) setForms(data)
  }

  async function saveForm() {
    if (!fName.trim()) return showToast('Dê um nome ao formulário!')
    if (!fClient.trim()) return showToast('Informe o cliente!')
    if (!questions.length) return showToast('Adicione pelo menos uma pergunta!')
    setSaving(true)
    const id = 'f_' + Date.now()
    const protocolo = gerarProtocolo()
    const { error } = await supabase.from('forms').insert({
      id, name: fName, client: fClient, description: fDesc,
      expiry: fExpiry || null, questions,
      logo_url: fLogoUrl || null,
      welcome_message: fWelcome || null,
      bg_color: fBgColor || '#031D38',
      form_type: fType,
      protocolo,
      created_by: adminName || 'Admin',
    })
    setSaving(false)
    if (error) return showToast('Erro ao salvar: ' + error.message)
    showToast(`Formulário criado! Protocolo: ${protocolo}`)
    setFName(''); setFClient(''); setFDesc(''); setFExpiry('')
    setFLogoUrl(''); setFBgColor('#031D38'); setQuestions([])
    setFWelcome('Este formulário foi preparado pela Azumi RH. Sua participação é muito importante!')
    setView('list'); loadForms()
  }

  function addQuestion() {
    if (!qText.trim()) return showToast('Digite a pergunta!')
    const q: any = { id: 'q_' + Date.now(), type: qType, text: qText, required: qReq }
    if (qType === 'mc') {
      const opts = qOpts.split('\n').map(s => s.trim()).filter(Boolean)
      if (!opts.length) return showToast('Adicione opções!')
      q.options = opts
    }
    setQuestions(prev => [...prev, q])
    setQText(''); setQOpts('')
    showToast('Pergunta adicionada!')
  }

  async function deleteForm(id: string) {
    if (!confirm('Apagar formulário e todas as respostas?')) return
    await supabase.from('responses').delete().eq('form_id', id)
    await supabase.from('forms').delete().eq('id', id)
    showToast('Formulário apagado.'); loadForms()
  }

  async function viewResponses(form: any) {
    setSelectedFormId(form.id)
    const { data } = await supabase.from('responses').select('*').eq('form_id', form.id).order('submitted_at', { ascending: false })
    setResponses(data || []); setView('responses')
  }

  async function exportCSV(formId: string) {
    const { data } = await supabase.from('responses').select('*').eq('form_id', formId).order('submitted_at', { ascending: false })
    if (!data || !data.length) return showToast('Sem respostas para exportar.')
    const allKeys = new Set<string>()
    data.forEach(r => Object.values(r.answers).forEach((a: any) => allKeys.add(a.question)))
    const headers = ['Data', ...Array.from(allKeys)]
    const rows = data.map(r => [
      new Date(r.submitted_at).toLocaleString('pt-BR'),
      ...Array.from(allKeys).map(q => {
        const found = Object.values(r.answers as any).find((a: any) => a.question === q) as any
        return found?.answer || ''
      })
    ])
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `respostas_${formId}.csv`; a.click()
    showToast('CSV exportado!')
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const selectedForm = forms.find(f => f.id === selectedFormId)
  const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', border:'1.5px solid #EDEDED', borderRadius:8, fontSize:12, fontFamily:'inherit', color:'#222', background:'#fff' }
  const lbl: React.CSSProperties = { fontSize:10, fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase' as const, color:'#778082', display:'block', marginBottom:4, marginTop:10 }

  if (!auth) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f2f7' }}>
      <Head><title>Admin · Azumi Forms</title></Head>
      <div style={{ background:'#fff', borderRadius:16, padding:32, width:360, textAlign:'center', boxShadow:'0 4px 24px rgba(0,0,0,.08)' }}>
        <div style={{ marginBottom:4 }}>
          <svg width="40" height="32" viewBox="0 0 120 96" fill="none" style={{ margin:'0 auto 8px', display:'block' }}>
            <defs>
              <linearGradient id="lg0" x1="0" y1="0" x2="120" y2="96" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#4A90D9"/><stop offset="100%" stopColor="#6EB3F7"/>
              </linearGradient>
            </defs>
            <circle cx="44" cy="48" r="34" fill="url(#lg0)" opacity=".95"/>
            <circle cx="76" cy="48" r="34" fill="url(#lg0)" opacity=".7"/>
          </svg>
          <div>
            <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:24, color:'#031D38' }}>azumi</span>
            <span style={{ fontFamily:'Poppins,sans-serif', fontStyle:'italic', fontWeight:400, fontSize:24, color:'#3B82F6' }}>RH</span>
          </div>
        </div>
        <div style={{ fontSize:11, color:'#778082', fontFamily:'monospace', letterSpacing:'.1em', marginBottom:20 }}>FORM BUILDER · ADMIN</div>
        <label style={lbl}>Seu nome (identificação interna)</label>
        <input style={{ ...inp, marginBottom:10 }} placeholder="Ex.: Ana Azumi" value={adminName} onChange={e => setAdminNameState(e.target.value)}/>
        <label style={lbl}>Senha</label>
        <input style={{ ...inp, marginBottom:10 }} type="password" placeholder="Senha de acesso" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && handleLogin()} />
        {authError && <div style={{ color:'#b91c1c', fontSize:12, marginBottom:8 }}>{authError}</div>}
        <button onClick={handleLogin} style={{ width:'100%', padding:'11px', background:HDR, color:'#fff', border:'none', borderRadius:100, fontWeight:700, fontSize:13, cursor:'pointer', fontFamily:'inherit', marginTop:4 }}>Entrar</button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth:900, margin:'0 auto', padding:'20px 16px' }}>
      <Head><title>Admin · Azumi Forms</title></Head>
      {toast && <div style={{ position:'fixed', bottom:20, right:20, background:DARK, color:'#fff', padding:'10px 20px', borderRadius:100, fontSize:12, fontWeight:600, zIndex:999 }}>{toast}</div>}

      {/* QR MODAL */}
      {showQR && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }} onClick={() => setShowQR(null)}>
          <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', maxWidth:380, width:'100%', margin:16 }} onClick={e => e.stopPropagation()}>
            <div style={{ background:HDR, padding:'18px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ color:'#fff', fontWeight:700, fontSize:15 }}>{showQR.name}</div>
                <div style={{ color:'rgba(147,197,253,.8)', fontSize:11, marginTop:2 }}>{showQR.client} · {showQR.form_type || 'Formulário'}</div>
              </div>
              <Logo/>
            </div>
            {showQR.logo_url && (
              <div style={{ background:'#f8f9fb', padding:'12px 24px', borderBottom:'1px solid #EDEDED', display:'flex', alignItems:'center', gap:10 }}>
                <img src={showQR.logo_url} alt="Logo" style={{ height:32, objectFit:'contain' }}/>
                <span style={{ fontSize:11, color:'#778082' }}>{showQR.client}</span>
              </div>
            )}
            <div style={{ padding:'20px 24px', textAlign:'center' }}>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(baseUrl+'/forms/'+showQR.id)}`}
                alt="QR Code" style={{ borderRadius:8, width:200, height:200, border:'1px solid #EDEDED' }}/>
              <div style={{ marginTop:10, fontSize:11, color:'#778082', wordBreak:'break-all', fontFamily:'monospace' }}>{baseUrl}/forms/{showQR.id}</div>
              <div style={{ marginTop:12, fontSize:12, color:'#034C8B', fontWeight:600 }}>Sua participação é muito importante!</div>
              <div style={{ fontSize:11, color:'#778082', marginTop:4 }}>Em caso de dúvidas, procure a Azumi RH ou seu gestor.</div>
            </div>
            <div style={{ padding:'0 24px 20px', display:'flex', gap:8 }}>
             <button onClick={() => { navigator.clipboard.writeText(`${baseUrl}/forms/${showQR.id}`); showToast('Link copiado!'); }}
                style={{ flex:1, padding:'9px', background:'#e9f2ff', color:'#034C8B', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Copiar link
              </button>
              <a href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(baseUrl+'/forms/'+showQR.id)}&format=png`}
                download={`qrcode-${showQR.name}.png`}
                style={{ flex:1, padding:'9px', background:'#f3f0ff', color:'#5B21B6', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
                Baixar PNG
              </a>
              <button onClick={() => setShowQR(null)}
                style={{ flex:1, padding:'9px', background:DARK, color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background:HDR, borderRadius:14, padding:'13px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
        <Logo/>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {adminName && <span style={{ fontSize:11, color:'rgba(147,197,253,.8)', fontFamily:'monospace' }}>Olá, {adminName}</span>}
          {view !== 'list' && <button onClick={() => setView('list')} style={{ background:'rgba(255,255,255,.12)', color:'#fff', border:'1px solid rgba(255,255,255,.2)', borderRadius:100, padding:'8px 16px', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>← Voltar</button>}
          {view === 'list' && <button onClick={() => { setView('new'); setQuestions([]); }} style={{ background:'rgba(255,255,255,.15)', color:'#fff', border:'1px solid rgba(255,255,255,.25)', borderRadius:100, padding:'8px 16px', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>+ Novo formulário</button>}
          {view === 'new' && <button onClick={saveForm} disabled={saving} style={{ background:'#fff', color:DARK, border:'none', borderRadius:100, padding:'8px 18px', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>{saving ? 'Salvando...' : 'Salvar e gerar link'}</button>}
        </div>
      </div>

      {/* LIST */}
      {view === 'list' && (
        <div>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#034C8B', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ display:'inline-block', width:3, height:14, borderRadius:100, background:'linear-gradient(#034C8B,#3B82F6)' }}></span>
            Formulários criados ({forms.length})
          </div>
          {!forms.length && <div style={{ background:'#fff', borderRadius:12, padding:40, textAlign:'center', color:'#778082', border:'1px solid #EDEDED' }}>Nenhum formulário ainda. Clique em "+ Novo formulário".</div>}
          {forms.map(f => (
            <div key={f.id} style={{ background:'#fff', borderRadius:12, padding:'16px 18px', marginBottom:12, border:'1px solid #EDEDED', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:2 }}>{f.name}</div>
                  <div style={{ fontSize:11, color:'#778082' }}>
                    {f.form_type && <span style={{ background:'#e9f2ff', color:'#034C8B', borderRadius:100, padding:'1px 8px', fontSize:10, fontWeight:700, marginRight:6 }}>{f.form_type}</span>}
                    {f.client} · {f.questions.length} perguntas · {new Date(f.created_at).toLocaleDateString('pt-BR')}
                    {f.expiry && <> · até {new Date(f.expiry + 'T00:00:00').toLocaleDateString('pt-BR')}</>}
                  </div>
                  {f.protocolo && <div style={{ fontSize:10, color:'#aaa', fontFamily:'monospace', marginTop:3 }}>Protocolo: {f.protocolo} {f.created_by && `· Criado por: ${f.created_by}`}</div>}
                </div>
                {f.logo_url && <img src={f.logo_url} alt="Logo" style={{ height:28, objectFit:'contain', borderRadius:4 }}/>}
              </div>
              <div onClick={() => { navigator.clipboard.writeText(`${baseUrl}/forms/${f.id}`); showToast('Link copiado!'); }}
                style={{ background:'#f0f4fa', borderRadius:8, padding:'7px 11px', fontSize:11, fontFamily:'monospace', color:'#034C8B', cursor:'pointer', wordBreak:'break-all', marginBottom:10 }}>
                Copiar link: {baseUrl}/forms/{f.id}
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button onClick={() => window.open(`/forms/${f.id}`, '_blank')} style={{ padding:'7px 14px', background:'#e9f2ff', color:'#034C8B', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Ver formulário</button>
                <button onClick={() => viewResponses(f)} style={{ padding:'7px 14px', background:'#e9faf2', color:'#0F6E56', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Ver respostas</button>
                <button onClick={() => exportCSV(f.id)} style={{ padding:'7px 14px', background:'#fff8e1', color:'#7c6200', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Baixar CSV</button>
                <button onClick={() => setShowQR(f)} style={{ padding:'7px 14px', background:'#f3f0ff', color:'#5B21B6', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>QR Code / Card</button>
                <button onClick={() => deleteForm(f.id)} style={{ padding:'7px 14px', background:'#fef2f2', color:'#b91c1c', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Apagar</button>
              </div>
            </div>
          ))}
          <div style={{ textAlign:'center', fontSize:10, color:'#aaa', marginTop:20, fontFamily:'monospace' }}>AZUMI RH · contato@azumirh.com.br · azumirh.com.br</div>
        </div>
      )}

      {/* NEW FORM */}
      {view === 'new' && (
        <div>
          <div style={{ background:'#fff', borderRadius:12, padding:20, marginBottom:14, border:'1px solid #EDEDED' }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#034C8B', marginBottom:12 }}>Identificação</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <div><label style={lbl}>Nome do formulário</label><input style={inp} value={fName} onChange={e=>setFName(e.target.value)} placeholder="Ex.: Pesquisa de leitura"/></div>
              <div><label style={lbl}>Cliente</label><input style={inp} value={fClient} onChange={e=>setFClient(e.target.value)} placeholder="Ex.: Empresa X"/></div>
              <div><label style={lbl}>Tipo</label>
                <select style={inp} value={fType} onChange={e=>setFType(e.target.value)}>
                  {FORM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div><label style={lbl}>Instrução para o respondente</label><textarea style={{ ...inp, minHeight:72, resize:'vertical' as const }} value={fDesc} onChange={e=>setFDesc(e.target.value)} placeholder="Ex.: Informe abaixo quais políticas você leu."/></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
              <div><label style={lbl}>Data limite (opcional)</label><input style={inp} type="date" value={fExpiry} onChange={e=>setFExpiry(e.target.value)}/></div>
              <div><label style={lbl}>URL da logo do cliente</label><input style={inp} value={fLogoUrl} onChange={e=>setFLogoUrl(e.target.value)} placeholder="https://..."/></div>
              <div><label style={lbl}>Cor de fundo (identidade do cliente)</label>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4 }}>
                  <input type="color" value={fBgColor} onChange={e=>setFBgColor(e.target.value)} style={{ width:40, height:36, border:'1.5px solid #EDEDED', borderRadius:6, cursor:'pointer', padding:2 }}/>
                  <input style={{ ...inp, flex:1 }} value={fBgColor} onChange={e=>setFBgColor(e.target.value)} placeholder="#031D38"/>
                </div>
              </div>
            </div>
            <div><label style={lbl}>Mensagem de boas-vindas (pop-up)</label><textarea style={{ ...inp, minHeight:60, resize:'vertical' as const }} value={fWelcome} onChange={e=>setFWelcome(e.target.value)}/></div>
          </div>

          <div style={{ background:'#fff', borderRadius:12, padding:20, border:'1px solid #EDEDED' }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#034C8B', marginBottom:12 }}>Perguntas ({questions.length})</div>
            {questions.map((q, i) => (
              <div key={q.id} style={{ background:'#f8f9fb', border:'1px solid #EDEDED', borderRadius:10, padding:12, marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                  <span style={{ background:'linear-gradient(135deg,#031D38,#3B82F6)', color:'#fff', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700 }}>{i+1}</span>
                  <span style={{ background:'#e9f2ff', color:'#034C8B', borderRadius:100, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{q.type}</span>
                  {q.required && <span style={{ fontSize:10, color:'#b91c1c', fontWeight:700 }}>OBRIGATÓRIA</span>}
                  <button onClick={() => setQuestions(prev => prev.filter(x => x.id !== q.id))} style={{ marginLeft:'auto', background:'#fef2f2', color:'#b91c1c', border:'none', borderRadius:6, padding:'3px 9px', fontSize:11, cursor:'pointer', fontFamily:'inherit' }}>x</button>
                </div>
                <div style={{ fontWeight:600, fontSize:13 }}>{q.text}</div>
                {q.options && <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:4 }}>{q.options.map((o: string) => <span key={o} style={{ background:'#fff', border:'1px solid #EDEDED', borderRadius:6, padding:'3px 9px', fontSize:11, color:'#778082' }}>{o}</span>)}</div>}
              </div>
            ))}
            <div style={{ border:'2px dashed #EDEDED', borderRadius:10, padding:14, marginTop:8 }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#034C8B', marginBottom:10 }}>Adicionar pergunta</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div><label style={lbl}>Tipo</label>
                  <select style={inp} value={qType} onChange={e=>setQType(e.target.value)}>
                    <option value="text">Texto livre</option>
                    <option value="mc">Múltipla escolha</option>
                    <option value="scale">Escala (1 a 5)</option>
                    <option value="yn">Sim / Não</option>
                  </select>
                </div>
                <div><label style={lbl}>Obrigatória?</label>
                  <select style={inp} value={qReq?'1':'0'} onChange={e=>setQReq(e.target.value==='1')}>
                    <option value="1">Sim</option><option value="0">Não</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop:8 }}><label style={lbl}>Texto da pergunta</label>
                <input style={inp} value={qText} onChange={e=>setQText(e.target.value)} placeholder="Digite a pergunta aqui..." onKeyDown={e=>e.key==='Enter'&&qType!=='mc'&&addQuestion()}/>
              </div>
              {qType==='mc' && <div style={{ marginTop:8 }}><label style={lbl}>Opções (uma por linha)</label>
                <textarea style={{ ...inp, minHeight:72, resize:'vertical' as const }} value={qOpts} onChange={e=>setQOpts(e.target.value)} placeholder={'Li completo\nLi parcial\nNão li'}/>
              </div>}
              <button onClick={addQuestion} style={{ marginTop:10, padding:'9px 18px', background:'linear-gradient(135deg,#031D38,#3B82F6)', color:'#fff', border:'none', borderRadius:100, fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>+ Adicionar pergunta</button>
            </div>
          </div>
        </div>
      )}

      {/* RESPONSES */}
      {view==='responses' && selectedForm && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:16 }}>{selectedForm.name}</div>
              <div style={{ fontSize:12, color:'#778082' }}>{selectedForm.client} · {responses.length} resposta{responses.length!==1?'s':''}</div>
              {selectedForm.protocolo && <div style={{ fontSize:10, color:'#aaa', fontFamily:'monospace' }}>Protocolo: {selectedForm.protocolo}</div>}
            </div>
            <button onClick={() => exportCSV(selectedForm.id)} style={{ padding:'8px 16px', background:'#fff8e1', color:'#7c6200', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Exportar CSV</button>
          </div>
          {!responses.length && <div style={{ background:'#fff', borderRadius:12, padding:40, textAlign:'center', color:'#778082' }}>Nenhuma resposta ainda.</div>}
          {responses.map((r, ri) => (
            <div key={r.id} style={{ background:'#fff', borderRadius:12, padding:16, marginBottom:10, border:'1px solid #EDEDED' }}>
              <div style={{ fontSize:11, color:'#778082', marginBottom:10, fontFamily:'monospace' }}>Resposta #{ri+1} · {new Date(r.submitted_at).toLocaleString('pt-BR')}</div>
              {Object.values(r.answers as any).map((a: any, ai: number) => (
                <div key={ai} style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:8, fontSize:12, padding:'6px 0', borderBottom:'1px solid #EDEDED' }}>
                  <div style={{ color:'#778082', fontSize:11 }}>{a.question}</div>
                  <div style={{ fontWeight:600 }}>{a.answer||'—'}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
