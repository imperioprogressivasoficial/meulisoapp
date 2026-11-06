/**
 * Ícones do Meu Liso (desenhados para o app, não são de biblioteca).
 * Estilo v7 "Fio": traço único e fino em marrom suave, um detalhe em dourado
 * champagne, sobre um círculo nude bem discreto. Viewbox 48×48.
 * Sem rosa, sem lilás, sem bolhas. Quando existe a versão 3D (champagne, gerada na
 * Higgsfield e recortada por scripts/recortar-icones.py), ela é mostrada; o traço fica de reserva.
 * Os ícones de abas são de traço (24×24, currentColor); a aba ativa fica em champagne via CSS.
 */
import { useState, type ComponentType, type ReactNode } from 'react'

export type IconeProps = { size?: number | string; strokeWidth?: number | string; className?: string; color?: string; ativo?: boolean }
export type Icone = ComponentType<IconeProps> & { ilustrado?: boolean }

/* cores só por token (com fallback para quem renderiza fora do app) */
const TRACO = 'var(--ml-marrom, #756653)'
const ACENTO = 'var(--ml-dourado, #C6A56A)'
const CIRCULO = 'var(--ml-nude, #F3EEE5)'

/* ícone 3D de cada ilustração (public/img/icones/<arquivo>.webp) */
const ARQUIVO_3D: Record<string, string> = {
  IlCronograma: 'cronograma', IlHidratacao: 'hidratacao', IlNutricao: 'nutricao', IlReconstrucao: 'reconstrucao',
  IlDiagnostico: 'diagnostico', IlCabelo: 'cabelo', IlGaleria: 'galeria', IlSino: 'sino', IlPrancha: 'prancha',
  IlEscova: 'escova', IlCoroa: 'liso', IlTesoura: 'tesoura', IlSempreLisa: 'sempre-lisa', IlRaiz: 'raiz',
  IlEstrela: 'estrela', IlAgendar: 'agendar',
}

function ilustra(nome: string, desenho: ReactNode): Icone {
  const arquivo = ARQUIVO_3D[nome]
  const C = ({ size = 48, className }: IconeProps) => {
    const [falhou, setFalhou] = useState(false)
    if (arquivo && !falhou)
      return <img src={`${import.meta.env.BASE_URL}img/icones/${arquivo}.webp`} width={size} height={size} className={['ml-icone', 'ml-icone--3d', className].filter(Boolean).join(' ')} alt="" aria-hidden draggable={false} decoding="async" onError={() => setFalhou(true)} />
    return <svg width={size} height={size} viewBox="0 0 48 48" className={['ml-icone', className].filter(Boolean).join(' ')} aria-hidden fill="none" stroke={TRACO} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="22" fill={CIRCULO} stroke="none" />
      {desenho}
    </svg>
  }
  C.displayName = nome
  ;(C as Icone).ilustrado = true
  return C as Icone
}

const a = { stroke: ACENTO }

/* ---------------- ilustrados ---------------- */
export const IlAgendar = ilustra('IlAgendar', <>
  <rect x="14" y="15" width="20" height="19" rx="4" />
  <path d="M19 12v5M29 12v5M14 21h20" />
  <path d="M20.5 27.2l2.4 2.4 4.6-4.8" {...a} />
</>)

export const IlCabelo = ilustra('IlCabelo', <>
  <path d="M19 12c-3 5-3 10 0 14s3 7 1 10" />
  <path d="M24.5 12c-3 5-3 10 0 14s3 7 1 10" {...a} />
  <path d="M30 12c-3 5-3 10 0 14s3 7 1 10" />
</>)

export const IlDiagnostico = ilustra('IlDiagnostico', <>
  <circle cx="22" cy="22" r="7.5" />
  <path d="M27.6 27.6l6.4 6.4" />
  <path d="M18.6 22a3.4 3.4 0 0 1 3.4-3.4" {...a} />
</>)

export const IlLoja = ilustra('IlLoja', <>
  <path d="M21 12.5h6v4.5h-6z" />
  <path d="M19.5 17h9a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3V19a2 2 0 0 1 2-2Z" />
  <path d="M21.5 25h5" {...a} />
</>)

export const IlSempreLisa = ilustra('IlSempreLisa', <>
  <path d="M15.5 20.5l4-6h9l4 6-8.5 14-8.5-14Z" />
  <path d="M15.5 20.5h17M24 34.5l-3-14 3-6 3 6-3 14" />
  <path d="M35.5 11.5v3.5M33.75 13.25h3.5" {...a} />
</>)

