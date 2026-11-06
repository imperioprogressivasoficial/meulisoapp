/**
 * Testes das regras de mesclagem aparelho × nuvem (src/data/mesclar.ts).
 * Rodar: node scripts/testar-mesclar.ts   (Node 22.18+, sem dependências)
 */
import assert from 'node:assert/strict'
import { mesclarCronograma, mesclarDiagnosticos, mesclarDiario } from '../src/data/mesclar.ts'

let n = 0
const caso = (nome: string, fn: () => void) => { fn(); n++; console.log('ok ', nome) }

type P = { estado: string; inicio: string }
const perfilA: P = { estado: 'ressecado', inicio: '2026-11-02' }
const perfilB: P = { estado: 'danificado', inicio: '2026-10-26' }

/* ---------- cronograma ---------- */
caso('cronograma: sem nada no aparelho e na nuvem, nada a enviar', () => {
  const r = mesclarCronograma<P>({ feitos: [] }, null)
  assert.equal(r.enviar, false)
})
caso('cronograma: só no aparelho (dado antigo, sem controle) sobe para a nuvem', () => {
  const r = mesclarCronograma<P>({ perfil: perfilA, feitos: ['2026-11-02'] }, null)
  assert.equal(r.enviar, true)
  assert.deepEqual(r.valor.perfil, perfilA)
})
caso('cronograma: aparelho novo (vazio) recebe o da nuvem', () => {
  const r = mesclarCronograma<P>({ feitos: [] }, { perfil: perfilB, feitos: ['2026-10-28', '2026-10-26'], atualizado_em: '2026-11-01T10:00:00Z' })
  assert.equal(r.enviar, false)
  assert.deepEqual(r.valor, { perfil: perfilB, feitos: ['2026-10-26', '2026-10-28'], sinc: { em: '2026-11-01T10:00:00Z', pendente: false } })
})
caso('cronograma: conflito sem alteração pendente → a nuvem vence', () => {
  const r = mesclarCronograma<P>({ perfil: perfilA, feitos: [], sinc: { em: '2026-11-03T10:00:00Z', pendente: false } },
    { perfil: perfilB, feitos: [], atualizado_em: '2026-11-01T10:00:00Z' })
  assert.equal(r.enviar, false)
  assert.deepEqual(r.valor.perfil, perfilB)
})
caso('cronograma: alteração pendente mais nova que a nuvem → o aparelho vence e sobe', () => {
  const r = mesclarCronograma<P>({ perfil: perfilA, feitos: ['2026-11-04'], sinc: { em: '2026-11-04T12:00:00Z', pendente: true } },
    { perfil: perfilB, feitos: [], atualizado_em: '2026-11-04T11:59:00Z' })
  assert.equal(r.enviar, true)
  assert.deepEqual(r.valor.perfil, perfilA)
})
caso('cronograma: alteração pendente mais velha que a nuvem → a nuvem vence (por atualizado_em)', () => {
  const r = mesclarCronograma<P>({ perfil: perfilA, feitos: [], sinc: { em: '2026-11-04T09:00:00Z', pendente: true } },
    { perfil: perfilB, feitos: [], atualizado_em: '2026-11-04T10:00:00Z' })
  assert.equal(r.enviar, false)
  assert.deepEqual(r.valor.perfil, perfilB)
})
caso('cronograma: "refazer" na nuvem (perfil nulo) chega ao aparelho', () => {
  const r = mesclarCronograma<P>({ perfil: perfilA, feitos: ['2026-11-02'] }, { perfil: null, feitos: [], atualizado_em: '2026-11-04T10:00:00Z' })
  assert.equal(r.valor.perfil, undefined)
  assert.deepEqual(r.valor.feitos, [])
})

/* ---------- diário ---------- */
const reg = (data: string, x: number) => ({ data, frizz: x, brilho: x, maciez: x })
const dia = (d: string, x: number, em: string) => ({ dia: d, frizz: x, brilho: x, maciez: x, atualizado_em: em })

caso('diário: aparelho novo recebe todos os dias da nuvem, em ordem', () => {
  const r = mesclarDiario([], {}, [dia('2026-11-02', 3, '2026-11-02T10:00:00Z'), dia('2026-11-01', 2, '2026-11-01T10:00:00Z')])
  assert.deepEqual(r.registros.map((x) => x.data), ['2026-11-01', '2026-11-02'])
  assert.deepEqual(r.enviar, [])
  assert.equal(r.sinc['2026-11-01'].pendente, false)
})
caso('diário: dias só do aparelho sobem; dias só da nuvem descem', () => {
  const r = mesclarDiario([reg('2026-11-03', 4)], {}, [dia('2026-11-01', 2, '2026-11-01T10:00:00Z')])
  assert.deepEqual(r.registros.map((x) => x.data), ['2026-11-01', '2026-11-03'])
  assert.deepEqual(r.enviar, ['2026-11-03'])
  assert.equal(r.sinc['2026-11-03'].pendente, true)
})
caso('diário: mesmo dia, sem pendência → vale a nuvem', () => {
  const r = mesclarDiario([reg('2026-11-01', 5)], { '2026-11-01': { em: '2026-11-01T09:00:00Z', pendente: false } }, [dia('2026-11-01', 1, '2026-11-01T08:00:00Z')])
  assert.equal(r.registros[0].frizz, 1)
  assert.deepEqual(r.enviar, [])
})
caso('diário: mesmo dia, pendente e mais novo → vale o aparelho (último a gravar vence)', () => {
  const r = mesclarDiario([reg('2026-11-01', 5)], { '2026-11-01': { em: '2026-11-01T12:00:00Z', pendente: true } }, [dia('2026-11-01', 1, '2026-11-01T11:00:00Z')])
  assert.equal(r.registros[0].frizz, 5)
  assert.deepEqual(r.enviar, ['2026-11-01'])
})
caso('diário: mesmo dia, pendente mas mais velho → vale a nuvem (gravado depois em outro aparelho)', () => {
  const r = mesclarDiario([reg('2026-11-01', 5)], { '2026-11-01': { em: '2026-11-01T10:00:00Z', pendente: true } }, [dia('2026-11-01', 1, '2026-11-01T11:00:00Z')])
  assert.equal(r.registros[0].frizz, 1)
  assert.deepEqual(r.enviar, [])
  assert.equal(r.sinc['2026-11-01'].pendente, false)
})
caso('diário: cada dia decide sozinho', () => {
  const r = mesclarDiario(
    [reg('2026-11-01', 5), reg('2026-11-02', 5)],
    { '2026-11-01': { em: '2026-11-01T12:00:00Z', pendente: true }, '2026-11-02': { em: '2026-11-02T08:00:00Z', pendente: false } },
    [dia('2026-11-01', 1, '2026-11-01T11:00:00Z'), dia('2026-11-02', 1, '2026-11-02T11:00:00Z')],
  )
  assert.deepEqual(r.registros.map((x) => x.frizz), [5, 1])
  assert.deepEqual(r.enviar, ['2026-11-01'])
})

/* ---------- diagnósticos ---------- */
caso('diagnósticos: pendentes aparecem junto com os da nuvem, sem repetir e do mais recente', () => {
  const r = mesclarDiagnosticos([{ id: 'a', data: '2026-11-01' }, { id: 'b', data: '2026-11-03' }], [{ id: 'b', data: '2026-11-03' }, { id: 'c', data: '2026-11-04' }])
  assert.deepEqual(r.map((x) => x.id), ['c', 'b', 'a'])
})

console.log(`\n${n} testes de mesclagem passaram`)
