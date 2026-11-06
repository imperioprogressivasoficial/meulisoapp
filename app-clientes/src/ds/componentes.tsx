import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import type { Icone as IconeIlustrado } from './ilustras'
export type QualquerIcone = LucideIcon | IconeIlustrado
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronDown, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ---------- Marca ---------- */
/** @deprecated A coroa saiu da identidade. Mantido por compatibilidade: mostra o símbolo oficial Meu Liso. */
export function CoroaSvg({ tamanho = 32 }: { tamanho?: number }) {
  return <SimboloMeuLiso altura={tamanho} className="ds-coroa" />
}

/** @deprecated Use MarcaMeuLiso. Mantido por compatibilidade: renderiza a marca oficial Meu Liso. */
export function Marca({ tamanho = 'md' }: { tamanho?: 'sm' | 'md' | 'lg'; tom?: 'ouro' | 'escuro' }) {
  return <MarcaMeuLiso tamanho={tamanho} />
}

export function Script({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('ds-script', className)}>{children}</span>
}

/* ---------- Botão ---------- */
type VarianteBotao = 'ouro' | 'escuro' | 'contorno' | 'sucesso' | 'texto'
interface BotaoBase { variante?: VarianteBotao; icone?: LucideIcon; bloco?: boolean; tamanho?: 'sm' | 'md' }

export function Botao({ variante = 'ouro', icone: Icone, bloco = true, tamanho = 'md', className, children, ...p }: BotaoBase & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cx('ds-botao', `ds-botao--${variante}`, `ds-botao--${tamanho}`, bloco && 'ds-botao--bloco', className)} {...p}>
      {Icone && <Icone size={18} strokeWidth={2} />}
      {children}
    </button>
  )
}

export function BotaoLink({ variante = 'ouro', icone: Icone, bloco = true, tamanho = 'md', className, children, ...p }: BotaoBase & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cx('ds-botao', `ds-botao--${variante}`, `ds-botao--${tamanho}`, bloco && 'ds-botao--bloco', className)} {...p}>
      {Icone && <Icone size={18} strokeWidth={2} />}
      {children}
    </a>
  )
}

/* ---------- Cartão ---------- */
export function Cartao({ tom = 'claro', className, children, style, onClick }: { tom?: 'claro' | 'escuro' | 'ouro' | 'creme'; className?: string; children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={cx('ds-cartao', `ds-cartao--${tom}`, onClick && 'ds-cartao--clicavel', className)} style={style} onClick={onClick}>
      {children}
    </Tag>
  )
}

/* ---------- Cabeçalho ---------- */
export function Cabecalho({ titulo, onVoltar, tom = 'claro', direita }: { titulo: ReactNode; onVoltar?: () => void; tom?: 'claro' | 'escuro'; direita?: ReactNode }) {
  return (
    <header className={cx('ds-cabecalho', `ds-cabecalho--${tom}`)}>
      <span className="ds-cabecalho__lado">
        {onVoltar && (
          <button className="ds-icone-botao" onClick={onVoltar} aria-label="Voltar">
            <ChevronLeft size={22} />
          </button>
        )}
      </span>
      <h1 className="ds-cabecalho__titulo">{titulo}</h1>
      <span className="ds-cabecalho__lado ds-cabecalho__lado--dir">{direita}</span>
    </header>
  )
}

/* ---------- Títulos de seção ---------- */
export function TituloSecao({ children, acao, onAcao }: { children: ReactNode; acao?: string; onAcao?: () => void }) {
  return (
    <div className="ds-titulo-secao">
      <h2>{children}</h2>
      {acao && (
        <button className="ds-link" onClick={onAcao}>
          {acao} <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}

/* ---------- Etiqueta / selo ---------- */
export type TomEstado = 'sucesso' | 'aviso' | 'erro' | 'ouro' | 'neutro' | 'escuro'
export function Etiqueta({ tom = 'neutro', icone: Icone, children }: { tom?: TomEstado; icone?: LucideIcon; children: ReactNode }) {
  return (
    <span className={cx('ds-etiqueta', `ds-etiqueta--${tom}`)}>
      {Icone && <Icone size={13} strokeWidth={2.5} />}
      {children}
    </span>
  )
}

/* ---------- Progresso ---------- */
export function Progresso({ valor, tom = 'ouro', fina, rotulo }: { valor: number; tom?: 'ouro' | 'sucesso' | 'aviso' | 'erro'; fina?: boolean; rotulo?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, valor)) * 100)
  return (
    <div className={cx('ds-progresso', fina && 'ds-progresso--fina', `ds-progresso--${tom}`)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={rotulo}>
      <div style={{ width: `${pct}%` }} />
    </div>
  )
}

/* ---------- Campos ---------- */
export function Campo({ rotulo, icone: Icone, ...p }: { rotulo?: string; icone?: LucideIcon } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="ds-campo">
      {rotulo && <span className="ds-campo__rotulo">{rotulo}</span>}
      <span className="ds-campo__caixa">
        {Icone && <Icone size={18} className="ds-campo__icone" />}
        <input {...p} />
      </span>
    </label>
  )
}

export function Selecao({ rotulo, icone: Icone, children, ...p }: { rotulo?: string; icone?: LucideIcon } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="ds-campo">
      {rotulo && <span className="ds-campo__rotulo">{rotulo}</span>}
      <span className="ds-campo__caixa">
        {Icone && <Icone size={18} className="ds-campo__icone" />}
        <select {...p}>{children}</select>
        <ChevronDown size={18} className="ds-campo__seta" />
      </span>
    </label>
  )
}