export const IlGarantia = ilustra('IlGarantia', <>
  <path d="M24 12l10 3.5v7c0 6.5-4.2 11-10 13.5-5.8-2.5-10-7-10-13.5v-7L24 12Z" />
  <path d="M19.6 24.2l3 3 5.8-6" {...a} />
</>)

/* antes era uma coroa: agora "liso", fios retos e alinhados */
export const IlCoroa = ilustra('IlCoroa', <>
  <path d="M16.5 17c2.2-3 4.8-4.5 7.5-4.5s5.3 1.5 7.5 4.5" />
  <path d="M19 18v17M29 18v17" />
  <path d="M24 14v21" {...a} />
</>)

export const IlIndique = ilustra('IlIndique', <>
  <path d="M20.5 33.5s-7-4.2-7-9a3.8 3.8 0 0 1 7-2 3.8 3.8 0 0 1 7 2c0 4.8-7 9-7 9Z" />
  <path d="M30 28.5s-4.8-2.9-4.8-6.2a2.6 2.6 0 0 1 4.8-1.4 2.6 2.6 0 0 1 4.8 1.4c0 3.3-4.8 6.2-4.8 6.2Z" {...a} />
</>)

export const IlCronograma = ilustra('IlCronograma', <>
  <circle cx="24" cy="24" r="10.5" />
  <path d="M24 13.5a10.5 10.5 0 0 1 9.1 15.75" {...a} strokeWidth={2.4} />
  <path d="M24 18.5V24l3.5 2.2" />
</>)

export const IlHidratacao = ilustra('IlHidratacao', <>
  <path d="M24 12.5c4.6 5.6 8 9.6 8 13.6a8 8 0 0 1-16 0c0-4 3.4-8 8-13.6Z" />
  <path d="M20.4 26.6a3.6 3.6 0 0 0 3.1 3.3" {...a} />
</>)

export const IlNutricao = ilustra('IlNutricao', <>
  <path d="M21 16c3.6 4.2 6 7.2 6 10.2a6 6 0 0 1-12 0c0-3 2.4-6 6-10.2Z" />
  <path d="M28.5 21.5c.3-4.2 3-6.4 7-6.4 0 4-2.5 6.6-7 6.4ZM28.5 21.5l3.5-3.5" {...a} />
</>)

export const IlReconstrucao = ilustra('IlReconstrucao', <>
  <rect x="15" y="28" width="18" height="6" rx="3" />
  <rect x="17.5" y="21" width="13" height="6" rx="3" />
  <rect x="20" y="14" width="8" height="6" rx="3" {...a} />
</>)

export const IlRaiz = ilustra('IlRaiz', <>
  <rect x="13" y="24" width="22" height="8" rx="2.5" />
  <path d="M17.5 24v3M22 24v4M26.5 24v3M31 24v4" strokeWidth={1.4} />
  <path d="M24 12c-1.6 3-1.6 6.5 0 9.5" {...a} />
</>)

export const IlGaleria = ilustra('IlGaleria', <>
  <rect x="13" y="15" width="22" height="18" rx="3.5" />
  <path d="M13.5 29.5l6-5.5 4.5 4 3-2.5 7.5 6" />
  <circle cx="28.5" cy="20.5" r="2" {...a} />
</>)

export const IlPassaporte = ilustra('IlPassaporte', <>
  <rect x="16" y="12" width="16" height="24" rx="3" />
  <circle cx="24" cy="22" r="4" {...a} />
  <path d="M20.5 30h7" />
</>)

export const IlIA = ilustra('IlIA', <>
  <path d="M21.5 13l2 5.8 5.8 2-5.8 2-2 5.8-2-5.8-5.8-2 5.8-2 2-5.8Z" />
  <path d="M31.5 27l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1 1-2.6Z" {...a} />
</>)

export const IlEstrela = ilustra('IlEstrela', <>
  <path d="M24 13l3.2 6.6 7.2 1-5.2 5.1 1.2 7.2L24 29.5l-6.4 3.4 1.2-7.2-5.2-5.1 7.2-1L24 13Z" />
  <path d="M24 19.5v5" {...a} />
</>)

