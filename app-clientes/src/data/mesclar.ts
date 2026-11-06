/**
 * Modo conectado: regras para juntar o que está no aparelho com o que está na nuvem.
 * Funções puras (sem React, sem Supabase, sem localStorage), testadas em scripts/testar-mesclar.ts.
 *
 * Regra geral: a nuvem vence. O aparelho só vence quando tem uma alteração que ainda não subiu
 * (`pendente`) e que é mais nova do que a versão da nuvem. Dado que existe só no aparelho
 * (de antes da sincronização existir, ou gravado sem internet) sobe para a nuvem.
 */

/** Controle de sincronização guardado junto com o dado no aparelho. */
export interface Sinc {
  /** Quando foi a última alteração (ISO). No aparelho é a hora da edição; vindo da nuvem é o atualizado_em do servidor. */
  em?: string
  /** Alteração feita no aparelho que ainda não chegou à nuvem. */
  pendente?: boolean
}

const maisNovo = (a?: string, b?: string) => !!a && (!b || Date.parse(a) > Date.parse(b))

/* ---------- cronograma (um por cliente) ---------- */
export interface CronogramaLocal<P> { perfil?: P; feitos: string[]; sinc?: Sinc }
export interface CronogramaNuvem<P> { perfil: P | null; feitos: string[]; atualizado_em: string }

/**
 * Decide qual versão do cronograma fica.
 * `enviar`: o aparelho venceu e a versão dele precisa subir para a nuvem.
 */
export function mesclarCronograma<P>(local: CronogramaLocal<P>, nuvem: CronogramaNuvem<P> | null): { valor: CronogramaLocal<P>; enviar: boolean } {
  const temLocal = !!local.perfil || local.feitos.length > 0
  if (!nuvem) {
    // nada na nuvem: o que está no aparelho sobe (se houver)
    return { valor: local, enviar: temLocal || !!local.sinc?.pendente }
  }
  if (local.sinc?.pendente && maisNovo(local.sinc.em, nuvem.atualizado_em)) return { valor: local, enviar: true }
  return {
    valor: { perfil: nuvem.perfil ?? undefined, feitos: [...nuvem.feitos].sort(), sinc: { em: nuvem.atualizado_em, pendente: false } },
    enviar: false,
  }
}

/* ---------- diário (um registro por dia, vence o mais recente de cada dia) ---------- */
export interface RegistroDia { data: string; frizz: number; brilho: number; maciez: number }
export interface DiaNuvem { dia: string; frizz: number; brilho: number; maciez: number; atualizado_em: string }

/**
 * Junta os registros dia a dia.
 * `enviar`: dias em que o aparelho venceu (ou que só existem no aparelho) e precisam subir.
 */
export function mesclarDiario<R extends RegistroDia>(
  local: R[], sinc: Record<string, Sinc>, nuvem: DiaNuvem[],
): { registros: R[]; sinc: Record<string, Sinc>; enviar: string[] } {
  const porDia = new Map<string, R>(local.map((r) => [r.data, r]))
  const novoSinc: Record<string, Sinc> = {}
  const enviar: string[] = []
  const daNuvem = new Map(nuvem.map((n) => [n.dia, n]))
  for (const n of nuvem) {
    const l = porDia.get(n.dia)
    const s = sinc[n.dia]
    if (l && s?.pendente && maisNovo(s.em, n.atualizado_em)) {
      novoSinc[n.dia] = s
      enviar.push(n.dia)
    } else {
      porDia.set(n.dia, { ...(l ?? {}), data: n.dia, frizz: n.frizz, brilho: n.brilho, maciez: n.maciez } as R)
      novoSinc[n.dia] = { em: n.atualizado_em, pendente: false }
    }
  }
  for (const [dia] of porDia) {
    if (daNuvem.has(dia)) continue
    // só no aparelho: sobe (registro antigo, ou gravado quando não havia internet)
    novoSinc[dia] = { em: sinc[dia]?.em, pendente: true }
    enviar.push(dia)
  }
  const registros = [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data))
  return { registros, sinc: novoSinc, enviar: enviar.sort() }
}

/* ---------- diagnósticos guardados no aparelho até subirem ---------- */
/** Junta os diagnósticos da nuvem com os que ainda não subiram (mais recente primeiro, sem repetir id). */
export function mesclarDiagnosticos<D extends { id: string; data: string }>(nuvem: D[], pendentes: D[]): D[] {
  const ids = new Set(nuvem.map((d) => d.id))
  return [...pendentes.filter((p) => !ids.has(p.id)), ...nuvem].sort((a, b) => b.data.localeCompare(a.data))
}
