/**
 * Dicas de cuidado (tela /dicas). Textos curtos, sem promessas e sem produtos de marca.
 * Curadoria de Tássia Carvalho.
 */
import type { ChaveFoto } from './fotos'
import type { TipoCabelo } from '../types'

export const AUTORA_DICAS = 'Tássia Carvalho'

export interface Dica {
  id: string
  titulo: string
  duracao: string
  foto: ChaveFoto
  /** Tipos de cabelo para quem a dica é mais útil (vazio = todos). */
  para: TipoCabelo[]
  texto: string[]
}

export const DICAS: Dica[] = [
  {
    id: 'lavar', titulo: 'Como lavar sem ressecar', duracao: '2 min', foto: 'fios', para: [],
    texto: [
      'Use água morna ou fria: água muito quente abre a cutícula e resseca.',
      'Shampoo só na raiz, com a ponta dos dedos. A espuma que escorre já limpa o comprimento.',
      'Condicionador ou máscara do meio às pontas, nunca na raiz.',
      'Tire o excesso de água apertando os fios com uma toalha de microfibra ou camiseta, sem esfregar.',
    ],
  },
  {
    id: 'cachos', titulo: 'Finalização para cachos e crespos', duracao: '3 min', foto: 'cachos', para: ['cacheado', 'crespo'],
    texto: [
      'Finalize com o cabelo encharcado: a água ajuda o produto a se espalhar e define melhor.',
      'Leave-in primeiro, depois creme de pentear ou gelatina, mecha a mecha.',
      'Amasse de baixo para cima e deixe secar sem mexer, ou use o difusor em temperatura média.',
      'Quando secar, quebre o "casquinho" da gelatina com as mãos levemente oleadas.',
    ],
  },
  {
    id: 'ondas', titulo: 'Ondas sem pesar', duracao: '2 min', foto: 'costas', para: ['ondulado'],
    texto: [
      'Ondulado costuma pesar com produto demais: prefira fórmulas leves.',
      'Aplique o finalizador com as mãos em concha e amasse as ondas de baixo para cima.',
      'Evite pentear depois de seco: desfaz as ondas e aumenta o frizz.',
    ],
  },
  {
    id: 'liso', titulo: 'Liso com movimento', duracao: '2 min', foto: 'splash', para: ['liso'],
    texto: [
      'Raiz oleosa e pontas secas são comuns no liso: mantenha máscara e óleo longe da raiz.',
      'Se usar secador ou chapinha, o protetor térmico vem sempre antes.',
      'Finalize com um jato de ar frio para selar os fios e dar brilho.',
    ],
  },
  {
    id: 'umidade', titulo: 'Dias úmidos sem frizz', duracao: '2 min', foto: 'crespo', para: [],
    texto: [
      'Em dias de muita umidade, aplique o finalizador com o cabelo ainda úmido.',
      'A nutrição em dia sela o fio e segura o frizz por mais tempo.',
      'Leve umas gotas de óleo na bolsa para as pontas.',
    ],
  },
  {
    id: 'noite', titulo: 'Cuidados para dormir', duracao: '1 min', foto: 'madura', para: [],
    texto: [
      'Fronha de cetim ou seda diminui o atrito e o frizz.',
      'Cabelo longo ou cacheado: prenda num coque frouxo no alto da cabeça ("abacaxi").',
      'Evite dormir com o cabelo molhado: ele fica mais frágil e pode ter cheiro de umidade.',
    ],
  },
]
