import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { form_id, form_name, client, answers } = req.body

  if (!form_id || !answers) return res.status(400).json({ error: 'Dados incompletos' })

  // Save to Supabase
  const { error: dbError } = await supabase.from('responses').insert({
    form_id,
    form_name,
    client,
    answers,
    submitted_at: new Date().toISOString(),
  })

  if (dbError) return res.status(500).json({ error: dbError.message })

  // Build email HTML
  const answersHtml = Object.values(answers as Record<string, { question: string; answer: string }>)
    .map(a => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #EDEDED;color:#778082;font-size:12px;vertical-align:top;width:200px">${a.question}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #EDEDED;font-size:12px;font-weight:600;color:#222">${a.answer || '—'}</td>
      </tr>
    `).join('')

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: 'Arial', sans-serif; background: #f0f2f7; margin: 0; padding: 20px; }
    .wrap { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; }
    .hdr { background: linear-gradient(135deg,#031D38 0%,#034C8B 40%,#3B82F6 75%,#8B5CF6 100%); padding: 22px 28px; }
    .hdr-title { color: #fff; font-size: 18px; font-weight: 700; margin-bottom: 3px; }
    .hdr-sub { color: rgba(147,197,253,.8); font-size: 11px; letter-spacing: .1em; text-transform: uppercase; }
    .body { padding: 24px 28px; }
    .badge { display: inline-block; background: #e9f2ff; color: #034C8B; border-radius: 100px; padding: 3px 12px; font-size: 11px; font-weight: 700; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    .foot { padding: 16px 28px; border-top: 1px solid #EDEDED; font-size: 10px; color: #778082; letter-spacing: .05em; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-title">Nova resposta recebida</div>
    <div class="hdr-sub">Azumi RH · Form Builder</div>
  </div>
  <div class="body">
    <span class="badge">${client}</span>
    <p style="font-size:13px;color:#222;margin-bottom:6px"><strong>Formulário:</strong> ${form_name}</p>
    <p style="font-size:12px;color:#778082;margin-bottom:16px">Recebido em ${new Date().toLocaleString('pt-BR')}</p>
    <table>
      ${answersHtml}
    </table>
  </div>
  <div class="foot">
    AZUMI RH · contato@azumirh.com.br · azumirh.com.br · WhatsApp: +55 41 98835-0743
  </div>
</div>
</body>
</html>
`

  // Send email via Resend
  await resend.emails.send({
    from: 'Azumi Forms <onboarding@resend.dev>',
    to: process.env.NOTIFY_EMAIL || 'contato@azumirh.com.br',
    subject: `📋 Nova resposta: ${form_name} (${client})`,
    html: emailHtml,
  })

  return res.status(200).json({ success: true })
}
