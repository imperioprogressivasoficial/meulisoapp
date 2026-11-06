/**
 * Teste do modo conectado sem Supabase de verdade: empacota os módulos reais (store, acoes,
 * cronograma, diario, sincronia, nuvem) com o Vite, troca @supabase/supabase-js por um servidor
 * falso em memória (supabase-falso.mjs) e simula dois aparelhos da mesma cliente.
 * Rodar: node scripts/teste-nuvem/rodar.mjs
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const raiz = path.resolve(aqui, '../..')
const saida = fs.mkdtempSync(path.join(os.tmpdir(), 'meuliso-nuvem-'))
await build({
  configFile: false, root: raiz, logLevel: 'error',
  resolve: {
    alias: [
      { find: '@supabase/supabase-js', replacement: path.join(aqui, 'supabase-falso.mjs') },
      { find: /^(\.\.\/)+ds\/extras$/, replacement: path.join(aqui, 'extras-falso.mjs') },
    ],
  },
  define: { 'import.meta.env.VITE_SUPABASE_URL': '"https://falso.supabase.co"', 'import.meta.env.VITE_SUPABASE_ANON_KEY': '"chave-anon-falsa"' },
  ssr: { noExternal: true },
  build: { ssr: path.join(aqui, 'entrada.js'), outDir: saida, emptyOutDir: true, minify: false },
})
const pacote = pathToFileURL(path.join(saida, fs.readdirSync(saida).find((f) => /^entrada\.m?js$/.test(f)))).href

/* ---------- ambiente de navegador mínimo ---------- */
class Armazem {
  m = new Map()
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null }
  setItem(k, v) { this.m.set(k, String(v)) }
  removeItem(k) { this.m.delete(k) }
  clear() { this.m.clear() }
  get length() { return this.m.size }
  key(i) { return [...this.m.keys()][i] ?? null }
}
globalThis.sessionStorage = new Armazem()
const avisos = () => (globalThis.__avisos ??= [])
const { servidor } = await import(pathToFileURL(path.join(aqui, 'supabase-falso.mjs')).href)
servidor.relogio = Date.now()

let n = 0
const caso = async (nome, fn) => { await fn(); n++; console.log('ok ', nome) }
const pausa = (ms = 5) => new Promise((r) => setTimeout(r, ms))
async function ate(cond, msg) {
  for (let i = 0; i < 200; i++) { if (cond()) return; await pausa(5) }
  assert.fail(`tempo esgotado: ${msg}`)
}
const json = (arm, k) => JSON.parse(arm.getItem(k) ?? 'null')
const IMG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='

/* ---------- cliente já cadastrada ---------- */
const U = '11111111-1111-4111-8111-111111111111'
servidor.tabelas.perfis.push({ id: U, papel: 'cliente', nome: 'Ana Nuvem', telefone: '71999990001', criado_em: '2026-11-01T10:00:00Z', consentimento_marketing: false, consentimento_lgpd_em: '2026-11-01T10:00:00Z', onboarding: null })
servidor.usuario = U
const cronoNuvem = () => servidor.tabelas.cronogramas.find((l) => l.cliente_id === U)
const diaNuvem = (d) => servidor.tabelas.diario_cabelo.find((l) => l.cliente_id === U && l.dia === d)

/* ---------- aparelho A ---------- */
const armA = new Armazem()
globalThis.localStorage = armA
const A = await import(pacote + '?aparelho=A')
await A.store.sincronizar()

