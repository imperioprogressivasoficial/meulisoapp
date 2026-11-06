/**
 * Página pública do app (/conheca, também #conheca): apresentação profissional do Meu Liso.
 * Telas reais do app em molduras de celular, selos das lojas (o app ainda não está nas lojas:
 * os selos dizem "Em breve" e levam para usar no navegador) e nada de preço ou salão.
 */
import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { Check, ChevronDown, ShieldCheck, Smartphone, Sparkles } from 'lucide-react'
import { Botao, MarcaMeuLiso, TituloDestaque } from '../../ds/componentes'
import { Foto, toast } from '../../ds/extras'
import { IlCronograma, IlDiagnostico, IlEstrela, IlGaleria, IlNutricao, IlSino, type Icone } from '../../ds/ilustras'
import { TIPOS } from '../../data/perfilCabelo'
import { navegar } from '../../lib/rotas'
import './vendas.css'

const tela = (n: string) => `${import.meta.env.BASE_URL}img/telas/${n}.webp`

/* ---------- animação de entrada ---------- */
function Revela({ children, atraso = 0, className }: { children: ReactNode; atraso?: number; className?: string }) {
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.55, delay: atraso, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </motion.div>
  )
}

/* ---------- celular com uma tela real do app ---------- */
function Celular({ n, alt, className }: { n: string; alt: string; className?: string }) {
  return (
    <div className={['vd-celular', className].filter(Boolean).join(' ')}>
      <span className="vd-celular__ilha" aria-hidden />
      <img src={tela(n)} alt={alt} loading="lazy" decoding="async" draggable={false} />
    </div>
  )
}

/* ---------- selos das lojas (app ainda não publicado nas lojas) ---------- */
function LogoApple() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden fill="currentColor">
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.85.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.32-3.52zM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.65-1.05 1.69-.92 2.68.97.08 1.96-.49 2.56-1.23z" />
    </svg>
  )
}
function LogoPlay() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden>
      <path d="M3.6 2.4 13.3 12l-9.7 9.6c-.35-.2-.6-.6-.6-1.1V3.5c0-.5.25-.9.6-1.1z" fill="#2196F3" />
      <path d="M16.6 8.7 13.3 12 3.6 2.4c.1-.06.22-.1.35-.12.3-.04.6.02.88.18l11.77 6.24z" fill="#4CAF50" />
      <path d="M16.6 15.3 4.83 21.54c-.28.16-.58.22-.88.18-.13-.02-.25-.06-.35-.12L13.3 12l3.3 3.3z" fill="#F44336" />
      <path d="M20.4 12c0 .5-.27.96-.7 1.2l-3.1 2.1L13.3 12l3.3-3.3 3.1 2.1c.43.24.7.7.7 1.2z" fill="#FFC107" />
    </svg>
  )
}
const avisarLoja = (loja: string) => toast(`O Meu Liso chega em breve na ${loja}. Enquanto isso, use agora mesmo pelo navegador do celular.`)
function SelosLojas({ claro }: { claro?: boolean }) {
  return (
    <div className={`vd-lojas${claro ? ' vd-lojas--claro' : ''}`}>
      <button className="vd-loja" onClick={() => avisarLoja('App Store')} aria-label="Em breve na App Store">
        <LogoApple />
        <span><small>Em breve na</small><strong>App Store</strong></span>
      </button>
      <button className="vd-loja" onClick={() => avisarLoja('Google Play')} aria-label="Em breve no Google Play">
        <LogoPlay />
        <span><small>Em breve no</small><strong>Google Play</strong></span>
      </button>
    </div>
  )
}

/* ---------- conteúdo ---------- */
const DESTAQUES: { n: string; alt: string; rotulo: string; titulo: ReactNode; texto: string; itens: string[] }[] = [
  {
    n: 'plano', alt: 'Tela Seu plano do app Meu Liso', rotulo: 'Personalizado',
    titulo: <>Um plano feito <em>para o seu fio</em></>,
    texto: 'Você responde perguntas rápidas sobre o seu cabelo e o app monta um plano só seu, com o foco certo para o seu momento.',
    itens: ['Liso, ondulado, cacheado ou crespo', 'Considera química, calor e rotina de lavagem', 'Dá para mudar as respostas quando quiser'],
  },
  {
    n: 'cronograma', alt: 'Tela do cronograma capilar', rotulo: 'Cronograma capilar',
    titulo: <>Hidratação, nutrição e reconstrução <em>no dia certo</em></>,
    texto: 'Quatro semanas organizadas na ordem que o seu cabelo precisa. Você marca o que fez e acompanha o progresso.',
    itens: ['Avisa o que fazer hoje', 'Respeita a fase depois de uma química', 'Indica o tipo de produto de cada etapa'],
  },
  {
    n: 'hidratacao', alt: 'Tela com o passo a passo da hidratação', rotulo: 'Passo a passo',
    titulo: <>Cada etapa <em>explicada</em></>,
    texto: 'Para que serve, quanto tempo deixar agir e como aplicar, em linguagem simples, para fazer em casa sem erro.',
    itens: ['Tempo de pausa de cada etapa', 'O que evitar para não pesar o fio', 'Tudo sem precisar de marca específica'],
  },
  {
    n: 'diario', alt: 'Tela do diário do cabelo', rotulo: 'Diário do cabelo',
    titulo: <>Descubra o que <em>funciona com você</em></>,
    texto: 'Um minuto por dia para registrar frizz, brilho e maciez. O gráfico mostra o que muda quando você muda a rotina.',
    itens: ['Registro rápido, em três toques', 'Gráfico dos últimos 14 dias', 'Dicas a partir do seu histórico'],
  },
]