export const IlPresente = ilustra('IlPresente', <>
  <rect x="14.5" y="22" width="19" height="12" rx="2" />
  <rect x="13" y="18" width="22" height="4.5" rx="1.5" />
  <path d="M24 18v16" {...a} />
  <path d="M24 18c-2-4-6-4.2-5.6-1.6.3 1.4 2.8 1.6 5.6 1.6Zm0 0c2-4 6-4.2 5.6-1.6-.3 1.4-2.8 1.6-5.6 1.6Z" {...a} />
</>)

export const IlEscova = ilustra('IlEscova', <>
  <path d="M15 33l8-8" />
  <rect x="21.5" y="13.5" width="11" height="11" rx="5.5" transform="rotate(45 27 19)" />
  <path d="M25 17l4 4" {...a} />
</>)

export const IlTesoura = ilustra('IlTesoura', <>
  <circle cx="18.5" cy="31" r="3.5" />
  <circle cx="29.5" cy="31" r="3.5" />
  <path d="M20.6 28.2L30 14M27.4 28.2L18 14" />
  <circle cx="24" cy="23.2" r=".9" fill={ACENTO} {...a} />
</>)

export const IlPacote = ilustra('IlPacote', <>
  <path d="M24 13l10 5v12l-10 5-10-5V18l10-5Z" />
  <path d="M14 18l10 5 10-5M24 23v12" />
  <path d="M19 15.5l10 5" {...a} />
</>)

export const IlCupom = ilustra('IlCupom', <>
  <path d="M13.5 19a2 2 0 0 1 2-2h17a2 2 0 0 1 2 2v2.5a2.5 2.5 0 0 0 0 5V29a2 2 0 0 1-2 2h-17a2 2 0 0 1-2-2v-2.5a2.5 2.5 0 0 0 0-5V19Z" />
  <path d="M28 18.5v11" {...a} strokeDasharray="2 2.4" />
  <path d="M18.5 27.5l5-7" />
</>)

export const IlLive = ilustra('IlLive', <>
  <rect x="12.5" y="17" width="17" height="14" rx="3.5" />
  <path d="M29.5 22l6-3.5v11l-6-3.5" />
  <circle cx="18" cy="22" r="1.6" fill={ACENTO} stroke="none" />
</>)

export const IlPrancha = ilustra('IlPrancha', <>
  <path d="M15 34l13-18M20 35l13-18" />
  <path d="M28 16l5 1" {...a} />
</>)

export const IlSino = ilustra('IlSino', <>
  <path d="M16.5 30c1.6-2.6 1.6-5.4 1.6-8.5a5.9 5.9 0 0 1 11.8 0c0 3.1 0 5.9 1.6 8.5H16.5Z" />
  <path d="M21.8 33a2.2 2.2 0 0 0 4.4 0" {...a} />
</>)

/* ---------------- abas (traço mínimo; ativa recebe a cor champagne do CSS) ---------------- */
function aba(nome: string, corpo: (ativo: boolean) => ReactNode): Icone {
  const C = ({ size = 24, ativo, strokeWidth, className }: IconeProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={strokeWidth ?? (ativo ? 1.9 : 1.6)} strokeLinecap="round" strokeLinejoin="round">
      {corpo(!!ativo)}
    </svg>
  )
  C.displayName = nome
  return C as Icone
}

export const AbaInicio = aba('AbaInicio', () => <>
  <path d="M4 10.5 12 4l8 6.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8.5Z" />
  <path d="M10 21v-5.5h4V21" />
</>)
export const AbaAgenda = aba('AbaAgenda', () => <>
  <rect x="3.5" y="5" width="17" height="15.5" rx="4" />
  <path d="M8 3v4M16 3v4M3.5 10h17" />
</>)
export const AbaClub = aba('AbaClub', () => <>
  <path d="M12 3.5l2 5.5 5.5 2-5.5 2-2 5.5-2-5.5-5.5-2 5.5-2 2-5.5Z" />
</>)
export const AbaCuidados = aba('AbaCuidados', () => <>
  <path d="M12 3c3.5 4.6 6.5 7.8 6.5 11.3a6.5 6.5 0 0 1-13 0C5.5 10.8 8.5 7.6 12 3Z" />
  <path d="M9.5 15.5c.8 1.4 2.2 2 3.6 1.8" />
</>)
export const AbaPerfil = aba('AbaPerfil', () => <>
  <circle cx="12" cy="8.5" r="4" />
  <path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6" />
</>)
