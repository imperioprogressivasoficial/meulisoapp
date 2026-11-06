/**
 * Hook "Send SMS" do Supabase Auth: em vez de SMS, entrega o código de login
 * pelo WhatsApp através de um fluxo do n8n.
 *
 * Configuração (Supabase > Authentication > Hooks > Send SMS hook):
 *   - URL: https://<projeto>.supabase.co/functions/v1/enviar-codigo-whatsapp
 *   - Segredo gerado pelo painel → secret SEND_SMS_HOOK_SECRET
 * Secrets: SEND_SMS_HOOK_SECRET, N8N_WHATSAPP_WEBHOOK_URL, N8N_WEBHOOK_TOKEN
 *
 * Formato conferido na documentação oficial (send-sms-hook.mdx, 31/10/2026):
 * payload { user: { phone }, sms: { otp } }, assinatura Standard Webhooks,
 * segredo sem o prefixo "v1,whsec_"; resposta 200 vazia = sucesso.
 */
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 })
  const corpo = await req.text()
  const segredo = (Deno.env.get('SEND_SMS_HOOK_SECRET') ?? '').replace('v1,whsec_', '')
  let dados: { user: { phone: string }; sms: { otp: string } }
  try {
    dados = new Webhook(segredo).verify(corpo, Object.fromEntries(req.headers)) as typeof dados
  } catch {
    return new Response(JSON.stringify({ error: { http_code: 401, message: 'Assinatura inválida' } }), { status: 401 })
  }

  const r = await fetch(Deno.env.get('N8N_WHATSAPP_WEBHOOK_URL')!, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${Deno.env.get('N8N_WEBHOOK_TOKEN')}` },
    body: JSON.stringify({ telefone: dados.user.phone, codigo: dados.sms.otp, modelo: 'codigo_login' }),
  })
  if (!r.ok) {
    console.error('n8n recusou o envio', r.status)
    return new Response(JSON.stringify({ error: { http_code: 502, message: 'Falha ao enviar o código' } }), { status: 502 })
  }
  return new Response('{}', { headers: { 'content-type': 'application/json' } })
})
