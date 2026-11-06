// Substitui src/ds/extras.tsx no teste: só guarda os avisos (toasts) mostrados.
export function toast(texto) { (globalThis.__avisos ??= []).push(texto) }
