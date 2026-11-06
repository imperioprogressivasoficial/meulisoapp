/**
 * Supabase falso, em memória, só para scripts/teste-nuvem/rodar.mjs.
 * Imita o que o app usa: auth.getSession, from(tabela) com select/eq/order/limit/maybeSingle/single,
 * insert/upsert/update/delete, rpc e storage. As linhas de cada tabela só são vistas e gravadas
 * pela dona (como a RLS), e atualizado_em é sempre preenchido pelo "servidor".
 */
export const servidor = (globalThis.__servidorFalso ??= {
  tabelas: { perfis: [], fotos: [], diagnosticos: [], notificacoes: [], cronogramas: [], diario_cabelo: [], unidades: [] },
  arquivos: new Map(),
  funcoes: {}, // nome → (args, uid) => resultado (lança Error para erro)
  chamadas: [], // { fn, args }
  usuario: null, // id da cliente logada
  falhar: false, // simula queda de rede em toda chamada
  enumSemEvolucao: false, // simula servidor sem a migration do tipo 'evolucao'
  relogio: Date.parse('2026-11-04T12:00:00Z'),
}) // em globalThis: os dois "aparelhos" do teste (duas cópias do app) falam com o mesmo servidor
// relógio real e sempre crescente (as edições no aparelho usam a hora real)
const agora = () => new Date((servidor.relogio = Math.max(Date.now(), servidor.relogio + 1))).toISOString()
const erroRede = { message: 'TypeError: Failed to fetch', code: '' }
const CHAVES = { cronogramas: ['cliente_id'], diario_cabelo: ['cliente_id', 'dia'], perfis: ['id'], diagnosticos: ['id'], fotos: ['id'] }
const dona = (t, l) => (t === 'perfis' ? l.id : t === 'unidades' ? servidor.usuario : l.cliente_id)

class Consulta {
  constructor(tabela) { this.t = tabela; this.filtros = []; this.op = 'select'; this.retorno = false; this.um = null; this.ordem = null }
  select(cols) { if (this.op === 'select') this.cols = cols; else this.retorno = true; return this }
  eq(c, v) { this.filtros.push((l) => l[c] === v); return this }
  order(c) { this.ordem = c; return this }
  limit() { return this }
  maybeSingle() { this.um = 'talvez'; return this }
  single() { this.um = 'um'; return this }
  insert(v) { this.op = 'insert'; this.linhas = [v].flat(); return this }
  upsert(v, o = {}) { this.op = 'upsert'; this.linhas = [v].flat(); this.conflito = o.onConflict?.split(',') ?? CHAVES[this.t]; return this }
  update(v) { this.op = 'update'; this.valores = v; return this }
  delete() { this.op = 'delete'; return this }
  then(ok, erro) { return Promise.resolve().then(() => this.executar()).then(ok, erro) }
  executar() {
    if (servidor.falhar) return { data: null, error: erroRede }
    const u = servidor.usuario
    const tab = servidor.tabelas[this.t]
    if (!tab) return { data: null, error: { code: 'PGRST205', message: `Could not find the table 'public.${this.t}'` } }
    const visiveis = () => tab.filter((l) => dona(this.t, l) === u && this.filtros.every((f) => f(l)))
    let afetadas = []
    if (this.op === 'select') afetadas = visiveis()
    else if (this.op === 'insert' || this.op === 'upsert') {
      for (const nova of this.linhas) {
        if (dona(this.t, nova) !== u) return { data: null, error: { code: '42501', message: 'new row violates row-level security policy' } }
        if (this.t === 'fotos' && nova.tipo === 'evolucao' && servidor.enumSemEvolucao) return { data: null, error: { code: '22P02', message: 'invalid input value for enum tipo_foto: "evolucao"' } }
        const chave = this.op === 'upsert' ? this.conflito : CHAVES[this.t]
        const existe = chave && tab.find((l) => chave.every((c) => nova[c] !== undefined && l[c] === nova[c]))
        if (existe && this.op === 'insert') return { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } }
        const linha = existe ?? { id: crypto.randomUUID(), criado_em: agora() }
        Object.assign(linha, nova)
        if ('cronogramas diario_cabelo'.includes(this.t)) linha.atualizado_em = agora()
        if (!existe) tab.push(linha)
        afetadas.push(linha)
      }
    } else if (this.op === 'update') {
      afetadas = visiveis()
      afetadas.forEach((l) => Object.assign(l, this.valores))
    } else if (this.op === 'delete') {
      afetadas = visiveis()
      servidor.tabelas[this.t] = tab.filter((l) => !afetadas.includes(l))
    }
    if (this.ordem) afetadas = [...afetadas].sort((a, b) => String(a[this.ordem]).localeCompare(String(b[this.ordem])))
    const data = this.op === 'select' || this.retorno ? structuredClone(afetadas) : null
    if (this.um === 'um') return data?.length === 1 ? { data: data[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' } }
    if (this.um === 'talvez') return { data: data?.[0] ?? null, error: null }
    return { data, error: null }
  }
}

export function createClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: servidor.usuario ? { user: { id: servidor.usuario, phone: '5571999990001', user_metadata: {} } } : null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signOut: async () => { servidor.usuario = null; return { error: null } },
    },
    from: (t) => new Consulta(t),
    rpc: async (fn, args) => {
      servidor.chamadas.push({ fn, args })
      if (servidor.falhar) return { data: null, error: erroRede }
      const f = servidor.funcoes[fn]
      if (!f) return { data: null, error: { code: 'PGRST202', message: `Could not find the function public.${fn}` } }
      try { return { data: f(args, servidor.usuario), error: null } } catch (e) { return { data: null, error: { message: e.message } } }
    },
    storage: {
      from: () => ({
        upload: async (caminho, blob) => {
          if (servidor.falhar) return { data: null, error: erroRede }
          if (!caminho.startsWith(servidor.usuario + '/')) return { data: null, error: { message: 'new row violates row-level security policy' } }
          servidor.arquivos.set(caminho, blob)
          return { data: { path: caminho }, error: null }
        },
        remove: async (caminhos) => { caminhos.forEach((c) => servidor.arquivos.delete(c)); return { data: [], error: null } },
        createSignedUrl: async (c) => ({ data: { signedUrl: `https://falso/${c}` }, error: null }),
      }),
    },
  }
}