await caso('A: entra e carrega a cliente da nuvem', () => {
  assert.equal(A.store.getBanco().sessao.clienteId, U)
  assert.equal(A.store.estaCarregando(), false)
})
await caso('A: cronograma salvo no aparelho na hora e gravado na nuvem', async () => {
  A.cronograma.salvarPerfil(U, { estado: 'ressecado', lavagens: 3, inicio: '2026-11-02', lembretes: true })
  assert.equal(json(armA, `imperio-cronograma-${U}`).perfil.estado, 'ressecado') // instantâneo
  await ate(() => cronoNuvem()?.perfil?.estado === 'ressecado', 'cronograma na nuvem')
  assert.equal(cronoNuvem().inicio, '2026-11-02')
  await ate(() => json(armA, `imperio-cronograma-${U}`).sinc?.pendente === false, 'pendência limpa')
  A.cronograma.alternarFeito(U, '2026-11-02')
  A.cronograma.alternarFeito(U, '2026-11-04')
  await ate(() => cronoNuvem().feitos.length === 2, 'feitos na nuvem')
  assert.deepEqual([...cronoNuvem().feitos].sort(), ['2026-11-02', '2026-11-04'])
})
await caso('A: diário gravado na nuvem', async () => {
  A.diario.registrarDia(U, { data: '2026-11-03', frizz: 4, brilho: 2, maciez: 3 })
  await ate(() => diaNuvem('2026-11-03')?.frizz === 4, 'dia na nuvem')
  await ate(() => json(armA, `imperio-diario-${U}`).sinc['2026-11-03'].pendente === false, 'pendência do dia limpa')
})
await caso('A: diagnóstico (com foto) gravado na tabela diagnosticos', async () => {
  armA.setItem('imperio:foto:diag1', IMG)
  const id = crypto.randomUUID()
  A.acoes.salvarDiagnostico(U, { id, data: '2026-11-04', respostas: { tipo: 'liso' }, fio: 'Liso, fino', porosidade: 'Baixa', danos: 'Baixo', foco: 'H', rotina: ['Hidratação toda semana'], observacoes: [], fotoId: 'diag1' })
  assert.equal(A.store.getBanco().clientes[0].diagnosticos[0].id, id) // aparece na hora
  await ate(() => servidor.tabelas.diagnosticos.some((d) => d.id === id), 'diagnóstico na nuvem')
  const d = servidor.tabelas.diagnosticos.find((x) => x.id === id)
  assert.equal(d.resultado.foco, 'H')
  assert.equal(d.resultado.fotoId, undefined)
  const foto = servidor.tabelas.fotos.find((f) => f.id === d.foto_id)
  assert.equal(foto.tipo, 'diagnostico')
  assert.ok(servidor.arquivos.has(foto.caminho))
  await ate(() => A.store.getBanco().clientes[0].diagnosticos[0]?.fotoId === `nuvem:${foto.caminho}`, 'diagnóstico recarregado da nuvem')
  assert.equal(armA.getItem(`imperio-diagnosticos-pendentes-${U}`), null)
  assert.equal(armA.getItem('imperio:foto:diag1'), null)
})
await caso('A: foto da Evolução gravada com tipo "evolucao" e apagada na nuvem', async () => {
  armA.setItem('imperio:foto:evo1', IMG)
  A.acoes.adicionarFoto(U, { id: 'evo1', data: '2026-11-04', tipo: 'evolucao' })
  await ate(() => A.store.getBanco().clientes[0].fotos.some((f) => f.tipo === 'evolucao'), 'foto na Evolução')
  const f = servidor.tabelas.fotos.find((x) => x.tipo === 'evolucao')
  assert.ok(f && f.caminho.startsWith(U + '/'))
  const idApp = A.store.getBanco().clientes[0].fotos.find((x) => x.tipo === 'evolucao').id
  assert.equal(idApp, `nuvem:${f.caminho}`)
  A.acoes.removerFotoCliente(U, idApp)
  await ate(() => !servidor.tabelas.fotos.some((x) => x.tipo === 'evolucao'), 'foto apagada na nuvem')
  assert.ok(!servidor.arquivos.has(f.caminho))
  await ate(() => !A.store.getBanco().clientes[0].fotos.some((x) => x.tipo === 'evolucao'), 'foto some da tela')
})
await caso('A: servidor sem o tipo "evolucao" → grava como "depois" e a Evolução mostra igual', async () => {
  servidor.enumSemEvolucao = true
  armA.setItem('imperio:foto:evo2', IMG)
  A.acoes.adicionarFoto(U, { id: 'evo2', data: '2026-11-04', tipo: 'evolucao' })
  await ate(() => servidor.tabelas.fotos.some((x) => x.tipo === 'depois'), 'foto como depois')
  await ate(() => A.store.getBanco().clientes[0].fotos.some((f) => f.tipo === 'evolucao'), 'foto na Evolução')
  servidor.enumSemEvolucao = false
})

