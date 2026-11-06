import { mutar, clienteNo, getBanco, sincronizar } from './store'
import { modoNuvem, nuvem, sairNuvem, mensagemErro } from './nuvem'
import { lerImagem, apagarImagem } from '../lib/imagem'
import { toast } from '../ds/extras'
import type { Cliente, Diagnostico, Notificacao, RespostasOnboarding } from '../types'
import { hojeISO, uid } from '../lib/regras'
import { quimicaRecente } from './perfilCabelo'
import { mostrarNotificacaoSistema } from '../lib/notificar'
import { chaveDiagnosticosPendentes, diagnosticosPendentes, enviarDiagnosticosPendentes, guardarDiagnosticoPendente } from './sincronia'

/* ---------- modo conectado ---------- */
/** Executa a ação no servidor, recarrega os dados e mostra o erro em linguagem simples. */
async function noServidor<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    const r = await fn()
    await sincronizar()
    return r
  } catch (e) {
    toast(mensagemErro(e))
    return undefined
  }
}

async function dataUrlParaBlob(url: string) {
  return (await fetch(url)).blob()
}

/* ---------- notificações (só lembretes de cuidado) ---------- */
function notificar(c: Cliente, n: Omit<Notificacao, 'id' | 'data' | 'lida'>) {
  if (n.chave && c.notificacoes.some((x) => x.chave === n.chave)) return false
  c.notificacoes.unshift({ ...n, id: uid(), data: new Date().toISOString(), lida: false })
  c.notificacoes = c.notificacoes.slice(0, 60)
  return true
}

export function marcarNotificacoesLidas(clienteId: string) {
  if (modoNuvem()) return void noServidor(() => nuvem.marcarLidas(clienteId))
  mutar((b) => clienteNo(b, clienteId).notificacoes.forEach((n) => (n.lida = true)))
}
/** Marca só um aviso como lido (ao tocar nele). */
export function marcarNotificacaoLida(clienteId: string, notificacaoId: string) {
  if (modoNuvem()) return void noServidor(() => nuvem.marcarLida(notificacaoId))
  mutar((b) => {
    const n = clienteNo(b, clienteId).notificacoes.find((x) => x.id === notificacaoId)
    if (n) n.lida = true
  })
}

/**
 * Roda ao abrir o app: lembretes de cuidado guardados no aparelho (modo demonstração).
 * O lembrete do cronograma do dia é calculado na hora (data/cronograma.ts).
 */
export function verificarEventos(clienteId: string) {
  if (modoNuvem()) return
  const novas: Notificacao[] = []
  mutar((b) => {
    const c = clienteNo(b, clienteId)
    const antes = c.notificacoes.length
    const q = quimicaRecente(c)
    if (q)
      notificar(c, {
        titulo: 'Cuidado pós-química',
        texto: 'Nas próximas semanas, priorize a hidratação, use protetor térmico e pegue leve no calor.',
        rota: '/cuidados', chave: `quimica-${q.desde}`,
      })
    if (!c.fotos.some((f) => f.tipo === 'evolucao'))
      notificar(c, { titulo: 'Comece sua Evolução', texto: 'Tire uma foto do cabelo hoje: daqui a algumas semanas você compara.', rota: '/evolucao', chave: 'evolucao-primeira' })
    novas.push(...c.notificacoes.slice(0, c.notificacoes.length - antes))
  })
  novas.forEach((n) => mostrarNotificacaoSistema(n.titulo, n.texto))
}

/* ---------- sessão e cadastro ---------- */
const codigosEnviados = new Map<string, string>()

/** DEMONSTRAÇÃO: em produção o código vai por WhatsApp/SMS (Supabase Auth + Edge Function). */
export function enviarCodigo(telefone: string) {
  const codigo = String(Math.floor(100000 + Math.random() * 900000))
  codigosEnviados.set(telefone, codigo)
  return codigo
}
export const verificarCodigo = (telefone: string, codigo: string) => codigosEnviados.get(telefone) === codigo
export const clientePorTelefone = (telefone: string) => getBanco().clientes.find((c) => c.telefone === telefone)

export function entrar(clienteId: string) {
  mutar((b) => (b.sessao.clienteId = clienteId))
}
export function sair() {
  if (modoNuvem()) return void sairNuvem().then(sincronizar)
  try { sessionStorage.setItem('imperio-demo-saiu', '1') } catch { /* sem sessionStorage */ }
  mutar((b) => (b.sessao.clienteId = undefined))
}

export async function cadastrar(d: { nome: string; telefone: string; aniversario?: string; marketing?: boolean; onboarding?: RespostasOnboarding }) {
  if (modoNuvem()) {
    // telefone: o servidor só usa quando o login não confirmou um (Google/Apple) e valida lá
    await noServidor(async () => {
      const id = await nuvem.completarCadastro({ nome: d.nome, aniversario: d.aniversario ? `2000-${d.aniversario}` : undefined, marketing: !!d.marketing, telefone: d.telefone || undefined, onboarding: d.onboarding })
      // diagnóstico feito antes de criar a conta: sobe na sincronização logo abaixo
      const visitante = getBanco().diagnosticoVisitante
      if (visitante && id) {
        guardarDiagnosticoPendente(id, visitante)
        mutar((b) => { b.diagnosticoVisitante = undefined })
      }
      return id
    })
    return getBanco().sessao.clienteId ?? ''
  }
  let id = ''
  mutar((b) => {
    const c: Cliente = {
      id: uid(), nome: d.nome, telefone: d.telefone, aniversario: d.aniversario, criadoEm: hojeISO(),
      fotos: [], diagnosticos: b.diagnosticoVisitante ? [b.diagnosticoVisitante] : [], notificacoes: [],
      consentimentoLgpdEm: new Date().toISOString(), consentimentoMarketing: !!d.marketing, onboarding: d.onboarding,
    }
    notificar(c, { titulo: 'Bem-vinda ao Meu Liso!', texto: 'Seu cronograma, seu diário e sua evolução ficam todos aqui.', rota: '/cuidados', chave: 'boas-vindas' })
    b.diagnosticoVisitante = undefined
    b.clientes.push(c)
    b.sessao.clienteId = c.id
    id = c.id
  })
  return id
}

