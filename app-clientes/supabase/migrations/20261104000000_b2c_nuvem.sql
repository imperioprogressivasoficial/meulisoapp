-- =========================================================
-- Meu Liso (B2C): dados de cuidado na nuvem
-- Só acrescenta (nenhuma tabela, coluna ou dado é apagado; as funções
-- antigas continuam existindo com o mesmo comportamento):
--  - tipo de foto 'evolucao' (antes a Evolução gravava como 'depois');
--  - tabela cronogramas (um plano por cliente) e diario_cabelo (um registro por dia),
--    com RLS: cada cliente lê e grava só as próprias linhas; visitante (anon) não acessa;
--  - atualizado_em preenchido pelo servidor em toda escrita (base do "a nuvem vence" no app);
--  - os diagnósticos continuam na tabela diagnosticos (ela já serve: respostas + resultado);
--  - exportar_meus_dados inclui cronograma, diário e fotos; excluir_minha_conta apaga cronograma e diário;
--  - completar_cadastro_v3: igual à v2, mas sem exigir unidade do salão e sem os efeitos
--    do programa de pontos (crédito de boas-vindas e aviso para /club). A v2 fica igual.
-- =========================================================

-- ---------- tipo de foto da Evolução ----------
-- (o valor novo só é usado depois desta migration: ADD VALUE pode rodar dentro de uma transação)
alter type tipo_foto add value if not exists 'evolucao';

-- ---------- atualizado_em sempre pelo servidor ----------
create or replace function tocar_atualizado_em() returns trigger
language plpgsql set search_path = public as $$
begin
  new.atualizado_em := now();
  return new;
end $$;
revoke execute on function tocar_atualizado_em() from public, anon, authenticated;

-- ---------- cronograma capilar (um por cliente) ----------
create table if not exists cronogramas (
  cliente_id uuid primary key references perfis (id) on delete cascade,
  -- { estado, lavagens, inicio, lembretes } do app; nulo depois de "Refazer cronograma"
  perfil jsonb check (perfil is null or (jsonb_typeof(perfil) = 'object' and length(perfil::text) <= 1000)),
  feitos date[] not null default '{}' check (cardinality(feitos) <= 500),
  inicio date,
  atualizado_em timestamptz not null default now()
);

-- ---------- diário do cabelo (um registro por dia) ----------
create table if not exists diario_cabelo (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references perfis (id) on delete cascade,
  dia date not null,
  frizz smallint not null check (frizz between 1 and 5),
  brilho smallint not null check (brilho between 1 and 5),
  maciez smallint not null check (maciez between 1 and 5),
  atualizado_em timestamptz not null default now(),
  unique (cliente_id, dia)
);

create or replace trigger tocar_cronogramas before insert or update on cronogramas for each row execute function tocar_atualizado_em();
create or replace trigger tocar_diario_cabelo before insert or update on diario_cabelo for each row execute function tocar_atualizado_em();

-- ---------- segurança: só a dona, com conta ativa ----------
alter table cronogramas enable row level security;
alter table cronogramas force row level security;
alter table diario_cabelo enable row level security;
alter table diario_cabelo force row level security;

revoke all on cronogramas, diario_cabelo from public, anon, authenticated;
grant select, insert, update, delete on cronogramas, diario_cabelo to authenticated;

-- meu_papel() é nulo para quem não tem cadastro ou excluiu a conta
create policy propria on cronogramas for all to authenticated
  using (cliente_id = auth.uid() and meu_papel() is not null)
  with check (cliente_id = auth.uid() and meu_papel() is not null);
create policy propria on diario_cabelo for all to authenticated
  using (cliente_id = auth.uid() and meu_papel() is not null)
  with check (cliente_id = auth.uid() and meu_papel() is not null);

-- ---------- LGPD: exportação inclui os dados novos ----------
create or replace function exportar_meus_dados() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v uuid := exigir_cliente();
begin
  return jsonb_build_object(
    'perfil', (select to_jsonb(p) from perfis p where id = v),
    'passaporte', (select to_jsonb(x) from passaportes x where cliente_id = v),
    'atendimentos', (select coalesce(jsonb_agg(x), '[]') from atendimentos x where cliente_id = v),
    'pontos', (select coalesce(jsonb_agg(x), '[]') from movimentos_pontos x where cliente_id = v),
    'vouchers', (select coalesce(jsonb_agg(x), '[]') from vouchers x where cliente_id = v),
    'agendamentos', (select coalesce(jsonb_agg(x), '[]') from agendamentos x where cliente_id = v),
    'diagnosticos', (select coalesce(jsonb_agg(x), '[]') from diagnosticos x where cliente_id = v),
    'medicoes_raiz', (select coalesce(jsonb_agg(x), '[]') from medicoes_raiz x where cliente_id = v),
    'pedidos', (select coalesce(jsonb_agg(x), '[]') from pedidos x where cliente_id = v),
    'pagamentos', (select coalesce(jsonb_agg(x), '[]') from pagamentos x where cliente_id = v),
    'cronograma', (select to_jsonb(x) from cronogramas x where cliente_id = v),
    'diario_cabelo', (select coalesce(jsonb_agg(x order by x.dia), '[]') from diario_cabelo x where cliente_id = v),
    'fotos', (select coalesce(jsonb_agg(x order by x.criado_em), '[]') from fotos x where cliente_id = v),
    'exportado_em', now()
  );