/* ---------- aparelho B: celular novo, sem nada guardado ---------- */
const armB = new Armazem()
globalThis.localStorage = armB
const B = await import(pacote + '?aparelho=B')
await B.store.sincronizar()

await caso('B (celular novo): cronograma, diário, diagnóstico e fotos vêm da nuvem', () => {
  const crono = json(armB, `imperio-cronograma-${U}`)
  assert.deepEqual(crono.perfil, { estado: 'ressecado', lavagens: 3, inicio: '2026-11-02', lembretes: true })
  assert.deepEqual(crono.feitos, ['2026-11-02', '2026-11-04'])
  const diario = json(armB, `imperio-diario-${U}`)
  assert.deepEqual(diario.registros, [{ data: '2026-11-03', frizz: 4, brilho: 2, maciez: 3 }])
  const c = B.store.getBanco().clientes[0]
  assert.equal(c.diagnosticos.length, 1)
  assert.ok(c.diagnosticos[0].fotoId.startsWith('nuvem:'))
  assert.equal(c.diagnosticos[0].data, '2026-11-04')
  assert.equal(c.fotos.filter((f) => f.tipo === 'evolucao').length, 1)
})
await caso('B: sem internet, o diário e o cronograma ficam no aparelho e um aviso aparece', async () => {
  servidor.falhar = true
  const antes = avisos().length
  B.diario.registrarDia(U, { data: '2026-11-03', frizz: 1, brilho: 1, maciez: 1 }) // vai perder para a edição mais nova do A
  await pausa(10)
  B.diario.registrarDia(U, { data: '2026-11-04', frizz: 2, brilho: 5, maciez: 5 }) // só existe neste aparelho
  B.cronograma.alternarFeito(U, '2026-11-02') // desmarca
  await ate(() => avisos().length >= antes + 2, 'avisos de falha')
  assert.ok(avisos().slice(antes).some((t) => /diário/.test(t)) && avisos().slice(antes).some((t) => /cronograma/.test(t)))
  assert.ok(avisos().slice(antes).every((t) => /guardado neste aparelho/.test(t)))
  assert.equal(json(armB, `imperio-diario-${U}`).registros.find((r) => r.data === '2026-11-04').brilho, 5)
  assert.equal(json(armB, `imperio-diario-${U}`).sinc['2026-11-04'].pendente, true)
  assert.deepEqual(json(armB, `imperio-cronograma-${U}`).feitos, ['2026-11-04'])
  assert.equal(diaNuvem('2026-11-04'), undefined)
})
const diagOff = crypto.randomUUID()
await caso('B: diagnóstico sem internet fica no aparelho (e na tela) até subir', async () => {
  const antes = avisos().length
  B.acoes.salvarDiagnostico(U, { id: diagOff, data: '2026-11-05', respostas: { tipo: 'cacheado' }, fio: 'Cacheado, médio', porosidade: 'Média', danos: 'Médio', foco: 'N', rotina: [], observacoes: [] })
  await ate(() => avisos().length > antes, 'aviso de falha do diagnóstico')
  assert.match(avisos().at(-1), /diagnóstico.*guardado neste aparelho/)
  assert.equal(json(armB, `imperio-diagnosticos-pendentes-${U}`)[0].id, diagOff)
  assert.equal(B.store.getBanco().clientes[0].diagnosticos[0].id, diagOff)
})
await caso('B: sincronizar sem internet avisa e mantém a cópia do aparelho', async () => {
  const antes = avisos().length
  await B.store.sincronizar()
  assert.ok(avisos().length > antes)
  assert.deepEqual(json(armB, `imperio-cronograma-${U}`).feitos, ['2026-11-04'])
  assert.equal(B.store.getBanco().clientes[0].diagnosticos[0].id, diagOff)
  servidor.falhar = false
})

