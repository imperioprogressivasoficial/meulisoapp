/**
 * Perfil de cabelo: lê as respostas do primeiro acesso (`cliente.onboarding`) e
 * transforma em decisões do app (plano inicial, cronograma, dica do Início).
 * Vale para todos os tipos de cabelo. Tudo aqui é lógica pura, sem React e sem servidor.
 *
 * Textos sem promessas: são orientações gerais de cuidado em casa.
 */
import type {
  Cliente, Comprimento, EstadoFio, Incomodo, Lavagens, QuimicaAtual, RespostasOnboarding, TipoCabelo, UltimaQuimica, UsoCalor,
} from '../types'
import { diasEntre, hojeISO } from '../lib/regras'

/* ---------- rótulos (usados no onboarding, no perfil e nos resumos) ---------- */
export const OBJETIVOS: { id: string; rotulo: string }[] = [
  { id: 'hidratar', rotulo: 'Hidratar os fios' },
  { id: 'definir', rotulo: 'Definir meus cachos' },
  { id: 'frizz', rotulo: 'Reduzir o frizz' },
  { id: 'crescimento', rotulo: 'Crescimento e menos queda' },
  { id: 'recuperar', rotulo: 'Recuperar fios danificados' },
  { id: 'liso', rotulo: 'Manter o liso bonito' },
  { id: 'entender', rotulo: 'Entender meu cabelo' },
]
export const TIPOS: { id: TipoCabelo; rotulo: string; detalhe: string }[] = [
  { id: 'liso', rotulo: 'Liso', detalhe: 'Fios retos da raiz às pontas' },
  { id: 'ondulado', rotulo: 'Ondulado', detalhe: 'Ondas em forma de S' },
  { id: 'cacheado', rotulo: 'Cacheado', detalhe: 'Cachos definidos, em espiral' },
  { id: 'crespo', rotulo: 'Crespo', detalhe: 'Molinhas bem fechadas, muito volume' },
]
export const QUIMICAS_ATUAIS: { id: QuimicaAtual; rotulo: string; detalhe?: string }[] = [
  { id: 'nenhuma', rotulo: 'Nenhuma', detalhe: 'Cabelo natural' },
  { id: 'alisamento', rotulo: 'Progressiva ou alisamento', detalhe: 'Inclui selagem e botox com formol ou ácidos' },
  { id: 'coloracao', rotulo: 'Coloração', detalhe: 'Tinta ou tonalizante' },
  { id: 'luzes', rotulo: 'Luzes ou mechas' },
  { id: 'descoloracao', rotulo: 'Descoloração', detalhe: 'Cabelo clareado por inteiro' },
  { id: 'relaxamento', rotulo: 'Relaxamento', detalhe: 'Relaxante, guanidina ou tioglicolato' },
]
export const ULTIMA: { id: UltimaQuimica; rotulo: string }[] = [
  { id: 'semana', rotulo: 'Nesta semana' },
  { id: 'menos-1-mes', rotulo: 'Menos de 1 mês' },
  { id: '1-3-meses', rotulo: '1 a 3 meses' },
  { id: 'mais-3-meses', rotulo: 'Mais de 3 meses' },
]
export const COMPRIMENTOS: { id: Comprimento; rotulo: string; detalhe: string }[] = [
  { id: 'curto', rotulo: 'Curto', detalhe: 'Até o queixo' },
  { id: 'medio', rotulo: 'Médio', detalhe: 'Até os ombros' },
  { id: 'longo', rotulo: 'Longo', detalhe: 'Até o meio das costas' },
  { id: 'muito-longo', rotulo: 'Muito longo', detalhe: 'Abaixo do meio das costas' },
]
export const ESTADOS: { id: EstadoFio; rotulo: string; detalhe: string }[] = [
  { id: 'saudavel', rotulo: 'Saudável', detalhe: 'Macio e com brilho, só quero manter' },
  { id: 'ressecado', rotulo: 'Ressecado', detalhe: 'Áspero, com frizz e pontas secas' },
  { id: 'danificado', rotulo: 'Danificado', detalhe: 'Quebrando, elástico ou muito poroso' },
]
export const INCOMODOS: { id: Incomodo; rotulo: string }[] = [
  { id: 'frizz', rotulo: 'Frizz' },
  { id: 'volume', rotulo: 'Volume' },
  { id: 'definicao', rotulo: 'Falta de definição' },
  { id: 'pontas', rotulo: 'Pontas secas' },
  { id: 'quebra', rotulo: 'Quebra' },
  { id: 'oleosidade', rotulo: 'Oleosidade' },
  { id: 'brilho', rotulo: 'Falta de brilho' },
  { id: 'queda', rotulo: 'Queda' },
]
export const LAVAGENS: { id: Lavagens; rotulo: string }[] = [
  { id: 2, rotulo: '2 vezes' },
  { id: 3, rotulo: '3 vezes' },
  { id: 4, rotulo: '4 vezes ou mais' },
]
export const CALOR: { id: UsoCalor; rotulo: string; detalhe?: string }[] = [
  { id: 'nunca', rotulo: 'Nunca', detalhe: 'Deixo secar naturalmente' },
  { id: 'as-vezes', rotulo: 'Às vezes', detalhe: 'Em dias especiais' },
  { id: 'sempre', rotulo: 'Quase sempre', detalhe: 'Secador, difusor ou chapinha toda semana' },
]

