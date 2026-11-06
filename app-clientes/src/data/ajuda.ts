/**
 * Conteúdo da tela "Ajuda" (/ajuda): perguntas frequentes sobre o app.
 * Regra de ouro: não afirmar nada que o app não faça. Casos de saúde (queda forte,
 * alergia, ferida no couro cabeludo): orientar a procurar um dermatologista.
 */

/** Minúsculas e sem acento, para a busca achar "cronograma" e "crónograma". */
export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export type CategoriaAjuda = 'cronograma' | 'diario' | 'evolucao' | 'conta' | 'privacidade'

export interface PerguntaAjuda {
  id: string
  categoria: CategoriaAjuda
  pergunta: string
  texto: string[]
  lista?: string[]
  /** "Ir para": uma tela do app */
  acao?: { rotulo: string; rota: string }
  /** sinônimos que a pessoa pode digitar na busca */
  termos?: string
}

export const CATEGORIAS_AJUDA: { id: CategoriaAjuda; nome: string }[] = [
  { id: 'cronograma', nome: 'Cronograma e cuidados' },
  { id: 'diario', nome: 'Diário do cabelo' },
  { id: 'evolucao', nome: 'Evolução e diagnóstico' },
  { id: 'conta', nome: 'Conta e acesso' },
  { id: 'privacidade', nome: 'Privacidade e dados' },
]

