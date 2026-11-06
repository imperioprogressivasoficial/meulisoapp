/**
 * Modo conectado: junta os dados de cuidado do aparelho com os da nuvem ao entrar e a cada sincronização
 * (chamado por store.ts `sincronizar`).
 *  - cronograma e diário: carrega da nuvem e mescla (cronograma.ts, diario.ts, regras em mesclar.ts);
 *  - diagnósticos: ficam guardados no aparelho até subirem; os que ainda não subiram aparecem junto com os da nuvem.
 * Se a nuvem falhar, mostra um aviso e mantém a cópia do aparelho.
 */
import type { Diagnostico } from '../types'
import { nuvem } from './nuvem'
import { sincronizarCronograma } from './cronograma'
import { sincronizarDiario } from './diario'
import { apagarImagem, lerImagem } from '../lib/imagem'
import { toast } from '../ds/extras'

export const AVISO_SEM_SINCRONIA = 'Não foi possível sincronizar com a nuvem agora. O que está neste aparelho continua guardado.'

/* ---------- diagnósticos que ainda não subiram ---------- */
export const chaveDiagnosticosPendentes = (id: string) => `imperio-diagnosticos-pendentes-${id}`

export function diagnosticosPendentes(id: string): Diagnostico[] {
  try {
    const v = JSON.parse(localStorage.getItem(chaveDiagnosticosPendentes(id)) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}
function gravarPendentes(id: string, lista: Diagnostico[]) {
  try {
    if (lista.length) localStorage.setItem(chaveDiagnosticosPendentes(id), JSON.stringify(lista))
    else localStorage.removeItem(chaveDiagnosticosPendentes(id))
  } catch { /* sem espaço: segue só na memória */ }
}
export function guardarDiagnosticoPendente(id: string, d: Diagnostico) {
  gravarPendentes(id, [d, ...diagnosticosPendentes(id).filter((x) => x.id !== d.id)])
}

const enviando = new Set<string>()
/**
 * Envia os diagnósticos guardados no aparelho (com a foto, se houver).
 * Retorna quantos subiram; se algum falhar, os outros seguem e o primeiro erro é lançado no fim.
 */
export async function enviarDiagnosticosPendentes(id: string): Promise<number> {
  let enviados = 0
  let erro: unknown
  for (const d of diagnosticosPendentes(id)) {
    if (enviando.has(d.id)) continue
    enviando.add(d.id)
    try {
      const dados = d.fotoId && !d.fotoId.startsWith('nuvem:') ? lerImagem(d.fotoId) : undefined
      await nuvem.salvarDiagnostico(id, d, dados ? await (await fetch(dados)).blob() : undefined)
      gravarPendentes(id, diagnosticosPendentes(id).filter((x) => x.id !== d.id))
      if (dados && d.fotoId) apagarImagem(d.fotoId)
      enviados++
    } catch (e) {
      erro ??= e
    } finally {
      enviando.delete(d.id)
    }
  }
  if (erro) throw erro
  return enviados
}

/** Carrega e mescla cronograma e diário e envia os diagnósticos pendentes. */
export async function sincronizarCabelo(id: string): Promise<{ diagnosticosEnviados: number }> {
  const [crono, diario, diags] = await Promise.allSettled([sincronizarCronograma(id), sincronizarDiario(id), enviarDiagnosticosPendentes(id)])
  const falhas = [crono, diario, diags].filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (falhas.length) {
    console.warn('Falha ao sincronizar os dados de cuidado', ...falhas.map((f) => f.reason))
    toast(AVISO_SEM_SINCRONIA)
  }
  return { diagnosticosEnviados: diags.status === 'fulfilled' ? diags.value : 0 }
}
