/**
 * Modo conectado: Supabase.
 *
 * Quando VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidos, o app:
 *  - faz login por código (Supabase Auth, entregue por WhatsApp via Edge Function) ou com Google/Apple;
 *  - lê só os dados da própria cliente (a RLS garante);
 *  - grava o perfil, as respostas do perfil de cabelo, as fotos da Evolução, os diagnósticos,
 *    o cronograma e o diário (migration 20261104000000_b2c_nuvem.sql). Cronograma e diário também
 *    ficam no aparelho para a tela responder na hora: veja cronograma.ts, diario.ts e mesclar.ts.
 *
 * O resultado é convertido para o mesmo formato do modo demonstração (tipo Banco),
 * então as telas funcionam igual nos dois modos.
 *
 * O banco ainda tem as tabelas e funções da época do salão (agenda, pontos, loja...).
 * O app B2C não chama mais nenhuma delas: veja a lista no README.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Banco, Cliente, Diagnostico, Foto, RespostasOnboarding } from '../types'

const URL_SB = import.meta.env.VITE_SUPABASE_URL as string | undefined
const CHAVE_SB = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const modoNuvem = () => !!(URL_SB && CHAVE_SB)

let cliente: SupabaseClient | null = null
export function sb() {
  if (!modoNuvem()) throw new Error('Supabase não configurado')
  // PKCE: a volta do Google/Apple traz só um ?code= na URL (nada de token no #, que é usado pelas rotas)
  cliente ??= createClient(URL_SB!, CHAVE_SB!, { auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce' } })
  return cliente
}

/** Erro do servidor em linguagem da cliente. */
export function mensagemErro(e: unknown) {
  const m = (e as { message?: string })?.message ?? String(e)
  if (/network|fetch/i.test(m)) return 'Sem conexão. Verifique a internet e tente de novo.'
  return m.replace(/^.*?ERROR:\s*/, '')
}

async function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb().rpc(fn, args)
  if (error) throw new Error(mensagemErro(error))
  return data as T
}

/* ---------- login por código ---------- */
const comDDI = (tel: string) => `+55${tel.replace(/\D/g, '')}`

export async function enviarCodigoNuvem(telefone: string) {
  const { error } = await sb().auth.signInWithOtp({ phone: comDDI(telefone) })
  if (error) throw new Error(mensagemErro(error))
}

/** Confirma o código. Retorna true se a pessoa já tem cadastro completo. */
export async function verificarCodigoNuvem(telefone: string, codigo: string) {
  const { data, error } = await sb().auth.verifyOtp({ phone: comDDI(telefone), token: codigo, type: 'sms' })
  if (error) throw new Error('Código incorreto ou expirado.')
  const { data: perfil } = await sb().from('perfis').select('id').eq('id', data.user!.id).maybeSingle()
  return !!perfil
}

/* ---------- login com Google ou Apple ---------- */
/** Sai do app para a tela do Google/Apple; na volta o Supabase abre a sessão sozinho. */
export async function entrarComProvedor(provider: 'google' | 'apple') {
  const { error } = await sb().auth.signInWithOAuth({ provider, options: { redirectTo: location.origin + location.pathname } })
  if (error) throw new Error(mensagemErro(error))
}

/**
 * Sessão aberta mas ainda sem cadastro (ex.: acabou de voltar do Google/Apple).
 * `temTelefone` diz se o login já confirmou um telefone; se não, o cadastro pede o WhatsApp.
 */
export async function loginSemCadastro(): Promise<{ nome?: string; temTelefone: boolean } | null> {
  const { data } = await sb().auth.getSession()
  const u = data.session?.user
  if (!u) return null
  const { data: perfil } = await sb().from('perfis').select('id').eq('id', u.id).maybeSingle()
  if (perfil) return null
  const meta = (u.user_metadata ?? {}) as { full_name?: string; name?: string }
  return { nome: meta.full_name ?? meta.name, temTelefone: !!u.phone }
}

/** PostgREST responde PGRST202 quando a função não existe (migration ainda não aplicada). */
const funcaoAusente = (e: { code?: string; message?: string }) => e.code === 'PGRST202' || /could not find the function/i.test(e.message ?? '')

export async function sairNuvem() {
  await sb().auth.signOut()
}

/* ---------- leitura: tabelas → formato do app ---------- */
type Linha = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

