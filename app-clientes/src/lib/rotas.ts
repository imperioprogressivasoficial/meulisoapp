import { useSyncExternalStore } from 'react'

/** Navegação simples por hash: #/caminho?param=valor */
function ler() {
  const h = location.hash.replace(/^#/, '') || '/'
  const [caminho, query = ''] = h.split('?')
  return { caminho: caminho || '/', query }
}
let atual = ler()
let chave = location.hash
const ouvintes = new Set<() => void>()
window.addEventListener('hashchange', () => {
  atual = ler()
  chave = location.hash
  ouvintes.forEach((o) => o())
})

export function useRota() {
  useSyncExternalStore(
    (o) => (ouvintes.add(o), () => ouvintes.delete(o)),
    () => chave,
  )
  const partes = atual.caminho.split('/').filter(Boolean)
  return { caminho: atual.caminho, partes, params: new URLSearchParams(atual.query) }
}

export function navegar(caminho: string) {
  location.hash = caminho
  window.scrollTo({ top: 0 })
}

export function voltar(padrao = '/inicio') {
  if (history.length > 1) history.back()
  else navegar(padrao)
}
