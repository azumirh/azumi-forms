import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '../../lib/supabase'
import { Form, Question } from '../../lib/types'

export default function FormPage() {
  const router = useRouter()
  const { id } = router.query as { id: string }

  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (!id) return
    loadForm()
  }, [id])

  async function loadForm() {
    const { data, error } = await supabase.from('forms').select('*').eq('id', id).single()
    setLoading(false)
    if (error || !data) { setNotFound(true); return }
    if (data.expiry) {
      const exp = new Date(data.expiry + 'T23:59:59')
      if (new Date() > exp) { setExpired(true); setForm(data); return }
    }
    setForm(data)
  }

  function setAnswer(qId: string, value: string) {
    setAnswers(prev => ({ ...prev, [qId]: value }))
  }

  async function handleSubmit() {
    if (!form) return
    const missing: string[] = []
    form.questions.forEach(q => {
      if (q.required && !answers[q.id]?.trim()) missing.push(q.id)
    })
    if (missing.length) { setErrors(missing); return }
    setErrors([])
    setSubmitting(true)

    const answersPayload: Record<string, { question: string; answer: string }> = {}
    form.questions.forEach(q => {
      answersPayload[q.id] = { question: q.text, answer: answers[q.id] || '' }
    })

    await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        form_id: form.id,
        form_name: form.name,
        client: form.client,
        answers: answersPayload,
      }),
    })

    setSubmitting(false)
    setSubmitted(true)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f7' }}>
      <div style={{ color: '#778082', fontFamily: 'JetBrains Mono', fontSize: 12 }}>Carregando...</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f7' }}>
      <div style={{ textAlign: 'center', color: '#778082' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#222' }}>Formulário não encontrado</div>
        <div style={{ fontSize: 13, marginTop: 6 }}>Verifique o link com a Azumi RH.</div>
      </div>
    </div>
  )

  const AzumiHeader = () => (
    <div style={{ background: 'linear-gradient(135deg,#031D38 0%,#034C8B 40%,#3B82F6 75%,#8B5CF6 100%)', borderRadius: '12px 12px 0 0', padding: '24px 28px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 40% 80% at 90% 50%,rgba(139,92,246,.25) 0%,transparent 60%)', pointerEvents: 'none' }}/>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'Sora, sans-serif', marginBottom: 3 }}>{form?.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(147,197,253,.8)', fontFamily: 'JetBrains Mono', letterSpacing: '.1em', textTransform: 'uppercase' }}>{form?.client}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <svg width="28" height="22" viewBox="0 0 120 96" fill="none">
            <circle cx="44" cy="48" r="34" fill="#3B82F6" opacity=".9"/>
            <circle cx="76" cy="48" r="34" fill="#8B5CF6" opacity=".7"/>
          </svg>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 600, fontSize: 20, color: '#fff' }}>azumi</span>
          <span style={{ fontFamily: 'Poppins, sans-serif', fontStyle: 'italic', fontWeight: 400, fontSize: 20, color: 'rgba(147,197,253,.85)' }}>RH</span>
        </div>
      </div>
    </div>
  )

  if (expired) return (
    <div style={{ minHeight: '100vh', background: '#f0f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 520, width: '100%', margin: '0 16px' }}>
        <AzumiHeader />
        <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', padding: '32px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⏰</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Formulário encerrado</div>
          <div style={{ fontSize: 13, color: '#778082' }}>
            Este formulário expirou em {new Date(form!.expiry! + 'T00:00:00').toLocaleDateString('pt-BR')}. Entre em contato com a Azumi RH.
          </div>
        </div>
      </div>
    </div>
  )

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: '#f0f2f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Head><title>Obrigado · Azumi RH</title></Head>
      <div style={{ maxWidth: 520, width: '100%', margin: '0 16px' }}>
        <AzumiHeader />
        <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', padding: '40px 28px', textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Resposta enviada!</div>
          <div style={{ fontSize: 13, color: '#778082', lineHeight: 1.7 }}>Obrigado. Suas respostas foram registradas pela <strong>Azumi RH</strong>.</div>
          <div style={{ marginTop: 24, fontSize: 11, color: '#778082', fontFamily: 'JetBrains Mono' }}>contato@azumirh.com.br · azumirh.com.br</div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f7', padding: '24px 16px' }}>
      <Head><title>{form?.name} · Azumi RH</title></Head>
      <div style={{ maxWidth: 580, margin: '0 auto' }}>
        <AzumiHeader />
        <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', border: '1px solid #EDEDED', borderTop: 'none', padding: '24px 28px' }}>
          {form?.expiry && (
            <div style={{ background: '#fff8e1', border: '1px solid #ffd54f', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#7c6200', marginBottom: 16 }}>
              📅 Disponível até {new Date(form.expiry + 'T00:00:00').toLocaleDateString('pt-BR')}
            </div>
          )}
          {form?.description && (
            <div style={{ fontSize: 13, color: '#778082', marginBottom: 20, lineHeight: 1.7 }}>{form.description}</div>
          )}

          {form?.questions.map((q, i) => (
            <QuestionRenderer
              key={q.id}
              q={q}
              index={i}
              value={answers[q.id] || ''}
              onChange={v => setAnswer(q.id, v)}
              hasError={errors.includes(q.id)}
            />
          ))}

          {errors.length > 0 && (
            <div className="alert" style={{ marginBottom: 14 }}>
              Por favor, responda todas as perguntas obrigatórias (*).
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg,#034C8B 0%,#3B82F6 50%,#8B5CF6 100%)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? .7 : 1, fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {submitting ? 'Enviando...' : 'Enviar respostas'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 10, color: '#778082', fontFamily: 'JetBrains Mono', letterSpacing: '.05em' }}>
            AZUMI RH · contato@azumirh.com.br · azumirh.com.br
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionRenderer({ q, index, value, onChange, hasError }: {
  q: Question; index: number; value: string; onChange: (v: string) => void; hasError: boolean
}) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#222', display: 'flex', gap: 4 }}>
        <span style={{ color: '#778082' }}>{index + 1}.</span>
        <span>{q.text}</span>
        {q.required && <span style={{ color: '#e24b4a' }}>*</span>}
      </div>

      {hasError && <div style={{ fontSize: 11, color: '#b91c1c', marginBottom: 6 }}>Campo obrigatório</div>}

      {q.type === 'text' && (
        <textarea
          style={{ width: '100%', padding: '10px 12px', border: `1.5px solid ${hasError ? '#fecaca' : '#EDEDED'}`, borderRadius: 8, fontSize: 13, fontFamily: 'Space Grotesk, sans-serif', minHeight: 80, resize: 'vertical', outline: 'none' }}
          placeholder="Sua resposta..."
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}

      {q.type === 'mc' && q.options?.map(opt => (
        <button key={opt} onClick={() => onChange(opt)}
          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: `1.5px solid ${value === opt ? '#3B82F6' : hasError ? '#fecaca' : '#EDEDED'}`, borderRadius: 8, fontSize: 13, cursor: 'pointer', background: value === opt ? '#eff6ff' : '#fff', color: value === opt ? '#034C8B' : '#222', marginBottom: 6, fontWeight: value === opt ? 600 : 400, fontFamily: 'Space Grotesk, sans-serif', transition: 'all .12s' }}>
          {opt}
        </button>
      ))}

      {q.type === 'scale' && (
        <div style={{ display: 'flex', gap: 6 }}>
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => onChange(String(n))}
              style={{ flex: 1, padding: '10px 4px', border: `1.5px solid ${value === String(n) ? '#3B82F6' : hasError ? '#fecaca' : '#EDEDED'}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: value === String(n) ? '#eff6ff' : '#fff', color: value === String(n) ? '#034C8B' : '#222', fontFamily: 'Space Grotesk, sans-serif', transition: 'all .12s' }}>
              {n}
            </button>
          ))}
        </div>
      )}

      {q.type === 'yn' && (
        <div style={{ display: 'flex', gap: 8 }}>
          {['Sim', 'Não'].map(opt => (
            <button key={opt} onClick={() => onChange(opt)}
              style={{ flex: 1, padding: '10px', border: `1.5px solid ${value === opt ? '#3B82F6' : hasError ? '#fecaca' : '#EDEDED'}`, borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: value === opt ? '#eff6ff' : '#fff', color: value === opt ? '#034C8B' : '#222', fontFamily: 'Space Grotesk, sans-serif', transition: 'all .12s' }}>
              {opt === 'Sim' ? '✓ Sim' : '✗ Não'}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
