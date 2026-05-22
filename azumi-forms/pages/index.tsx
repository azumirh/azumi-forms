import { useState, useEffect } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'
import { Form, Question, QuestionType } from '../lib/types'

const TYPE_LABELS: Record<QuestionType, string> = {
  text: 'Texto livre',
  mc: 'Múltipla escolha',
  scale: 'Escala 1–5',
  yn: 'Sim / Não',
}

export default function Admin() {
  const [auth, setAuth] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [forms, setForms] = useState<Form[]>([])
  const [view, setView] = useState<'list' | 'new' | 'responses'>('list')
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null)
  const [responses, setResponses] = useState<any[]>([])

  // New form state
  const [fName, setFName] = useState('')
  const [fClient, setFClient] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fExpiry, setFExpiry] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])

  // New question state
  const [qType, setQType] = useState<QuestionType>('text')
  const [qText, setQText] = useState('')
  const [qOpts, setQOpts] = useState('')
  const [qReq, setQReq] = useState(true)

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function handleLogin() {
    if (password === (process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'azumi2024')) {
      setAuth(true)
      loadForms()
    } else {
      setAuthError('Senha incorreta.')
    }
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
    const { error } = await supabase.from('forms').insert({
      id,
      name: fName,
      client: fClient,
      description: fDesc,
      expiry: fExpiry || null,
      questions,
    })
    setSaving(false)
    if (error) return showToast('Erro ao salvar: ' + error.message)
    showToast('Formulário criado!')
    setFName(''); setFClient(''); setFDesc(''); setFExpiry(''); setQuestions([])
    setView('list')
    loadForms()
  }

  function addQuestion() {
    if (!qText.trim()) return showToast('Digite a pergunta!')
    const q: Question = {
      id: 'q_' + Date.now(),
      type: qType,
      text: qText,
      required: qReq,
    }
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
    showToast('Formulário apagado.')
    loadForms()
  }

  async function viewResponses(form: Form) {
    setSelectedFormId(form.id)
    const { data } = await supabase.from('responses').select('*').eq('form_id', form.id).order('submitted_at', { ascending: false })
    setResponses(data || [])
    setView('responses')
  }

  async function exportCSV(formId: string) {
    const { data } = await supabase.from('responses').select('*').eq('form_id', formId).order('submitted_at', { ascending: false })
    if (!data || !data.length) return showToast('Sem respostas para exportar.')
    const allKeys = new Set<string>()
    data.forEach(r => Object.keys(r.answers).forEach(k => allKeys.add(r.answers[k].question)))
    const headers = ['Data', ...Array.from(allKeys)]
    const rows = data.map(r => [
      r.submitted_at,
      ...Array.from(allKeys).map(q => {
        const found = Object.values(r.answers as any).find((a: any) => a.question === q) as any
        return found?.answer || ''
      })
    ])
    const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `respostas_${formId}.csv`; a.click()
    showToast('CSV exportado! Abra no Google Sheets ou Excel.')
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const selectedForm = forms.find(f => f.id === selectedFormId)

  if (!auth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f7' }}>
      <Head><title>Admin · Azumi Forms</title></Head>
      <div className="card" style={{ width: 360, textAlign: 'center' }}>
        <div style={{ marginBottom: 18 }}>
          <span className="az-logo-a" style={{ color: '#034C8B' }}>azumi</span>
          <span className="az-logo-r" style={{ color: '#8B5CF6' }}>RH</span>
          <div style={{ fontSize: 11, color: '#778082', marginTop: 4, fontFamily: 'JetBrains Mono', letterSpacing: '.08em' }}>FORM BUILDER · ADMIN</div>
        </div>
        <input className="inp" type="password" placeholder="Senha de acesso" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ marginBottom: 10 }} />
        {authError && <div className="alert" style={{ marginBottom: 10 }}>{authError}</div>}
        <button className="btn btn-primary" onClick={handleLogin} style={{ width: '100%' }}>Entrar</button>
      </div>
    </div>
  )

  return (
    <div className="page-wrap">
      <Head><title>Admin · Azumi Forms</title></Head>
      {toast && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#031D38', color: '#fff', padding: '10px 20px', borderRadius: 100, fontSize: 12, fontWeight: 600, zIndex: 999 }}>
          {toast}
        </div>
      )}

      <div className="az-hdr">
        <div className="az-brand">
          <svg width="32" height="26" viewBox="0 0 120 96" fill="none">
            <circle cx="44" cy="48" r="34" fill="#3B82F6" opacity=".9"/>
            <circle cx="76" cy="48" r="34" fill="#8B5CF6" opacity=".7"/>
          </svg>
          <span className="az-logo-a">azumi</span><span className="az-logo-r">RH</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {view !== 'list' && <button className="btn btn-ghost" onClick={() => setView('list')}>← Voltar</button>}
          {view === 'list' && <button className="btn btn-ghost" onClick={() => { setView('new'); setQuestions([]); }}>+ Novo formulário</button>}
          {view === 'new' && <button className="btn btn-primary" onClick={saveForm} disabled={saving}>{saving ? 'Salvando...' : 'Salvar e gerar link'}</button>}
        </div>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div>
          <div className="section-lbl">Formulários criados ({forms.length})</div>
          {!forms.length && (
            <div className="card" style={{ textAlign: 'center', color: '#778082', padding: 32 }}>
              Nenhum formulário ainda. Clique em "+ Novo formulário".
            </div>
          )}
          {forms.map(f => (
            <div key={f.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{f.name}</div>
                <div style={{ fontSize: 11, color: '#778082', marginBottom: 6 }}>
                  🏢 {f.client} &nbsp;·&nbsp; {f.questions.length} perguntas &nbsp;·&nbsp; {new Date(f.created_at).toLocaleDateString('pt-BR')}
                  {f.expiry && <> &nbsp;·&nbsp; até {new Date(f.expiry + 'T00:00:00').toLocaleDateString('pt-BR')}</>}
                </div>
                <div
                  onClick={() => { navigator.clipboard.writeText(`${baseUrl}/forms/${f.id}`); showToast('Link copiado!'); }}
                  style={{ background: '#f0f2f7', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontFamily: 'JetBrains Mono', color: '#034C8B', cursor: 'pointer', wordBreak: 'break-all' }}
                  title="Clique para copiar"
                >
                  📋 {baseUrl}/forms/{f.id}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button className="btn" style={{ background: '#e9f2ff', color: '#034C8B', fontSize: 11, padding: '6px 12px' }}
                  onClick={() => window.open(`/forms/${f.id}`, '_blank')}>
                  👁 Ver
                </button>
                <button className="btn" style={{ background: '#e9faf2', color: '#0F6E56', fontSize: 11, padding: '6px 12px' }}
                  onClick={() => viewResponses(f)}>
                  📊 Respostas
                </button>
                <button className="btn" style={{ background: '#fff8e1', color: '#7c6200', fontSize: 11, padding: '6px 12px' }}
                  onClick={() => exportCSV(f.id)}>
                  ⬇ CSV
                </button>
                <button className="btn btn-danger" style={{ fontSize: 11, padding: '6px 12px' }}
                  onClick={() => deleteForm(f.id)}>
                  🗑 Apagar
                </button>
              </div>
            </div>
          ))}
          <div className="footer">AZUMI RH · contato@azumirh.com.br · azumirh.com.br</div>
        </div>
      )}

      {/* NEW FORM VIEW */}
      {view === 'new' && (
        <div>
          <div className="card">
            <div className="section-lbl">Identificação</div>
            <div className="grid2">
              <div><label className="lbl">Nome do formulário</label><input className="inp" value={fName} onChange={e => setFName(e.target.value)} placeholder="Ex.: Pesquisa de leitura de políticas"/></div>
              <div><label className="lbl">Cliente</label><input className="inp" value={fClient} onChange={e => setFClient(e.target.value)} placeholder="Ex.: Empresa X"/></div>
            </div>
            <div><label className="lbl">Instrução para o respondente</label><textarea className="inp" value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Ex.: Informe abaixo quais políticas você leu."/></div>
            <div style={{ marginTop: 10 }}>
              <label className="lbl">Data limite (opcional)</label>
              <input className="inp" type="date" value={fExpiry} onChange={e => setFExpiry(e.target.value)} style={{ maxWidth: 200 }}/>
            </div>
          </div>

          <div className="card">
            <div className="section-lbl">Perguntas ({questions.length})</div>
            {questions.map((q, i) => (
              <div key={q.id} style={{ background: '#f8f9fb', border: '1px solid #EDEDED', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ background: 'linear-gradient(135deg,#034C8B,#8B5CF6)', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{i+1}</span>
                  <span className="badge badge-blue">{TYPE_LABELS[q.type]}</span>
                  {q.required && <span style={{ fontSize: 10, color: '#b91c1c', fontWeight: 700 }}>OBRIGATÓRIA</span>}
                  <button className="btn btn-danger" style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 9px' }}
                    onClick={() => setQuestions(prev => prev.filter(x => x.id !== q.id))}>✕</button>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{q.text}</div>
                {q.options && <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {q.options.map(o => <span key={o} style={{ background: '#fff', border: '1px solid #EDEDED', borderRadius: 6, padding: '3px 9px', fontSize: 11, color: '#778082' }}>{o}</span>)}
                </div>}
              </div>
            ))}

            <div style={{ border: '2px dashed #EDEDED', borderRadius: 10, padding: 14, marginTop: 8 }}>
              <div className="section-lbl" style={{ marginBottom: 10 }}>Adicionar pergunta</div>
              <div className="grid2">
                <div>
                  <label className="lbl">Tipo</label>
                  <select className="inp" value={qType} onChange={e => setQType(e.target.value as QuestionType)}>
                    <option value="text">Texto livre</option>
                    <option value="mc">Múltipla escolha</option>
                    <option value="scale">Escala (1 a 5)</option>
                    <option value="yn">Sim / Não</option>
                  </select>
                </div>
                <div>
                  <label className="lbl">Obrigatória?</label>
                  <select className="inp" value={qReq ? '1' : '0'} onChange={e => setQReq(e.target.value === '1')}>
                    <option value="1">Sim</option>
                    <option value="0">Não</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <label className="lbl">Texto da pergunta</label>
                <input className="inp" value={qText} onChange={e => setQText(e.target.value)} placeholder="Digite a pergunta aqui..."
                  onKeyDown={e => e.key === 'Enter' && qType !== 'mc' && addQuestion()}/>
              </div>
              {qType === 'mc' && (
                <div style={{ marginTop: 8 }}>
                  <label className="lbl">Opções (uma por linha)</label>
                  <textarea className="inp" value={qOpts} onChange={e => setQOpts(e.target.value)} placeholder={'Li completo\nLi parcial\nNão li'}/>
                </div>
              )}
              <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={addQuestion}>+ Adicionar pergunta</button>
            </div>
          </div>
        </div>
      )}

      {/* RESPONSES VIEW */}
      {view === 'responses' && selectedForm && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedForm.name}</div>
              <div style={{ fontSize: 12, color: '#778082' }}>{selectedForm.client} · {responses.length} resposta{responses.length !== 1 ? 's' : ''}</div>
            </div>
            <button className="btn" style={{ background: '#fff8e1', color: '#7c6200', fontSize: 12 }} onClick={() => exportCSV(selectedForm.id)}>
              ⬇ Exportar CSV (Google Sheets)
            </button>
          </div>

          {!responses.length && (
            <div className="card" style={{ textAlign: 'center', color: '#778082', padding: 32 }}>Nenhuma resposta ainda.</div>
          )}

          {responses.map((r, ri) => (
            <div key={r.id} className="card">
              <div style={{ fontSize: 11, color: '#778082', marginBottom: 10, fontFamily: 'JetBrains Mono' }}>
                Resposta #{ri + 1} · {new Date(r.submitted_at).toLocaleString('pt-BR')}
              </div>
              {Object.values(r.answers as any).map((a: any, ai: number) => (
                <div key={ai} style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 8, fontSize: 12, padding: '6px 0', borderBottom: '1px solid #EDEDED' }}>
                  <div style={{ color: '#778082', fontSize: 11 }}>{a.question}</div>
                  <div style={{ fontWeight: 600 }}>{a.answer || '—'}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