end $$;

-- ---------- LGPD: exclusão apaga também cronograma e diário ----------
-- (igual à versão de 20261031120000_cadastro_oauth.sql, mais as duas tabelas novas)
create or replace function excluir_minha_conta() returns void
language plpgsql security definer set search_path = public as $$
declare
  v uuid := exigir_cliente();
  v_anon text := '00' || lpad(((('x' || substr(md5(v::text), 1, 15))::bit(60)::bigint) % 100000000000)::text, 11, '0');
begin
  while exists (select 1 from perfis where telefone = v_anon and id <> v) loop
    v_anon := '00' || lpad(floor(random() * 100000000000)::bigint::text, 11, '0');
  end loop;
  delete from passaportes where cliente_id = v;
  delete from medicoes_raiz where cliente_id = v;
  delete from diagnosticos where cliente_id = v;
  delete from fotos where cliente_id = v; -- os arquivos no Storage são removidos pela Edge Function "excluir-conta"
  delete from push_inscricoes where cliente_id = v;
  delete from carrinho where cliente_id = v;
  delete from cronogramas where cliente_id = v;
  delete from diario_cabelo where cliente_id = v;
  update agendamentos set status = 'cancelado' where cliente_id = v and status in ('agendado', 'confirmado');
  update perfis set nome = 'Conta excluída', telefone = v_anon, aniversario = null, bairro = null,
    consentimento_marketing = false, onboarding = null, excluido_em = now() where id = v;
end $$;

-- ---------- cadastro B2C: sem unidade do salão ----------
create or replace function completar_cadastro_v3(
  p_nome text, p_aniversario date, p_consentimento boolean, p_marketing boolean default false,
  p_telefone text default null, p_onboarding jsonb default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v uuid := auth.uid();
  v_tel text;
begin
  if v is null then raise exception 'Faça login para continuar.' using errcode = '28000'; end if;
  if exists (select 1 from perfis where id = v) then raise exception 'Cadastro já existe.'; end if;
  if not coalesce(p_consentimento, false) then raise exception 'É preciso aceitar a Política de Privacidade.'; end if;

  -- Login por WhatsApp: o telefone confirmado no login sempre vale (o parâmetro é ignorado).
  select regexp_replace(coalesce(phone, ''), '^\+?55', '') into v_tel from auth.users where id = v;
  if coalesce(v_tel, '') = '' then
    -- Login por Google/Apple: o WhatsApp vem do formulário e é validado aqui.
    v_tel := regexp_replace(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), '^55(?=[0-9]{10,11}$)', '');
    if v_tel = '' then raise exception 'Informe seu WhatsApp.'; end if;
    if v_tel !~ '^[1-9][1-9](9[0-9]{8}|[2-5][0-9]{7})$' then raise exception 'WhatsApp inválido. Confira o DDD e o número.'; end if;
    if exists (select 1 from perfis where telefone = v_tel) then
      raise exception 'Este WhatsApp já tem cadastro. Entre com "Continuar com WhatsApp".';
    end if;
  end if;

  if p_onboarding is not null and (jsonb_typeof(p_onboarding) <> 'object' or length(p_onboarding::text) > 2000) then
    raise exception 'Respostas inválidas.';
  end if;

  insert into perfis (id, nome, telefone, aniversario, consentimento_lgpd_em, consentimento_marketing, onboarding)
  values (v, trim(p_nome), v_tel, p_aniversario, now(), coalesce(p_marketing, false), p_onboarding);
  -- mesmo aviso de boas-vindas do modo demonstração
  perform notificar(v, 'Bem-vinda ao Meu Liso!', 'Seu cronograma, seu diário e sua evolução ficam todos aqui.', '/cuidados', 'boas-vindas');
  return v;
end $$;

revoke execute on function completar_cadastro_v3(text, date, boolean, boolean, text, jsonb) from public, anon;
grant execute on function completar_cadastro_v3(text, date, boolean, boolean, text, jsonb) to authenticated;
