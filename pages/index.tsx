import { useState } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

const DARK = '#031D38'
const HDR = `linear-gradient(135deg,#031D38 0%,#052E5A 60%,#0A3F7A 100%)`
const FORM_TYPES = ['Pesquisa', 'Questionário', 'Avaliação', 'Diagnóstico', 'Outro']

const Logo = () => (
  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
    <svg width="28" height="22" viewBox="0 0 120 96" fill="none">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="120" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4A90D9"/>
          <stop offset="100%" stopColor="#6EB3F7"/>
        </linearGradient>
      </defs>
      <circle cx="44" cy="48" r="34" fill="url(#lg)" opacity=".95"/>
      <circle cx="76" cy="48" r="34" fill="url(#lg)" opacity=".7"/>
    </svg>
    <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:20, color:'#fff', letterSpacing:'-.01em' }}>azumi</span>
    <span style={{ fontFamily:'Poppins,sans-serif', fontStyle:'italic', fontWeight:400, fontSize:20, color:'#93C5FD' }}>RH</span>
  </div>
)

function gerarProtocolo() {
  const now = new Date()
  const ano = now.getFullYear()
  const mes = String(now.getMonth()+1).padStart(2,'0')
  const rand = Math.floor(Math.random()*90000)+10000
  return `AZ-${ano}${mes}-${rand}`
}

