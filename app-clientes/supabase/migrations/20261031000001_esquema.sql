-- =========================================================
-- Império Progressivas: esquema principal
-- Não destrutivo: só cria objetos novos.
-- =========================================================
create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------- tipos ----------
create type papel as enum ('cliente', 'recepcao', 'profissional', 'gestao');
create type status_agendamento as enum ('agendado', 'confirmado', 'chegou', 'em_andamento', 'concluido', 'cancelado');
create type tipo_movimento as enum ('boas_vindas', 'atendimento', 'aniversario', 'indicacao', 'post', 'cashback', 'resgate', 'ajuste');
create type origem_voucher as enum ('pontos', 'garantia', 'embaixadora');
create type status_pagamento as enum ('pendente', 'aprovado', 'recusado', 'estornado');
create type metodo_pagamento as enum ('pix', 'cartao', 'imperio_pay');
create type status_pedido as enum ('aguardando_pagamento', 'pago', 'preparando', 'pronto', 'entregue', 'cancelado');
create type status_assinatura as enum ('pendente', 'ativa', 'cancelada', 'inadimplente');
create type status_garantia as enum ('analise', 'aprovada', 'recusada');
create type status_embaixadora as enum ('pendente', 'ativa', 'recusada');
create type tipo_foto as enum ('antes', 'depois', 'raiz', 'diagnostico', 'garantia');

-- ---------- configuração (editável pela gestão) ----------
create table config (
  chave text primary key,
  valor jsonb not null,
  descricao text,
  atualizado_em timestamptz not null default now()
);

create table unidades (
  id text primary key,
  nome text not null,
  cidade text not null,
  whatsapp text,
  lat double precision,
  lng double precision,
  abre time not null default '10:00',
  fecha time not null default '22:00',
  ativa boolean not null default true,
  em_breve boolean not null default false
);

create table servicos (
  id text primary key,
  nome text not null,
  preco numeric(10,2) not null check (preco >= 0),
  duracao_min int not null check (duracao_min between 15 and 480),
  manutencao_dias int not null default 0 check (manutencao_dias >= 0),
  garantia_dias int not null default 0 check (garantia_dias >= 0),
  ativo boolean not null default true
);

create table niveis (
  nome text primary key,
  ordem int not null unique,
  minimo int not null check (minimo >= 0),
  multiplicador numeric(4,2) not null check (multiplicador >= 1),
  beneficios text[] not null default '{}'
);

create table recompensas (
  id text primary key,
  nome text not null,
  descricao text not null default '',
  custo int not null check (custo > 0),
  ativa boolean not null default true
);

create table planos (
  id text primary key,
  nome text not null,
  preco numeric(10,2) not null check (preco > 0),
  hidratacoes_mes int not null default 0,
  botox_mes int not null default 0,
  retoque_incluso boolean not null default false,
  desconto_progressiva numeric(4,3) not null default 0 check (desconto_progressiva between 0 and 1),
  desconto_produtos numeric(4,3) not null default 0 check (desconto_produtos between 0 and 1),
  pontos_em_dobro boolean not null default false,
  acesso_exclusivo boolean not null default false,
  beneficios text[] not null default '{}',
  ativo boolean not null default true
);

create table produtos (
  id text primary key,
  nome text not null,
  descricao text not null default '',
  preco numeric(10,2) not null check (preco > 0),
  categoria text not null check (categoria in ('produto', 'kit')),
  duracao_dias int not null default 60,
  recomendado_para text[] not null default '{}',
  imagem text,
  ativo boolean not null default true
);

-- ---------- pessoas ----------
create table perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  papel papel not null default 'cliente',
  nome text not null check (length(trim(nome)) >= 2),
  telefone text not null unique check (telefone ~ '^[0-9]{10,13}$'),
  aniversario date,
  bairro text,
  cidade text,
  unidade_preferida text references unidades (id),
  unidade_trabalho text references unidades (id),
  codigo_indicacao text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 7)),
  indicada_por uuid references perfis (id),
  indicacao_creditada boolean not null default false,
  consentimento_lgpd_em timestamptz,
  consentimento_marketing boolean not null default false,
  excluido_em timestamptz,
  criado_em timestamptz not null default now()
);
create index on perfis (papel);

