/**
 * Cronograma capilar: plano de 4 semanas que alterna Hidratação, Nutrição e
 * Reconstrução conforme o estado do fio, quantas vezes a cliente lava por semana
 * e se ela fez uma química recente. Vale para todos os tipos de cabelo.
 *
 * O plano e o registro do que foi feito ficam no próprio aparelho (localStorage), para a tela
 * responder na hora. No modo conectado, cada alteração também é gravada na nuvem (tabela cronogramas)
 * e, ao entrar ou sincronizar, o que está na nuvem é carregado e mesclado (regras em mesclar.ts).
 */
import { useSyncExternalStore } from 'react'
import type { Cliente, EstadoFio, Lavagens } from '../types'
import { diasEntre, hojeISO, parseData, somarDias } from '../lib/regras'
import { quimicaRecente } from './perfilCabelo'
import { modoNuvem, nuvem, type CronogramaDaNuvem } from './nuvem'
import { mesclarCronograma, type Sinc } from './mesclar'
import { toast } from '../ds/extras'

export type Etapa = 'H' | 'N' | 'R'
export type { EstadoFio, Lavagens }

export interface PerfilCronograma {
  estado: EstadoFio
  lavagens: Lavagens
  inicio: string // segunda-feira em que o plano começou
  lembretes: boolean
}
// feitos: datas ISO já feitas; sinc: só no modo conectado
interface Salvo { perfil?: PerfilCronograma; feitos: string[]; sinc?: Sinc }

/* ---------- conteúdo de cada etapa ---------- */
/** Produtos sugeridos são TIPOS de produto (nenhuma marca, nenhuma loja). */
export const ETAPA: Record<Etapa, {
  nome: string; curto: string; tom: 'azul' | 'areia' | 'lavanda'; para: string; tempo: string
  passos: string[]; produtos: { nome: string; detalhe: string }[]; evite?: string
}> = {
  H: {
    nome: 'Hidratação', curto: 'Hidratar', tom: 'azul', tempo: '15 a 20 min',
    para: 'Devolve água ao fio: maciez, movimento e brilho. É a base do cronograma de todo tipo de cabelo.',
    passos: [
      'Lave com um shampoo suave, massageando só a raiz.',
      'Retire o excesso de água com uma toalha de microfibra ou uma camiseta, sem esfregar.',
      'Aplique a máscara mecha a mecha, do comprimento às pontas, a dois dedos da raiz.',
      'Espalhe com os dedos ou um pente de dentes largos.',
      'Deixe agir de 15 a 20 minutos. Com touca térmica ou toalha morna o efeito é maior.',
      'Enxágue com água fria ou morna até sair todo o produto.',
      'Finalize como você costuma: leave-in, creme de pentear ou protetor térmico.',
    ],
    produtos: [
      { nome: 'Máscara de hidratação', detalhe: 'Com glicerina, pantenol, aloe vera ou ácido hialurônico' },
      { nome: 'Shampoo suave', detalhe: 'Limpa sem ressecar' },
      { nome: 'Leave-in', detalhe: 'Protege e ajuda a finalizar' },
    ],
  },
  N: {
    nome: 'Nutrição', curto: 'Nutrir', tom: 'areia', tempo: '20 min',
    para: 'Repõe óleos e lipídios: sela a cutícula, controla o frizz da umidade e protege as pontas.',
    passos: [
      'Lave com um shampoo suave.',
      'Aplique a máscara de nutrição no comprimento e nas pontas.',
      'Se quiser, misture 3 a 5 gotas de óleo vegetal na máscara para potencializar.',
      'Deixe agir por 20 minutos.',
      'Enxágue bem, com água fria no final para fechar as cutículas.',
      'Finalize com um finalizador antifrizz ou umas gotas de óleo nas pontas.',
    ],
    produtos: [
      { nome: 'Máscara de nutrição', detalhe: 'Com manteigas e óleos vegetais' },
      { nome: 'Óleo vegetal', detalhe: 'Coco, argan, rícino ou o que seu fio gostar' },
      { nome: 'Finalizador antifrizz', detalhe: 'Sérum, creme ou óleo leve' },
    ],
    evite: 'Não aplique óleo na raiz: pesa e deixa o cabelo oleoso mais rápido.',
  },
  R: {
    nome: 'Reconstrução', curto: 'Reconstruir', tom: 'lavanda', tempo: '10 a 15 min',
    para: 'Repõe a massa (proteínas) perdida com calor, química e o dia a dia. Devolve força e reduz a quebra.',
    passos: [
      'Lave com um shampoo suave.',
      'Aplique a máscara de reconstrução mecha a mecha, sem encostar na raiz.',
      'Deixe agir só o tempo da embalagem (10 a 15 minutos). Passar do tempo enrijece o fio.',
      'Enxágue bem e aplique uma máscara de hidratação por 3 minutos para devolver a maciez.',
      'Finalize com leave-in ou protetor térmico.',
    ],
    produtos: [
      { nome: 'Máscara de reconstrução', detalhe: 'Com queratina, aminoácidos ou proteínas vegetais' },
      { nome: 'Leave-in ou protetor térmico', detalhe: 'Para fechar a etapa' },
    ],
    evite: 'Reconstrução em excesso deixa o fio duro e quebradiço. Siga o cronograma.',
  },
}

