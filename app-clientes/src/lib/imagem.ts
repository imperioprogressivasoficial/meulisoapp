import { uid } from './regras'

const PREFIXO = 'imperio:foto:'

/** Reduz a foto (máx. 720px, JPEG) para caber no aparelho. */
export async function comprimir(arquivo: File, max = 720, qualidade = 0.72): Promise<string> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = erro
      i.src = url
    })
    const escala = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * escala)
    canvas.height = Math.round(img.height * escala)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', qualidade)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Guarda a imagem e devolve o id. Lança erro se o aparelho estiver sem espaço. */
export async function salvarImagem(arquivo: File) {
  const dados = await comprimir(arquivo)
  const id = uid()
  try {
    localStorage.setItem(PREFIXO + id, dados)
  } catch {
    throw new Error('Sem espaço para guardar mais fotos neste aparelho. Apague algumas fotos antigas.')
  }
  return id
}

export const lerImagem = (id: string) => localStorage.getItem(PREFIXO + id) ?? undefined
export const apagarImagem = (id: string) => localStorage.removeItem(PREFIXO + id)