const rotuloDe = <T extends string | number>(lista: { id: T; rotulo: string }[], id?: T | '') => lista.find((x) => x.id === id)?.rotulo

/* ---------- leitura ---------- */
/** Como chamar a cliente: o apelido do onboarding, senão o primeiro nome do cadastro. */
export function comoChamar(c: Cliente) {
  const a = c.onboarding?.apelido?.trim()
  return a || c.nome.split(' ')[0]
}

/** Primeiro nome digitado no onboarding, para já vir preenchido no cadastro. */
export const primeiroNomeDe = (texto: string) => texto.trim().replace(/\s+/g, ' ').slice(0, 40)

export const temQuimica = (r?: Partial<RespostasOnboarding>) => !!r?.quimicas?.some((q) => q !== 'nenhuma')
export const temClareamento = (r?: Partial<RespostasOnboarding>) => !!r?.quimicas?.some((q) => q === 'descoloracao' || q === 'luzes')
export const ehCacheadoOuCrespo = (r?: Partial<RespostasOnboarding>) => r?.tipoCabelo === 'cacheado' || r?.tipoCabelo === 'crespo'

/**
 * Química recente: a cliente respondeu que fez uma química nesta semana ou há menos de 1 mês,
 * e a resposta tem menos de 30 dias. `semana` indica que ainda está nos primeiros dias.
 */
export function quimicaRecente(c: Cliente, hoje = hojeISO()): { semana: boolean; desde: string } | undefined {
  const r = c.onboarding
  if (!temQuimica(r) || (r!.ultimaProgressiva !== 'semana' && r!.ultimaProgressiva !== 'menos-1-mes')) return undefined
  const desde = r!.atualizadoEm ?? c.criadoEm
  if (diasEntre(desde, hoje) > 30) return undefined
  return { semana: r!.ultimaProgressiva === 'semana', desde }
}

/** Cronograma: as duas respostas que ele precisa já vieram do cadastro? */
export function cronogramaDasRespostas(c: Cliente): { estado: EstadoFio; lavagens: Lavagens; lembretes: boolean } | undefined {
  const r = c.onboarding
  if (!r?.estado || !r.lavagens || !ESTADOS.some((e) => e.id === r.estado) || ![2, 3, 4].includes(r.lavagens)) return undefined
  return { estado: r.estado, lavagens: r.lavagens, lembretes: r.lembretes ?? true }
}