const RECURSOS: { icone: Icone; titulo: string; texto: string }[] = [
  { icone: IlCronograma, titulo: 'Cronograma capilar', texto: 'Quatro semanas montadas pelas suas respostas, com lembrete no dia.' },
  { icone: IlEstrela, titulo: 'Diário do cabelo', texto: 'Frizz, brilho e maciez num gráfico simples.' },
  { icone: IlGaleria, titulo: 'Evolução em fotos', texto: 'Compare a primeira foto com a mais recente.' },
  { icone: IlDiagnostico, titulo: 'Diagnóstico capilar', texto: 'Tipo de fio, porosidade provável e rotina sugerida.' },
  { icone: IlNutricao, titulo: 'Dicas para o seu tipo', texto: 'Lavagem, finalização e cuidados para dormir.' },
  { icone: IlSino, titulo: 'Lembretes', texto: 'Só o que importa para o seu cabelo, no dia certo.' },
]

const PASSOS = [
  { t: 'Responda o quiz', d: 'Doze perguntas rápidas sobre o seu cabelo e a sua rotina.' },
  { t: 'Receba o seu plano', d: 'Cronograma de 4 semanas, dicas e lembretes no seu ritmo.' },
  { t: 'Acompanhe a evolução', d: 'Diário, fotos e ajustes conforme o cabelo responde.' },
]

const GALERIA: [string, string][] = [['quiz', 'Quiz inicial'], ['plano', 'Seu plano'], ['inicio', 'Início'], ['cronograma', 'Cronograma'], ['hidratacao', 'Passo a passo'], ['diario', 'Diário'], ['perfil-cabelo', 'Perfil do cabelo']]

const FIO: Record<string, string> = {
  liso: 'M12 4v40',
  ondulado: 'M12 4c6 6-6 10 0 16s-6 10 0 16 0 8 0 8',
  cacheado: 'M12 4c7 0 7 7 0 7s-7 7 0 7 7 7 0 7-7 7 0 7 7 7 0 7',
  crespo: 'M12 4l3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5 3 2.5-3 2.5',
}

const PERGUNTAS: { p: string; r: string }[] = [
  { p: 'O app é grátis?', r: 'Sim. O Meu Liso é gratuito para usar.' },
  { p: 'Quando chega na App Store e no Google Play?', r: 'Em breve. Enquanto isso, você já pode usar o Meu Liso pelo navegador do celular e adicionar à tela inicial, como um app.' },
  { p: 'Serve para cabelo cacheado e crespo?', r: 'Sim. O app é para todos os tipos de cabelo: liso, ondulado, cacheado e crespo. O cronograma, as dicas e o diagnóstico mudam conforme as suas respostas.' },
  { p: 'Preciso comprar algum produto específico?', r: 'Não. O app sugere tipos de produto para cada etapa (por exemplo, "máscara de hidratação"), sem marca. Você usa os que já tem ou os que preferir.' },
  { p: 'O diagnóstico substitui um profissional?', r: 'Não. É uma orientação de cuidados em casa. Queda forte, coceira ou feridas no couro cabeludo pedem um dermatologista.' },
  { p: 'Meus dados ficam seguros?', r: 'Sim. Usamos seus dados só para personalizar o app, nunca vendemos e você pode baixar ou apagar tudo pelo próprio app.' },
]

