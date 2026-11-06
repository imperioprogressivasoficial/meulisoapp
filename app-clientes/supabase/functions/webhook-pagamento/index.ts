/**
 * Recebe a confirmação de pagamento do gateway e chama confirmar_pagamento()
 * no banco com a service role (que nunca vai para o navegador).
 *
 * Garantias:
 *  - assinatura HMAC validada antes de qualquer processamento;
 *  - idempotência: cada evento é gravado em webhooks_recebidos e nunca processado duas vezes;
 *  - erros ficam registrados no próprio evento para reprocessamento.
 *
 * O formato do evento depende do gateway escolhido (Mercado Pago, Pagar.me ou Asaas).
 * Implemente lerEvento() conforme a documentação oficial do fornecedor escolhido;
 * a assinatura também segue a regra do fornecedor (cabeçalho e algoritmo).
 * Secrets: GATEWAY_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hmacHex, iguais } from '../_compartilhado/assinatura.ts'

interface Evento {
  id: string // id único do evento no gateway
  aprovado: boolean
  pagamentoId: string // nosso id, enviado ao gateway como referência externa
  gatewayId: string
}

function lerEvento(_json: unknown): Evento {
  throw new Error('Defina o gateway de pagamento e implemente lerEvento() conforme a documentação oficial dele.')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 })
  const corpo = await req.text()
  const recebida = req.headers.get('x-signature') ?? ''
  const esperada = await hmacHex(Deno.env.get('GATEWAY_WEBHOOK_SECRET')!, corpo)
  if (!iguais(recebida, esperada)) return new Response('Assinatura inválida', { status: 401 })

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  let evento: Evento
  try {
    evento = lerEvento(JSON.parse(corpo))
  } catch (e) {
    console.error(e)
    return new Response('Evento não reconhecido', { status: 400 })
  }

  const { error: dup } = await db.from('webhooks_recebidos').insert({ id: evento.id, provedor: 'gateway', payload: JSON.parse(corpo) })
  if (dup) return new Response('ok (já processado)') // chave primária: evento repetido

  try {
    if (evento.aprovado) {
      const { error } = await db.rpc('confirmar_pagamento', { p_pagamento: evento.pagamentoId, p_gateway: 'gateway', p_gateway_id: evento.gatewayId })
      if (error) throw error
    }
    await db.from('webhooks_recebidos').update({ processado_em: new Date().toISOString() }).eq('id', evento.id)
    return new Response('ok')
  } catch (e) {
    await db.from('webhooks_recebidos').update({ erro: String(e) }).eq('id', evento.id)
    return new Response('Erro ao processar', { status: 500 }) // o gateway reenvia
  }
})