create table profissionais (
  id text primary key,
  nome text not null,
  unidade_id text not null references unidades (id),
  usuario_id uuid references perfis (id),
  exclusiva boolean not null default false,
  ativa boolean not null default true
);

-- ---------- Passaporte do Fio (dado sensível) ----------
create table passaportes (
  cliente_id uuid primary key references perfis (id) on delete cascade,
  tipo_fio text, curvatura text, espessura text, porosidade text, quimicas text,
  produto_preferido text, tempo_pausa_min int, temperatura_prancha int,
  alergias text, reacoes text, observacoes text,
  atualizado_por uuid references perfis (id),
  atualizado_em timestamptz not null default now()
);

-- ---------- agenda ----------
create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id),
  unidade_id text not null references unidades (id),
  servico_id text not null references servicos (id),
  profissional_id text not null references profissionais (id),
  inicio timestamptz not null,
  fim timestamptz not null,
  status status_agendamento not null default 'agendado',
  preco_tabela numeric(10,2) not null,
  preco numeric(10,2) not null check (preco >= 0),
  happy_hour boolean not null default false,
  cobertura text,
  etapa int not null default 0,
  etapa_inicio timestamptz,
  chegada_em timestamptz,
  avaliacao_nota int check (avaliacao_nota between 1 and 5),
  avaliacao_comentario text,
  pago boolean not null default false,
  criado_em timestamptz not null default now(),
  check (fim > inicio),
  -- impede dois horários sobrepostos para a mesma profissional
  constraint sem_sobreposicao exclude using gist (profissional_id with =, tstzrange(inicio, fim) with &&) where (status <> 'cancelado')
);
create index on agendamentos (cliente_id, inicio);
create index on agendamentos (unidade_id, inicio);

create table fila_encaixe (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id),
  unidade_id text not null references unidades (id),
  servico_id text not null references servicos (id),
  data date not null,
  status text not null default 'aguardando' check (status in ('aguardando', 'avisada', 'atendida')),
  criado_em timestamptz not null default now(),
  unique (cliente_id, unidade_id, data)
);

create table atendimentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id),
  servico_id text not null references servicos (id),
  unidade_id text not null references unidades (id),
  profissional_id text references profissionais (id),
  agendamento_id uuid unique references agendamentos (id),
  data date not null default current_date,
  valor numeric(10,2) not null check (valor >= 0),
  pontos int not null default 0,
  ficha jsonb,
  registrado_por uuid references perfis (id),
  criado_em timestamptz not null default now()
);
create index on atendimentos (cliente_id, data desc);

-- ---------- Império Club ----------
create table movimentos_pontos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id),
  tipo tipo_movimento not null,
  pontos int not null check (pontos <> 0),
  descricao text not null,
  ref_id uuid,
  chave text unique, -- idempotência: o mesmo evento nunca gera pontos duas vezes
  expira_em date,
  criado_em timestamptz not null default now()
);
create index on movimentos_pontos (cliente_id, criado_em desc);

create table vouchers (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  cliente_id uuid not null references perfis (id),
  recompensa_id text references recompensas (id),
  titulo text not null,
  custo int not null default 0,
  origem origem_voucher not null,
  usado_em timestamptz,
  usado_por uuid references perfis (id),
  criado_em timestamptz not null default now()
);

create table posts_instagram (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id),
  link text not null unique,
  mes text not null,
  criado_em timestamptz not null default now(),
  unique (cliente_id, mes)
);

-- ---------- Meu Cabelo ----------
create table fotos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id) on delete cascade,
  tipo tipo_foto not null,
  caminho text not null unique, -- caminho no bucket privado "fotos-clientes"
  criado_em timestamptz not null default now()
);

create table medicoes_raiz (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id) on delete cascade,
  cm numeric(3,1) not null check (cm between 0 and 10),
  foto_id uuid references fotos (id),
  origem text not null default 'cliente' check (origem in ('cliente', 'ia', 'profissional')),
  incerteza_cm numeric(3,1),
  validada_por uuid references perfis (id),
  criado_em timestamptz not null default now()
);

create table diagnosticos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references perfis (id) on delete cascade,
  respostas jsonb not null,
  resultado jsonb not null,
  foto_id uuid references fotos (id),
  revisado_por uuid references perfis (id),
  criado_em timestamptz not null default now()
);

