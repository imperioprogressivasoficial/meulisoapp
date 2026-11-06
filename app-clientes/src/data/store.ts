import { useSyncExternalStore } from 'react'
import type { Banco, Cliente } from '../types'
import { criarBancoDemo, VERSAO_BANCO } from './seed'
import { carregarBanco, modoNuvem, sb } from './nuvem'
import { AVISO_SEM_SINCRONIA, diagnosticosPendentes, sincronizarCabelo } from './sincronia'
import { toast } from '../ds/extras'
import { mesclarDiagnosticos } from './mesclar'

/**
 * Armazenamento da demonstração: tudo fica no próprio aparelho (localStorage).
 * Em produção, cada ação de `acoes.ts` vira uma chamada à API do servidor
 * e as telas continuam iguais.
 */
const CHAVE = 'imperio:banco'

function carregar(): Banco {
  try {
    const raw = localStorage.getItem(CHAVE)
    if (raw) {
      const b = JSON.parse(raw) as Banco
      if (b.versao === VERSAO_BANCO) return b
    }
  } catch {
    /* recria abaixo */
  }
  return criarBancoDemo()
}

const vazio = (): Banco => ({ versao: 0, clientes: [], sessao: {} })
let banco: Banco = modoNuvem() ? vazio() : carregar()
let carregando = modoNuvem()
const ouvintes = new Set<() => void>()

function salvar() {
  if (modoNuvem()) return
  try {
    localStorage.setItem(CHAVE, JSON.stringify(banco))
  } catch (e) {
    console.warn('Não foi possível salvar', e)
  }
}
salvar()

export const getBanco = () => banco
export const estaCarregando = () => carregando

/**
 * Modo conectado: recarrega do Supabase o que o usuário pode ver e mescla cronograma, diário
 * e diagnósticos do aparelho com os da nuvem (sincronia.ts).
 * Chamadas que chegam durante uma sincronização esperam por ela e por mais uma rodada.
 */
let emCurso: Promise<void> | undefined
let deNovo = false
export function sincronizar(): Promise<void> {
  if (!modoNuvem()) return Promise.resolve()
  if (emCurso) {
    deNovo = true
    return emCurso
  }
  emCurso = (async () => {
    try {
      do {
        deNovo = false
        await sincronizarUmaVez()
      } while (deNovo)
    } finally {
      emCurso = undefined
    }
  })()
  return emCurso
}
async function sincronizarUmaVez() {
  try {
    let b = await carregarBanco()
    const id = b.sessao.clienteId
    if (id) {
      const { diagnosticosEnviados } = await sincronizarCabelo(id)
      if (diagnosticosEnviados) b = await carregarBanco()
      const c = b.clientes.find((x) => x.id === id)
      if (c) c.diagnosticos = mesclarDiagnosticos(c.diagnosticos, diagnosticosPendentes(id))
    }
    // diagnóstico feito antes de entrar: fica na memória até o cadastro
    b.diagnosticoVisitante = banco.diagnosticoVisitante
    banco = b
  } catch (e) {
    console.error('Falha ao sincronizar', e)
    toast(AVISO_SEM_SINCRONIA)
  } finally {
    carregando = false
    ouvintes.forEach((o) => o())
  }
}
if (modoNuvem()) {
  void sincronizar()
  sb().auth.onAuthStateChange(() => void sincronizar())
}

export function mutar(fn: (b: Banco) => void) {
  const rascunho = structuredClone(banco)
  fn(rascunho)
  banco = rascunho
  salvar()
  ouvintes.forEach((o) => o())
}

export function resetarDemo() {
  banco = criarBancoDemo()
  salvar()
  ouvintes.forEach((o) => o())
}

function assinar(o: () => void) {
  ouvintes.add(o)
  const aoMudarOutraAba = (e: StorageEvent) => {
    if (e.key === CHAVE && e.newValue) {
      banco = JSON.parse(e.newValue)
      o()
    }
  }
  window.addEventListener('storage', aoMudarOutraAba)
  return () => {
    ouvintes.delete(o)
    window.removeEventListener('storage', aoMudarOutraAba)
  }
}

export const useBanco = () => useSyncExternalStore(assinar, getBanco)

export function useClienteLogada(): Cliente | undefined {
  const b = useBanco()
  return b.clientes.find((c) => c.id === b.sessao.clienteId)
}

/** Usado dentro de mutar(): encontra a cliente no rascunho. */
export function clienteNo(b: Banco, id: string) {
  const c = b.clientes.find((x) => x.id === id)
  if (!c) throw new Error('Cliente não encontrada')
  return c
}
