import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronLeft, KeyRound, MessageCircle, Phone, User } from 'lucide-react'
import { Botao, Campo, CampoAniversario, MarcaMeuLiso, TituloDestaque } from '../../ds/componentes'
import { Alerta, Foto, toast } from '../../ds/extras'
import { IlCabelo, IlCronograma, IlDiagnostico, IlEstrela, IlHidratacao, IlNutricao, IlPrancha, IlReconstrucao, type Icone } from '../../ds/ilustras'
import { cadastrar, clientePorTelefone, enviarCodigo, entrar, verificarCodigo } from '../../data/acoes'
import { navegar } from '../../lib/rotas'
import { enviarCodigoNuvem, entrarComProvedor, loginSemCadastro, mensagemErro, modoNuvem, verificarCodigoNuvem } from '../../data/nuvem'
import { sincronizar } from '../../data/store'
import { montarPlanoInicial, type IlustraPlano } from '../../data/perfilCabelo'
import { hojeISO } from '../../lib/regras'
import type { RespostasOnboarding } from '../../types'
import { CorpoPergunta, OPCIONAL, ORDEM_ONBOARDING, Pergunta, limparRespostas, pularPergunta, vazio, type IdPergunta } from './PerguntasCabelo'
import './entrada.css'

/* ---------- etapas: boas-vindas, perguntas (uma por tela), plano e conta ---------- */
type Etapa = 'boas-vindas' | IdPergunta | 'plano' | 'conta' | 'telefone' | 'codigo' | 'cadastro'
const QUIZ: Etapa[] = [...ORDEM_ONBOARDING, 'plano']
/** Guarda as respostas enquanto a cliente vai ao Google/Apple e volta (a página recarrega). */
const CHAVE_RESPOSTAS = 'imperio:onboarding'
const ehPergunta = (e: Etapa): e is IdPergunta => (ORDEM_ONBOARDING as Etapa[]).includes(e)

const ILUSTRA: Record<IlustraPlano, Icone> = {
  reconstrucao: IlReconstrucao, hidratacao: IlHidratacao, nutricao: IlNutricao, cronograma: IlCronograma,
  prancha: IlPrancha, cabelo: IlCabelo, diario: IlEstrela, diagnostico: IlDiagnostico,
}

const mascara = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/* ---------- logos oficiais (botões seguem as regras de marca do Google e da Apple) ---------- */
const LogoGoogle = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
)
const LogoApple = () => (
  <svg width="18" height="20" viewBox="0 0 814 1000" aria-hidden fill="currentColor">
    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
  </svg>
)

const TRANSICAO = { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] as const }