-- ---------- comercial ----------
create table assinaturas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id),
  plano_id text not null references planos (id),
  status status_assinatura not null default 'pendente',
  inicio date,
  proxima_cobranca date,
  cancelada_em date,
  ultimo_retoque date,
  gateway_assinatura_id text unique,
  criado_em timestamptz not null default now()
);
create unique index uma_assinatura_ativa on assinaturas (cliente_id) where status in ('ativa', 'pendente');

create table usos_assinatura (
  assinatura_id uuid not null references assinaturas (id),
  mes text not null,
  hidratacoes int not null default 0,
  botox int not null default 0,
  primary key (assinatura_id, mes)
);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id),
  subtotal numeric(10,2) not null,
  desconto numeric(10,2) not null default 0,
  frete numeric(10,2) not null default 0,
  total numeric(10,2) not null,
  entrega text not null check (entrega in ('retirada', 'entrega')),
  unidade_id text references unidades (id),
  endereco text,
  status status_pedido not null default 'aguardando_pagamento',
  automatico boolean not null default false,
  criado_em timestamptz not null default now()
);

create table pedido_itens (
  pedido_id uuid not null references pedidos (id) on delete cascade,
  produto_id text not null references produtos (id),
  qtd int not null check (qtd > 0),
  preco_unitario numeric(10,2) not null,
  primary key (pedido_id, produto_id)
);

create table carrinho (
  cliente_id uuid not null references perfis (id) on delete cascade,
  produto_id text not null references produtos (id),
  qtd int not null check (qtd > 0),
  primary key (cliente_id, produto_id)
);

create table recompra_auto (
  cliente_id uuid not null references perfis (id) on delete cascade,
  produto_id text not null references produtos (id),
  primary key (cliente_id, produto_id)
);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id),
  referente text not null check (referente in ('pedido', 'assinatura', 'agendamento')),
  ref_id uuid not null,
  valor numeric(10,2) not null check (valor > 0),
  metodo metodo_pagamento not null,
  parcelas int not null default 1 check (parcelas between 1 and 12),
  status status_pagamento not null default 'pendente',
  gateway text,
  gateway_id text unique,
  criado_em timestamptz not null default now(),
  confirmado_em timestamptz
);

create table webhooks_recebidos (
  id text primary key, -- id do evento no provedor (idempotência)
  provedor text not null,
  payload jsonb not null,
  processado_em timestamptz,
  erro text,
  recebido_em timestamptz not null default now()
);

create table garantias (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id),
  atendimento_id uuid not null unique references atendimentos (id),
  motivo text not null check (length(motivo) >= 10),
  foto_id uuid references fotos (id),
  status status_garantia not null default 'analise',
  respondido_por uuid references perfis (id),
  respondido_em timestamptz,
  criado_em timestamptz not null default now()
);

create table embaixadoras (
  cliente_id uuid primary key references perfis (id),
  status status_embaixadora not null default 'pendente',
  instagram text not null,
  seguidores int not null check (seguidores >= 0),
  saldo numeric(10,2) not null default 0 check (saldo >= 0),
  aprovada_por uuid references perfis (id),
  criado_em timestamptz not null default now()
);

create table comissoes (
  id uuid primary key default gen_random_uuid(),
  embaixadora_id uuid not null references perfis (id),
  indicada_id uuid not null unique references perfis (id),
  valor numeric(10,2) not null,
  criado_em timestamptz not null default now()
);

-- ---------- comunicação ----------
create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id) on delete cascade,
  titulo text not null,
  texto text not null,
  rota text,
  chave text,
  lida boolean not null default false,
  enviada_push boolean not null default false,
  criado_em timestamptz not null default now(),
  unique (cliente_id, chave)
);

create table lembretes_live (
  cliente_id uuid not null references perfis (id) on delete cascade,
  data date not null,
  primary key (cliente_id, data)
);

create table push_inscricoes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id) on delete cascade,
  endpoint text not null unique,
  chaves jsonb not null,
  criado_em timestamptz not null default now()
);

-- ---------- auditoria ----------
create table auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro text,
  acao text not null,
  antes jsonb,
  depois jsonb,
  por uuid,
  em timestamptz not null default now()
);
