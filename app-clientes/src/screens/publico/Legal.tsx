import type { ReactNode } from 'react'
import { Alerta } from '../../ds/extras'
import { Cabecalho } from '../../ds/componentes'
import { voltar } from '../../lib/rotas'

/**
 * Política de Privacidade e Termos de Uso do Meu Liso.
 * RASCUNHO: precisa de revisão jurídica e dos dados marcados com [preencher] antes de publicar.
 */
const EMPRESA = 'Império Progressivas [razão social — preencher]'
const CNPJ = '[CNPJ — preencher]'
const CONTATO = '[e-mail do encarregado de dados — preencher]'
const ATUALIZADO = '1º de novembro de 2026'

function Documento({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <>
      <Cabecalho titulo={titulo} onVoltar={() => voltar('/')} />
      <article className="tela legal">
        <Alerta tom="aviso">Rascunho para revisão jurídica antes de publicar.</Alerta>
        <p className="fraco">Última atualização: {ATUALIZADO}</p>
        {children}
      </article>
    </>
  )
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="legal__secao">
      <h2>{titulo}</h2>
      {children}
    </section>
  )
}

export function Privacidade() {
  return (
    <Documento titulo="Política de Privacidade">
      <p>O Meu Liso é um aplicativo de cuidado com o cabelo, by Império Progressivas. Esta política explica quais dados usamos, por quê e como você controla tudo isso, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>
      <Secao titulo="1. Quem é o controlador">
        <p>{EMPRESA}, CNPJ {CNPJ}. Encarregado de dados (DPO): {CONTATO}.</p>
      </Secao>
      <Secao titulo="2. Dados que coletamos">
        <ul>
          <li><strong>Conta:</strong> nome, telefone (WhatsApp) ou e-mail do Google/Apple, data de aniversário (opcional).</li>
          <li><strong>Perfil do cabelo:</strong> respostas do questionário inicial (tipo, comprimento, química, incômodos, rotina de lavagem e calor).</li>
          <li><strong>Dados sensíveis de saúde capilar:</strong> alergias, reações e condições do couro cabeludo que você informar. Só tratamos esses dados com o seu consentimento expresso.</li>
          <li><strong>Uso do app:</strong> cronograma, diário do cabelo, fotos de evolução e diagnóstico que você registrar.</li>
          <li><strong>Técnicos:</strong> dados do aparelho necessários para o app funcionar e para enviar lembretes, se você permitir.</li>
        </ul>
      </Secao>
      <Secao titulo="3. Para que usamos">
        <ul>
          <li>Montar e ajustar seu cronograma capilar e suas recomendações.</li>
          <li>Mostrar sua evolução e enviar lembretes que você ativou.</li>
          <li>Manter sua conta segura e cumprir obrigações legais.</li>
          <li>Enviar novidades apenas se você aceitar (pode desligar a qualquer momento em Configurações).</li>
        </ul>
        <p>Não vendemos seus dados e não publicamos nada nas suas redes.</p>
      </Secao>
      <Secao titulo="4. Bases legais">
        <p>Execução do serviço que você contratou ao criar a conta; consentimento (dados de saúde, fotos, lembretes e marketing); legítimo interesse para segurança e melhoria do app; cumprimento de obrigação legal.</p>
      </Secao>
      <Secao titulo="5. Com quem compartilhamos">
        <p>Somente com fornecedores que operam o app em nosso nome, sob contrato e com segurança: hospedagem e banco de dados (Supabase), envio de mensagens (WhatsApp/provedor de SMS) e login (Google/Apple), quando você escolher esses meios. Fotos ficam em armazenamento privado e só você acessa.</p>
      </Secao>
      <Secao titulo="6. Por quanto tempo guardamos">
        <p>Enquanto sua conta estiver ativa. Ao excluir a conta, apagamos ou anonimizamos seus dados, exceto o que a lei exigir guardar por mais tempo.</p>
      </Secao>
      <Secao titulo="7. Seus direitos">
        <p>Você pode confirmar, acessar, corrigir, exportar, anonimizar ou excluir seus dados e revogar consentimentos. Em <strong>Perfil → Configurações</strong> você exporta seus dados e exclui a conta direto pelo app. Para outros pedidos: {CONTATO}.</p>
      </Secao>
      <Secao titulo="8. Armazenamento no aparelho">
        <p>Algumas preferências e registros (como o cronograma e o diário) ficam também na memória do seu celular para o app funcionar rápido e sem internet. Ao sair da conta ou limpar os dados do navegador, essas cópias são apagadas do aparelho.</p>
      </Secao>
      <Secao titulo="9. Segurança">
        <p>Usamos conexão criptografada, controle de acesso por usuário no banco de dados e armazenamento privado para fotos. Nenhum sistema é 100% invulnerável; se houver incidente relevante, avisaremos você e a ANPD.</p>
      </Secao>
      <Secao titulo="10. Crianças e adolescentes">
        <p>O Meu Liso é destinado a maiores de 18 anos ou a adolescentes com autorização de um responsável.</p>
      </Secao>
      <Secao titulo="11. Mudanças nesta política">
        <p>Avisaremos no app quando houver mudanças importantes.</p>
      </Secao>
    </Documento>
  )
}

export function Termos() {
  return (
    <Documento titulo="Termos de Uso">
      <p>Ao usar o Meu Liso, você concorda com estes termos. Leia com atenção.</p>
      <Secao titulo="1. O que é o Meu Liso">
        <p>Um aplicativo de cuidado com o cabelo para todos os tipos de fio: questionário de perfil, cronograma capilar, diário, evolução por fotos, diagnóstico e dicas. Oferecido por {EMPRESA}, CNPJ {CNPJ}.</p>
      </Secao>
      <Secao titulo="2. Orientações, não tratamento">
        <p>As recomendações do app são orientações gerais de cuidado e não substituem avaliação de profissional habilitado ou de dermatologista. Em caso de queda intensa, feridas, coceira forte ou reação a produtos, procure um médico. Faça teste de mecha e de alergia antes de usar produtos novos.</p>
      </Secao>
      <Secao titulo="3. Sua conta">
        <p>Você é responsável pelas informações que cadastra e por manter o acesso ao seu WhatsApp, Google ou Apple. Não crie conta em nome de outra pessoa.</p>
      </Secao>
      <Secao titulo="4. Conteúdo que você envia">
        <p>Fotos e registros continuam sendo seus. Você nos autoriza a armazená-los e processá-los só para prestar o serviço. Não envie fotos de terceiros sem autorização.</p>
      </Secao>
      <Secao titulo="5. Uso adequado">
        <p>Não use o app para fins ilegais, não tente acessar dados de outras pessoas nem interferir no funcionamento do serviço.</p>
      </Secao>
      <Secao titulo="6. Disponibilidade e mudanças">
        <p>Podemos atualizar, incluir ou retirar funções, sempre avisando no app quando a mudança for importante.</p>
      </Secao>
      <Secao titulo="7. Encerramento">
        <p>Você pode excluir sua conta a qualquer momento em Configurações. Podemos suspender contas que violem estes termos.</p>
      </Secao>
      <Secao titulo="8. Responsabilidade">
        <p>Não nos responsabilizamos por resultados de produtos ou procedimentos feitos fora do app, nem por uso diferente das orientações.</p>
      </Secao>
      <Secao titulo="9. Lei e foro">
        <p>Estes termos seguem a lei brasileira. Foro do domicílio do consumidor, conforme o Código de Defesa do Consumidor.</p>
      </Secao>
      <Secao titulo="10. Contato">
        <p>{CONTATO}</p>
      </Secao>
    </Documento>
  )
}