// enquanto B estava sem internet, A regravou o dia 03 (mais novo que a edição do B)
globalThis.localStorage = armA
await pausa(10)
A.diario.registrarDia(U, { data: '2026-11-03', frizz: 5, brilho: 5, maciez: 5 })
await ate(() => diaNuvem('2026-11-03').frizz === 5, 'A regravou o dia 03')

globalThis.localStorage = armB
await B.store.sincronizar()
await caso('B volta a ter internet: vale o registro mais recente de cada dia', async () => {
  const regs = json(armB, `imperio-diario-${U}`).registros
  assert.equal(regs.find((r) => r.data === '2026-11-03').frizz, 5) // o do A (mais novo) venceu
  await ate(() => diaNuvem('2026-11-04')?.brilho === 5, 'dia só do B subiu')
})
await caso('B volta a ter internet: o diagnóstico guardado sobe e sai da fila do aparelho', () => {
  assert.ok(servidor.tabelas.diagnosticos.some((d) => d.id === diagOff))
  assert.equal(armB.getItem(`imperio-diagnosticos-pendentes-${U}`), null)
  const ids = B.store.getBanco().clientes[0].diagnosticos.map((d) => d.id)
  assert.equal(ids.filter((x) => x === diagOff).length, 1)
  assert.equal(ids.length, 2)
})
await caso('B volta a ter internet: a alteração pendente e mais nova do cronograma sobe', async () => {
  await ate(() => cronoNuvem().feitos.length === 1, 'cronograma do B subiu')
  assert.deepEqual(cronoNuvem().feitos, ['2026-11-04'])
})

globalThis.localStorage = armA
await A.store.sincronizar()
await caso('A sincroniza: a nuvem vence (recebe o que o B fez)', () => {
  assert.deepEqual(json(armA, `imperio-cronograma-${U}`).feitos, ['2026-11-04'])
  assert.equal(json(armA, `imperio-diario-${U}`).registros.find((r) => r.data === '2026-11-04').brilho, 5)
})
await caso('A: "Refazer cronograma" também vai para a nuvem', async () => {
  A.cronograma.recomecar(U)
  await ate(() => cronoNuvem().perfil === null && cronoNuvem().feitos.length === 0, 'cronograma zerado na nuvem')
})
await caso('cronograma inválido vindo da nuvem é ignorado', async () => {
  cronoNuvem().perfil = { estado: 'xyz', lavagens: 9 }
  cronoNuvem().atualizado_em = new Date(Date.now() + 60000).toISOString()
  await A.store.sincronizar()
  assert.equal(json(armA, `imperio-cronograma-${U}`).perfil, undefined)
})
await caso('exportação inclui o que ainda não subiu', async () => {
  servidor.funcoes.exportar_meus_dados = () => ({ perfil: { id: U }, cronograma: {}, diario_cabelo: [] })
  const e = await A.acoes.exportarDados(U)
  assert.ok(e.cronograma && Array.isArray(e.noAparelho.diagnosticosAindaNaoEnviados))
})

