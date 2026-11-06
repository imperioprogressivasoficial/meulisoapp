# Meu Liso

**Meu Liso, by Império Progressivas**: web app instalável (PWA) de cuidados com o cabelo para **todos os tipos de fio**
(liso, ondulado, cacheado e crespo). É um app B2C: não tem agenda, pagamentos, pontos, loja nem unidades.
A única referência à Império Progressivas é a assinatura "by Império Progressivas" (componente `MarcaMeuLiso`) e os textos legais.

## Como testar
```bash
npm install
npm run dev
```
- **Demonstração:** sem Supabase configurado, o app entra sozinho como a cliente de exemplo **Linda** (ondulado, com coloração, fio ressecado,
  diário com 9 dias de registros). "Sair" leva ao onboarding até fechar a aba.
- **Cadastro novo:** "Começar" → perguntas do perfil de cabelo (uma por tela) → "Seu plano" → "Criar minha conta" →
  "Continuar com WhatsApp" → o código aparece na tela. Google/Apple na demonstração vão direto ao cadastro (pedindo o WhatsApp).
- **Reiniciar:** Perfil → "Reiniciar dados da demonstração".
- **Teste de ponta a ponta:** `npm run build`, `npx vite preview --port 4176` e o script Playwright em `/tmp/e2e/e2e.cjs` (fora do repositório).
  Ele cobre só a demonstração.
- **Modo conectado sem Supabase:** `node scripts/teste-nuvem/rodar.mjs` empacota os módulos reais com um Supabase falso em memória e
  simula dois celulares da mesma cliente (gravação na nuvem, celular novo, sem internet, conflitos, cadastro v3 e fallback).
  `node scripts/testar-mesclar.ts` testa só as regras de mesclagem (`src/data/mesclar.ts`).
- **Banco:** `supabase/tests/rodar.sh` (Postgres 16 local) aplica as migrations e roda `supabase/tests/regras.test.sql`
  até imprimir "TODOS OS TESTES PASSARAM".

## Navegação
| Aba | Rota | O que tem |
|---|---|---|
| Início | `/inicio` | Etapa do cronograma de hoje, check-in do diário, dica pelo incômodo principal, lembrete neutro de cuidado pós-química |
| Cronograma | `/cuidados`, `/cuidados/H·N·R` | Plano de 4 semanas (hidratação, nutrição, reconstrução), marcar como feito, passo a passo e **tipos** de produto (sem marca, sem loja) |
| Diário | `/diario` | Frizz, brilho e maciez de 1 a 5 por dia, gráfico de 14 dias e uma dica a partir dos registros |
| Evolução | `/evolucao` | Fotos do cabelo ao longo do tempo, com comparador da primeira com a mais recente |
| Perfil | `/perfil` | Nome, aniversário, atalhos, sair |

Outras telas: `/diagnostico` (também sem login), `/perfil-cabelo`, `/dicas`, `/notificacoes`, `/configuracoes` (avisos, LGPD: baixar e excluir dados),
e as públicas `/ajuda`, `/privacidade`, `/termos` e `/conheca` (página do app com o botão "Começar"). Qualquer outra rota mostra "Página não encontrada".

### Perfil de cabelo (onboarding)
Nome · objetivos (hidratar, definir cachos, reduzir frizz, crescimento, recuperar danos, manter o liso, entender o cabelo) · tipo de cabelo ·
química no cabelo (nenhuma, progressiva/alisamento, coloração, luzes/mechas, descoloração, relaxamento) · quando foi a última química
(só para quem tem) · comprimento · estado do fio · incômodos (em ordem) · lavagens por semana · calor · lembretes.
As respostas montam o "Seu plano", o cronograma de um toque e a dica do Início. Para manter compatibilidade com o banco,
o campo `ultimaProgressiva` do jsonb guarda hoje "quando foi a última química".

