import { useEffect, useLayoutEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Home } from 'lucide-react'
import { AbaAgenda, AbaClub, AbaCuidados, AbaInicio, AbaPerfil } from './ds/ilustras'
import { BarraAbas, Botao, MarcaMeuLiso, Script } from './ds/componentes'
import { Carregando, Foto, Toaster } from './ds/extras'
import { avisarCronograma } from './data/cronograma'
import { estaCarregando, useClienteLogada } from './data/store'
import { modoNuvem } from './data/nuvem'
import { entrar, verificarEventos } from './data/acoes'
import { navegar, useRota } from './lib/rotas'
import { Entrada } from './screens/cliente/Entrada'
import { Inicio } from './screens/cliente/Inicio'
import { Cuidados, EtapaCuidado } from './screens/cliente/Cuidados'
import { Diario } from './screens/cliente/Diario'
import { Evolucao } from './screens/cliente/Evolucao'
import { Diagnostico } from './screens/cliente/Diagnostico'
import { Dicas } from './screens/cliente/Dicas'
import { Notificacoes } from './screens/cliente/Notificacoes'
import { Perfil } from './screens/cliente/Perfil'
import { PerfilCabelo } from './screens/cliente/PerfilCabelo'
import { Configuracoes } from './screens/cliente/Configuracoes'
import { Ajuda } from './screens/cliente/Ajuda'
import { Vendas } from './screens/publico/Vendas'
import { Privacidade, Termos } from './screens/publico/Legal'

/* Ícones das abas: os nomes vêm da versão anterior (AbaAgenda é um calendário, AbaClub um brilho). */
const ABAS = [
  { id: 'inicio', rotulo: 'Início', icone: AbaInicio },
  { id: 'cuidados', rotulo: 'Cronograma', icone: AbaCuidados },
  { id: 'diario', rotulo: 'Diário', icone: AbaAgenda },
  { id: 'evolucao', rotulo: 'Evolução', icone: AbaClub },
  { id: 'perfil', rotulo: 'Perfil', icone: AbaPerfil },
]
const ABA_DA_ROTA: Record<string, string> = {
  diagnostico: 'inicio', dicas: 'inicio', notificacoes: 'perfil', configuracoes: 'perfil', 'perfil-cabelo': 'perfil',
}
/** Abrem com ou sem login (e não fazem a demonstração entrar sozinha). */
const PUBLICAS = ['conheca', 'ajuda', 'privacidade', 'termos']
/** Rotas da área logada; `true` = aceita uma subrota (ex.: /cuidados/H). */
const ROTAS_CLIENTE: Record<string, boolean> = {
  inicio: false, cuidados: true, diario: false, evolucao: false, diagnostico: false, dicas: false,
  notificacoes: false, perfil: false, 'perfil-cabelo': false, configuracoes: false,
}
const ETAPAS_VALIDAS = ['H', 'N', 'R']

/** Quem tocou em "Sair" na demonstração vê o onboarding até fechar a aba. */
const demoSaiu = () => { try { return sessionStorage.getItem('imperio-demo-saiu') === '1' } catch { return false } }

function NaoEncontrada() {
  return (
    <div className="tela nao-encontrada" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 'var(--e-14)' }}>
      <MarcaMeuLiso tamanho="sm" assinatura={false} />
      <h1>Página não encontrada</h1>
      <p className="suave">O endereço que você abriu não existe ou mudou de lugar.</p>
      <Botao bloco={false} icone={Home} onClick={() => navegar('/inicio')}>Ir para o Início</Botao>
    </div>
  )
}

export default function App() {
  const { partes } = useRota()
  const cliente = useClienteLogada()
  const raiz = partes[0] ?? ''
  const sub = partes[1]

  // Demonstração: entra direto como cliente de exemplo (só sem o Supabase; com ele o login é obrigatório).
  useLayoutEffect(() => {
    if (modoNuvem() || cliente || demoSaiu() || PUBLICAS.includes(raiz)) return
    entrar('demo')
    if (!raiz) navegar('/inicio')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente?.id])

  useEffect(() => {
    if (cliente) { verificarEventos(cliente.id); void avisarCronograma(cliente) }
    // roda ao entrar e ao trocar de tela principal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente?.id, raiz])

  useEffect(() => {
    document.body.classList.add('app-cliente')
  }, [])

  if (estaCarregando())
    return <div className="carregando-tela"><MarcaMeuLiso tamanho="md" /><Carregando /></div>

  const lateral = (
    <aside className="lateral-marca" aria-hidden>
      <Foto chave="retrato" />
      <MarcaMeuLiso tamanho="md" />
      <Script>Seu cabelo, do seu jeito</Script>
      <p>Cronograma capilar, diário e evolução para todo tipo de cabelo. Instale no celular para a melhor experiência.</p>
    </aside>
  )
  const publica = (conteudo: ReactNode) => <>{lateral}<div className="app">{conteudo}<Toaster /></div></>

  // Telas públicas (com ou sem login)
  if (raiz === 'conheca') return <><Vendas /><Toaster /></>
  if (raiz === 'ajuda') return publica(<Ajuda cliente={cliente} />)
  if (raiz === 'privacidade') return publica(<Privacidade />)
  if (raiz === 'termos') return publica(<Termos />)

  const conhecida = !raiz || (raiz in ROTAS_CLIENTE && (!sub || (ROTAS_CLIENTE[raiz] && ETAPAS_VALIDAS.includes(sub))))
  if (!cliente) {
    if (!conhecida) return publica(<NaoEncontrada />)
    if (raiz === 'diagnostico') return publica(<Diagnostico />)
    return <>{lateral}<Entrada /><Toaster /></>
  }

  let tela
  if (!conhecida) tela = <NaoEncontrada />
  else switch (raiz) {
    case 'cuidados': tela = sub ? <EtapaCuidado cliente={cliente} etapa={sub as 'H' | 'N' | 'R'} /> : <Cuidados cliente={cliente} />; break
    case 'diario': tela = <Diario cliente={cliente} />; break
    case 'evolucao': tela = <Evolucao cliente={cliente} />; break
    case 'diagnostico': tela = <Diagnostico cliente={cliente} />; break
    case 'dicas': tela = <Dicas cliente={cliente} />; break
    case 'notificacoes': tela = <Notificacoes cliente={cliente} />; break
    case 'perfil': tela = <Perfil cliente={cliente} />; break
    case 'perfil-cabelo': tela = <PerfilCabelo cliente={cliente} />; break
    case 'configuracoes': tela = <Configuracoes cliente={cliente} />; break
    default: tela = <Inicio cliente={cliente} />
  }
  const aba = ABA_DA_ROTA[raiz] ?? (ABAS.some((a) => a.id === raiz) ? raiz : 'inicio')

  return (
    <>
    {lateral}
    <div className="app">
      {!modoNuvem() && raiz === 'inicio' && <p className="faixa-demo">Demonstração: dados de exemplo guardados neste aparelho.</p>}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={raiz + (sub ?? '')}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {tela}
        </motion.main>
      </AnimatePresence>
      <BarraAbas itens={ABAS} ativa={aba} onTrocar={(id) => navegar(`/${id}`)} />
      <Toaster />
    </div>
    </>
  )
}