/** Links legais abrem em outra aba, para não perder o que já foi respondido. */
const LinkLegal = ({ rota, children }: { rota: string; children: ReactNode }) => (
  <a href={`#${rota}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>{children}</a>
)

export function Entrada() {
  const [historico, setHistorico] = useState<Etapa[]>(['boas-vindas'])
  const [direcao, setDirecao] = useState(1)
  const etapa = historico[historico.length - 1]!

  // respostas do perfil de cabelo
  const [r, setR] = useState<RespostasOnboarding>(vazio)
  const mudar = (p: Partial<RespostasOnboarding>) => setR((x) => ({ ...x, ...p }))
  // login
  const [tel, setTel] = useState('')
  const [codigo, setCodigo] = useState('')
  const [pedirWhats, setPedirWhats] = useState(false)
  const [whats, setWhats] = useState('')
  // cadastro
  const [nome, setNome] = useState('')
  const [aniversario, setAniversario] = useState('')
  const [aceite, setAceite] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const digitos = tel.replace(/\D/g, '')
  const digitosWhats = whats.replace(/\D/g, '')

  /** Respostas já chegam ao cadastro: o nome vem preenchido. */
  const preencherCadastro = (resp: RespostasOnboarding) => {
    if (resp.apelido) setNome((n) => n || resp.apelido!.trim())
  }
  const irPara = (e: Etapa) => {
    if (e === 'cadastro') preencherCadastro(r)
    setDirecao(1); setHistorico((h) => [...h, e]); window.scrollTo({ top: 0 })
  }
  const voltar = () => { setDirecao(-1); setHistorico((h) => (h.length > 1 ? h.slice(0, -1) : h)); window.scrollTo({ top: 0 }) }
  /** Avança a partir de uma pergunta (dois toques rápidos não pulam a seguinte). */
  const avancarDe = (de: Etapa) => {
    let i = QUIZ.indexOf(de) + 1
    while (i < QUIZ.length && ehPergunta(QUIZ[i]) && pularPergunta(QUIZ[i] as IdPergunta, r)) i++
    const proxima = QUIZ[i] ?? 'plano'
    setDirecao(1)
    setHistorico((h) => (h[h.length - 1] === de ? [...h, proxima] : h))
    window.scrollTo({ top: 0 })
  }

  const limpas = limparRespostas(r)
  const respostas: RespostasOnboarding | undefined = limpas && { ...limpas, atualizadoEm: hojeISO() }

  /* Modo conectado: voltou do Google/Apple com sessão e sem cadastro → vai direto ao formulário. */
  useEffect(() => {
    if (!modoNuvem()) return
    const q = new URLSearchParams(location.search)
    if (q.has('error') || q.has('error_description')) {
      toast('Não foi possível entrar agora. Tente de novo ou use o WhatsApp.')
      q.delete('error'); q.delete('error_code'); q.delete('error_description')
      history.replaceState(history.state, '', location.pathname + (q.toString() ? `?${q}` : '') + location.hash)
    }
    let vivo = true
    loginSemCadastro().then((sessao) => {
      if (!vivo || !sessao) return
      try {
        const salvas = JSON.parse(sessionStorage.getItem(CHAVE_RESPOSTAS) ?? 'null') as RespostasOnboarding | null
        if (salvas) { const resp = { ...vazio(), ...salvas }; setR(resp); preencherCadastro(resp) }
      } catch { /* sem respostas guardadas */ }
      if (sessao.nome) setNome(sessao.nome)
      setPedirWhats(!sessao.temTelefone)
      setDirecao(1)
      setHistorico(['boas-vindas', 'conta', 'cadastro'])
    }).catch(() => { /* sem sessão: segue o fluxo normal */ })
    return () => { vivo = false }
  }, [])

  async function comProvedor(provedor: 'google' | 'apple') {
    const nomeProvedor = provedor === 'google' ? 'Google' : 'Apple'
    if (!modoNuvem()) {
      // Demonstração: não há login de verdade; segue para o cadastro pedindo o WhatsApp.
      toast(`Demonstração: no app publicado, aqui abre a sua conta ${nomeProvedor}`)
      setPedirWhats(true)
      irPara('cadastro')
      return
    }
    setEnviando(true)
    try {
      try { if (respostas) sessionStorage.setItem(CHAVE_RESPOSTAS, JSON.stringify(respostas)) } catch { /* segue sem guardar */ }
      await entrarComProvedor(provedor) // a página sai para o Google/Apple
    } catch (er) {
      toast(mensagemErro(er))
      setEnviando(false)
    }
  }

  let tela: ReactNode
  if (etapa === 'boas-vindas')
    tela = (
      <div className="ob-boas-vindas">
        <MarcaMeuLiso tamanho="md" />
        <div className="ob-moldura">
          <Foto chave="splash" prioridade />
        </div>
        <TituloDestaque linha="Seu cabelo," destaque="do seu jeito" />
        <p className="ob-texto">Cronograma capilar, diário e evolução para cabelo liso, ondulado, cacheado ou crespo.</p>
        <div className="pilha-sm">
          <Botao onClick={() => irPara(ORDEM_ONBOARDING[0])}>Começar</Botao>
          <Botao variante="texto" onClick={() => irPara('conta')}>Já tenho conta</Botao>
        </div>
        <div className="ob-links">
          <button onClick={() => navegar('/diagnostico')}>Diagnóstico capilar</button>
          <button onClick={() => navegar('/conheca')}>Conheça o Meu Liso</button>
          {!modoNuvem() && <button onClick={() => { entrar('demo'); navegar('/inicio') }}>Cliente demo</button>}
        </div>
      </div>
    )
  else if (ehPergunta(etapa))
    tela = <CorpoPergunta id={etapa} r={r} mudar={mudar} avancar={() => avancarDe(etapa)} />
  else if (etapa === 'plano') {
    const plano = montarPlanoInicial(r)
    tela = (
      <>
        <div className="ob-plano__topo">
          <TituloDestaque linha={r.apelido?.trim() ? `${r.apelido.trim()}, seu plano` : 'Seu plano'} destaque="está pronto" tom="lavanda" />
          <p className="ob-texto">Montamos com base nas suas respostas. Tudo isso já fica no seu app.</p>
        </div>
        <div className="ob-plano">
          {plano.cartoes.map((c, i) => {
            const I = ILUSTRA[c.ilustra]
            return (
              <motion.div key={c.id} className={`ob-cartao ob-cartao--${c.tom}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...TRANSICAO, delay: 0.08 * i + 0.1 }}>
                <I size={56} />
                <div>
                  <strong>{c.titulo}</strong>
                  <p>{c.texto}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
        {plano.aviso && <Alerta tom="aviso">{plano.aviso}</Alerta>}
        <div className="ob-rodape"><Botao onClick={() => irPara('conta')}>Criar minha conta</Botao></div>
      </>
    )
  }
  else if (etapa === 'conta')
    tela = (
      <>
        <Pergunta titulo={respostas ? 'Falta pouco!' : 'Que bom te ver'} texto={respostas ? 'Crie sua conta para guardar seu plano, seu diário e sua evolução.' : 'Entre na sua conta do Meu Liso ou crie uma nova.'} />
        <div className="ob-provedores">
          <button className="ob-provedor ob-provedor--google" onClick={() => comProvedor('google')} disabled={enviando}>
            <LogoGoogle /> Continuar com Google
          </button>
          <button className="ob-provedor ob-provedor--apple" onClick={() => comProvedor('apple')} disabled={enviando}>
            <LogoApple /> Continuar com Apple
          </button>
          <Botao icone={MessageCircle} onClick={() => { setPedirWhats(false); irPara('telefone') }} disabled={enviando}>Continuar com WhatsApp</Botao>
        </div>
        <p className="ob-letras">Ao continuar, você concorda com os <LinkLegal rota="/termos">Termos de Uso</LinkLegal> e a <LinkLegal rota="/privacidade">Política de Privacidade</LinkLegal> do Meu Liso. Não postamos nada nas suas redes.</p>
      </>
    )
  else if (etapa === 'telefone')
    tela = (
      <form
        className="pilha"
        onSubmit={async (e) => {
          e.preventDefault()
          setEnviando(true)
          try {
            if (modoNuvem()) {
              await enviarCodigoNuvem(digitos)
              toast('Enviamos o código para o seu WhatsApp.')
            } else {
              // Modo demonstração: o código aparece na tela.
              toast(`Demonstração: seu código é ${enviarCodigo(digitos)}`)
            }
            irPara('codigo')
          } catch (er) {
            toast(mensagemErro(er))
          } finally {
            setEnviando(false)
          }
        }}
      >
        <Pergunta titulo="Entre com seu WhatsApp" texto="Vamos enviar um código de 6 dígitos para confirmar que é você." />
        <Campo icone={Phone} placeholder="(11) 99999-9999" value={tel} onChange={(e) => setTel(mascara(e.target.value))} inputMode="tel" autoComplete="tel" aria-label="WhatsApp" autoFocus />
        <Botao type="submit" disabled={digitos.length < 10 || enviando}>{enviando ? 'Enviando…' : 'Receber código'}</Botao>
      </form>
    )
  else if (etapa === 'codigo')
    tela = (
      <form
        className="pilha"
        onSubmit={async (e) => {
          e.preventDefault()
          if (modoNuvem()) {
            try {
              const temCadastro = await verificarCodigoNuvem(digitos, codigo)
              if (temCadastro) { await sincronizar(); navegar('/inicio') } else { setPedirWhats(false); irPara('cadastro') }
            } catch (er) {
              toast(mensagemErro(er))
            }
            return
          }
          if (!verificarCodigo(digitos, codigo)) return toast('Código incorreto. Confira e tente de novo.')
          const existente = clientePorTelefone(digitos)
          if (existente) {
            entrar(existente.id)
            navegar('/inicio')
          } else { setPedirWhats(false); irPara('cadastro') }
        }}
      >
        <Pergunta titulo="Digite o código" texto={`Enviado para ${tel}`} />
        <Campo icone={KeyRound} placeholder="000000" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" aria-label="Código" autoFocus style={{ letterSpacing: '.4em', fontWeight: 700 }} />
        <Botao type="submit" disabled={codigo.length !== 6}>Confirmar</Botao>
        <Botao type="button" variante="texto" onClick={async () => { if (modoNuvem()) { await enviarCodigoNuvem(digitos).catch((er) => toast(mensagemErro(er))); toast('Código reenviado.') } else toast(`Demonstração: seu código é ${enviarCodigo(digitos)}`) }}>Reenviar código</Botao>
      </form>
    )
  else
    tela = (
      <form
        className="pilha"
        onSubmit={async (e) => {
          e.preventDefault()
          if (pedirWhats && !modoNuvem() && clientePorTelefone(digitosWhats)) return toast('Este WhatsApp já tem cadastro. Entre com "Continuar com WhatsApp".')
          setEnviando(true)
          const id = await cadastrar({
            marketing, nome: nome.trim(), telefone: pedirWhats ? digitosWhats : digitos, aniversario: aniversario || undefined,
            onboarding: respostas,
          })
          setEnviando(false)
          if (!id) return // o erro já apareceu num aviso
          try { sessionStorage.removeItem(CHAVE_RESPOSTAS) } catch { /* nada */ }
          navegar('/inicio')
        }}
      >
        <Pergunta titulo="Faça seu cadastro" texto="Só o essencial para guardar o seu plano." />
        <Campo icone={User} placeholder="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" aria-label="Nome completo" />
        {pedirWhats && (
          <>
            <Campo rotulo="Seu WhatsApp (para entrar na conta)" icone={Phone} placeholder="(11) 99999-9999" value={whats} onChange={(e) => setWhats(mascara(e.target.value))} inputMode="tel" autoComplete="tel" aria-label="Seu WhatsApp" required />
            {whats && digitosWhats.length < 10 && <Alerta tom="aviso">Digite o DDD e o número, por exemplo (11) 99999-9999.</Alerta>}
          </>
        )}
        <CampoAniversario rotulo="Aniversário (opcional)" valor={aniversario || undefined} onTrocar={(v) => setAniversario(v ?? '')} />
        <label className="aceite">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span>Li e aceito os <LinkLegal rota="/termos">Termos de Uso</LinkLegal> e a <LinkLegal rota="/privacidade">Política de Privacidade</LinkLegal>. Minhas respostas sobre o cabelo são usadas só para personalizar o app.</span>
        </label>
        <label className="aceite">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
          <span>Quero receber dicas e novidades do Meu Liso pelo WhatsApp (opcional).</span>
        </label>
        <Botao type="submit" disabled={nome.trim().length < 2 || !aceite || (pedirWhats && digitosWhats.length < 10) || enviando}>
          {enviando ? 'Criando…' : 'Criar minha conta'}
        </Botao>
      </form>
    )

  const passo = QUIZ.indexOf(etapa)
  const podePular = ehPergunta(etapa) && OPCIONAL[etapa]
  return (
    <div className="ob">
      {etapa !== 'boas-vindas' && (
        <header className="ob-topo">
          <button className="ob-voltar" onClick={voltar} aria-label="Voltar"><ChevronLeft size={22} /></button>
          {passo >= 0 ? (
            <div className="ob-barra" role="progressbar" aria-label={`Passo ${passo + 1} de ${QUIZ.length}`} aria-valuemin={0} aria-valuemax={QUIZ.length} aria-valuenow={passo + 1}>
              <motion.span initial={false} animate={{ width: `${((passo + 1) / QUIZ.length) * 100}%` }} transition={TRANSICAO} />
            </div>
          ) : <span />}
          {podePular ? <button className="ob-pular" onClick={() => avancarDe(etapa)}>Pular</button> : <span className="ob-topo__espaco" />}
        </header>
      )}
      <AnimatePresence mode="wait" initial={false} custom={direcao}>
        <motion.section
          key={etapa}
          className={`ob-tela ob-tela--${etapa}`}
          custom={direcao}
          variants={{
            entra: (d: number) => ({ opacity: 0, x: 28 * d }),
            fica: { opacity: 1, x: 0 },
            sai: (d: number) => ({ opacity: 0, x: -28 * d }),
          }}
          initial="entra"
          animate="fica"
          exit="sai"
          transition={TRANSICAO}
        >
          {tela}
        </motion.section>
      </AnimatePresence>
    </div>
  )
}