/** Resumo curto em texto, para o Perfil ("Ondulado · longo · ressecado"). */
export function resumoPerfil(r?: RespostasOnboarding) {
  if (!r) return undefined
  const partes = [
    rotuloDe(TIPOS, r.tipoCabelo),
    rotuloDe(COMPRIMENTOS, r.comprimento)?.toLowerCase(),
    rotuloDe(ESTADOS, r.estado)?.toLowerCase(),
  ].filter(Boolean)
  return partes.length ? partes.join(' · ') : undefined
}

export type IdLinhaPerfil = 'objetivos' | 'cabelo' | 'quimicas' | 'ultima' | 'comprimento' | 'estado' | 'incomodos' | 'lavagens' | 'calor'

/** Linhas do "Meu perfil de cabelo": pergunta → resposta em texto. */
export function linhasPerfil(r?: RespostasOnboarding): { id: IdLinhaPerfil; titulo: string; valor?: string }[] {
  const lista = <T extends string>(l: { id: T; rotulo: string }[], ids?: T[]) => (ids?.length ? ids.map((i) => rotuloDe(l, i)).filter(Boolean).join(', ') || undefined : undefined)
  return [
    { id: 'objetivos', titulo: 'O que você quer agora', valor: lista(OBJETIVOS, r?.objetivos) },
    { id: 'cabelo', titulo: 'Tipo de cabelo', valor: rotuloDe(TIPOS, r?.tipoCabelo) },
    { id: 'quimicas', titulo: 'Química no cabelo', valor: lista(QUIMICAS_ATUAIS, r?.quimicas) },
    ...(temQuimica(r) ? [{ id: 'ultima' as const, titulo: 'Última química', valor: rotuloDe(ULTIMA, r?.ultimaProgressiva) }] : []),
    { id: 'comprimento', titulo: 'Comprimento', valor: rotuloDe(COMPRIMENTOS, r?.comprimento) },
    { id: 'estado', titulo: 'Como está o fio', valor: rotuloDe(ESTADOS, r?.estado) },
    { id: 'incomodos', titulo: 'O que mais incomoda', valor: lista(INCOMODOS, r?.incomodos) },
    { id: 'lavagens', titulo: 'Lavagens por semana', valor: rotuloDe(LAVAGENS, r?.lavagens) },
    { id: 'calor', titulo: 'Secador, difusor e chapinha', valor: rotuloDe(CALOR, r?.calor) },
  ]
}

/* ---------- "Seu plano" no fim do onboarding ---------- */
export type IlustraPlano = 'reconstrucao' | 'hidratacao' | 'nutricao' | 'cronograma' | 'prancha' | 'cabelo' | 'diario' | 'diagnostico'
export interface CartaoPlano { id: string; ilustra: IlustraPlano; tom: 'rosa' | 'azul' | 'lavanda' | 'areia'; titulo: string; texto: string }

const NOME_ESTADO: Record<EstadoFio, string> = { saudavel: 'saudável', ressecado: 'ressecado', danificado: 'danificado' }

/** Cuidado de finalização de cada tipo de cabelo. */
const FINALIZACAO: Record<TipoCabelo, Omit<CartaoPlano, 'id' | 'ilustra'>> = {
  liso: { tom: 'azul', titulo: 'Leveza e movimento', texto: 'Condicionador só do meio às pontas e finalizador leve. Assim o liso fica solto, sem pesar na raiz.' },
  ondulado: { tom: 'azul', titulo: 'Ondas definidas', texto: 'Finalizador leve no cabelo molhado e amasse de baixo para cima. Produto pesado demais desmancha as ondas.' },
  cacheado: { tom: 'azul', titulo: 'Cachos definidos', texto: 'Leave-in e creme de pentear mecha a mecha no cabelo encharcado. Deixe secar sem mexer, ou use o difusor.' },
  crespo: { tom: 'azul', titulo: 'Hidratação que dura', texto: 'Fio crespo perde água rápido: leave-in, creme e óleo em camadas ajudam a manter a umidade e a definição.' },
}

