/**
 * Meu perfil de cabelo: mostra as respostas do primeiro acesso e deixa editar,
 * reabrindo as mesmas perguntas (uma por tela). Rota: /perfil-cabelo
 */
import { useRef, useState } from 'react'
import { ChevronRight, Pencil } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { Cliente, RespostasOnboarding } from '../../types'
import { Botao, Cabecalho, Cartao, Progresso, TituloDestaque, TituloSecao } from '../../ds/componentes'
import { toast } from '../../ds/extras'
import { atualizarOnboarding } from '../../data/acoes'
import { linhasPerfil } from '../../data/perfilCabelo'
import { voltar } from '../../lib/rotas'
import { CorpoPergunta, ORDEM_PERFIL, limparRespostas, pularPergunta, vazio, type IdPergunta } from './PerguntasCabelo'

const TRANSICAO = { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] as const }

export function PerfilCabelo({ cliente }: { cliente: Cliente }) {
  const [fila, setFila] = useState<IdPergunta[]>([])
  const [indice, setIndice] = useState(0)
  const [rascunho, setRascunho] = useState<RespostasOnboarding>(vazio)
  const ref = useRef<{ r: RespostasOnboarding; atual?: IdPergunta; salvando: boolean }>({ r: vazio(), salvando: false })
  const editando = fila[indice]
  ref.current.atual = editando

  const abrir = (ids: IdPergunta[]) => {
    const r = { ...vazio(), ...cliente.onboarding }
    ref.current = { r, atual: ids[0], salvando: false }
    setRascunho(r)
    setFila(ids)
    setIndice(0)
    window.scrollTo({ top: 0 })
  }
  const fechar = () => { setFila([]); setIndice(0) }
  const mudar = (p: Partial<RespostasOnboarding>) => {
    ref.current.r = { ...ref.current.r, ...p }
    setRascunho(ref.current.r)
  }
  /** Próxima pergunta da fila, ou salva no fim. `de` evita pular uma pergunta com dois toques rápidos. */
  const avancarDe = async (de: IdPergunta) => {
    if (ref.current.atual !== de || ref.current.salvando) return
    let pos = fila.indexOf(de) + 1
    while (pos < fila.length && pularPergunta(fila[pos], ref.current.r)) pos++
    if (pos < fila.length) { ref.current.atual = fila[pos]; setIndice(pos); window.scrollTo({ top: 0 }); return }
    ref.current.salvando = true
    const limpas = limparRespostas(ref.current.r)
    const ok = limpas ? await atualizarOnboarding(cliente.id, limpas) : false
    ref.current.salvando = false
    if (ok) { toast('Perfil de cabelo atualizado.'); fechar() }
  }

  if (editando)
    return (
      <>
        <Cabecalho titulo="Meu perfil de cabelo" onVoltar={() => { let i = indice - 1; while (i > 0 && pularPergunta(fila[i], ref.current.r)) i--; if (i >= 0) { ref.current.atual = fila[i]; setIndice(i) } else fechar() }} />
        <div className="ob ob--embutido">
          {fila.length > 1 && (
            <div className="perfil-cabelo__passo">
              <span className="suave num">Pergunta {indice + 1} de {fila.length}</span>
              <Progresso valor={(indice + 1) / fila.length} fina rotulo="Progresso" />
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.section key={editando} className={`ob-tela ob-tela--${editando}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={TRANSICAO}>
              <CorpoPergunta id={editando} r={rascunho} mudar={mudar} avancar={() => void avancarDe(editando)} rotuloAvancar={indice < fila.length - 1 ? 'Continuar' : 'Salvar'} />
              {fila.length > 1 && <Botao variante="texto" onClick={() => void avancarDe(editando)}>{indice < fila.length - 1 ? 'Manter como está' : 'Salvar sem mudar esta'}</Botao>}
            </motion.section>
          </AnimatePresence>
        </div>
      </>
    )

  const linhas = linhasPerfil(cliente.onboarding)
  const respondidas = linhas.filter((l) => l.valor).length
  return (
    <>
      <Cabecalho titulo="Meu perfil de cabelo" onVoltar={() => voltar('/perfil')} />
      <div className="tela">
        <section className="perfil-cabelo__topo">
          <TituloDestaque linha="Meu perfil" destaque="de cabelo" tom="azul" />
          <p className="suave centro">Com estas respostas o app monta seu cronograma e escolhe as dicas do Início.</p>
        </section>

        <Cartao>
          {linhas.map((l) => (
            <button key={l.id} className="ds-item ds-item--clicavel perfil-cabelo__linha" onClick={() => abrir([l.id])} aria-label={`Editar: ${l.titulo}`}>
              <span className="ds-item__texto">
                <small>{l.titulo}</small>
                <strong className={l.valor ? undefined : 'fraco'}>{l.valor ?? 'Não respondido'}</strong>
              </span>
              <ChevronRight size={18} color="var(--texto-fraco)" />
            </button>
          ))}
        </Cartao>

        {respondidas === 0 ? (
          <Botao onClick={() => abrir(ORDEM_PERFIL)}>Responder agora</Botao>
        ) : (
          <Botao variante="contorno" icone={Pencil} onClick={() => abrir(ORDEM_PERFIL)}>Editar todas as respostas</Botao>
        )}

        <TituloSecao>Seus dados</TituloSecao>
        <p className="suave">As respostas ficam guardadas na sua conta e são usadas só para personalizar o app. Se você excluir a conta, elas são apagadas.</p>
      </div>
    </>
  )
}
