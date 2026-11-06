# Império Progressivas: auditoria e plano de execução

## Etapa A: auditoria (31/10/2026)

### Stack
- React 19 + Vite 8 + TypeScript 7, PWA com manifest e service worker próprios.
- Navegação por hash (`src/lib/rotas.ts`), 30 rotas entre cliente, equipe, BI e design system.
- Estado global em `src/data/store.ts` (`localStorage`), regras em `src/lib/regras.ts`, ações em `src/data/acoes.ts`.
- Design system em `src/ds/` (tokens, 20 componentes, página `#/design-system`).
- **Não há backend.** Não existe banco, autenticação, storage nem integração real.

### Situação das funcionalidades
| Módulo | Situação |
|---|---|
| Telas da cliente (29 telas) | Completas na interface, mas com dados locais e fictícios |
| Área da equipe e BI | Completas na interface; o login é por PIN fixo e os dados são fictícios |
| Login | Código mostrado na tela, sem envio real |
| Pontos, níveis e resgate | Calculados **no navegador**, ou seja, a cliente pode alterar |
| Agendamento | Verifica conflitos, mas só no aparelho (dois celulares podem reservar o mesmo horário) |
| Pagamentos, push, IA | Simulados |
| Configurações e privacidade (LGPD) | Não existem |
| Recuperação de acesso | Não existe (o login por código cobre, mas falta troca de telefone) |
| Fotografia | Não existe: telas sem imagens reais |

### Problemas técnicos
1. **Segurança:** regras de pontos e resgate rodam no cliente; dados sensíveis (alergias, reações, fotos do cabelo) ficam sem proteção no `localStorage`; PINs fixos no código.
2. **Integridade:** sem banco central, cada aparelho tem sua própria versão dos dados.
3. **LGPD:** sem consentimento, sem exportação e sem exclusão de conta.

### Problemas visuais (revisão com a skill frontend-design)
1. Vícios de interface gerada: rótulos em caixa-alta espaçada, textos unidos por "·", setas "→" em links e emojis em títulos.
2. Dourado com tendência amarela nos gradientes; o brief pede champagne discreto e menos gradiente.
3. Nenhuma fotografia: a referência visual depende de retratos editoriais.
4. Cartões repetidos com o mesmo peso em várias telas (Início, Meu Cabelo).

## Etapa B: plano por módulos

| # | Módulo | Depende de | Risco |
|---|---|---|---|
| 1 | **Backend Supabase**: tabelas, RLS, papéis (cliente, recepção, profissional, gestão), funções no servidor para pontos, resgate, agendamento, manutenção, bônus e auditoria | nada (testado em Postgres local) | Precisa de um projeto Supabase para publicar |
| 2 | **Fotografia** com Higgsfield: retratos fictícios com função definida em cada tela | créditos Higgsfield (há saldo) | Qualidade das gerações |
| 3 | **Design system v2**: tokens do brief, remoção dos vícios, fotos, Configurações e privacidade | 2 | Baixo |
| 4 | **Front-end ligado ao Supabase**: login por código (Supabase Auth), dados e ações via funções do servidor; modo demonstração rotulado quando não houver projeto configurado | 1 | Testes reais exigem o projeto |
| 5 | **Integrações**: WhatsApp (código e lembretes via n8n), pagamentos, push, IA | credenciais e escolha de fornecedores | Alto: dependem de contas externas |
| 6 | **Testes e revisão visual** | todos | – |

Funcionalidades existentes que estão corretas (fluxos, telas e regras) serão preservadas. As regras saem do navegador e passam para o servidor.

## O que depende de ação externa
- **Supabase:** criar o projeto (ou instalar o plugin Supabase nesta conversa) e informar a URL e a chave pública (anon). A chave secreta (service role) nunca vai para o front-end.
- **WhatsApp:** número oficial e API (Meta Cloud API, ou provedor via n8n) para o envio do código e dos lembretes.
- **Pagamentos:** escolher o gateway (Mercado Pago, Pagar.me ou Asaas) e criar a conta.
- **Push:** chaves VAPID geradas no servidor.
- **IA:** chave de API do modelo de visão, guardada como segredo da Edge Function.
- **Negócio:** confirmar preços, planos, produtos, prazos de garantia e comissão.