### Onde ficam os dados
| Dado | Demonstração | Conectado (Supabase) |
|---|---|---|
| Perfil e respostas do cabelo | `localStorage` (`imperio:banco`) | `perfis` (+ coluna `onboarding`) |
| Fotos da Evolução | `localStorage` | Storage privado `fotos-clientes` + tabela `fotos` (tipo `evolucao`; fotos antigas `antes`/`depois` também aparecem) |
| Diagnósticos | `localStorage` | Tabela `diagnosticos` (+ foto tipo `diagnostico`). Até a nuvem confirmar, fica em `imperio-diagnosticos-pendentes-*` |
| Cronograma | `localStorage` (`imperio-cronograma-*`) | Tabela `cronogramas` (um por cliente), com cópia no aparelho |
| Diário | `localStorage` (`imperio-diario-*`) | Tabela `diario_cabelo` (um registro por dia), com cópia no aparelho |
| Avisos | `localStorage` | `notificacoes` (avisos com rota de telas do salão são escondidos) |

**Sincronização (modo conectado).** Cronograma e diário continuam guardados no aparelho para a tela responder na hora;
cada alteração também é gravada na nuvem logo em seguida (`src/data/cronograma.ts`, `src/data/diario.ts`).
Ao entrar e a cada sincronização (`sincronizar` em `src/data/store.ts` → `src/data/sincronia.ts`) o app carrega da nuvem e mescla
(regras puras em `src/data/mesclar.ts`):
- **cronograma:** a nuvem vence. O aparelho só vence quando tem uma alteração que ainda não subiu e é mais nova que o `atualizado_em` da nuvem;
- **diário:** dia a dia, vale o registro gravado por último; dias que só existem no aparelho sobem;
- **diagnósticos:** os que ainda não subiram aparecem junto com os da nuvem e são reenviados (o id é o mesmo, então não duplica);
- dados de antes desta versão (que estavam só no aparelho) sobem na primeira sincronização.

Se a nuvem falhar, aparece um aviso ("...ficou guardado neste aparelho e vai ser enviado de novo") e a cópia do aparelho continua valendo.
Trocou de celular: ao entrar, o cronograma, o diário, os diagnósticos e as fotos da Evolução voltam.

## Backend (pasta `supabase/`)
As migrations da época do app de salão **não foram alteradas** (regra: nada destrutivo; só migrations novas, que só acrescentam).
A migration `20261104000000_b2c_nuvem.sql` acrescenta o que o app B2C precisa:
- tabelas `cronogramas` e `diario_cabelo` (notas de 1 a 5, um registro por cliente e dia), com RLS: cada cliente lê e grava só as
  próprias linhas, com conta ativa; visitante (`anon`) não tem acesso; `atualizado_em` é sempre preenchido pelo servidor;
- o tipo de foto `evolucao`;
- `exportar_meus_dados` passa a incluir cronograma, diário e fotos; `excluir_minha_conta` passa a apagar cronograma e diário;
- `completar_cadastro_v3`: cadastro sem unidade do salão e sem pontos do programa de fidelidade (cria só o aviso de boas-vindas do app).
  `completar_cadastro_v2` e `completar_cadastro` continuam iguais, para versões antigas do app.

O app B2C usa só:
- Auth (código por WhatsApp via `functions/enviar-codigo-whatsapp`, Google e Apple);
- RPCs `completar_cadastro_v3`, `atualizar_meu_perfil`, `atualizar_meu_onboarding`, `exportar_meus_dados`, `excluir_minha_conta`;
- tabelas `perfis`, `fotos` (gravar e apagar as próprias), `diagnosticos` (ler e gravar), `cronogramas` e `diario_cabelo` (ler e gravar),
  `notificacoes` (leitura e marcar como lida) e o bucket `fotos-clientes`.

Compatibilidade com um servidor que ainda não recebeu a migration `20261104000000`: o cadastro cai na `completar_cadastro_v2`
(e depois na `completar_cadastro`), que exigem uma unidade; o app usa a primeira unidade ativa do catálogo `unidades`, sem perguntar
nada à cliente (só nesse caso). A foto da Evolução cai no tipo `depois`. Cronograma e diário ficam só no aparelho (com o aviso de falha).

Ponto de atenção do legado: o job `gerar_lembretes` (se agendado) cria avisos de manutenção/agenda; o app esconde os que apontam
para rotas que não existem mais.

