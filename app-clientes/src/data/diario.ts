/**
 * Diário do cabelo: um registro por dia (frizz, brilho e maciez, de 1 a 5).
 * Fica no aparelho (localStorage) para a tela responder na hora. No modo conectado, cada registro
 * também é gravado na nuvem (tabela diario_cabelo) e, ao entrar ou sincronizar, os dias da nuvem
 * são mesclados com os do aparelho: vale o registro mais recente de cada dia (regras em mesclar.ts).
 */
import { useSyncExternalStore } from 'react'
import { diasEntre, hojeISO, somarDias } from '../lib/regras'
import { modoNuvem, nuvem } from './nuvem'
import { mesclarDiario, type Sinc } from './mesclar'
import { toast } from '../ds/extras'

export type Nota = 1 | 2 | 3 | 4 | 5
export type Metrica = 'frizz' | 'brilho' | 'maciez'
export interface RegistroDiario { data: string; frizz: Nota; brilho: Nota; maciez: Nota }
/** sinc: controle de envio de cada dia (só no modo conectado). */
interface SalvoDiario { registros: RegistroDiario[]; sinc?: Record<string, Sinc> }

/* ---------- armazenamento no aparelho ---------- */
const PREFIXO = 'imperio-diario-'
const ouvintes = new Set<() => void>()
const cache = new Map<string, SalvoDiario>()

function ler(id: string): SalvoDiario {
  if (!cache.has(id)) {
    let v: SalvoDiario = { registros: [] }
    try {
      const bruto = localStorage.getItem(PREFIXO + id)
      if (bruto) v = { ...v, ...JSON.parse(bruto) }
    } catch { /* vazio */ }
    cache.set(id, v)
  }
  return cache.get(id)!
}
function gravar(id: string, v: SalvoDiario) {
  cache.set(id, v)
  try { localStorage.setItem(PREFIXO + id, JSON.stringify(v)) } catch { /* sem espaço: fica só na memória */ }
  ouvintes.forEach((o) => o())
}
const assinar = (o: () => void) => (ouvintes.add(o), () => { ouvintes.delete(o) })

export const METRICAS: { id: Metrica; nome: string; ajuda: string; cor: string; melhorAlto: boolean }[] = [
  { id: 'frizz', nome: 'Frizz', ajuda: '1 = quase nada · 5 = muito', cor: 'var(--graf-2)', melhorAlto: false },
  { id: 'brilho', nome: 'Brilho', ajuda: '1 = opaco · 5 = muito brilho', cor: 'var(--graf-1)', melhorAlto: true },
  { id: 'maciez', nome: 'Maciez', ajuda: '1 = áspero · 5 = muito macio', cor: 'var(--graf-3)', melhorAlto: true },
]

export function useDiario(clienteId: string) {
  return useSyncExternalStore(assinar, () => ler(clienteId)).registros
}
export function registrarDia(clienteId: string, r: RegistroDiario) {
  const s = ler(clienteId)
  const registros = [...s.registros.filter((x) => x.data !== r.data), r].sort((a, b) => a.data.localeCompare(b.data))
  if (!modoNuvem()) return gravar(clienteId, { registros })
  gravar(clienteId, { registros, sinc: { ...s.sinc, [r.data]: { em: new Date().toISOString(), pendente: true } } })
  void enviarPendentes(clienteId)
}

/* ---------- modo conectado: nuvem ---------- */
const AVISO_FALHA = 'Não foi possível salvar o diário na nuvem agora. Ele ficou guardado neste aparelho e vai ser enviado de novo.'
let fila: Promise<void> = Promise.resolve()
/** Envia os dias ainda não enviados, uma leva de cada vez. */
function enviarPendentes(clienteId: string) {
  fila = fila.then(async () => {
    const s = ler(clienteId)
    const sinc = s.sinc ?? {}
    const dias = s.registros.filter((r) => sinc[r.data]?.pendente)
    if (!dias.length) return
    const enviados = Object.fromEntries(dias.map((r) => [r.data, sinc[r.data].em]))
    try {
      const doServidor = await nuvem.salvarDiario(clienteId, dias)
      const agora = ler(clienteId)
      const novo = { ...agora.sinc }
      // só marca como enviado o dia que não mudou enquanto o envio acontecia
      for (const [dia, em] of Object.entries(doServidor)) if (novo[dia]?.em === enviados[dia]) novo[dia] = { em, pendente: false }
      gravar(clienteId, { ...agora, sinc: novo })
    } catch (e) {
      console.warn('Diário não foi para a nuvem', e)
      toast(AVISO_FALHA)
    }
  })
  return fila
}