async function minhas(tabela: string, colunas = '*'): Promise<Linha[]> {
  const { data, error } = await sb().from(tabela).select(colunas).limit(5000)
  if (error) throw new Error(mensagemErro(error))
  return (data ?? []) as Linha[]
}

/** Avisos do servidor que ainda apontam para telas do salão (pontos, agenda...) não aparecem no app. */
const ROTAS_DO_APP = ['/inicio', '/cuidados', '/diario', '/evolucao', '/diagnostico', '/perfil', '/perfil-cabelo', '/configuracoes', '/dicas', '/ajuda']
const avisoDoApp = (rota?: string | null) => !rota || ROTAS_DO_APP.some((r) => rota === r || rota.startsWith(r + '/'))

/** Fotos antigas de "antes" e "depois" (de antes do tipo 'evolucao' existir) também são da Evolução. */
const TIPO_FOTO: Record<string, Foto['tipo'] | undefined> = { evolucao: 'evolucao', antes: 'evolucao', depois: 'evolucao', diagnostico: 'diagnostico' }

export async function carregarBanco(): Promise<Banco> {
  const { data: sessao } = await sb().auth.getSession()
  const eu = sessao.session?.user.id
  if (!eu) return { versao: 0, clientes: [], sessao: {} }
  const [perfis, fotos, diags, notifs] = await Promise.all([minhas('perfis'), minhas('fotos'), minhas('diagnosticos'), minhas('notificacoes')])
  const p = perfis.find((x) => x.id === eu)
  // contas da equipe do salão não usam este app
  if (!p || p.papel !== 'cliente') return { versao: 0, clientes: [], sessao: {} }
  const de = <T extends Linha>(l: T[]) => l.filter((x) => x.cliente_id === eu)
  const caminhoDaFoto = new Map(de(fotos).map((f) => [f.id, f.caminho as string]))
  const c: Cliente = {
    id: p.id, nome: p.nome, telefone: p.telefone, aniversario: p.aniversario?.slice(5), cidade: p.cidade ?? undefined,
    criadoEm: p.criado_em.slice(0, 10), consentimentoMarketing: p.consentimento_marketing, consentimentoLgpdEm: p.consentimento_lgpd_em,
    onboarding: p.onboarding ?? undefined,
    fotos: de(fotos).filter((f) => TIPO_FOTO[f.tipo]).sort((x, y) => y.criado_em.localeCompare(x.criado_em))
      .map((f) => ({ id: `nuvem:${f.caminho}`, data: f.criado_em.slice(0, 10), tipo: TIPO_FOTO[f.tipo]! })),
    diagnosticos: de(diags).filter((d) => d.resultado?.foco).sort((x, y) => y.criado_em.localeCompare(x.criado_em))
      .map((d) => ({
        ...d.resultado, id: d.id, data: d.resultado.data ?? d.criado_em.slice(0, 10), respostas: d.respostas,
        fotoId: d.foto_id && caminhoDaFoto.has(d.foto_id) ? `nuvem:${caminhoDaFoto.get(d.foto_id)}` : undefined,
      })),
    notificacoes: de(notifs).filter((n) => avisoDoApp(n.rota)).sort((x, y) => y.criado_em.localeCompare(x.criado_em))
      .map((n) => ({ id: n.id, data: n.criado_em, titulo: n.titulo, texto: n.texto, lida: n.lida, rota: n.rota ?? undefined, chave: n.chave ?? undefined })),
  }
  return { versao: 0, clientes: [c], sessao: { clienteId: eu } }
}

/**
 * Só para servidores sem a migration 20261104000000: as funções antigas de cadastro
 * (completar_cadastro_v2 e completar_cadastro) exigem uma unidade ativa do salão.
 * Usa a primeira do catálogo público; a cliente nunca escolhe nem vê isso.
 */
async function unidadeDoCadastroAntigo(): Promise<string | null> {
  const { data } = await sb().from('unidades').select('id').eq('ativa', true).eq('em_breve', false).order('id').limit(1).maybeSingle()
  return (data as { id?: string } | null)?.id ?? null
}