function downloadCard(name: string, onDone: () => void) {
  const el = document.getElementById('qr-card-inner')
  if (!el) return
  const load = () => {
    ;(window as any).html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff' }).then((canvas: any) => {
      const link = document.createElement('a')
      link.download = `card-${name}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      onDone()
    })
  }
  if ((window as any).html2canvas) { load(); return }
  const s = document.createElement('script')
  s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
  s.onload = load
  document.head.appendChild(s)
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
  const [downloading, setDownloading] = useState(false)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  function handleLogin() {
    const pwd = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'azumi2024'
    if (password === pwd) { setAuth(true); loadForms() }
    else { setAuthError('Senha incorreta.') }
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
      form_type: fType, protocolo,
      created_by: adminName || 'Admin',
    })
    setSaving(false)
    if (error) return showToast('Erro ao salvar: ' + error.message)
    showToast(`Criado! Protocolo: ${protocolo}`)
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
    showToast('Apagado.'); loadForms()
  }

  async function viewResponses(form: any) {
    setSelectedFormId(form.id)
    const { data } = await supabase.from('responses').select('*').eq('form_id', form.id).order('submitted_at', { ascending: false })
    setResponses(data || []); setView('responses')
  }

  async function exportCSV(formId: string) {
    const { data } = await supabase.from('responses').select('*').eq('form_id', formId).order('submitted_at', { ascending: false })
    if (!data || !data.length) return showToast('Sem respostas.')
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

  const inp: React.CSSProperties = {
    width:'100%', padding:'10px 12px', border:'1.5px solid #EDEDED',
    borderRadius:8, fontSize:14, fontFamily:'inherit', color:'#222',
    background:'#fff', boxSizing:'border-box' as const
  }
  const lbl: React.CSSProperties = {
    fontSize:11, fontWeight:700, letterSpacing:'.06em',
    textTransform:'uppercase' as const, color:'#778082',
    display:'block', marginBottom:5, marginTop:12
  }
  const sectionTitle: React.CSSProperties = {
    fontSize:11, fontWeight:700, letterSpacing:'.1em',
    textTransform:'uppercase' as const, color:'#034C8B', marginBottom:12
  }

  if (!auth) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f0f2f7', padding:16 }}>
      <Head><title>Admin · Azumi Forms</title></Head>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:'100%', maxWidth:360, textAlign:'center', boxShadow:'0 4px 24px rgba(0,0,0,.08)' }}>
        <svg width="44" height="35" viewBox="0 0 120 96" fill="none" style={{ margin:'0 auto 10px', display:'block' }}>
          <defs>
            <linearGradient id="lg0" x1="0" y1="0" x2="120" y2="96" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4A90D9"/><stop offset="100%" stopColor="#6EB3F7"/>
            </linearGradient>
          </defs>
          <circle cx="44" cy="48" r="34" fill="url(#lg0)" opacity=".95"/>
          <circle cx="76" cy="48" r="34" fill="url(#lg0)" opacity=".7"/>
        </svg>
        <div style={{ marginBottom:4 }}>
          <span style={{ fontFamily:'Poppins,sans-serif', fontWeight:600, fontSize:26, color:'#031D38' }}>azumi</span>
          <span style={{ fontFamily:'Poppins,sans-serif', fontStyle:'italic', fontWeight:400, fontSize:26, color:'#3B82F6' }}>RH</span>
        </div>
        <div style={{ fontSize:11, color:'#778082', fontFamily:'monospace', letterSpacing:'.1em', marginBottom:22 }}>FORM BUILDER · ADMIN</div>
        <label style={lbl}>Seu nome</label>
        <input style={{ ...inp, marginBottom:4 }} placeholder="Ex.: Ana Azumi" value={adminName} onChange={e => setAdminNameState(e.target.value)}/>
        <label style={lbl}>Senha</label>
        <input style={{ ...inp, marginBottom:4 }} type="password" placeholder="Senha de acesso" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==='Enter' && handleLogin()} />
        {authError && <div style={{ color:'#b91c1c', fontSize:13, marginBottom:8, marginTop:4 }}>{authError}</div>}
        <button onClick={handleLogin} style={{ width:'100%', padding:'13px', background:HDR, color:'#fff', border:'none', borderRadius:100, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit', marginTop:8 }}>Entrar</button>
      </div>
    </div>
  )

  return (
    <div style={{ maxWidth:700, margin:'0 auto', padding:'16px 12px', boxSizing:'border-box' as const }}>
      <Head><title>Admin · Azumi Forms</title></Head>

      {/* TOAST */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:DARK, color:'#fff', padding:'10px 20px', borderRadius:100, fontSize:13, fontWeight:600, zIndex:999, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}

      {/* QR MODAL */}
      {showQR && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }} onClick={() => setShowQR(null)}>
          <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', width:'100%', maxWidth:360 }} onClick={e => e.stopPropagation()}>
            <div id="qr-card-inner">
              <div style={{ background:HDR, padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ color:'#fff', fontWeight:700, fontSize:14 }}>{showQR.name}</div>
                  <div style={{ color:'rgba(147,197,253,.8)', fontSize:11, marginTop:2 }}>{showQR.client} · {showQR.form_type || 'Formulário'}</div>
                </div>
                <Logo/>
              </div>
              {showQR.logo_url && (
                <div style={{ background:'#f8f9fb', padding:'10px 20px', borderBottom:'1px solid #EDEDED', display:'flex', alignItems:'center', gap:10 }}>
                  <img src={showQR.logo_url} alt="Logo" style={{ height:28, objectFit:'contain' as const }}/>
                  <span style={{ fontSize:11, color:'#778082' }}>{showQR.client}</span>
                </div>
              )}
              <div style={{ padding:'16px 20px', textAlign:'center', background:'#fff' }}>
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(baseUrl+'/forms/'+showQR.id)}`}
                  alt="QR Code" style={{ borderRadius:8, width:180, height:180, border:'1px solid #EDEDED' }}/>
                <div style={{ marginTop:8, fontSize:10, color:'#778082', wordBreak:'break-all', fontFamily:'monospace' }}>{baseUrl}/forms/{showQR.id}</div>
              </div>
              <div style={{ background:HDR, padding:'12px 20px', textAlign:'center' }}>
                <div style={{ color:'#fff', fontWeight:700, fontSize:13 }}>Sua participação é muito importante!</div>
                <div style={{ color:'rgba(147,197,253,.8)', fontSize:11, marginTop:3 }}>Em caso de dúvidas, procure a Azumi RH ou seu gestor.</div>
              </div>
            </div>
            <div style={{ padding:'12px 16px', display:'flex', gap:8, background:'#fff' }}>
              <button onClick={() => { navigator.clipboard.writeText(`${baseUrl}/forms/${showQR.id}`); showToast('Link copiado!'); }}
                style={{ flex:1, padding:'10px 4px', background:'#e9f2ff', color:'#034C8B', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Copiar link
              </button>
              <button disabled={downloading} onClick={() => { setDownloading(true); downloadCard(showQR.name, () => { setDownloading(false); showToast('Card baixado!') }) }}
                style={{ flex:1, padding:'10px 4px', background:'#f3f0ff', color:'#5B21B6', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                {downloading ? 'Baixando...' : 'Baixar card'}
              </button>
              <button onClick={() => setShowQR(null)}
                style={{ flex:1, padding:'10px 4px', background:DARK, color:'#fff', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background:HDR, borderRadius:14, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, gap:8 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
          <Logo/>
          {adminName && <span style={{ fontSize:10, color:'rgba(147,197,253,.7)', fontFamily:'monospace', paddingLeft:2 }}>Olá, {adminName}</span>}
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          {view !== 'list' && (
            <button onClick={() => setView('list')} style={{ background:'rgba(255,255,255,.12)', color:'#fff', border:'1px solid rgba(255,255,255,.2)', borderRadius:100, padding:'8px 14px', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' as const }}>← Voltar</button>
          )}
          {view === 'list' && (
            <button onClick={() => { setView('new'); setQuestions([]); }} style={{ background:'rgba(255,255,255,.15)', color:'#fff', border:'1px solid rgba(255,255,255,.25)', borderRadius:100, padding:'8px 14px', fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' as const }}>+ Novo</button>
          )}
          {view === 'new' && (
            <button onClick={saveForm} disabled={saving} style={{ background:'#fff', color:DARK, border:'none', borderRadius:100, padding:'8px 14px', fontWeight:700, fontSize:12, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap' as const }}>{saving ? 'Salvando...' : 'Salvar'}</button>
          )}
        </div>
      </div>

      {/* LIST */}
      {view === 'list' && (
        <div>
          <div style={{ ...sectionTitle, display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
            <span style={{ display:'inline-block', width:3, height:14, borderRadius:100, background:'linear-gradient(#034C8B,#3B82F6)', flexShrink:0 }}></span>
            Formulários criados ({forms.length})
          </div>
          {!forms.length && (
            <div style={{ background:'#fff', borderRadius:12, padding:32, textAlign:'center', color:'#778082', border:'1px solid #EDEDED', fontSize:14 }}>
              Nenhum formulário ainda.
            </div>
          )}
          {forms.map(f => (
            <div key={f.id} style={{ background:'#fff', borderRadius:12, padding:'14px 16px', marginBottom:12, border:'1px solid #EDEDED', boxShadow:'0 2px 8px rgba(0,0,0,.04)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6, gap:8 }}>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:3 }}>{f.name}</div>
                  <div style={{ fontSize:11, color:'#778082', lineHeight:1.5 }}>
                    {f.form_type && <span style={{ background:'#e9f2ff', color:'#034C8B', borderRadius:100, padding:'1px 8px', fontSize:10, fontWeight:700, marginRight:5 }}>{f.form_type}</span>}
                    {f.client} · {f.questions.length} perguntas · {new Date(f.created_at).toLocaleDateString('pt-BR')}
                    {f.expiry && <> · até {new Date(f.expiry + 'T00:00:00').toLocaleDateString('pt-BR')}</>}
                  </div>
                  {f.protocolo && <div style={{ fontSize:10, color:'#aaa', fontFamily:'monospace', marginTop:3 }}>Protocolo: {f.protocolo}{f.created_by ? ` · ${f.created_by}` : ''}</div>}
                </div>
                {f.logo_url && <img src={f.logo_url} alt="Logo" style={{ height:28, objectFit:'contain' as const, borderRadius:4, flexShrink:0 }}/>}
              </div>
              <div onClick={() => { navigator.clipboard.writeText(`${baseUrl}/forms/${f.id}`); showToast('Link copiado!'); }}
                style={{ background:'#f0f4fa', borderRadius:8, padding:'8px 11px', fontSize:11, fontFamily:'monospace', color:'#034C8B', cursor:'pointer', wordBreak:'break-all', marginBottom:10, lineHeight:1.5 }}>
                {baseUrl}/forms/{f.id}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                <button onClick={() => window.open(`/forms/${f.id}`, '_blank')} style={{ padding:'9px 4px', background:'#e9f2ff', color:'#034C8B', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Ver formulário</button>
                <button onClick={() => viewResponses(f)} style={{ padding:'9px 4px', background:'#e9faf2', color:'#0F6E56', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Ver respostas</button>
                <button onClick={() => exportCSV(f.id)} style={{ padding:'9px 4px', background:'#fff8e1', color:'#7c6200', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Baixar CSV</button>
                <button onClick={() => setShowQR(f)} style={{ padding:'9px 4px', background:'#f3f0ff', color:'#5B21B6', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>QR Code / Card</button>
                <button onClick={() => deleteForm(f.id)} style={{ padding:'9px 4px', background:'#fef2f2', color:'#b91c1c', border:'none', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', gridColumn:'1/-1' }}>Apagar</button>
              </div>
            </div>
          ))}
          <div style={{ textAlign:'center', fontSize:10, color:'#aaa', marginTop:16, fontFamily:'monospace' }}>AZUMI RH · contato@azumirh.com.br · azumirh.com.br</div>
        </div>
      )}

      {/* NEW FORM */}
      {view === 'new' && (
        <div>
          <div style={{ background:'#fff', borderRadius:12, padding:16, marginBottom:12, border:'1px solid #EDEDED' }}>
            <div style={sectionTitle}>Identificação</div>
            <label style={lbl}>Nome do formulário</label>
            <input style={inp} value={fName} onChange={e=>setFName(e.target.value)} placeholder="Ex.: Pesquisa de leitura de políticas"/>
            <label style={lbl}>Cliente</label>
            <input style={inp} value={fClient} onChange={e=>setFClient(e.target.value)} placeholder="Ex.: Empresa X"/>
            <label style={lbl}>Tipo</label>
            <select style={inp} value={fType} onChange={e=>setFType(e.target.value)}>
              {FORM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <label style={lbl}>Instrução para o respondente</label>
            <textarea style={{ ...inp, minHeight:80, resize:'vertical' as const }} value={fDesc} onChange={e=>setFDesc(e.target.value)} placeholder="Ex.: Informe abaixo quais políticas você leu."/>
            <label style={lbl}>Data limite (opcional)</label>
            <input style={inp} type="date" value={fExpiry} onChange={e=>setFExpiry(e.target.value)}/>
            <label style={lbl}>URL da logo do cliente (opcional)</label>
            <input style={inp} value={fLogoUrl} onChange={e=>setFLogoUrl(e.target.value)} placeholder="https://empresa.com/logo.png"/>
            <label style={lbl}>Cor de fundo (identidade do cliente)</label>
            <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:4 }}>
              <input type="color" value={fBgColor} onChange={e=>setFBgColor(e.target.value)} style={{ width:44, height:40, border:'1.5px solid #EDEDED', borderRadius:8, cursor:'pointer', padding:2, flexShrink:0 }}/>
              <input style={{ ...inp }} value={fBgColor} onChange={e=>setFBgColor(e.target.value)} placeholder="#031D38"/>
            </div>
            <label style={lbl}>Mensagem de boas-vindas (pop-up)</label>
            <textarea style={{ ...inp, minHeight:70, resize:'vertical' as const }} value={fWelcome} onChange={e=>setFWelcome(e.target.value)}/>
          </div>

          <div style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #EDEDED' }}>
            <div style={sectionTitle}>Perguntas ({questions.length})</div>
            {questions.map((q, i) => (
              <div key={q.id} style={{ background:'#f8f9fb', border:'1px solid #EDEDED', borderRadius:10, padding:12, marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                  <span style={{ background:'linear-gradient(135deg,#031D38,#3B82F6)', color:'#fff', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{i+1}</span>
                  <span style={{ background:'#e9f2ff', color:'#034C8B', borderRadius:100, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{q.type}</span>
                  {q.required && <span style={{ fontSize:10, color:'#b91c1c', fontWeight:700 }}>OBRIG.</span>}
                  <button onClick={() => setQuestions(prev => prev.filter(x => x.id !== q.id))} style={{ marginLeft:'auto', background:'#fef2f2', color:'#b91c1c', border:'none', borderRadius:6, padding:'3px 10px', fontSize:12, cursor:'pointer', fontFamily:'inherit' }}>✕</button>
                </div>
                <div style={{ fontWeight:600, fontSize:13, lineHeight:1.4, wordBreak:'break-word' }}>{q.text}</div>
                {q.options && <div style={{ marginTop:6, display:'flex', flexWrap:'wrap', gap:4 }}>{q.options.map((o: string) => <span key={o} style={{ background:'#fff', border:'1px solid #EDEDED', borderRadius:6, padding:'3px 9px', fontSize:11, color:'#778082' }}>{o}</span>)}</div>}
              </div>
            ))}
            <div style={{ border:'2px dashed #EDEDED', borderRadius:10, padding:14, marginTop:8 }}>
              <div style={{ ...sectionTitle, marginBottom:10 }}>Adicionar pergunta</div>
              <label style={lbl}>Tipo</label>
              <select style={inp} value={qType} onChange={e=>setQType(e.target.value)}>
                <option value="text">Texto livre</option>
                <option value="mc">Múltipla escolha</option>
                <option value="scale">Escala (1 a 5)</option>
                <option value="yn">Sim / Não</option>
              </select>
              <label style={lbl}>Obrigatória?</label>
              <select style={inp} value={qReq?'1':'0'} onChange={e=>setQReq(e.target.value==='1')}>
                <option value="1">Sim</option><option value="0">Não</option>
              </select>
              <label style={lbl}>Texto da pergunta</label>
              <input style={inp} value={qText} onChange={e=>setQText(e.target.value)} placeholder="Digite a pergunta aqui..." onKeyDown={e=>e.key==='Enter'&&qType!=='mc'&&addQuestion()}/>
              {qType==='mc' && <>
                <label style={lbl}>Opções (uma por linha)</label>
                <textarea style={{ ...inp, minHeight:80, resize:'vertical' as const }} value={qOpts} onChange={e=>setQOpts(e.target.value)} placeholder={'Li completo\nLi parcial\nNão li'}/>
              </>}
              <button onClick={addQuestion} style={{ marginTop:12, width:'100%', padding:'12px', background:'linear-gradient(135deg,#031D38,#3B82F6)', color:'#fff', border:'none', borderRadius:10, fontWeight:700, fontSize:14, cursor:'pointer', fontFamily:'inherit' }}>+ Adicionar pergunta</button>
            </div>
          </div>
          <button onClick={saveForm} disabled={saving} style={{ marginTop:14, width:'100%', padding:'14px', background:HDR, color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:15, cursor:'pointer', fontFamily:'inherit' }}>{saving ? 'Salvando...' : 'Salvar e gerar link'}</button>
        </div>
      )}

      {/* RESPONSES */}
      {view==='responses' && selectedForm && (
        <div>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontWeight:700, fontSize:16 }}>{selectedForm.name}</div>
            <div style={{ fontSize:12, color:'#778082' }}>{selectedForm.client} · {responses.length} resposta{responses.length!==1?'s':''}</div>
            {selectedForm.protocolo && <div style={{ fontSize:10, color:'#aaa', fontFamily:'monospace', marginTop:2 }}>Protocolo: {selectedForm.protocolo}</div>}
            <button onClick={() => exportCSV(selectedForm.id)} style={{ marginTop:10, width:'100%', padding:'11px', background:'#fff8e1', color:'#7c6200', border:'1px solid #ffd54f', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' }}>Exportar CSV (Google Sheets)</button>
          </div>
          {!responses.length && <div style={{ background:'#fff', borderRadius:12, padding:32, textAlign:'center', color:'#778082' }}>Nenhuma resposta ainda.</div>}
          {responses.map((r, ri) => (
            <div key={r.id} style={{ background:'#fff', borderRadius:12, padding:14, marginBottom:10, border:'1px solid #EDEDED' }}>
              <div style={{ fontSize:11, color:'#778082', marginBottom:10, fontFamily:'monospace' }}>Resposta #{ri+1} · {new Date(r.submitted_at).toLocaleString('pt-BR')}</div>
              {Object.values(r.answers as any).map((a: any, ai: number) => (
                <div key={ai} style={{ fontSize:12, padding:'6px 0', borderBottom:'1px solid #EDEDED' }}>
                  <div style={{ color:'#778082', fontSize:11, marginBottom:2 }}>{a.question}</div>
                  <div style={{ fontWeight:600, wordBreak:'break-word' }}>{a.answer||'—'}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