**Agora sem uso pelo front-end** (podem sair numa migration de limpeza B2C, que é o próximo passo):
- Tabelas: `unidades` (só no fallback do cadastro para servidor sem a migration `20261104000000`), `servicos`, `niveis`, `recompensas`, `planos`, `produtos`, `profissionais`, `passaportes`,
  `agendamentos`, `fila_encaixe`, `atendimentos`, `movimentos_pontos`, `vouchers`, `posts_instagram`, `medicoes_raiz`, `assinaturas`,
  `usos_assinatura`, `pedidos`, `pedido_itens`, `carrinho`, `recompra_auto`, `pagamentos`, `webhooks_recebidos`, `garantias`, `embaixadoras`,
  `comissoes`, `lembretes_live`; colunas `perfis.bairro`, `unidade_preferida`, `unidade_trabalho`, `codigo_indicacao`, `indicada_por`, `indicacao_creditada`.
- Funções: `agendar`, `horarios_disponiveis`, `cancelar_agendamento`, `confirmar_presenca`, `registrar_chegada`, `entrar_fila`, `avaliar`,
  `resgatar`, `registrar_post`, `creditar_aniversario`, `creditar`, `creditar_indicacao`, `saldo_pontos`, `pontos_ganhos`, `nivel_de`,
  `multiplicador_de`, `meu_resumo`, `meu_preco`, `preco_para`, `eh_happy_hour`, `plano_ativo`, `iniciar_assinatura`, `cancelar_assinatura`,
  `criar_pedido`, `criar_pagamento`, `confirmar_pagamento`, `solicitar_garantia`, `candidatar_embaixadora`, `resgatar_saldo_embaixadora`,
  `registrar_medicao`, `minhas_manutencoes`, `manutencoes_de`, `acesso_exclusivo`, `liberar_vaga`, `gerar_lembretes`, todas as `equipe_*`
  e `gestao_*`; `completar_cadastro` e `completar_cadastro_v2` (só como fallback, enquanto houver servidor sem a v3).
- Tipos de foto `antes`, `depois` (ainda lidos como Evolução nas fotos antigas), `raiz` e `garantia`.
- Edge Function `webhook-pagamento`.

Já feito pela migration `20261104000000`: cadastro sem unidade e sem pontos (v3), tipo de foto `evolucao` e diagnóstico,
cronograma e diário no servidor. Falta só a limpeza: remover o que ficou sem uso (com cuidado com os dados que já existem).

### Como colocar no ar
1. Criar o projeto no Supabase (região São Paulo).
2. `supabase link --project-ref <ref>` e `supabase db push` (aplica todas as migrations, inclusive a `20261104000000_b2c_nuvem.sql`).
   O `seed.sql` é do catálogo do salão: com a v3 o cadastro não precisa mais dele.
3. Authentication → Phone: ativar. Hooks → Send SMS hook → URL da função `enviar-codigo-whatsapp`.
4. `supabase functions deploy enviar-codigo-whatsapp` e cadastrar os segredos `SEND_SMS_HOOK_SECRET`, `N8N_WHATSAPP_WEBHOOK_URL`, `N8N_WEBHOOK_TOKEN`.
5. Criar o fluxo no n8n que recebe `{ telefone, codigo }` e envia pela API do WhatsApp.
6. Copiar `.env.example` para `.env.local` com a URL e a chave **anon**. Nunca usar a service_role no app.

## Login com Google e Apple
No modo conectado, a tela de conta oferece "Continuar com Google", "Continuar com Apple" e "Continuar com WhatsApp".
Quem entra com Google ou Apple e ainda não tem cadastro cai no formulário, que pede também o WhatsApp
(obrigatório: é com ele que a conta é identificada). O número é validado no servidor pela função `completar_cadastro_v3`
(migration `20261104000000_b2c_nuvem.sql`; a mesma regra existe na `completar_cadastro_v2`, de `20261031120000_cadastro_oauth.sql`).
Rode `supabase db push` antes de ligar os provedores; sem essas migrations o app usa a função antiga e só o login por WhatsApp
completa o cadastro.

**Supabase (os dois provedores)**
1. Authentication → URL Configuration: em *Site URL* coloque o endereço do app publicado (ex.: `https://app.imperioprogressivas.com.br`)
   e em *Redirect URLs* adicione esse endereço e o de testes (ex.: `http://localhost:5173`). O app volta para `origem + caminho` da página.