/* sequências de 12 sessões por estado do fio (lidas em ordem, semana a semana) */
const SEQUENCIA: Record<EstadoFio, Etapa[]> = {
  saudavel:   ['H', 'H', 'N', 'H', 'N', 'H', 'H', 'H', 'N', 'H', 'N', 'R'],
  ressecado:  ['H', 'N', 'H', 'N', 'H', 'N', 'H', 'N', 'H', 'N', 'H', 'R'],
  danificado: ['H', 'R', 'N', 'H', 'N', 'H', 'R', 'H', 'N', 'H', 'N', 'H'],
}
/* dias da semana das lavagens (0 = segunda) */
const DIAS: Record<Lavagens, number[]> = { 2: [1, 5], 3: [0, 2, 5], 4: [0, 2, 4, 6] }

export const ROTULO_ESTADO: Record<EstadoFio, { titulo: string; texto: string }> = {
  saudavel: { titulo: 'Saudável', texto: 'Macio e com brilho, só quero manter' },
  ressecado: { titulo: 'Ressecado', texto: 'Áspero, com frizz e pontas secas' },
  danificado: { titulo: 'Danificado', texto: 'Quebrando, elástico ou muito poroso' },
}

export interface Sessao { data: string; etapa: Etapa; semana: number; feita: boolean }

/** Monta as 12 a 16 sessões do plano a partir do perfil. */
export function montarPlano(perfil: PerfilCronograma, c: Cliente, feitos: string[]): Sessao[] {
  const seq = SEQUENCIA[perfil.estado]
  const q = quimicaRecente(c)
  const sessoes: Sessao[] = []
  let k = 0
  for (let semana = 0; semana < 4; semana++) {
    for (const d of DIAS[perfil.lavagens]) {
      const data = somarDias(perfil.inicio, semana * 7 + d)
      let etapa = seq[k++ % seq.length]
      if (q) {
        // química recente: nas duas primeiras semanas depois da resposta, só hidratação
        const desde = diasEntre(q.desde, data)
        if (desde >= 0 && desde < 15 && etapa !== 'H') etapa = 'H'
      }
      sessoes.push({ data, etapa, semana, feita: feitos.includes(data) })
    }
  }
  return sessoes
}

/** Segunda-feira da semana de uma data. */
export function segundaDe(isoData: string) {
  const dia = (parseData(isoData).getDay() + 6) % 7
  return somarDias(isoData, -dia)
}

/* ---------- armazenamento no aparelho ---------- */
const chave = (id: string) => `imperio-cronograma-${id}`
const ouvintes = new Set<() => void>()
const cache = new Map<string, Salvo>()
function ler(id: string): Salvo {
  if (!cache.has(id)) {
    let v: Salvo = { feitos: [] }
    try { v = { feitos: [], ...JSON.parse(localStorage.getItem(chave(id)) ?? '{}') } } catch { /* vazio */ }
    cache.set(id, v)
  }
  return cache.get(id)!
}
function gravarLocal(id: string, v: Salvo) {
  cache.set(id, v)
  try { localStorage.setItem(chave(id), JSON.stringify(v)) } catch { /* sem espaço: fica na memória */ }
  ouvintes.forEach((o) => o())
}
/** Alteração feita pela cliente: no modo conectado também vai para a nuvem. */
function gravar(id: string, v: Salvo) {
  if (!modoNuvem()) return gravarLocal(id, v)
  gravarLocal(id, { ...v, sinc: { em: new Date().toISOString(), pendente: true } })
  void enviar(id)
}

