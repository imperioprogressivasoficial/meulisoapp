import type { Cliente } from '../types'

export const DIA = 86_400_000

/* ---------- datas ---------- */
export function parseData(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(a, m - 1, d)
}
export function iso(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export const hojeISO = () => iso(new Date())
export const somarDias = (isoData: string, n: number) => iso(new Date(parseData(isoData).getTime() + n * DIA + 3_600_000))
export const diasEntre = (a: string, b: string) => Math.round((parseData(b).getTime() - parseData(a).getTime()) / DIA)

export function formatarData(isoData: string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) {
  return parseData(isoData).toLocaleDateString('pt-BR', opts)
}

/* ---------- textos ---------- */
export const uid = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string
export const primeiroNome = (c: Cliente) => c.nome.split(' ')[0]
export const formatarTelefone = (t: string) => t.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')
