/**
 * Garante um localStorage utilizável. Em ambientes que bloqueiam o
 * armazenamento (navegação privada, páginas incorporadas), troca por uma
 * versão em memória: o app funciona, só não guarda os dados ao fechar.
 * Precisa ser o primeiro import de main.tsx.
 */
function funciona() {
  try {
    const k = '__imperio_teste__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

if (!funciona()) {
  const dados = new Map<string, string>()
  const memoria: Storage = {
    get length() { return dados.size },
    clear: () => dados.clear(),
    getItem: (k) => (dados.has(k) ? dados.get(k)! : null),
    key: (i) => [...dados.keys()][i] ?? null,
    removeItem: (k) => { dados.delete(k) },
    setItem: (k, v) => { dados.set(k, String(v)) },
  }
  try {
    Object.defineProperty(window, 'localStorage', { value: memoria, configurable: true })
  } catch { /* sem alternativa */ }
}
export {}