/* ---------- modo conectado: nuvem ---------- */
const AVISO_FALHA = 'Não foi possível salvar o cronograma na nuvem agora. Ele ficou guardado neste aparelho e vai ser enviado de novo.'
let fila: Promise<void> = Promise.resolve()
/** Envia a versão do aparelho, uma de cada vez (a ordem das alterações é mantida). */
function enviar(id: string) {
  fila = fila.then(async () => {
    const s = ler(id)
    if (!s.sinc?.pendente) return
    try {
      const em = await nuvem.salvarCronograma(id, s.perfil, s.feitos)
      const agora = ler(id)
      // só marca como enviado se nada mudou enquanto o envio acontecia
      if (agora.sinc?.em === s.sinc.em) gravarLocal(id, { ...agora, sinc: { em, pendente: false } })
    } catch (e) {
      console.warn('Cronograma não foi para a nuvem', e)
      toast(AVISO_FALHA)
    }
  })
  return fila
}

const ESTADOS: EstadoFio[] = ['saudavel', 'ressecado', 'danificado']
/** O perfil vem de um jsonb: só aceita o formato que o app grava. */
function perfilDaNuvem(l: CronogramaDaNuvem): PerfilCronograma | null {
  const p = l.perfil as Partial<PerfilCronograma> | null
  const inicio = l.inicio ?? p?.inicio
  if (!p || !ESTADOS.includes(p.estado as EstadoFio) || ![2, 3, 4].includes(p.lavagens as number) || !inicio || !/^\d{4}-\d{2}-\d{2}$/.test(inicio)) return null
  return { estado: p.estado!, lavagens: p.lavagens!, inicio, lembretes: !!p.lembretes }
}

/**
 * Modo conectado: carrega o cronograma da nuvem e mescla com o do aparelho.
 * A nuvem vence; o aparelho só vence com alteração ainda não enviada e mais nova.
 * Lança erro se a nuvem não responder (o que está no aparelho continua valendo).
 */
export async function sincronizarCronograma(id: string) {
  if (!modoNuvem()) return
  const linha = await nuvem.carregarCronograma(id)
  const r = mesclarCronograma(ler(id), linha && { perfil: perfilDaNuvem(linha), feitos: linha.feitos ?? [], atualizado_em: linha.atualizado_em })
  if (!r.enviar) return gravarLocal(id, r.valor)
  // o aparelho venceu (ou a nuvem ainda não tem nada): sobe
  gravarLocal(id, { ...r.valor, sinc: { em: r.valor.sinc?.em ?? new Date().toISOString(), pendente: true } })
  await enviar(id)
}

export function useCronograma(id: string) {
  return useSyncExternalStore((o) => (ouvintes.add(o), () => ouvintes.delete(o)), () => ler(id))
}
export function salvarPerfil(id: string, perfil: PerfilCronograma) {
  gravar(id, { ...ler(id), perfil })
}
export function alternarFeito(id: string, data: string) {
  const s = ler(id)
  gravar(id, { ...s, feitos: s.feitos.includes(data) ? s.feitos.filter((d) => d !== data) : [...s.feitos, data] })
}
export function recomecar(id: string) {
  gravar(id, { feitos: [] })
}

/** Resumo para o Início e lembretes: sessão de hoje ou a próxima. */
export function resumoHoje(c: Cliente) {
  const s = ler(c.id)
  if (!s.perfil) return undefined
  const plano = montarPlano(s.perfil, c, s.feitos)
  const hoje = hojeISO()
  const deHoje = plano.find((x) => x.data === hoje)
  const proxima = plano.find((x) => x.data > hoje)
  const fim = plano[plano.length - 1]?.data
  return { perfil: s.perfil, plano, deHoje, proxima, terminou: !!fim && fim < hoje, feitas: plano.filter((x) => x.feita).length }
}

/** Lembrete do dia (aparece no Início, no sino e, uma vez por dia, como aviso do sistema). */
export function lembreteDoDia(c: Cliente) {
  const r = resumoHoje(c)
  if (!r?.perfil.lembretes || !r.deHoje || r.deHoje.feita) return undefined
  const e = ETAPA[r.deHoje.etapa]
  return { titulo: `Hoje é dia de ${e.nome.toLowerCase()}`, texto: `${e.tempo} de pausa. Toque para ver o passo a passo.`, rota: `/cuidados/${r.deHoje.etapa}` }
}

export async function avisarCronograma(c: Cliente) {
  const l = lembreteDoDia(c)
  const k = `imperio-cronograma-aviso-${c.id}`
  if (!l || localStorage.getItem(k) === hojeISO()) return
  localStorage.setItem(k, hojeISO())
  const { mostrarNotificacaoSistema } = await import('../lib/notificar')
  await mostrarNotificacaoSistema(l.titulo, l.texto)
}