/* ---------- cadastro: v3 sem unidade, com fallback ---------- */
const V = '22222222-2222-4222-8222-222222222222'
servidor.funcoes.completar_cadastro_v3 = (args, uid) => {
  servidor.tabelas.perfis.push({ id: uid, papel: 'cliente', nome: args.p_nome, telefone: '71988887777', criado_em: new Date().toISOString(), consentimento_marketing: args.p_marketing, onboarding: args.p_onboarding })
  return uid
}
servidor.usuario = V
await A.store.sincronizar()
A.acoes.salvarDiagnostico(undefined, { id: crypto.randomUUID(), data: '2026-11-04', respostas: { tipo: 'crespo' }, fio: 'Crespo, grosso', porosidade: 'Média', danos: 'Médio', foco: 'N', rotina: [], observacoes: [] })
await A.store.sincronizar() // ex.: a sessão abriu depois do login: o diagnóstico de visitante não se perde
await caso('cadastro usa completar_cadastro_v3, sem unidade, e sobe o diagnóstico feito antes da conta', async () => {
  assert.ok(A.store.getBanco().diagnosticoVisitante)
  const id = await A.acoes.cadastrar({ nome: 'Bia Nova', telefone: '71988887777', marketing: true, onboarding: { objetivos: [], ultimaProgressiva: '', tipoCabelo: 'crespo' } })
  assert.equal(id, V)
  const ch = servidor.chamadas.filter((c) => /completar_cadastro/.test(c.fn))
  assert.deepEqual(ch.map((c) => c.fn), ['completar_cadastro_v3'])
  assert.ok(!('p_unidade' in ch[0].args))
  assert.equal(ch[0].args.p_telefone, '71988887777')
  await ate(() => servidor.tabelas.diagnosticos.some((d) => d.cliente_id === V && d.resultado.foco === 'N'), 'diagnóstico de visitante na nuvem')
  assert.equal(A.store.getBanco().diagnosticoVisitante, undefined)
  assert.equal(A.store.getBanco().clientes[0].diagnosticos.length, 1)
})
await caso('servidor sem a v3: cai na v2 com uma unidade do catálogo; sem a v2, na função antiga', async () => {
  delete servidor.funcoes.completar_cadastro_v3
  servidor.tabelas.unidades.push({ id: 'feira', ativa: true, em_breve: true }, { id: 'norte-shopping', ativa: true, em_breve: false })
  servidor.funcoes.completar_cadastro_v2 = (_a, uid) => uid
  servidor.chamadas.length = 0
  await A.nuvem.completarCadastro({ nome: 'X', marketing: false })
  assert.deepEqual(servidor.chamadas.map((c) => c.fn), ['completar_cadastro_v3', 'completar_cadastro_v2'])
  assert.equal(servidor.chamadas[1].args.p_unidade, 'norte-shopping')
  delete servidor.funcoes.completar_cadastro_v2
  servidor.funcoes.completar_cadastro = (_a, uid) => uid
  servidor.chamadas.length = 0
  await A.nuvem.completarCadastro({ nome: 'X', marketing: false })
  assert.deepEqual(servidor.chamadas.map((c) => c.fn), ['completar_cadastro_v3', 'completar_cadastro_v2', 'completar_cadastro'])
  assert.equal(servidor.chamadas[2].args.p_unidade, 'norte-shopping')
})
await caso('erro da v3 (ex.: WhatsApp repetido) chega à cliente sem tentar as antigas', async () => {
  servidor.funcoes.completar_cadastro_v3 = () => { throw new Error('Este WhatsApp já tem cadastro.') }
  servidor.chamadas.length = 0
  await assert.rejects(A.nuvem.completarCadastro({ nome: 'X', marketing: false }), /já tem cadastro/)
  assert.deepEqual(servidor.chamadas.map((c) => c.fn), ['completar_cadastro_v3'])
})

/* ---------- exclusão ---------- */
servidor.usuario = U
await A.store.sincronizar()
servidor.funcoes.excluir_minha_conta = () => null
await caso('excluir conta apaga cronograma, diário e pendências do aparelho', async () => {
  armA.setItem(`imperio-diagnosticos-pendentes-${U}`, '[]')
  A.acoes.excluirConta(U)
  for (const k of [`imperio-cronograma-${U}`, `imperio-diario-${U}`, `imperio-diagnosticos-pendentes-${U}`]) assert.equal(armA.getItem(k), null, k)
  await ate(() => servidor.chamadas.some((c) => c.fn === 'excluir_minha_conta'), 'exclusão no servidor')
})

fs.rmSync(saida, { recursive: true, force: true })
console.log(`\n${n} testes do modo conectado passaram`)
process.exit(0)