/** Valor do enum de fotos que ainda não existe no servidor (migration não aplicada). */
const valorInvalido = (e: { code?: string; message?: string }) => e.code === '22P02' || /invalid input value for enum/i.test(e.message ?? '')
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Foto vai para a pasta privada da cliente no Storage e é registrada na tabela fotos. */
async function enviarArquivoFoto(clienteId: string, arquivo: Blob, tipo: 'evolucao' | 'diagnostico') {
  const caminho = `${clienteId}/${crypto.randomUUID()}.jpg`
  const up = await sb().storage.from('fotos-clientes').upload(caminho, arquivo, { contentType: 'image/jpeg' })
  if (up.error) throw new Error(mensagemErro(up.error))
  const registrar = (t: string) => sb().from('fotos').insert({ cliente_id: clienteId, tipo: t, caminho }).select('id').single()
  let r = await registrar(tipo)
  // servidor sem o tipo 'evolucao': grava como 'depois', que o app também lê como Evolução
  if (r.error && tipo === 'evolucao' && valorInvalido(r.error)) r = await registrar('depois')
  if (r.error) {
    await sb().storage.from('fotos-clientes').remove([caminho])
    throw new Error(mensagemErro(r.error))
  }
  return { id: (r.data as { id: string }).id, caminho }
}

/* ---------- cronograma, diário e diagnóstico (tabelas protegidas por RLS) ---------- */
export interface CronogramaDaNuvem { perfil: Record<string, unknown> | null; feitos: string[]; inicio: string | null; atualizado_em: string }
export interface DiaDaNuvem { dia: string; frizz: number; brilho: number; maciez: number; atualizado_em: string }