const nota = (n: number): Nota => (Math.min(5, Math.max(1, Math.round(n))) as Nota)

/**
 * Modo conectado: carrega o diário da nuvem e mescla com o do aparelho, dia a dia.
 * Lança erro se a nuvem não responder (o que está no aparelho continua valendo).
 */
export async function sincronizarDiario(clienteId: string) {
  if (!modoNuvem()) return
  const nuvemDias = (await nuvem.carregarDiario(clienteId)).map((d) => ({ ...d, frizz: nota(d.frizz), brilho: nota(d.brilho), maciez: nota(d.maciez) }))
  const s = ler(clienteId)
  const r = mesclarDiario(s.registros, s.sinc ?? {}, nuvemDias)
  gravar(clienteId, { registros: r.registros, sinc: r.sinc })
  if (r.enviar.length) await enviarPendentes(clienteId)
}
/** Demonstração: troca todos os registros (usado pela semente da cliente demo). */
export function substituirDiario(clienteId: string, registros: RegistroDiario[]) {
  gravar(clienteId, { registros: [...registros].sort((a, b) => a.data.localeCompare(b.data)) })
}
export const registroDeHoje = (clienteId: string) => ler(clienteId).registros.find((r) => r.data === hojeISO())

/** Os últimos N dias (do mais antigo para hoje), com o registro de cada um quando houver. */
export function ultimosDias(registros: RegistroDiario[], n = 14, hoje = hojeISO()) {
  const porData = new Map(registros.map((r) => [r.data, r]))
  return Array.from({ length: n }, (_, i) => {
    const data = somarDias(hoje, i - (n - 1))
    return { data, registro: porData.get(data) }
  })
}

const media = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)

/** Uma dica simples a partir dos últimos registros. */
export function insightDiario(registros: RegistroDiario[], hoje = hojeISO()): { texto: string; rota?: string; acao?: string } {
  const recentes = registros.filter((r) => diasEntre(r.data, hoje) >= 0 && diasEntre(r.data, hoje) < 14)
  if (recentes.length < 3) {
    const faltam = 3 - recentes.length
    return { texto: `Registre mais ${faltam} ${faltam === 1 ? 'dia' : 'dias'} para ver como seu cabelo está evoluindo.` }
  }
  const ult = recentes.slice(-3)
  const ant = recentes.slice(0, -3)
  const fUlt = media(ult.map((r) => r.frizz))
  const bUlt = media(ult.map((r) => r.brilho))
  const mUlt = media(ult.map((r) => r.maciez))
  if (ant.length >= 2) {
    const fAnt = media(ant.map((r) => r.frizz))
    const bAnt = media(ant.map((r) => r.brilho))
    const mAnt = media(ant.map((r) => r.maciez))
    if (fUlt - fAnt >= 1) return { texto: 'O frizz subiu nos últimos dias. Em dias úmidos, um finalizador antifrizz no cabelo ainda úmido ajuda bastante.', rota: '/cuidados', acao: 'Ver meu cronograma' }
    if (mAnt - mUlt >= 1) return { texto: 'A maciez caiu um pouco. Pode ser hora de uma hidratação: ela devolve água ao fio.', rota: '/cuidados/H', acao: 'Como fazer a hidratação' }
    if (bAnt - bUlt >= 1) return { texto: 'O brilho diminuiu. Uma nutrição com óleo nas pontas costuma devolver o brilho.', rota: '/cuidados/N', acao: 'Como fazer a nutrição' }
    if (fAnt - fUlt >= 1 || bUlt - bAnt >= 1 || mUlt - mAnt >= 1) return { texto: 'Seu cabelo melhorou nos últimos dias. O que você está fazendo está funcionando, continue assim!' }
  }
  if (fUlt >= 4) return { texto: 'O frizz anda alto. Seque com o difusor ou com ar frio no final e use um finalizador nas pontas.', rota: '/cuidados', acao: 'Ver meu cronograma' }
  if (mUlt <= 2) return { texto: 'O fio está pedindo hidratação. Que tal fazer uma máscara esta semana?', rota: '/cuidados/H', acao: 'Como fazer a hidratação' }
  if (bUlt >= 4 && mUlt >= 4 && fUlt <= 2) return { texto: 'Cabelo em ótima fase: muito brilho, maciez e pouco frizz. Que tal registrar uma foto na Evolução?', rota: '/evolucao', acao: 'Abrir a Evolução' }
  return { texto: 'Seu cabelo está estável. Manter o cronograma em dia faz toda a diferença.' }
}