/**
 * Monta de 2 a 5 cartões a partir de todas as respostas, do mais urgente ao mais geral.
 * `aviso` aparece abaixo dos cartões quando há um cuidado importante (ex.: descoloração).
 */
export function montarPlanoInicial(r: Partial<RespostasOnboarding>): { cartoes: CartaoPlano[]; aviso?: string } {
  const objetivos = r.objetivos ?? []
  const incomodos = r.incomodos ?? []
  const tipo = rotuloDe(TIPOS, r.tipoCabelo)?.toLowerCase()
  const clareado = temClareamento(r)
  const recente = temQuimica(r) && (r.ultimaProgressiva === 'semana' || r.ultimaProgressiva === 'menos-1-mes')
  const cartoes: CartaoPlano[] = []

  // 1. força antes de tudo
  if (clareado || r.estado === 'danificado' || incomodos.includes('quebra') || objetivos.includes('recuperar'))
    cartoes.push({
      id: 'reconstrucao', ilustra: 'reconstrucao', tom: 'lavanda', titulo: 'Foco em reconstrução',
      texto: clareado
        ? 'Fio clareado perde massa: a reconstrução entra no cronograma para devolver força e reduzir a quebra.'
        : 'Seu fio está pedindo força: a reconstrução entra no cronograma para reduzir a quebra.',
    })

  // 2. química recente: proteger o fio
  if (recente)
    cartoes.push({ id: 'quimica', ilustra: 'hidratacao', tom: 'rosa', titulo: 'Química recente', texto: 'Nas primeiras semanas o cronograma prioriza a hidratação e pede calor moderado, para o fio se recuperar.' })

  // 3. finalização de acordo com o tipo de cabelo
  if (r.tipoCabelo && (r.tipoCabelo !== 'liso' || objetivos.includes('liso') || incomodos.includes('oleosidade') || incomodos.includes('volume')))
    cartoes.push({ id: 'finalizacao', ilustra: 'cabelo', ...FINALIZACAO[r.tipoCabelo] })

  // 4. nutrição para frizz, pontas e brilho (mais ainda com muita lavagem ou calor)
  const pedeNutricao = incomodos.some((i) => i === 'frizz' || i === 'pontas' || i === 'brilho') || objetivos.includes('frizz')
  if (pedeNutricao && (r.lavagens === 4 || r.calor === 'sempre' || r.estado === 'ressecado' || ehCacheadoOuCrespo(r)))
    cartoes.push({
      id: 'nutricao', ilustra: 'nutricao', tom: 'areia', titulo: 'Mais nutrição',
      texto: r.lavagens === 4 ? 'Quem lava 4 vezes por semana perde mais óleo natural. A nutrição repõe e ajuda a controlar o frizz.'
        : r.calor === 'sempre' ? 'Com secador, difusor ou chapinha frequentes, a nutrição protege as pontas e devolve o brilho.'
        : 'Fio com frizz pede nutrição: ela sela o fio e segura a umidade.',
    })

  // 5. cronograma (pronto se já sabemos estado e lavagens)
  if (r.estado && r.lavagens)
    cartoes.push({ id: 'cronograma', ilustra: 'cronograma', tom: 'lavanda', titulo: 'Cronograma pronto', texto: `4 semanas para fio ${NOME_ESTADO[r.estado]}, ${r.lavagens} lavagens por semana. É só um toque na aba Cronograma.` })
  else
    cartoes.push({ id: 'cronograma', ilustra: 'cronograma', tom: 'lavanda', titulo: 'Cronograma capilar', texto: `Hidratação, nutrição e reconstrução na ordem certa${tipo ? ` para o cabelo ${tipo}` : ''}, na aba Cronograma.` })

  // 6. calor
  if (r.calor === 'sempre')
    cartoes.push({ id: 'calor', ilustra: 'prancha', tom: 'rosa', titulo: 'Proteção do calor', texto: 'Protetor térmico sempre antes do secador, do difusor ou da chapinha, e temperatura moderada.' })

  // até 3 cuidados mais urgentes, depois o cronograma (sempre) e o diário
  const cronograma = cartoes.find((c) => c.id === 'cronograma')!
  const principais = [...cartoes.filter((c) => c !== cronograma).slice(0, 3), cronograma]
  principais.push({
    id: 'diario', ilustra: 'diario', tom: 'areia', titulo: 'Diário do cabelo',
    texto: objetivos.includes('entender') ? 'Um minuto por dia para entender seu cabelo: o app mostra o que melhora e o que piora.' : 'Um minuto por dia: frizz, brilho e maciez num gráfico, para ver o que funciona.',
  })

  const aviso = clareado
    ? 'Com descoloração, luzes ou mechas, evite outra química no mesmo cabelo sem orientação de um profissional e faça um teste de mecha antes.'
    : r.quimicas?.includes('relaxamento') && r.quimicas.includes('alisamento')
      ? 'Relaxamento e alisamento costumam ser incompatíveis entre si. Antes de repetir qualquer um, peça orientação a um profissional.'
      : undefined
  return { cartoes: principais, aviso }
}

