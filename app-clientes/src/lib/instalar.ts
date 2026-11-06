/**
 * Instalação do Meu Liso como app (PWA), enquanto ele não está nas lojas.
 * Android/Chrome/Edge: guardamos o evento `beforeinstallprompt` para abrir a instalação nativa.
 * iPhone/iPad (Safari): não existe esse evento; mostramos o passo a passo de "Adicionar à Tela de Início".
 * Importar este módulo cedo (main.tsx) para não perder o evento.
 */
import { useSyncExternalStore } from 'react'

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let evento: EventoInstalar | null = null
let instalado = false
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((o) => o())

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); evento = e as EventoInstalar; avisar() })
  window.addEventListener('appinstalled', () => { instalado = true; evento = null; avisar() })
}

export const rodandoComoApp = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

export const ehIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

const ESCONDIDO = 'meuliso-instalar-escondido'
export function escondidoPelaUsuaria() { try { return localStorage.getItem(ESCONDIDO) === '1' } catch { return false } }
export function esconder() { try { localStorage.setItem(ESCONDIDO, '1') } catch { /* sem armazenamento */ } avisar() }

/** Estado atual: 'instalado' | 'nativo' (há instalação do navegador) | 'ios' | 'manual' */
export function modoInstalacao(): 'instalado' | 'nativo' | 'ios' | 'manual' {
  if (instalado || rodandoComoApp()) return 'instalado'
  if (evento) return 'nativo'
  return ehIOS() ? 'ios' : 'manual'
}

export function useInstalacao() {
  useSyncExternalStore((o) => (ouvintes.add(o), () => ouvintes.delete(o)), () => `${modoInstalacao()}|${escondidoPelaUsuaria()}`)
  return { modo: modoInstalacao(), escondido: escondidoPelaUsuaria() }
}

/** Abre a instalação nativa. Devolve true se a usuária aceitou. */
export async function instalarAgora() {
  if (!evento) return false
  await evento.prompt()
  const { outcome } = await evento.userChoice
  evento = null
  avisar()
  return outcome === 'accepted'
}
