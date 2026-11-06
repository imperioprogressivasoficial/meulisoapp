// Validação de assinatura HMAC-SHA256 em tempo constante.
export async function hmacHex(segredo: string, corpo: string) {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(corpo)))
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function iguais(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}
