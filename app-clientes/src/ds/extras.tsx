import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { AnimatePresence, animate, motion, useInView } from 'motion/react'
import { Camera, ImagePlus, Star, type LucideIcon } from 'lucide-react'
import QRCode from 'qrcode'
import { lerImagem, salvarImagem } from '../lib/imagem'
import { FOTOS, urlLocal, urlRemota, type ChaveFoto } from '../data/fotos'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ---------- Segmento (abas internas) ---------- */
export function Segmento<T extends string>({ opcoes, valor, onTrocar, escuro }: { opcoes: { id: T; rotulo: ReactNode }[]; valor: T; onTrocar: (v: T) => void; escuro?: boolean }) {
  const id = useId()
  return (
    <div className={cx('ds-segmento', escuro && 'ds-segmento--escuro')} role="tablist">
      {opcoes.map((o) => (
        <button key={o.id} role="tab" aria-selected={valor === o.id} className={cx(valor === o.id && 'ativo')} onClick={() => onTrocar(o.id)}>
          {valor === o.id && <motion.span className="ds-segmento__pilula" layoutId={`seg-${id}`} transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span className="ds-segmento__rotulo">{o.rotulo}</span>
        </button>
      ))}
    </div>
  )
}

/** Número que conta até o valor quando aparece na tela (pontos, saldo). */
export function Contador({ valor, sufixo = '' }: { valor: number; sufixo?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const visivel = useInView(ref, { once: true })
  const anterior = useRef(0)
  useEffect(() => {
    if (!visivel || !ref.current) return
    const el = ref.current
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduzir) {
      el.textContent = valor.toLocaleString('pt-BR') + sufixo
      anterior.current = valor
      return
    }
    const ctl = animate(anterior.current, valor, {
      duration: 1.1,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => (el.textContent = Math.round(v).toLocaleString('pt-BR') + sufixo),
    })
    anterior.current = valor
    return () => ctl.stop()
  }, [visivel, valor, sufixo])
  return <span ref={ref} className="num">{valor.toLocaleString('pt-BR') + sufixo}</span>
}

/* ---------- Estrelas ---------- */
export function Estrelas({ valor, onMudar, tamanho = 30 }: { valor: number; onMudar?: (n: number) => void; tamanho?: number }) {
  return (
    <div className="ds-estrelas" role={onMudar ? 'radiogroup' : undefined} aria-label={`${valor} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={!onMudar} onClick={() => onMudar?.(n)} aria-label={`${n} estrelas`}>
          <Star size={tamanho} strokeWidth={1.5} fill={n <= valor ? 'var(--ml-dourado)' : 'none'} color={n <= valor ? 'var(--ml-dourado)' : 'var(--ml-nude-medio)'} />
        </button>
      ))}
    </div>
  )
}

/* ---------- Estado vazio ---------- */
export function Vazio({ icone: Icone, titulo, texto, children }: { icone: LucideIcon; titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="ds-vazio">
      <Icone size={36} strokeWidth={1.5} />
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  )
}

/* ---------- QR code ---------- */
/* a biblioteca do QR exige hex: tinta Meu Liso sobre branco (contraste máximo para leitura) */
const QR_CORES = { dark: '#2E261E', light: '#FFFFFF' }
export function QR({ valor, tamanho = 180 }: { valor: string; tamanho?: number }) {
  const [src, setSrc] = useState<string>()
  useEffect(() => {
    QRCode.toDataURL(valor, { width: tamanho * 2, margin: 1, color: QR_CORES }).then(setSrc)
  }, [valor, tamanho])
  return src ? <img className="ds-qr" src={src} width={tamanho} height={tamanho} alt="QR code" /> : <div className="ds-qr" style={{ width: tamanho, height: tamanho }} />
}

/* ---------- Fotos ---------- */
export function FotoSalva({ id, alt = '', className }: { id: string; alt?: string; className?: string }) {
  const [assinada, setAssinada] = useState<string>()
  useEffect(() => {
    if (id.startsWith('nuvem:')) void import('../data/nuvem').then((m) => m.nuvem.urlFoto(id.slice(6))).then(setAssinada)
  }, [id])
  const src = id.startsWith('nuvem:') ? assinada : lerImagem(id)
  return src ? <img src={src} alt={alt} className={cx('ds-foto', className)} /> : <div className={cx('ds-foto ds-foto--vazia', className)}>Foto indisponível</div>
}

export function EntradaFoto({ onFoto, rotulo = 'Tirar foto', camera = true, variante = 'grande' }: { onFoto: (id: string) => void; rotulo?: string; camera?: boolean; variante?: 'grande' | 'botao' }) {
  const ref = useRef<HTMLInputElement>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const Icone = camera ? Camera : ImagePlus
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture={camera ? 'environment' : undefined}
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          setCarregando(true)
          setErro('')
          try {
            onFoto(await salvarImagem(f))
          } catch (er) {
            setErro((er as Error).message)
          } finally {
            setCarregando(false)
          }
        }}
      />
      <button type="button" className={cx('ds-entrada-foto', `ds-entrada-foto--${variante}`)} onClick={() => ref.current?.click()} disabled={carregando}>
        <Icone size={variante === 'grande' ? 28 : 18} strokeWidth={1.75} />
        {carregando ? 'Processando…' : rotulo}
      </button>
      {erro && <p className="ds-erro">{erro}</p>}
    </>
  )
}

/* ---------- Anel de progresso ---------- */
export function Anel({ valor, tamanho = 120, children }: { valor: number; tamanho?: number; children?: ReactNode }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="ds-anel" style={{ width: tamanho, height: tamanho }}>
      <svg viewBox="0 0 120 120" width={tamanho} height={tamanho}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--ml-nude-medio)" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--ml-dourado)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, valor)))} transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <div className="ds-anel__centro">{children}</div>
    </div>
  )
}

/* ---------- Toast ---------- */
let mensagem: { id: number; texto: string } | null = null
const ouvintes = new Set<() => void>()
export function toast(texto: string) {
  mensagem = { id: Date.now(), texto }
  ouvintes.forEach((o) => o())
  setTimeout(() => {
    if (mensagem?.texto === texto) {
      mensagem = null
      ouvintes.forEach((o) => o())
    }
  }, 3200)
}
export function Toaster() {
  const m = useSyncExternalStore((o) => (ouvintes.add(o), () => ouvintes.delete(o)), () => mensagem)
  return (
    <AnimatePresence>
      {m && (
        <motion.div
          key={m.id}
          className="ds-toast"
          role="status"
          initial={{ opacity: 0, y: 16, scale: 0.96, x: '-50%' }}
          animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
          exit={{ opacity: 0, y: 8, scale: 0.98, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          {m.texto}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------- Fotografia editorial ---------- */

export function Foto({ chave, className, prioridade }: { chave: ChaveFoto; className?: string; prioridade?: boolean }) {
  const [src, setSrc] = useState(urlLocal(chave))
  const [falhou, setFalhou] = useState(false)
  if (falhou) return <span className={cx('ds-foto-falta', className)} role="img" aria-label={FOTOS[chave].alt} />
  return (
    <img
      src={src}
      alt={FOTOS[chave].alt}
      className={cx('ds-imagem', className)}
      loading={prioridade ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => (src !== urlRemota(chave) ? setSrc(urlRemota(chave)) : setFalhou(true))}
    />
  )
}

export function Hero({ chave, titulo, texto, alto, onClick, children }: { chave: ChaveFoto; titulo?: ReactNode; texto?: ReactNode; alto?: boolean; onClick?: () => void; children?: ReactNode }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={cx('ds-hero', alto && 'ds-hero--alto')} onClick={onClick}>
      <Foto chave={chave} />
      <div className="ds-hero__conteudo">
        {titulo && <strong>{titulo}</strong>}
        {texto && <span>{texto}</span>}
        {children}
      </div>
    </Tag>
  )
}

export function Alerta({ tom = 'info', children }: { tom?: 'info' | 'sucesso' | 'aviso' | 'erro'; children: ReactNode }) {
  return <div className={cx('ds-alerta', `ds-alerta--${tom}`)} role={tom === 'erro' ? 'alert' : 'status'}>{children}</div>
}

export const Carregando = ({ rotulo = 'Carregando' }: { rotulo?: string }) => <span className="ds-carregando" role="status" aria-label={rotulo} />
