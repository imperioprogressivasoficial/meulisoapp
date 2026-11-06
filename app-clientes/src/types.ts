/**
 * Tipos do Meu Liso: app de cuidados para todos os tipos de cabelo
 * (liso, ondulado, cacheado e crespo).
 */

export interface Foto {
  id: string // chave da imagem no armazenamento
  data: string
  /** evolucao: fotos da aba Evolução; diagnostico: foto anexada ao diagnóstico */
  tipo: 'evolucao' | 'diagnostico'
  legenda?: string
}

/** Resultado do diagnóstico capilar (só cuidados: nada de serviço nem preço). */
export interface Diagnostico {
  id: string
  data: string
  respostas: Record<string, string>
  fio: string
  porosidade: string
  danos: string
  /** Etapa que mais pesa no cronograma recomendado. */
  foco: 'H' | 'N' | 'R'
  rotina: string[]
  observacoes: string[]
  fotoId?: string
}

export interface Notificacao {
  id: string
  data: string // ISO completo
  titulo: string
  texto: string
  lida: boolean
  rota?: string
  chave?: string // evita duplicar o mesmo aviso
}

export interface Cliente {
  id: string
  nome: string
  telefone: string
  aniversario?: string // mm-dd
  cidade?: string
  criadoEm: string
  fotos: Foto[]
  diagnosticos: Diagnostico[]
  notificacoes: Notificacao[]
  consentimentoMarketing?: boolean
  consentimentoLgpdEm?: string
  /** Respostas do primeiro acesso (onboarding). */
  onboarding?: RespostasOnboarding
}

/* ---------- perfil de cabelo (respostas do primeiro acesso) ---------- */
export type TipoCabelo = 'liso' | 'ondulado' | 'cacheado' | 'crespo'
export type EstadoFio = 'saudavel' | 'ressecado' | 'danificado'
export type Lavagens = 2 | 3 | 4
export type Comprimento = 'curto' | 'medio' | 'longo' | 'muito-longo'
/** Químicas no cabelo hoje. `nenhuma` exclui as demais. */
export type QuimicaAtual = 'nenhuma' | 'alisamento' | 'coloracao' | 'luzes' | 'descoloracao' | 'relaxamento'
/** Quando foi a última química. */
export type UltimaQuimica = 'semana' | 'menos-1-mes' | '1-3-meses' | 'mais-3-meses'
export type Incomodo = 'frizz' | 'volume' | 'definicao' | 'pontas' | 'quebra' | 'oleosidade' | 'brilho' | 'queda'
export type UsoCalor = 'nunca' | 'as-vezes' | 'sempre'

/**
 * Respostas do primeiro acesso. Os três primeiros campos existem desde a primeira versão
 * (o servidor guarda tudo num jsonb); os demais são opcionais, então respostas antigas continuam carregando.
 * `ultimaProgressiva` hoje guarda quando foi a última química (qualquer uma), ou '' se não tem.
 */
export interface RespostasOnboarding {
  objetivos: string[]
  ultimaProgressiva: UltimaQuimica | ''
  tipoCabelo: TipoCabelo | ''
  apelido?: string
  comprimento?: Comprimento
  quimicas?: QuimicaAtual[]
  estado?: EstadoFio
  incomodos?: Incomodo[] // na ordem em que a cliente marcou (o primeiro é o principal)
  lavagens?: Lavagens
  calor?: UsoCalor
  lembretes?: boolean
  atualizadoEm?: string
}

export interface Banco {
  versao: number
  clientes: Cliente[]
  sessao: { clienteId?: string }
  /** Diagnóstico feito antes de criar a conta: entra no cadastro. */
  diagnosticoVisitante?: Diagnostico
}
