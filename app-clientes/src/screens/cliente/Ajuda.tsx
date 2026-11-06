import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, Mail, Search, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Cliente } from '../../types'
import { Botao, BotaoLink, Cabecalho, Cartao, TituloDestaque } from '../../ds/componentes'
import { IlSino } from '../../ds/ilustras'
import { EMAIL_SUPORTE } from '../../data/config'
import { CATEGORIAS_AJUDA, buscarPerguntas, type CategoriaAjuda, type PerguntaAjuda } from '../../data/ajuda'
import { navegar, useRota, voltar } from '../../lib/rotas'
import { primeiroNome } from '../../lib/regras'
import './ajuda.css'

/* =========================================================
   Ajuda (/ajuda): perguntas frequentes sobre o app. Funciona com ou sem login.
   ========================================================= */

/** Rotas que abrem sem login; as demais levam à tela de entrada. */
const PUBLICAS = ['/diagnostico', '/ajuda', '/privacidade', '/termos', '/conheca']
/** O e-mail de suporte só aparece depois de configurado em data/config.ts. */
const emailConfigurado = /^[^\s@[\]]+@[^\s@]+\.[^\s@]+$/.test(EMAIL_SUPORTE)

export function Ajuda({ cliente }: { cliente?: Cliente }) {
  const { params } = useRota()
  const qUrl = params.get('q') ?? ''
  const [busca, setBusca] = useState(qUrl)
  const [categoria, setCategoria] = useState<CategoriaAjuda | 'todas'>('todas')
  const [aberta, setAberta] = useState<string | null>(null)
  const faqRef = useRef<HTMLDivElement>(null)

  // deep link: /ajuda?q=diario
  useEffect(() => { if (qUrl) setBusca(qUrl) }, [qUrl])

  const nome = cliente ? primeiroNome(cliente) : undefined
  const resultados = useMemo(() => buscarPerguntas(busca), [busca])
  const filtrados = categoria === 'todas' ? resultados : resultados.filter((p) => p.categoria === categoria)
  const grupos = CATEGORIAS_AJUDA.map((c) => ({ ...c, itens: filtrados.filter((p) => p.categoria === c.id) })).filter((g) => g.itens.length)
  const buscando = busca.trim().length > 0
  // com um único resultado, a resposta já vem aberta
  const abertaEfetiva = aberta ?? (buscando && filtrados.length === 1 ? filtrados[0].id : null)

  return (
    <>
      <Cabecalho titulo="Ajuda" onVoltar={() => voltar(cliente ? '/perfil' : '/')} />
      <section className="ajd-topo">
        <TituloDestaque linha={nome ? `${nome}, como podemos` : 'Como podemos'} destaque="ajudar?" tom="lavanda" />
        <p className="suave centro">Respostas rápidas sobre o cronograma, o diário, a sua conta e a sua privacidade.</p>
        <div className="ajd-busca" role="search">
          <Search size={18} className="ajd-busca__icone" aria-hidden />
          <input
            type="search"
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setAberta(null) }}
            placeholder="Busque: cronograma, diário, excluir conta…"
            aria-label="Buscar nas perguntas frequentes"
            enterKeyHint="search"
          />
          {buscando && (
            <button className="ajd-busca__limpar" onClick={() => { setBusca(''); setAberta(null) }} aria-label="Limpar busca"><X size={16} /></button>
          )}
        </div>
      </section>

      <div className="tela">
        <div ref={faqRef} className="ajd-ancora" />
        <div className="ajd-categorias" role="toolbar" aria-label="Filtrar por assunto">
          {[{ id: 'todas' as const, nome: 'Todas' }, ...CATEGORIAS_AJUDA].map((c) => (
            <button key={c.id} className={`ajd-chip ${categoria === c.id ? 'sel' : ''}`} aria-pressed={categoria === c.id} onClick={() => { setCategoria(c.id); setAberta(null) }}>{c.nome}</button>
          ))}
        </div>

        {buscando && filtrados.length > 0 && (
          <p className="suave ajd-contagem" aria-live="polite">{`${filtrados.length} ${filtrados.length === 1 ? 'resposta' : 'respostas'} para “${busca.trim()}”`}</p>
        )}

        {grupos.length ? (
          grupos.map((g) => (
            <section key={g.id} className="ajd-grupo" aria-labelledby={`ajd-cat-${g.id}`}>
              <h2 id={`ajd-cat-${g.id}`} className="ajd-grupo__titulo">{g.nome}</h2>
              <Cartao className="ajd-lista">
                {g.itens.map((p) => (
                  <Pergunta key={p.id} p={p} aberta={abertaEfetiva === p.id} onAlternar={() => setAberta(abertaEfetiva === p.id ? '' : p.id)} logada={!!cliente} />
                ))}
              </Cartao>
            </section>
          ))
        ) : (
          <Cartao className="ajd-vazio">
            <IlSino size={56} />
            <strong>Nada encontrado{buscando ? ` para “${busca.trim()}”` : ''}</strong>
            <span className="suave centro">Tente outra palavra ou veja todas as perguntas.</span>
            <button className="ds-link" onClick={() => { setBusca(''); setCategoria('todas') }}>Ver todas as perguntas</button>
          </Cartao>
        )}

        {emailConfigurado && (
          <Cartao className="ajd-contato">
            <strong className="ajd-contato__titulo">Fale com a gente</strong>
            <span className="suave">Não achou o que procurava? Mande um e-mail para o suporte do Meu Liso.</span>
            <BotaoLink variante="contorno" icone={Mail} href={`mailto:${EMAIL_SUPORTE}?subject=${encodeURIComponent('Ajuda com o Meu Liso')}`}>{EMAIL_SUPORTE}</BotaoLink>
          </Cartao>
        )}

        <p className="fraco centro ajd-rodape">
          O Meu Liso dá orientações gerais de cuidado em casa. Para queda forte, alergia ou feridas no couro cabeludo, procure um dermatologista.
        </p>
      </div>
    </>
  )
}

