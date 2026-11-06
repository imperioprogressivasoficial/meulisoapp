/**
 * Diário do cabelo (/diario): um minuto por dia para registrar frizz, brilho e maciez
 * e ver, no gráfico dos últimos 14 dias, o que deixa o cabelo mais bonito.
 */
import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, Sparkles } from 'lucide-react'
import type { Cliente } from '../../types'
import { Botao, Cabecalho, Cartao, Etiqueta, TituloDestaque } from '../../ds/componentes'
import { Segmento, toast } from '../../ds/extras'
import { METRICAS, insightDiario, registrarDia, ultimosDias, useDiario, type Metrica, type Nota, type RegistroDiario } from '../../data/diario'
import { navegar } from '../../lib/rotas'
import { formatarData, hojeISO } from '../../lib/regras'
import { Sino } from './Inicio'
import './diario.css'

const NOTAS = ['1', '2', '3', '4', '5'].map((id) => ({ id, rotulo: id }))

export function Diario({ cliente }: { cliente: Cliente }) {
  const registros = useDiario(cliente.id)
  const hoje = hojeISO()
  const deHoje = registros.find((r) => r.data === hoje)
  const [notas, setNotas] = useState<Partial<Record<Metrica, string>>>(() =>
    deHoje ? { frizz: String(deHoje.frizz), brilho: String(deHoje.brilho), maciez: String(deHoje.maciez) } : {},
  )
  const completo = METRICAS.every((m) => notas[m.id])
  const insight = insightDiario(registros, hoje)
  const totalDias = new Set(registros.map((r) => r.data)).size

  const salvar = () => {
    if (!completo) return
    registrarDia(cliente.id, { data: hoje, frizz: Number(notas.frizz) as Nota, brilho: Number(notas.brilho) as Nota, maciez: Number(notas.maciez) as Nota })
    toast(deHoje ? 'Dia de hoje atualizado' : 'Registrado! Volte amanhã para acompanhar.')
  }

  return (
    <>
      <Cabecalho titulo="Diário do cabelo" direita={<Sino cliente={cliente} />} />
      <section className="dia-topo">
        <TituloDestaque linha="Diário do" destaque="cabelo" tom="pessego" />
        <p className="suave centro">Um minuto por dia para entender o que deixa seu cabelo mais bonito.</p>
        {totalDias > 0 && <Etiqueta tom="neutro">{totalDias === 1 ? '1 dia registrado' : `${totalDias} dias registrados`}</Etiqueta>}
      </section>

      <motion.div className="tela dia-tela" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
        <Cartao className="dia-diario">
          <div className="linha">
            <strong>Como está seu cabelo hoje?</strong>
            <span className="suave">{formatarData(hoje, { day: '2-digit', month: 'short' })}</span>
          </div>
          {METRICAS.map((m) => (
            <div key={m.id} className="dia-diario__metrica" role="group" aria-label={m.nome}>
              <span className="linha">
                <span className="dia-rotulo"><i className="dia-cor" style={{ background: m.cor }} />{m.nome}</span>
                <small className="suave">{m.ajuda}</small>
              </span>
              <Segmento<string> opcoes={NOTAS} valor={notas[m.id] ?? ''} onTrocar={(v) => setNotas((n) => ({ ...n, [m.id]: v }))} />
            </div>
          ))}
          <Botao disabled={!completo} icone={Check} onClick={salvar}>{deHoje ? 'Atualizar o dia de hoje' : 'Salvar o dia de hoje'}</Botao>
        </Cartao>

        <Cartao>
          <div className="linha">
            <strong>Últimos 14 dias</strong>
          </div>
          <Grafico registros={registros} hoje={hoje} />
        </Cartao>

        <Cartao className="dia-insight">
          <div className="linha" style={{ justifyContent: 'flex-start', gap: 12 }}>
            <Sparkles size={20} className="ouro" />
            <strong>O que o diário mostra</strong>
          </div>
          <p>{insight.texto}</p>
          {insight.rota && <Botao variante="texto" bloco={false} onClick={() => navegar(insight.rota!)}>{insight.acao}</Botao>}
        </Cartao>
      </motion.div>
    </>
  )
}

/* ---------- gráfico de linhas em SVG (sem biblioteca) ---------- */
const G = { w: 320, h: 170, l: 22, r: 10, t: 12, b: 24 }
const gx = (i: number, n: number) => G.l + (i * (G.w - G.l - G.r)) / (n - 1)
const gy = (v: number) => G.t + ((5 - v) * (G.h - G.t - G.b)) / 4