export const PERGUNTAS_AJUDA: PerguntaAjuda[] = [
  /* ---------- cronograma ---------- */
  {
    id: 'o-que-e-cronograma', categoria: 'cronograma', pergunta: 'O que é o cronograma capilar?',
    texto: ['É um plano de 4 semanas que alterna três cuidados em casa, um em cada lavagem:'],
    lista: ['Hidratação: devolve água ao fio (maciez e movimento).', 'Nutrição: repõe óleos (menos frizz, pontas protegidas).', 'Reconstrução: repõe massa (força, menos quebra).'],
    acao: { rotulo: 'Abrir meu cronograma', rota: '/cuidados' }, termos: 'hidratacao nutricao reconstrucao plano semanas',
  },
  {
    id: 'cronograma-tipos', categoria: 'cronograma', pergunta: 'Serve para cabelo cacheado, crespo ou liso?',
    texto: ['Sim. O cronograma vale para todos os tipos de cabelo. O que muda é a frequência de cada etapa, que o app ajusta pelo estado do seu fio e por quantas vezes você lava por semana.', 'A finalização (leave-in, creme, gelatina, protetor térmico) você escolhe do jeito que gosta.'],
    termos: 'cacho cachos crespo ondulado liso tipo',
  },
  {
    id: 'cronograma-marcar', categoria: 'cronograma', pergunta: 'Como marco uma etapa como feita?',
    texto: ['No Início ou na aba Cronograma, toque em "Marquei como feito" no cartão do dia. Também dá para tocar na bolinha do dia na grade das semanas.', 'Só dá para marcar o dia de hoje e os dias que já passaram.'],
    termos: 'feito marcar concluir bolinha',
  },
  {
    id: 'cronograma-refazer', categoria: 'cronograma', pergunta: 'Meu cabelo mudou. Como refaço o cronograma?',
    texto: ['Na aba Cronograma, desça até o fim e toque em "Refazer cronograma" (duas vezes, para confirmar). Se quiser, atualize antes o seu perfil de cabelo em Perfil → Meu perfil de cabelo.'],
    acao: { rotulo: 'Meu perfil de cabelo', rota: '/perfil-cabelo' }, termos: 'refazer recomecar mudar apagar',
  },
  {
    id: 'cronograma-produtos', categoria: 'cronograma', pergunta: 'Quais produtos devo usar?',
    texto: ['O app sugere tipos de produto para cada etapa (por exemplo, "máscara de hidratação"), sem indicar marcas. Escolha os que cabem no seu bolso e que o seu fio aceita bem.', 'Se tiver alergia ou sensibilidade, leia o rótulo e faça um teste numa pequena área antes.'],
    termos: 'produto marca mascara shampoo comprar',
  },
  {
    id: 'quimica-recente', categoria: 'cronograma', pergunta: 'Fiz uma química agora. O que muda?',
    texto: ['Se você contou no perfil de cabelo que fez uma química recente, o cronograma usa só hidratação nas primeiras semanas e o app mostra lembretes de cuidado.', 'Siga também as orientações de quem fez o procedimento (por exemplo, o tempo sem lavar).'],
    termos: 'progressiva alisamento coloracao descoloracao relaxamento quimica',
  },
  /* ---------- diário ---------- */
  {
    id: 'diario-como', categoria: 'diario', pergunta: 'Como funciona o Diário do cabelo?',
    texto: ['Uma vez por dia, dê uma nota de 1 a 5 para o frizz, o brilho e a maciez. Em poucos dias o gráfico mostra o que está melhorando e o app sugere um cuidado.'],
    acao: { rotulo: 'Abrir o diário', rota: '/diario' }, termos: 'nota grafico registro frizz brilho maciez',
  },
  {
    id: 'diario-esqueci', categoria: 'diario', pergunta: 'Esqueci de registrar um dia. E agora?',
    texto: ['Tudo bem: o gráfico só pula aquele dia. O diário registra o dia de hoje; se você salvar de novo no mesmo dia, o registro é atualizado.'],
    termos: 'esqueci ontem editar',
  },
  /* ---------- evolução e diagnóstico ---------- */
  {
    id: 'evolucao-fotos', categoria: 'evolucao', pergunta: 'Onde ficam as fotos da Evolução?',
    texto: ['No modo demonstração, só neste aparelho. Com a conta conectada, numa pasta privada da sua conta, que só você vê.', 'Com duas fotos ou mais, o app compara a primeira com a mais recente.'],
    acao: { rotulo: 'Abrir a Evolução', rota: '/evolucao' }, termos: 'foto galeria antes depois comparar',
  },
  {
    id: 'diagnostico', categoria: 'evolucao', pergunta: 'O diagnóstico capilar substitui um profissional?',
    texto: ['Não. É uma orientação de cuidados a partir das suas respostas: tipo de fio, porosidade provável e uma rotina sugerida.', 'Queda forte ou repentina, coceira, feridas ou descamação no couro cabeludo pedem consulta com um dermatologista.'],
    acao: { rotulo: 'Fazer o diagnóstico', rota: '/diagnostico' }, termos: 'porosidade analise teste queda dermatologista',
  },
  /* ---------- conta ---------- */
  {
    id: 'conta-entrar', categoria: 'conta', pergunta: 'Como entro na minha conta?',
    texto: ['Na tela inicial, toque em "Já tenho conta" e escolha Google, Apple ou WhatsApp. Pelo WhatsApp, você recebe um código de 6 dígitos.'],
    termos: 'login entrar codigo whatsapp google apple senha',
  },
  {
    id: 'conta-perfil', categoria: 'conta', pergunta: 'Como mudo minhas respostas sobre o cabelo?',
    texto: ['Em Perfil → Meu perfil de cabelo, toque na resposta que quer mudar. O cronograma e as dicas do Início passam a usar as respostas novas.'],
    acao: { rotulo: 'Meu perfil de cabelo', rota: '/perfil-cabelo' }, termos: 'editar respostas tipo cabelo',
  },
  {
    id: 'conta-lembretes', categoria: 'conta', pergunta: 'Como ligo ou desligo os lembretes?',
    texto: ['Os lembretes do cronograma ficam na aba Cronograma. Os avisos no celular você ativa em Perfil → Configurações e privacidade.'],
    acao: { rotulo: 'Configurações', rota: '/configuracoes' }, termos: 'notificacao aviso lembrete push',
  },
  /* ---------- privacidade ---------- */
  {
    id: 'privacidade-dados', categoria: 'privacidade', pergunta: 'Quais dados o app guarda?',
    texto: ['Seu nome, WhatsApp, data de aniversário (se informar), as respostas do perfil de cabelo, os diagnósticos e as fotos da Evolução. O cronograma e o diário ficam no próprio aparelho.', 'Nunca vendemos seus dados.'],
    acao: { rotulo: 'Política de Privacidade', rota: '/privacidade' }, termos: 'lgpd dados privacidade',
  },
  {
    id: 'privacidade-excluir', categoria: 'privacidade', pergunta: 'Como baixo ou apago meus dados?',
    texto: ['Em Perfil → Configurações e privacidade você baixa uma cópia dos seus dados e pode excluir a conta. A exclusão apaga o perfil, as fotos, o diário e o cronograma.'],
    acao: { rotulo: 'Configurações e privacidade', rota: '/configuracoes' }, termos: 'excluir apagar conta exportar copia lgpd',
  },
]

/** Busca simples por palavras (pergunta, texto e sinônimos), sem acento. */
export function buscarPerguntas(busca: string): PerguntaAjuda[] {
  const palavras = normalizar(busca).split(/\s+/).filter((p) => p.length > 1)
  if (!palavras.length) return PERGUNTAS_AJUDA
  return PERGUNTAS_AJUDA.filter((p) => {
    const alvo = normalizar([p.pergunta, ...p.texto, ...(p.lista ?? []), p.termos ?? ''].join(' '))
    return palavras.every((w) => alvo.includes(w))
  })
}