2. O app usa o fluxo PKCE: a volta traz só um `?code=` na URL, que o Supabase troca pela sessão sozinho.

**Google**
1. [Google Cloud Console](https://console.cloud.google.com) → APIs e serviços → *Tela de permissão OAuth*: nome do app, e-mail de suporte,
   domínio, link da Política de Privacidade; escopos `openid`, `email` e `profile`. Publique o app (sai do modo "Teste").
2. Credenciais → Criar credenciais → *ID do cliente OAuth* → tipo **Aplicativo da Web**.
   - Origens JavaScript autorizadas: o endereço do app.
   - URIs de redirecionamento autorizados: `https://<projeto>.supabase.co/auth/v1/callback`.
3. Copie o *Client ID* e o *Client Secret* para Supabase Dashboard → Authentication → Providers → **Google** → ativar → salvar.

**Apple** (exige conta paga no Apple Developer Program, US$ 99/ano)
1. [developer.apple.com](https://developer.apple.com/account) → Certificates, Identifiers & Profiles → Identifiers → um **App ID** com a capacidade *Sign in with Apple*.
2. Identifiers → **Services IDs** → novo (ex.: `br.com.imperioprogressivas.web`) → marcar *Sign in with Apple* → Configure:
   App ID principal = o do passo 1; Domains = `<projeto>.supabase.co`; Return URLs = `https://<projeto>.supabase.co/auth/v1/callback`.
3. Keys → nova chave com *Sign in with Apple* → baixe o arquivo `.p8` (só dá para baixar uma vez) e anote o *Key ID* e o *Team ID*.
4. Supabase Dashboard → Authentication → Providers → **Apple** → ativar; em *Client IDs* coloque o Services ID; em *Secret Key* cole o
   segredo gerado a partir do `.p8`, Key ID e Team ID (a documentação do Supabase tem o gerador). A Apple faz esse segredo vencer a cada
   6 meses: anote na agenda para gerar um novo.
5. A Apple pode esconder o e-mail real ("Ocultar meu e-mail"). Não tem problema: o app identifica a cliente pelo WhatsApp do cadastro.

> O WhatsApp digitado por quem entra com Google/Apple não passa por código de confirmação. O servidor confere o formato e
> recusa número que já tem cadastro; se aparecer um número errado, a gestão corrige na tabela `perfis` pelo SQL Editor.

## Fotografia
12 fotos editoriais geradas com Higgsfield (Soul 2.0), com modelos fictícias de diferentes tons de pele e tipos de cabelo. Cada foto tem uma função (boas-vindas, diagnóstico, cronograma, dicas, painel lateral). As cópias otimizadas (WebP, 640 e 1200 px) ficam em `public/img/`. O workflow `.github/workflows/baixar-fotos.yml` baixa as fotos de novo sempre que `src/data/fotos.ts` muda.

## O que ainda depende de ação externa
| Peça | O que falta |
|---|---|
| Projeto Supabase | Criar e configurar (passos acima), aplicar as migrations e, depois, a migration de limpeza B2C |
| Login com Google e Apple | Cliente OAuth no Google Cloud e Services ID + chave na Apple (passos acima) |
| WhatsApp | Número oficial + API (Meta Cloud API ou provedor) + fluxo n8n para o código de login |
| E-mail de suporte | Preencher `EMAIL_SUPORTE` em `src/data/config.ts` (a Ajuda só mostra o contato depois disso) |
| Textos legais | Revisão jurídica e campos `[preencher]` em `src/screens/publico/Legal.tsx` |
| Push com app fechado | Gerar chaves VAPID e a função de envio |

## Onde ajustar
- **Perguntas, plano inicial e dicas do Início:** `src/data/perfilCabelo.ts`.
- **Cronograma (etapas, passos e tipos de produto):** `src/data/cronograma.ts`. **Diário:** `src/data/diario.ts`. **Dicas:** `src/data/dicas.ts`. **Ajuda:** `src/data/ajuda.ts`.
- **Demonstração:** `src/data/seed.ts` (mude `VERSAO_BANCO` quando o formato mudar).
- **Visual:** design system em `src/ds/` e [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).