/* ---------- Ícone em moldura ---------- */
export function IconeMoldura({ icone: Icone, tom = 'ouro', tamanho = 40 }: { icone: QualquerIcone; tom?: 'ouro' | 'escuro' | 'creme'; tamanho?: number }) {
  if ((Icone as IconeIlustrado).ilustrado) return <span className="ds-ilustra" style={{ width: tamanho + 6, height: tamanho + 6 }}><Icone size={tamanho + 6} /></span>
  return (
    <span className={cx('ds-icone-moldura', `ds-icone-moldura--${tom}`)} style={{ width: tamanho, height: tamanho }}>
      <Icone size={Math.round(tamanho * 0.5)} strokeWidth={1.75} />
    </span>
  )
}

/* ---------- Item de lista ---------- */
export function ItemLista({ icone, titulo, subtitulo, direita, onClick, seta }: { icone?: QualquerIcone; titulo: ReactNode; subtitulo?: ReactNode; direita?: ReactNode; onClick?: () => void; seta?: boolean }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={cx('ds-item', onClick && 'ds-item--clicavel')} onClick={onClick}>
      {icone && <IconeMoldura icone={icone} tamanho={38} tom="creme" />}
      <span className="ds-item__texto">
        <strong>{titulo}</strong>
        {subtitulo && <small>{subtitulo}</small>}
      </span>
      {direita}
      {seta && <ChevronRight size={18} className="ds-item__seta" />}
    </Tag>
  )
}

/* ---------- Atalho (tile com ícone) ---------- */
export function Atalho({ icone, rotulo, onClick, href }: { icone: QualquerIcone; rotulo: string; onClick?: () => void; href?: string }) {
  const conteudo = (
    <>
      <IconeMoldura icone={icone} tom="creme" tamanho={44} />
      <span>{rotulo}</span>
    </>
  )
  return href ? (
    <a className="ds-atalho" href={href} target="_blank" rel="noreferrer">{conteudo}</a>
  ) : (
    <button className="ds-atalho" onClick={onClick}>{conteudo}</button>
  )
}

/* ---------- Opção selecionável (tile) ---------- */
export function Opcao({ icone: Icone, rotulo, selecionada, desabilitada, onClick }: { icone?: LucideIcon; rotulo: ReactNode; selecionada?: boolean; desabilitada?: boolean; onClick?: () => void }) {
  return (
    <button className={cx('ds-opcao', selecionada && 'ds-opcao--sel')} disabled={desabilitada} onClick={onClick} aria-pressed={selecionada}>
      {Icone && <Icone size={22} strokeWidth={1.75} />}
      <span>{rotulo}</span>
    </button>
  )
}

/* ---------- Passos (acompanhamento) ---------- */
export function Passos({ etapas, atual }: { etapas: string[]; atual: number }) {
  return (
    <ol className="ds-passos">
      {etapas.map((e, i) => (
        <li key={e} className={cx(i < atual && 'feito', i === atual && 'atual')}>
          <span className="ds-passos__marca">{i < atual && <Check size={12} strokeWidth={3} />}</span>
          {e}
        </li>
      ))}
    </ol>
  )
}

/* ---------- Avatar ---------- */
export function Avatar({ nome, tamanho = 48 }: { nome: string; tamanho?: number }) {
  const iniciais = nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
  return (
    <span className="ds-avatar" style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.38 }}>
      {iniciais}
    </span>
  )
}