/** LGPD: exporta tudo o que o app guarda sobre a cliente. */
export async function exportarDados(clienteId: string): Promise<unknown> {
  const local = {
    cronograma: JSON.parse(localStorage.getItem(`imperio-cronograma-${clienteId}`) ?? 'null'),
    diario: JSON.parse(localStorage.getItem(`imperio-diario-${clienteId}`) ?? 'null'),
  }
  if (modoNuvem()) return { ...((await nuvem.exportarDados()) as object), noAparelho: { ...local, diagnosticosAindaNaoEnviados: diagnosticosPendentes(clienteId) } }
  const c = getBanco().clientes.find((x) => x.id === clienteId)
  return { exportadoEm: new Date().toISOString(), cliente: c, noAparelho: local }
}

/** LGPD: apaga a conta, as fotos, o diário e o cronograma. */
export function excluirConta(clienteId: string) {
  for (const k of [`imperio-cronograma-${clienteId}`, `imperio-diario-${clienteId}`, `imperio-cronograma-aviso-${clienteId}`]) localStorage.removeItem(k)
  if (modoNuvem()) {
    diagnosticosPendentes(clienteId).forEach((d) => d.fotoId && apagarImagem(d.fotoId))
    localStorage.removeItem(chaveDiagnosticosPendentes(clienteId))
    return void noServidor(async () => { await nuvem.excluirConta(); await sairNuvem() })
  }
  const c = getBanco().clientes.find((x) => x.id === clienteId)
  c?.fotos.forEach((f) => apagarImagem(f.id))
  mutar((b) => {
    b.clientes = b.clientes.filter((x) => x.id !== clienteId)
    b.sessao.clienteId = undefined
  })
}

export function atualizarCliente(clienteId: string, parcial: Partial<Cliente>) {
  if (modoNuvem()) {
    const atual = getBanco().clientes.find((c) => c.id === clienteId)
    if (atual) void noServidor(() => nuvem.atualizarPerfil({ ...atual, ...parcial }))
    return
  }
  mutar((b) => Object.assign(clienteNo(b, clienteId), parcial))
}

/**
 * Perfil de cabelo: atualiza as respostas do primeiro acesso (mescla com as que já existem).
 * `silencioso`: não mostra erro (usado quando a mudança vem de outra tela, como o cronograma).
 */
export async function atualizarOnboarding(clienteId: string, dados: Partial<RespostasOnboarding>, opcoes: { silencioso?: boolean } = {}): Promise<boolean> {
  const atual = getBanco().clientes.find((c) => c.id === clienteId)
  if (!atual) return false
  const novo: RespostasOnboarding = { objetivos: [], ultimaProgressiva: '', tipoCabelo: '', ...atual.onboarding, ...dados, atualizadoEm: hojeISO() }
  if (modoNuvem()) {
    try {
      await nuvem.atualizarOnboarding(novo)
      await sincronizar()
      return true
    } catch (e) {
      if (!opcoes.silencioso) toast(mensagemErro(e))
      return false
    }
  }
  mutar((b) => { clienteNo(b, clienteId).onboarding = novo })
  return true
}

/* ---------- evolução e diagnóstico ---------- */
export function adicionarFoto(clienteId: string, foto: Cliente['fotos'][number]) {
  if (modoNuvem()) {
    const dados = lerImagem(foto.id)
    if (dados) void noServidor(async () => { await nuvem.enviarFoto(clienteId, await dataUrlParaBlob(dados), foto.tipo); apagarImagem(foto.id) })
    return
  }
  mutar((b) => clienteNo(b, clienteId).fotos.unshift(foto))
}
export function removerFotoCliente(clienteId: string, fotoId: string) {
  if (modoNuvem() && fotoId.startsWith('nuvem:')) void noServidor(() => nuvem.apagarFoto(fotoId.slice(6)))
  mutar((b) => {
    const c = clienteNo(b, clienteId)
    c.fotos = c.fotos.filter((f) => f.id !== fotoId)
  })
}
export function salvarDiagnostico(clienteId: string | undefined, d: Diagnostico) {
  if (modoNuvem() && clienteId) {
    // fica no aparelho até subir: some só depois que a nuvem confirmar
    guardarDiagnosticoPendente(clienteId, d)
    void enviarDiagnosticosPendentes(clienteId)
      .then((n) => (n ? sincronizar() : undefined))
      .catch((e) => {
        console.warn('Diagnóstico não foi para a nuvem', e)
        toast('Não foi possível salvar o diagnóstico na nuvem agora. Ele ficou guardado neste aparelho e vai ser enviado de novo.')
      })
  }
  mutar((b) => {
    if (clienteId) clienteNo(b, clienteId).diagnosticos.unshift(d)
    else b.diagnosticoVisitante = d
  })
}