function Grafico({ registros, hoje }: { registros: RegistroDiario[]; hoje: string }) {
  const diasG = ultimosDias(registros, 14, hoje)
  const n = diasG.length
  const ultimoComDado = diasG.map((d, i) => (d.registro ? i : -1)).filter((i) => i >= 0).pop()
  const [sel, setSel] = useState<number | undefined>(ultimoComDado)
  const atual = sel !== undefined ? diasG[sel] : undefined
  const vazio = ultimoComDado === undefined

  const caminho = (m: Metrica) => {
    let d = ''
    let anterior = false
    diasG.forEach((x, i) => {
      if (!x.registro) { anterior = false; return }
      d += `${anterior ? 'L' : 'M'}${gx(i, n).toFixed(1)} ${gy(x.registro[m]).toFixed(1)} `
      anterior = true
    })
    return d.trim()
  }
  const resumo = vazio
    ? 'Gráfico vazio: nenhum registro nos últimos 14 dias.'
    : `Gráfico dos últimos 14 dias com ${diasG.filter((d) => d.registro).length} registros de frizz, brilho e maciez.`

  return (
    <div className="dia-grafico">
      <div className="dia-grafico__legenda">
        {METRICAS.map((m) => (
          <span key={m.id}><i className="dia-cor" style={{ background: m.cor }} />{m.nome}{m.id === 'frizz' && <small> (menor é melhor)</small>}</span>
        ))}
      </div>
      <div className="dia-grafico__detalhe" aria-live="polite">
        {atual?.registro ? (
          <>
            <strong>{atual.data === hoje ? 'Hoje' : formatarData(atual.data, { weekday: 'short', day: '2-digit', month: '2-digit' })}</strong>
            {METRICAS.map((m) => <span key={m.id}>{m.nome} <b className="num">{atual.registro![m.id]}</b></span>)}
          </>
        ) : atual ? (
          <><strong>{formatarData(atual.data, { weekday: 'short', day: '2-digit', month: '2-digit' })}</strong><span className="suave">sem registro</span></>
        ) : (
          <span className="suave">Seus registros aparecem aqui.</span>
        )}
      </div>
      <svg viewBox={`0 0 ${G.w} ${G.h}`} className="dia-grafico__svg" role="img" aria-label={resumo}>
        {[1, 2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={G.l} x2={G.w - G.r} y1={gy(v)} y2={gy(v)} className="dia-grafico__grade" />
            {v % 2 === 1 && <text x={G.l - 8} y={gy(v) + 4} textAnchor="end" className="dia-grafico__eixo">{v}</text>}
          </g>
        ))}
        {[0, 7, n - 1].map((i) => (
          <text key={i} x={gx(i, n)} y={G.h - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="dia-grafico__eixo">
            {i === n - 1 ? 'hoje' : formatarData(diasG[i].data, { day: '2-digit', month: '2-digit' })}
          </text>
        ))}
        {sel !== undefined && <line x1={gx(sel, n)} x2={gx(sel, n)} y1={G.t - 4} y2={G.h - G.b} className="dia-grafico__mira" />}
        {METRICAS.map((m) => (
          <g key={m.id}>
            <path d={caminho(m.id)} fill="none" stroke={m.cor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {diasG.map((x, i) => x.registro && (
              <circle key={i} cx={gx(i, n)} cy={gy(x.registro[m.id])} r={i === sel ? 5 : 4} fill={m.cor} stroke="var(--branco)" strokeWidth={2} />
            ))}
          </g>
        ))}
        {diasG.map((x, i) => (
          <rect
            key={x.data}
            x={gx(i, n) - (G.w - G.l - G.r) / (n - 1) / 2}
            y={0}
            width={(G.w - G.l - G.r) / (n - 1)}
            height={G.h - G.b + 6}
            fill="transparent"
            onPointerEnter={() => setSel(i)}
            onClick={() => setSel(i)}
            aria-hidden
          />
        ))}
      </svg>
      {vazio && <p className="suave centro">Salve o dia de hoje para começar o gráfico.</p>}
      {!vazio && (
        <details className="dia-grafico__tabela">
          <summary>Ver em tabela</summary>
          <table>
            <thead><tr><th scope="col">Dia</th>{METRICAS.map((m) => <th key={m.id} scope="col">{m.nome}</th>)}</tr></thead>
            <tbody>
              {diasG.filter((d) => d.registro).reverse().map((d) => (
                <tr key={d.data}>
                  <th scope="row">{formatarData(d.data, { day: '2-digit', month: '2-digit' })}</th>
                  {METRICAS.map((m) => <td key={m.id} className="num">{d.registro![m.id]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  )
}