/* ---------- Folha (modal inferior) ---------- */
/** Folha inferior: sobe com mola e fecha ao arrastar para baixo. */
export function Folha({ aberta, onFechar, children }: { aberta: boolean; onFechar: () => void; children: ReactNode }) {
  return (
    <AnimatePresence>
      {aberta && (
        <motion.div className="ds-folha-fundo" onClick={onFechar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div
            className="ds-folha"
            role="dialog"
            aria-modal
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onFechar()
            }}
          >
            <span className="ds-folha__alca" />
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------- Barra de abas ---------- */
export function BarraAbas<T extends string>({ itens, ativa, onTrocar }: { itens: { id: T; rotulo: string; icone: QualquerIcone }[]; ativa: T; onTrocar: (id: T) => void }) {
  return (
    <nav className="ds-abas">
      {itens.map(({ id, rotulo, icone: Icone }) => (
        <motion.button key={id} className={cx(ativa === id && 'ativa')} onClick={() => onTrocar(id)} aria-current={ativa === id ? 'page' : undefined} whileTap={{ scale: 0.9 }}>
          {ativa === id && <motion.span className="ds-abas__indicador" layoutId="aba-ativa" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
          <Icone size={24} strokeWidth={ativa === id ? 2 : 1.6} {...({ ativo: ativa === id } as object)} />
          {rotulo}
        </motion.button>
      ))}
    </nav>
  )
}

/* ---------- Área de texto ---------- */
export function AreaTexto({ rotulo, ...p }: { rotulo?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="ds-campo">
      {rotulo && <span className="ds-campo__rotulo">{rotulo}</span>}
      <textarea {...p} />
    </label>
  )
}

/* ---------- Título com marca-texto (assinatura do sistema) ---------- */
export function TituloDestaque({ linha, destaque, tom = 'rosa', esquerda }: { linha?: ReactNode; destaque: ReactNode; tom?: 'rosa' | 'azul' | 'lavanda' | 'areia' | 'pessego'; esquerda?: boolean }) {
  return (
    <div className={cx('ds-destaque', `ds-destaque--${tom}`, esquerda && 'ds-destaque--esq')}>
      {linha && <span className="ds-destaque__linha">{linha}</span>}
      <span className="ds-destaque__palavra"><span className="ds-destaque__marcador">{destaque}</span></span>
    </div>
  )
}

/* ---------- Marca Meu Liso (símbolo oficial, sem redesenho) ---------- */
export function SimboloMeuLiso({ altura = 48, className }: { altura?: number; className?: string }) {
  return <img src={`${import.meta.env.BASE_URL}marca/simbolo.png`} alt="" aria-hidden height={altura} style={{ height: altura, width: 'auto' }} className={cx('ml-simbolo', className)} draggable={false} />
}
/** Símbolo + "Meu Liso" + "by Império Progressivas" */
export function MarcaMeuLiso({ tamanho = 'md', assinatura = true, horizontal }: { tamanho?: 'sm' | 'md' | 'lg'; assinatura?: boolean; horizontal?: boolean }) {
  const alt = { sm: 32, md: 56, lg: 96 }[tamanho]
  return (
    <span className={cx('ml-marca', `ml-marca--${tamanho}`, horizontal && 'ml-marca--horizontal')} role="img" aria-label="Meu Liso, by Império Progressivas">
      <SimboloMeuLiso altura={alt} />
      <span className="ml-marca__textos">
        <span className="ml-marca__nome">Meu Liso</span>
        {assinatura && <span className="ml-marca__by">by Império Progressivas</span>}
      </span>
    </span>
  )
}

/* ---------- Aniversário (dia e mês, sem ano) — valor no formato "MM-DD" ---------- */
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const DIAS_NO_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
export function CampoAniversario({ rotulo = 'Aniversário', valor, onTrocar }: { rotulo?: string; valor?: string; onTrocar: (mmdd: string | undefined) => void }) {
  const [mm, dd] = valor && /^\d{2}-\d{2}$/.test(valor) ? valor.split('-') : ['', '']
  const trocar = (m: string, d: string) => {
    if (!m || !d) return onTrocar(m || d ? undefined : undefined)
    const max = DIAS_NO_MES[Number(m) - 1]
    onTrocar(`${m}-${String(Math.min(Number(d), max)).padStart(2, '0')}`)
  }
  const limite = mm ? DIAS_NO_MES[Number(mm) - 1] : 31
  return (
    <fieldset className="ds-aniversario">
      <legend className="ds-campo__rotulo">{rotulo}</legend>
      <div className="ds-aniversario__linha">
        <Selecao aria-label="Dia do aniversário" value={dd} onChange={(e) => trocar(mm, e.target.value)}>
          <option value="">Dia</option>
          {Array.from({ length: limite }, (_, i) => String(i + 1).padStart(2, '0')).map((d) => <option key={d} value={d}>{Number(d)}</option>)}
        </Selecao>
        <Selecao aria-label="Mês do aniversário" value={mm} onChange={(e) => trocar(e.target.value, dd)}>
          <option value="">Mês</option>
          {MESES.map((m, i) => <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
        </Selecao>
      </div>
    </fieldset>
  )
}