/* ---------- ações ---------- */
export const nuvem = {
  /**
   * Cadastro. Usa completar_cadastro_v3 (sem unidade do salão; aceita o WhatsApp digitado de quem entrou
   * com Google/Apple e as respostas do onboarding). Se o servidor ainda não tem a v3, cai na v2 e depois
   * na função antiga, que exigem uma unidade (veja unidadeDoCadastroAntigo).
   */
  completarCadastro: async (d: { nome: string; aniversario?: string; marketing: boolean; telefone?: string; onboarding?: RespostasOnboarding }) => {
    const v3 = await sb().rpc('completar_cadastro_v3', {
      p_nome: d.nome, p_aniversario: d.aniversario ?? null, p_consentimento: true, p_marketing: d.marketing,
      p_telefone: d.telefone ?? null, p_onboarding: d.onboarding ?? null,
    })
    if (!v3.error) return v3.data as string
    if (!funcaoAusente(v3.error)) throw new Error(mensagemErro(v3.error))
    // servidor ainda sem a v3: as versões antigas exigem uma unidade do salão
    const base = { p_nome: d.nome, p_aniversario: d.aniversario ?? null, p_bairro: null, p_cidade: null, p_unidade: await unidadeDoCadastroAntigo(), p_codigo_indicacao: null, p_consentimento: true, p_marketing: d.marketing }
    const { data, error } = await sb().rpc('completar_cadastro_v2', { ...base, p_telefone: d.telefone ?? null, p_onboarding: d.onboarding ?? null })
    if (!error) return data as string
    if (!funcaoAusente(error)) throw new Error(mensagemErro(error))
    try {
      return await rpc<string>('completar_cadastro', base)
    } catch (e) {
      if (/Telefone não confirmado/.test(mensagemErro(e))) throw new Error('Não foi possível concluir com Google ou Apple agora. Entre com "Continuar com WhatsApp".')
      throw e
    }
  },
  /** p_bairro e p_unidade ficam nulos: o servidor mantém o que já tinha. */
  atualizarPerfil: (c: Cliente) => rpc('atualizar_meu_perfil', { p_nome: c.nome, p_aniversario: c.aniversario ? `2000-${c.aniversario}` : null, p_bairro: null, p_unidade: null, p_marketing: c.consentimentoMarketing ?? false }),
  /** Respostas do perfil de cabelo, editadas depois do cadastro (migration 20261101120000). */
  atualizarOnboarding: async (r: RespostasOnboarding) => {
    const { error } = await sb().rpc('atualizar_meu_onboarding', { p_onboarding: r })
    if (!error) return
    if (funcaoAusente(error)) throw new Error('Não foi possível salvar agora. Tente de novo mais tarde.')
    throw new Error(mensagemErro(error))
  },
  exportarDados: () => rpc<unknown>('exportar_meus_dados'),
  excluirConta: () => rpc('excluir_minha_conta'),
  marcarLidas: async (clienteId: string) => {
    const { error } = await sb().from('notificacoes').update({ lida: true }).eq('cliente_id', clienteId).eq('lida', false)
    if (error) throw new Error(mensagemErro(error))
  },
  /** Um aviso só (a RLS deixa a cliente atualizar apenas os próprios avisos). */
  marcarLida: async (id: string) => {
    const { error } = await sb().from('notificacoes').update({ lida: true }).eq('id', id)
    if (error) throw new Error(mensagemErro(error))
  },
  /** Foto da Evolução (tipo 'evolucao') ou do diagnóstico, na pasta privada da cliente. */
  enviarFoto: async (clienteId: string, arquivo: Blob, tipo: Foto['tipo']) => `nuvem:${(await enviarArquivoFoto(clienteId, arquivo, tipo)).caminho}`,
  /** Apaga a foto (registro e arquivo). A RLS só deixa apagar as da própria cliente. */
  apagarFoto: async (caminho: string) => {
    const { error } = await sb().from('fotos').delete().eq('caminho', caminho)
    if (error) throw new Error(mensagemErro(error))
    const rm = await sb().storage.from('fotos-clientes').remove([caminho])
    if (rm.error) console.warn('Arquivo da foto não foi apagado do Storage', rm.error)
  },

  /** Cronograma da cliente (null se ainda não tem). */
  carregarCronograma: async (clienteId: string): Promise<CronogramaDaNuvem | null> => {
    const { data, error } = await sb().from('cronogramas').select('perfil, feitos, inicio, atualizado_em').eq('cliente_id', clienteId).maybeSingle()
    if (error) throw new Error(mensagemErro(error))
    return (data as CronogramaDaNuvem | null) ?? null
  },
  /** Grava o cronograma inteiro. Devolve o atualizado_em do servidor. */
  salvarCronograma: async (clienteId: string, perfil: { inicio: string } | undefined, feitos: string[]): Promise<string> => {
    const { data, error } = await sb().from('cronogramas')
      .upsert({ cliente_id: clienteId, perfil: perfil ?? null, feitos, inicio: perfil?.inicio ?? null }, { onConflict: 'cliente_id' })
      .select('atualizado_em').single()
    if (error) throw new Error(mensagemErro(error))
    return (data as { atualizado_em: string }).atualizado_em
  },
  /** Todos os registros do diário da cliente. */
  carregarDiario: async (clienteId: string): Promise<DiaDaNuvem[]> => {
    const { data, error } = await sb().from('diario_cabelo').select('dia, frizz, brilho, maciez, atualizado_em').eq('cliente_id', clienteId).order('dia').limit(5000)
    if (error) throw new Error(mensagemErro(error))
    return (data ?? []) as DiaDaNuvem[]
  },
  /** Grava (ou regrava) os dias enviados. Devolve o atualizado_em do servidor de cada dia. */
  salvarDiario: async (clienteId: string, dias: { data: string; frizz: number; brilho: number; maciez: number }[]): Promise<Record<string, string>> => {
    const linhas = dias.map((r) => ({ cliente_id: clienteId, dia: r.data, frizz: r.frizz, brilho: r.brilho, maciez: r.maciez }))
    const { data, error } = await sb().from('diario_cabelo').upsert(linhas, { onConflict: 'cliente_id,dia' }).select('dia, atualizado_em')
    if (error) throw new Error(mensagemErro(error))
    return Object.fromEntries(((data ?? []) as { dia: string; atualizado_em: string }[]).map((x) => [x.dia, x.atualizado_em]))
  },
  /**
   * Grava um diagnóstico (com a foto, se houver). Usa o mesmo id do aparelho: se o envio
   * for repetido depois de uma falha de rede, o servidor recusa a cópia e conta como enviado.
   */
  salvarDiagnostico: async (clienteId: string, d: Diagnostico, foto?: Blob) => {
    const fotoId = foto ? (await enviarArquivoFoto(clienteId, foto, 'diagnostico')).id : null
    const { id, respostas, fotoId: _foto, ...resultado } = d // eslint-disable-line @typescript-eslint/no-unused-vars
    const { error } = await sb().from('diagnosticos').insert({ ...(UUID.test(id) ? { id } : {}), cliente_id: clienteId, respostas, resultado, foto_id: fotoId })
    if (error && !(error.code === '23505' && UUID.test(id))) throw new Error(mensagemErro(error))
  },
  urlFoto: async (caminho: string) => {
    const { data } = await sb().storage.from('fotos-clientes').createSignedUrl(caminho, 3600)
    return data?.signedUrl
  },
}