/* ---------- dica do Início, a partir do incômodo principal ---------- */
export interface DicaPerfil { incomodo: Incomodo; titulo: string; texto: string; rota: string; acao: string; tom: 'azul' | 'areia' | 'lavanda' }

const DICAS: Record<Incomodo, Omit<DicaPerfil, 'incomodo'>> = {
  frizz: { titulo: 'Menos frizz', tom: 'areia', rota: '/cuidados/N', acao: 'Como fazer a nutrição', texto: 'Aplique o finalizador com o fio ainda úmido e não esfregue a toalha: aperte os fios com uma toalha de microfibra ou uma camiseta.' },
  volume: { titulo: 'Volume sob controle', tom: 'azul', rota: '/cuidados/N', acao: 'Como fazer a nutrição', texto: 'Finalizador mais encorpado no comprimento e secagem sem mexer muito nos fios. Nutrição em dia também assenta o volume.' },
  definicao: { titulo: 'Mais definição', tom: 'azul', rota: '/cuidados/H', acao: 'Como fazer a hidratação', texto: 'Finalize com o cabelo encharcado, mecha a mecha, e amasse de baixo para cima. Deixe secar sem tocar.' },
  pontas: { titulo: 'Pontas secas', tom: 'areia', rota: '/cuidados/N', acao: 'Como fazer a nutrição', texto: 'Duas ou três gotas de óleo só nas pontas, depois de secar. Aparar as pontas de tempos em tempos também ajuda.' },
  quebra: { titulo: 'Fio quebrando', tom: 'lavanda', rota: '/cuidados/R', acao: 'Como fazer a reconstrução', texto: 'Evite elástico apertado e use protetor térmico antes do calor. A reconstrução repõe a força do fio.' },
  oleosidade: { titulo: 'Raiz oleosa', tom: 'azul', rota: '/cuidados/H', acao: 'Como fazer a hidratação', texto: 'Máscara e óleo só do comprimento às pontas, longe da raiz. Na raiz, só o shampoo, com massagem leve.' },
  brilho: { titulo: 'Mais brilho', tom: 'areia', rota: '/cuidados/N', acao: 'Como fazer a nutrição', texto: 'Termine o banho com água fria no cabelo e mantenha a nutrição no cronograma.' },
  queda: { titulo: 'Menos queda', tom: 'lavanda', rota: '/diario', acao: 'Acompanhar no diário', texto: 'Massageie o couro cabeludo ao lavar e evite penteados muito apertados. Se a queda for forte ou repentina, procure um dermatologista.' },
}

/** Uma dica para o "Para você hoje", pelo incômodo que a cliente marcou primeiro. */
export function dicaDoPerfil(c: Cliente): DicaPerfil | undefined {
  const principal = c.onboarding?.incomodos?.find((i) => i in DICAS)
  return principal ? { incomodo: principal, ...DICAS[principal] } : undefined
}