/* ---------------- uma pergunta (acordeão) ---------------- */
function Pergunta({ p, aberta, onAlternar, logada }: { p: PerguntaAjuda; aberta: boolean; onAlternar: () => void; logada: boolean }) {
  const reduzir = useReducedMotion()
  const idResposta = `ajd-r-${p.id}`
  const [primeiro, ...resto] = p.texto
  const precisaEntrar = !!p.acao && !logada && !PUBLICAS.some((r) => p.acao!.rota.startsWith(r))
  return (
    <div className={`ajd-item ${aberta ? 'aberta' : ''}`}>
      <button className="ajd-item__pergunta" aria-expanded={aberta} aria-controls={idResposta} onClick={onAlternar}>
        <span>{p.pergunta}</span>
        <motion.span className="ajd-item__seta" animate={{ rotate: aberta ? 180 : 0 }} transition={{ duration: reduzir ? 0 : 0.2 }}>
          <ChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div
            id={idResposta}
            role="region"
            aria-label={p.pergunta}
            className="ajd-item__corpo"
            initial={reduzir ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduzir ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduzir ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="ajd-item__resposta">
              {primeiro && <p>{primeiro}</p>}
              {p.lista && <ul>{p.lista.map((l) => <li key={l}>{l}</li>)}</ul>}
              {resto.map((t) => <p key={t}>{t}</p>)}
              {p.acao && (
                <span className="ajd-acao-linha">
                  <Botao variante="contorno" tamanho="sm" bloco={false} className="ajd-acao" onClick={() => navegar(p.acao!.rota)} aria-label={`Ir para: ${p.acao.rotulo}`}>
                    {p.acao.rotulo} <ArrowRight size={16} />
                  </Botao>
                  {precisaEntrar && <small className="fraco">Precisa entrar na sua conta</small>}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