function Pergunta({ p, r, aberta, onTrocar, id }: { p: string; r: string; aberta: boolean; onTrocar: () => void; id: string }) {
  return (
    <div className={`vd-faq__item${aberta ? ' vd-faq__item--aberta' : ''}`}>
      <button className="vd-faq__pergunta" aria-expanded={aberta} aria-controls={id} onClick={onTrocar}>
        <span>{p}</span>
        <motion.span className="vd-faq__seta" animate={{ rotate: aberta ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={20} strokeWidth={2} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {aberta && (
          <motion.div id={id} className="vd-faq__resposta" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}>
            <p>{r}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const rolar = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export function Vendas() {
  const [aberta, setAberta] = useState<number | null>(0)
  const comecar = () => navegar('/')
  return (
    <MotionConfig reducedMotion="user">
      <div className="vendas">
        <header className="vd-topo">
          <div className="vd-container vd-topo__linha">
            <MarcaMeuLiso tamanho="sm" horizontal />
            <nav className="vd-topo__nav" aria-label="Seções">
              <button onClick={() => rolar('recursos')}>Recursos</button>
              <button onClick={() => rolar('telas')}>Telas</button>
              <button onClick={() => rolar('como-funciona')}>Como funciona</button>
              <button onClick={() => rolar('duvidas')}>Dúvidas</button>
            </nav>
            <Botao tamanho="sm" bloco={false} onClick={comecar}>Usar agora</Botao>
          </div>
        </header>

        {/* ---------- hero ---------- */}
        <section className="vd-hero">
          <div className="vd-container vd-hero__grade">
            <Revela className="vd-hero__texto">
              <span className="vd-rotulo">Tecnologia para o cuidado do cabelo</span>
              <h1 className="vd-titulo">Seu cabelo, <span className="vd-marcador">do seu jeito</span>.</h1>
              <p className="vd-hero__sub">Cronograma capilar, diário e evolução em um só app, para cabelo liso, ondulado, cacheado ou crespo.</p>
              <SelosLojas />
              <div className="vd-hero__acoes">
                <Botao bloco={false} icone={Sparkles} onClick={comecar}>Usar agora no navegador</Botao>
                <Botao bloco={false} variante="contorno" onClick={() => navegar('/diagnostico')}>Fazer o diagnóstico</Botao>
              </div>
              <ul className="vd-hero__selos">
                <li><Smartphone size={16} /> Grátis</li>
                <li><ShieldCheck size={16} /> Seus dados só com você</li>
                <li><Check size={16} /> Para todo tipo de cabelo</li>
              </ul>
            </Revela>
            <Revela className="vd-hero__visual" atraso={0.12}>
              <span className="vd-hero__brilho" aria-hidden />
              <Celular n="cronograma" alt="Tela do cronograma capilar" className="vd-celular--tras" />
              <Celular n="inicio" alt="Tela inicial do app Meu Liso" className="vd-celular--frente" />
            </Revela>
          </div>
        </section>

        {/* ---------- tipos de cabelo ---------- */}
        <section className="vd-faixa-tipos" aria-label="Tipos de cabelo">
          <div className="vd-container vd-tipos">
            {TIPOS.map((t) => (
              <div key={t.id} className="vd-tipo">
                <svg width="30" height="44" viewBox="0 0 24 48" aria-hidden fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d={FIO[t.id]} transform="translate(-4 0)" /><path d={FIO[t.id]} /><path d={FIO[t.id]} transform="translate(4 0)" />
                </svg>
                <div><strong>{t.rotulo}</strong><small>{t.detalhe}</small></div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- destaques com telas ---------- */}
        <section className="vd-secao" id="recursos">
          <div className="vd-container">
            <Revela className="vd-cabeca">
              <span className="vd-rotulo">O que o app faz</span>
              <h2 className="vd-titulo vd-titulo--secao">Tudo para cuidar <span className="vd-marcador">em casa</span></h2>
              <p className="vd-cabeca__texto">Um assistente de rotina capilar que entende o seu fio e te lembra do que fazer, no dia certo.</p>
            </Revela>
            <div className="vd-destaques">
              {DESTAQUES.map((d, i) => (
                <div key={d.n} className={`vd-destaque${i % 2 ? ' vd-destaque--inverso' : ''}`}>
                  <Revela className="vd-destaque__texto">
                    <span className="vd-rotulo">{d.rotulo}</span>
                    <h3 className="vd-destaque__titulo">{d.titulo}</h3>
                    <p>{d.texto}</p>
                    <ul className="vd-lista">{d.itens.map((it) => <li key={it}><Check size={16} /> {it}</li>)}</ul>
                  </Revela>
                  <Revela className="vd-destaque__visual" atraso={0.08}>
                    <span className="vd-destaque__fundo" aria-hidden />
                    <Celular n={d.n} alt={d.alt} />
                  </Revela>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- recursos em grade ---------- */}
        <section className="vd-secao vd-secao--nude">
          <div className="vd-container">
            <Revela className="vd-cabeca">
              <span className="vd-rotulo">Recursos</span>
              <h2 className="vd-titulo vd-titulo--secao">Tudo em um só lugar</h2>
            </Revela>
            <div className="vd-grade vd-grade--3">
              {RECURSOS.map((r, i) => (
                <Revela key={r.titulo} atraso={0.04 * i} className="vd-cartao vd-recurso">
                  <r.icone size={56} />
                  <div><h3>{r.titulo}</h3><p>{r.texto}</p></div>
                </Revela>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- galeria de telas ---------- */}
        <section className="vd-secao" id="telas">
          <div className="vd-container">
            <Revela className="vd-cabeca">
              <span className="vd-rotulo">Telas do app</span>
              <h2 className="vd-titulo vd-titulo--secao">Conheça o <span className="vd-marcador">Meu Liso</span></h2>
            </Revela>
          </div>
          <div className="vd-galeria" role="list">
            {GALERIA.map(([n, nome]) => (
              <figure key={n} className="vd-galeria__item" role="listitem">
                <Celular n={n} alt={`Tela ${nome} do app Meu Liso`} />
                <figcaption>{nome}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ---------- como funciona ---------- */}
        <section className="vd-secao vd-secao--nude" id="como-funciona">
          <div className="vd-container">
            <Revela className="vd-cabeca">
              <span className="vd-rotulo">Como funciona</span>
              <h2 className="vd-titulo vd-titulo--secao">Comece em <span className="vd-marcador">dois minutos</span></h2>
            </Revela>
            <ol className="vd-passos">
              {PASSOS.map((p, i) => (
                <Revela key={p.t} atraso={0.06 * i} className="vd-passo">
                  <span className="vd-passo__num">{i + 1}</span>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                </Revela>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- assinatura da marca ---------- */}
        <section className="vd-secao">
          <div className="vd-container vd-marca">
            <Revela className="vd-marca__foto"><Foto chave="amigas" /></Revela>
            <Revela className="vd-marca__texto" atraso={0.08}>
              <span className="vd-rotulo">by Império Progressivas</span>
              <h2 className="vd-titulo vd-titulo--secao">Experiência de quem <span className="vd-marcador">cuida de cabelo</span></h2>
              <p>O Meu Liso nasce da experiência da Império Progressivas com cabelos de verdade, agora em forma de tecnologia: um app simples, bonito e feito para a rotina em casa, para todos os tipos de fio.</p>
            </Revela>
          </div>
        </section>

        {/* ---------- dúvidas ---------- */}
        <section className="vd-secao vd-secao--nude" id="duvidas">
          <div className="vd-container vd-container--estreito">
            <Revela className="vd-cabeca">
              <span className="vd-rotulo">Dúvidas</span>
              <h2 className="vd-titulo vd-titulo--secao">Perguntas frequentes</h2>
            </Revela>
            <div className="vd-faq">
              {PERGUNTAS.map((q, i) => (
                <Pergunta key={q.p} id={`vd-faq-${i}`} p={q.p} r={q.r} aberta={aberta === i} onTrocar={() => setAberta(aberta === i ? null : i)} />
              ))}
            </div>
          </div>
        </section>

        {/* ---------- chamada final ---------- */}
        <section className="vd-final">
          <div className="vd-container">
            <Revela className="vd-final__caixa">
              <div className="vd-final__texto">
                <TituloDestaque linha="Comece hoje o" destaque="seu cronograma" esquerda />
                <p>Leva dois minutos: responda algumas perguntas sobre o seu cabelo e o plano das próximas 4 semanas fica pronto.</p>
                <SelosLojas claro />
                <Botao bloco={false} icone={Sparkles} onClick={comecar}>Usar agora no navegador</Botao>
              </div>
              <div className="vd-final__visual"><Celular n="plano" alt="Tela Seu plano do app Meu Liso" /></div>
            </Revela>
          </div>
        </section>

        <footer className="vd-rodape">
          <div className="vd-container">
            <div className="vd-rodape__linha">
              <MarcaMeuLiso tamanho="sm" horizontal />
              <nav className="vd-rodape__links" aria-label="Informações">
                <a href="#/privacidade">Política de Privacidade</a>
                <a href="#/termos">Termos de Uso</a>
                <a href="#/ajuda">Ajuda</a>
              </nav>
            </div>
            <p className="vd-rodape__fim">© {new Date().getFullYear()} Meu Liso, by Império Progressivas. Orientações gerais de cuidado em casa, sem substituir um profissional de saúde. Apple e App Store são marcas da Apple Inc. Google Play é marca da Google LLC.</p>
          </div>
        </footer>
      </div>
    </MotionConfig>
  )
}
