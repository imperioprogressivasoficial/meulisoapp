-- =========================================================
-- Império Progressivas: regras de negócio no servidor
-- Todas as funções expostas são SECURITY DEFINER com search_path fixo
-- e validam quem chama. O navegador nunca define pontos nem preços.
-- =========================================================

-- ---------- utilitários ----------
create or replace function cfg(p_chave text) returns jsonb
language sql stable security definer set search_path = public as $$
  select valor from config where chave = p_chave
$$;

create or replace function cfg_num(p_chave text, p_padrao numeric) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select (valor #>> '{}')::numeric from config where chave = p_chave), p_padrao)
$$;

create or replace function fuso() returns text language sql immutable as $$ select 'America/Bahia' $$;

create or replace function meu_papel() returns papel
language sql stable security definer set search_path = public as $$
  select papel from perfis where id = auth.uid() and excluido_em is null
$$;

create or replace function eh_equipe() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(meu_papel() in ('recepcao', 'profissional', 'gestao'), false)
$$;

create or replace function eh_gestao() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(meu_papel() = 'gestao', false)
$$;

create or replace function exigir_cliente() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v uuid := auth.uid();
begin
  if v is null or not exists (select 1 from perfis where id = v and excluido_em is null) then
    raise exception 'Faça login para continuar.' using errcode = '28000';
  end if;
  return v;
end $$;

create or replace function exigir_equipe() returns uuid
language plpgsql stable security definer set search_path = public as $$
begin
  if not eh_equipe() then raise exception 'Acesso restrito à equipe.' using errcode = '42501'; end if;
  return auth.uid();
end $$;

create or replace function gerar_codigo(p_prefixo text) returns text
language plpgsql volatile as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  r text := '';
begin
  for i in 1..6 loop
    r := r || substr(chars, 1 + (get_byte(gen_random_bytes(1), 0) % 32), 1);
  end loop;
  return p_prefixo || '-' || r;
end $$;

create or replace function notificar(p_cliente uuid, p_titulo text, p_texto text, p_rota text, p_chave text default null)
returns void language sql security definer set search_path = public as $$
  insert into notificacoes (cliente_id, titulo, texto, rota, chave)
  values (p_cliente, p_titulo, p_texto, p_rota, p_chave)
  on conflict (cliente_id, chave) do nothing
$$;

-- ---------- pontos ----------
create or replace function validade_meses() returns int language sql stable as $$
  select cfg_num('validade_pontos_meses', 12)::int
$$;

/** Credita pontos de forma idempotente (a mesma chave nunca credita duas vezes). */
create or replace function creditar(p_cliente uuid, p_tipo tipo_movimento, p_pontos int, p_descricao text, p_ref uuid, p_chave text)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if p_pontos <= 0 then return false; end if;
  insert into movimentos_pontos (cliente_id, tipo, pontos, descricao, ref_id, chave, expira_em)
  values (p_cliente, p_tipo, p_pontos, p_descricao, p_ref, p_chave, current_date + make_interval(months => validade_meses()))
  on conflict (chave) do nothing;
  get diagnostics n = row_count;
  return n > 0;
end $$;

/** Pontos ganhos nos últimos 12 meses (definem o nível). */
create or replace function pontos_ganhos(p_cliente uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(pontos), 0)::int from movimentos_pontos
  where cliente_id = p_cliente and pontos > 0 and tipo <> 'resgate'
    and criado_em >= now() - make_interval(months => validade_meses())
$$;

/**
 * Saldo = pontos ganhos ainda válidos − resgates feitos dentro da janela de validade.
 * Pontos vencem 12 meses depois de ganhos.
 */
create or replace function saldo_pontos(p_cliente uuid) returns int
language sql stable security definer set search_path = public as $$
  select greatest(0,
    coalesce((select sum(pontos) from movimentos_pontos where cliente_id = p_cliente and pontos > 0 and expira_em >= current_date), 0)
    + coalesce((select sum(pontos) from movimentos_pontos where cliente_id = p_cliente and pontos < 0 and criado_em >= now() - make_interval(months => validade_meses())), 0)
  )::int
$$;

create or replace function nivel_de(p_cliente uuid) returns niveis
language sql stable security definer set search_path = public as $$
  select * from niveis where minimo <= pontos_ganhos(p_cliente) order by minimo desc limit 1
$$;

create or replace function plano_ativo(p_cliente uuid) returns planos
language sql stable security definer set search_path = public as $$
  select p.* from assinaturas a join planos p on p.id = a.plano_id
  where a.cliente_id = p_cliente and a.status = 'ativa' limit 1
$$;

create or replace function multiplicador_de(p_cliente uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select greatest(coalesce((nivel_de(p_cliente)).multiplicador, 1), case when (plano_ativo(p_cliente)).pontos_em_dobro then 2 else 1 end)
$$;

create or replace function acesso_exclusivo(p_cliente uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((nivel_de(p_cliente)).nome = 'Diamante', false) or coalesce((plano_ativo(p_cliente)).acesso_exclusivo, false)
$$;

-- ---------- cadastro ----------
create or replace function completar_cadastro(
  p_nome text, p_aniversario date, p_bairro text, p_cidade text, p_unidade text,
  p_codigo_indicacao text, p_consentimento boolean, p_marketing boolean default false
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v uuid := auth.uid();
  v_tel text;
  v_indicou uuid;
begin
  if v is null then raise exception 'Faça login para continuar.' using errcode = '28000'; end if;
  if exists (select 1 from perfis where id = v) then raise exception 'Cadastro já existe.'; end if;
  if not coalesce(p_consentimento, false) then raise exception 'É preciso aceitar a Política de Privacidade.'; end if;
  if not exists (select 1 from unidades where id = p_unidade and ativa and not em_breve) then raise exception 'Unidade inválida.'; end if;
  select regexp_replace(coalesce(phone, ''), '^\+?55', '') into v_tel from auth.users where id = v;
  if v_tel is null or v_tel = '' then raise exception 'Telefone não confirmado.'; end if;
  if p_codigo_indicacao is not null and trim(p_codigo_indicacao) <> '' then
    select id into v_indicou from perfis where codigo_indicacao = upper(trim(p_codigo_indicacao));
  end if;
  insert into perfis (id, nome, telefone, aniversario, bairro, cidade, unidade_preferida, indicada_por, consentimento_lgpd_em, consentimento_marketing)
  values (v, trim(p_nome), v_tel, p_aniversario, nullif(trim(p_bairro), ''), nullif(trim(p_cidade), ''), p_unidade, v_indicou, now(), coalesce(p_marketing, false));
  perform creditar(v, 'boas_vindas', cfg_num('bonus_boas_vindas', 100)::int, 'Bônus de boas-vindas', null, 'boas_vindas:' || v);
  perform notificar(v, 'Bem-vinda ao Império Club', 'Você começa com ' || cfg_num('bonus_boas_vindas', 100)::int || ' pontos.', '/club', 'boas_vindas');
  return v;
end $$;

create or replace function atualizar_meu_perfil(p_nome text, p_aniversario date, p_bairro text, p_unidade text, p_marketing boolean)
returns void language plpgsql security definer set search_path = public as $$
declare v uuid := exigir_cliente();
begin
  if p_unidade is not null and not exists (select 1 from unidades where id = p_unidade and ativa and not em_breve) then raise exception 'Unidade inválida.'; end if;
  update perfis set
    nome = coalesce(nullif(trim(p_nome), ''), nome),
    aniversario = p_aniversario,
    bairro = nullif(trim(p_bairro), ''),
    unidade_preferida = coalesce(p_unidade, unidade_preferida),
    consentimento_marketing = coalesce(p_marketing, consentimento_marketing)
  where id = v;
end $$;

/** LGPD: exporta todos os dados da cliente. */
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
    'exportado_em', now()
  );
end $$;

/** LGPD: anonimiza a conta. Dados fiscais ficam (obrigação legal); fotos e ficha de saúde são apagadas. */
create or replace function excluir_minha_conta() returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := exigir_cliente();
begin
  delete from passaportes where cliente_id = v;
  delete from medicoes_raiz where cliente_id = v;
  delete from diagnosticos where cliente_id = v;
  delete from fotos where cliente_id = v; -- os arquivos no Storage são removidos pela Edge Function "excluir-conta"
  delete from push_inscricoes where cliente_id = v;
  delete from carrinho where cliente_id = v;
  update agendamentos set status = 'cancelado' where cliente_id = v and status in ('agendado', 'confirmado');
  update perfis set nome = 'Conta excluída', telefone = '00' || substr(replace(v::text, '-', ''), 1, 11), aniversario = null, bairro = null,
    consentimento_marketing = false, excluido_em = now() where id = v;
end $$;

-- ---------- bônus ----------
create or replace function creditar_aniversario() returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v uuid := exigir_cliente();
  v_aniv date;
  v_ano int := extract(year from (now() at time zone fuso()));
  ok boolean;
begin
  select aniversario into v_aniv from perfis where id = v;
  if v_aniv is null or extract(month from v_aniv) <> extract(month from (now() at time zone fuso())) then return false; end if;
  ok := creditar(v, 'aniversario', cfg_num('bonus_aniversario', 200)::int, 'Bônus de aniversário', null, 'aniversario:' || v || ':' || v_ano);
  if ok then perform notificar(v, 'Feliz aniversário!', 'Você ganhou ' || cfg_num('bonus_aniversario', 200)::int || ' pontos de presente.', '/club', 'aniversario:' || v_ano); end if;
  return ok;
end $$;

create or replace function registrar_post(p_link text) returns int
language plpgsql security definer set search_path = public as $$
declare
  v uuid := exigir_cliente();
  v_mes text := to_char(now() at time zone fuso(), 'YYYY-MM');
  v_pts int := cfg_num('bonus_post', 50)::int;
  v_id uuid;
begin
  if p_link !~* '^https://(www\.)?instagram\.com/(p|reel)/[A-Za-z0-9_-]+' then raise exception 'Cole o link de um post do Instagram.'; end if;
  if exists (select 1 from posts_instagram where cliente_id = v and mes = v_mes) then raise exception 'Você já ganhou pontos por um post este mês.'; end if;
  if exists (select 1 from posts_instagram where link = p_link) then raise exception 'Esse post já foi registrado.'; end if;
  insert into posts_instagram (cliente_id, link, mes) values (v, p_link, v_mes) returning id into v_id;
  perform creditar(v, 'post', v_pts, 'Post de antes e depois', v_id, 'post:' || v_id);
  return v_pts;
end $$;

/** Indicação: credita quem indicou quando a indicada conclui o 1º atendimento. */
create or replace function creditar_indicacao(p_cliente uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_quem uuid;
  v_nome text;
  v_com numeric := cfg_num('comissao_embaixadora', 30);
begin
  select indicada_por, split_part(nome, ' ', 1) into v_quem, v_nome from perfis where id = p_cliente and not indicacao_creditada for update;
  if v_quem is null then return; end if;
  update perfis set indicacao_creditada = true where id = p_cliente;
  if exists (select 1 from embaixadoras where cliente_id = v_quem and status = 'ativa') then
    insert into comissoes (embaixadora_id, indicada_id, valor) values (v_quem, p_cliente, v_com) on conflict (indicada_id) do nothing;
    if found then
      update embaixadoras set saldo = saldo + v_com where cliente_id = v_quem;
      perform notificar(v_quem, 'Nova comissão', v_nome || ' fez o primeiro procedimento com o seu link.', '/indicacao', 'comissao:' || p_cliente);
    end if;
  else
    if creditar(v_quem, 'indicacao', cfg_num('bonus_indicacao', 150)::int, 'Indicação de ' || v_nome, p_cliente, 'indicacao:' || p_cliente) then
      perform notificar(v_quem, 'Pontos por indicação', v_nome || ' fez o primeiro procedimento na Império.', '/club', 'indicacao:' || p_cliente);
    end if;
  end if;
end $$;

-- ---------- resgate ----------
create or replace function resgatar(p_recompensa text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v uuid := exigir_cliente();
  r recompensas;
  v_codigo text;
  v_voucher uuid;
begin
  -- trava a cliente: dois resgates simultâneos não passam pelo mesmo saldo
  perform 1 from perfis where id = v for update;
  select * into r from recompensas where id = p_recompensa and ativa;
  if r.id is null then raise exception 'Recompensa indisponível.'; end if;
  if saldo_pontos(v) < r.custo then raise exception 'Pontos insuficientes.'; end if;
  loop
    v_codigo := gerar_codigo('IMP');
    exit when not exists (select 1 from vouchers where codigo = v_codigo);
  end loop;
  insert into vouchers (codigo, cliente_id, recompensa_id, titulo, custo, origem) values (v_codigo, v, r.id, r.nome, r.custo, 'pontos') returning id into v_voucher;
  insert into movimentos_pontos (cliente_id, tipo, pontos, descricao, ref_id, chave) values (v, 'resgate', -r.custo, 'Resgate: ' || r.nome, v_voucher, 'resgate:' || v_voucher);
  return v_codigo;
end $$;

-- ---------- manutenção ----------
create or replace function manutencoes_de(p_cliente uuid)
returns table (servico_id text, ultimo date, data_ideal date, dias_restantes int, status text)
language sql stable security definer set search_path = public as $$
  with ult as (
    select distinct on (a.servico_id) a.servico_id, a.data
    from atendimentos a where a.cliente_id = p_cliente order by a.servico_id, a.data desc
  )
  select u.servico_id, u.data, u.data + s.manutencao_dias, (u.data + s.manutencao_dias) - current_date,
    case when (u.data + s.manutencao_dias) < current_date then 'atrasada'
         when (u.data + s.manutencao_dias) - current_date <= 14 then 'chegando' else 'em_dia' end
  from ult u join servicos s on s.id = u.servico_id
  where s.manutencao_dias > 0 and current_date - (u.data + s.manutencao_dias) <= s.manutencao_dias
  order by 4
$$;

create or replace function minhas_manutencoes()
returns table (servico_id text, ultimo date, data_ideal date, dias_restantes int, status text)
language sql stable security definer set search_path = public as $$ select * from manutencoes_de(auth.uid()) $$;

/** Lembretes automáticos: rodar 1x por dia (pg_cron). Idempotente. */
create or replace function gerar_lembretes() returns int
language plpgsql security definer set search_path = public as $$
declare
  c record; m record; n int := 0;
begin
  for c in select id from perfis where papel = 'cliente' and excluido_em is null loop
    for m in select * from manutencoes_de(c.id) where status <> 'em_dia' loop
      insert into notificacoes (cliente_id, titulo, texto, rota, chave)
      values (c.id,
        (select nome from servicos where id = m.servico_id) || case when m.status = 'atrasada' then ': manutenção atrasada' else ': manutenção chegando' end,
        case when m.status = 'atrasada' then 'Agende agora e ganhe pontos.' else 'Faltam ' || m.dias_restantes || ' dias para a data ideal.' end,
        '/agendar?servico=' || m.servico_id, 'man:' || m.servico_id || ':' || m.ultimo || ':' || m.status)
      on conflict (cliente_id, chave) do nothing;
      if found then n := n + 1; end if;
    end loop;
  end loop;
  insert into notificacoes (cliente_id, titulo, texto, rota, chave)
  select a.cliente_id, 'Seu horário é amanhã', s.nome || ' às ' || to_char(a.inicio at time zone fuso(), 'HH24:MI') || '. Confirme com um toque.', '/agenda', 'vespera:' || a.id
  from agendamentos a join servicos s on s.id = a.servico_id
  where a.status in ('agendado', 'confirmado') and (a.inicio at time zone fuso())::date = (now() at time zone fuso())::date + 1
  on conflict (cliente_id, chave) do nothing;
  return n;
end $$;

-- ---------- preço e agenda ----------
create or replace function eh_happy_hour(p_inicio timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    extract(dow from p_inicio at time zone fuso())::int in (select jsonb_array_elements_text(cfg('happy_hour')->'dias')::int)
    and to_char(p_inicio at time zone fuso(), 'HH24:MI') in (select jsonb_array_elements_text(cfg('happy_hour')->'horas')),
  false)
$$;

/** Preço do serviço para a cliente (plano + happy hour). */
create or replace function preco_para(p_cliente uuid, p_servico text, p_inicio timestamptz, out preco numeric, out cobertura text, out happy boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  s servicos; p planos; a assinaturas; u usos_assinatura;
  v_mes text := to_char(p_inicio at time zone fuso(), 'YYYY-MM');
begin
  select * into s from servicos where id = p_servico;
  preco := s.preco; happy := eh_happy_hour(p_inicio);
  p := plano_ativo(p_cliente);
  if p.id is not null then
    select * into a from assinaturas where cliente_id = p_cliente and status = 'ativa';
    select * into u from usos_assinatura where assinatura_id = a.id and mes = v_mes;
    if p_servico = 'hidratacao' and coalesce(u.hidratacoes, 0) < p.hidratacoes_mes then preco := 0; cobertura := 'Incluso no plano ' || p.nome;
    elsif p_servico = 'botox' and coalesce(u.botox, 0) < p.botox_mes then preco := 0; cobertura := 'Incluso no plano ' || p.nome;
    elsif p_servico = 'progressiva' then
      if p.retoque_incluso and (a.ultimo_retoque is null or (p_inicio at time zone fuso())::date - a.ultimo_retoque >= cfg_num('intervalo_retoque_plano', 80)) then
        preco := 0; cobertura := 'Retoque incluso no plano ' || p.nome;
      elsif p.desconto_progressiva > 0 and p.desconto_progressiva < 1 then
        preco := s.preco * (1 - p.desconto_progressiva); cobertura := round(p.desconto_progressiva * 100) || '% off pelo plano ' || p.nome;
      end if;
    end if;
  end if;
  if happy and preco > 0 then preco := preco * (1 - coalesce((cfg('happy_hour')->>'desconto')::numeric, 0)); end if;
  preco := round(preco, 2);
end $$;

/** Horários livres de um dia. Não revela quem ocupa cada horário. */
create or replace function horarios_disponiveis(p_unidade text, p_servico text, p_data date, p_profissional text default null)
returns table (inicio timestamptz, hora text, profissional_id text, happy_hour boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  un unidades; s servicos; h text; t timestamptz; pr record; v uuid := auth.uid(); v_excl boolean := false;
begin
  select * into un from unidades where id = p_unidade and ativa and not em_breve;
  select * into s from servicos where id = p_servico and ativo;
  if un.id is null or s.id is null then return; end if;
  if v is not null then v_excl := acesso_exclusivo(v); end if;
  for h in select jsonb_array_elements_text(cfg('horarios')) loop
    t := (p_data::text || ' ' || h)::timestamp at time zone fuso();
    continue when t < now() + interval '30 minutes';
    continue when h::time < un.abre or (h::time + make_interval(mins => s.duracao_min)) > un.fecha;
    for pr in
      select p.id from profissionais p
      where p.unidade_id = p_unidade and p.ativa
        and (p_profissional is null and not p.exclusiva or p.id = p_profissional)
        and (not p.exclusiva or v_excl)
      order by p.id
    loop
      if not exists (
        select 1 from agendamentos a where a.profissional_id = pr.id and a.status <> 'cancelado'
          and tstzrange(a.inicio, a.fim) && tstzrange(t, t + make_interval(mins => s.duracao_min))
      ) then
        inicio := t; hora := h; profissional_id := pr.id; happy_hour := eh_happy_hour(t);
        return next;
        exit;
      end if;
    end loop;
  end loop;
end $$;

create or replace function agendar(p_unidade text, p_servico text, p_inicio timestamptz, p_profissional text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v uuid := exigir_cliente();
  s servicos; un unidades; pr profissionais; pc record; v_id uuid; a assinaturas; v_mes text; v_local timestamp;
begin
  select * into s from servicos where id = p_servico and ativo;
  select * into un from unidades where id = p_unidade and ativa and not em_breve;
  if s.id is null or un.id is null then raise exception 'Serviço ou unidade indisponível.'; end if;
  v_local := p_inicio at time zone fuso();
  if p_inicio < now() + interval '30 minutes' then raise exception 'Escolha um horário futuro.'; end if;
  if v_local::time < un.abre or (v_local::time + make_interval(mins => s.duracao_min)) > un.fecha
     or to_char(v_local, 'HH24:MI') not in (select jsonb_array_elements_text(cfg('horarios'))) then
    raise exception 'Horário fora do expediente.';
  end if;
  if p_profissional is null then
    select h.profissional_id into p_profissional from horarios_disponiveis(p_unidade, p_servico, v_local::date) h where h.inicio = p_inicio;
    if p_profissional is null then raise exception 'Esse horário acabou de ser ocupado. Escolha outro.'; end if;
  end if;
  select * into pr from profissionais where id = p_profissional and unidade_id = p_unidade and ativa;
  if pr.id is null then raise exception 'Profissional indisponível nesta unidade.'; end if;
  if pr.exclusiva and not acesso_exclusivo(v) then raise exception 'Horário exclusivo para Diamante e plano VIP.'; end if;
  if exists (select 1 from agendamentos where cliente_id = v and status <> 'cancelado' and tstzrange(inicio, fim) && tstzrange(p_inicio, p_inicio + make_interval(mins => s.duracao_min))) then
    raise exception 'Você já tem um horário nesse período.';
  end if;
  pc := preco_para(v, p_servico, p_inicio);
  begin
    insert into agendamentos (cliente_id, unidade_id, servico_id, profissional_id, inicio, fim, preco_tabela, preco, happy_hour, cobertura)
    values (v, p_unidade, p_servico, p_profissional, p_inicio, p_inicio + make_interval(mins => s.duracao_min), s.preco, pc.preco, pc.happy, pc.cobertura)
    returning id into v_id;
  exception when exclusion_violation then
    raise exception 'Esse horário acabou de ser ocupado. Escolha outro.';
  end;
  if pc.cobertura is not null and pc.preco = 0 then
    select * into a from assinaturas where cliente_id = v and status = 'ativa';
    v_mes := to_char(v_local, 'YYYY-MM');
    insert into usos_assinatura (assinatura_id, mes) values (a.id, v_mes) on conflict do nothing;
    if p_servico = 'hidratacao' then update usos_assinatura set hidratacoes = hidratacoes + 1 where assinatura_id = a.id and mes = v_mes; end if;
    if p_servico = 'botox' then update usos_assinatura set botox = botox + 1 where assinatura_id = a.id and mes = v_mes; end if;
    if p_servico = 'progressiva' then update assinaturas set ultimo_retoque = v_local::date where id = a.id; end if;
  end if;
  update fila_encaixe set status = 'atendida' where cliente_id = v and data = v_local::date;
  perform notificar(v, 'Agendamento feito', s.nome || ' em ' || to_char(v_local, 'DD/MM') || ' às ' || to_char(v_local, 'HH24:MI') || '.', '/agenda', 'agendado:' || v_id);
  return v_id;
end $$;

/** Ao liberar um horário, avisa a primeira da fila (prioridade por nível e plano). */
create or replace function liberar_vaga(p_ag agendamentos) returns void
language plpgsql security definer set search_path = public as $$
declare f record; v_local timestamp := p_ag.inicio at time zone fuso();
begin
  select fe.* into f from fila_encaixe fe
  where fe.status = 'aguardando' and fe.unidade_id = p_ag.unidade_id and fe.data = v_local::date
  order by coalesce((nivel_de(fe.cliente_id)).ordem, 0) + case when (plano_ativo(fe.cliente_id)).id is not null then 2 else 0 end desc, fe.criado_em
  limit 1 for update skip locked;
  if f.id is null then return; end if;
  update fila_encaixe set status = 'avisada' where id = f.id;
  perform notificar(f.cliente_id, 'Vaga liberada', 'Abriu um horário às ' || to_char(v_local, 'HH24:MI') || ' em ' || to_char(v_local, 'DD/MM') || '.',
    '/agendar?unidade=' || p_ag.unidade_id || '&data=' || v_local::date || '&servico=' || f.servico_id, 'vaga:' || p_ag.id);
end $$;

create or replace function cancelar_agendamento(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare ag agendamentos; a assinaturas; v_mes text;
begin
  select * into ag from agendamentos where id = p_id for update;
  if ag.id is null or (ag.cliente_id <> auth.uid() and not eh_equipe()) then raise exception 'Agendamento não encontrado.'; end if;
  if ag.status not in ('agendado', 'confirmado') then raise exception 'Este agendamento não pode mais ser cancelado.'; end if;
  update agendamentos set status = 'cancelado' where id = p_id;
  if ag.cobertura is not null and ag.preco = 0 then
    select * into a from assinaturas where cliente_id = ag.cliente_id and status = 'ativa';
    v_mes := to_char(ag.inicio at time zone fuso(), 'YYYY-MM');
    if ag.servico_id = 'hidratacao' then update usos_assinatura set hidratacoes = greatest(0, hidratacoes - 1) where assinatura_id = a.id and mes = v_mes; end if;
    if ag.servico_id = 'botox' then update usos_assinatura set botox = greatest(0, botox - 1) where assinatura_id = a.id and mes = v_mes; end if;
    if ag.servico_id = 'progressiva' then update assinaturas set ultimo_retoque = null where id = a.id and ultimo_retoque = (ag.inicio at time zone fuso())::date; end if;
  end if;
  if ag.cliente_id <> auth.uid() then
    perform notificar(ag.cliente_id, 'Seu horário foi cancelado', 'Fale com a unidade para remarcar.', '/agenda', 'cancelado:' || ag.id);
  end if;
  perform liberar_vaga(ag);
end $$;

create or replace function confirmar_presenca(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update agendamentos set status = 'confirmado' where id = p_id and cliente_id = auth.uid() and status = 'agendado'
$$;

create or replace function registrar_chegada(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare ag agendamentos;
begin
  select * into ag from agendamentos where id = p_id;
  if ag.id is null or (ag.cliente_id <> auth.uid() and not eh_equipe()) then raise exception 'Agendamento não encontrado.'; end if;
  if (ag.inicio at time zone fuso())::date <> (now() at time zone fuso())::date then raise exception 'O aviso de chegada vale só no dia do horário.'; end if;
  update agendamentos set status = 'chegou', chegada_em = now() where id = p_id and status in ('agendado', 'confirmado');
end $$;

create or replace function entrar_fila(p_unidade text, p_servico text, p_data date) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := exigir_cliente();
begin
  if p_data < current_date then raise exception 'Data inválida.'; end if;
  insert into fila_encaixe (cliente_id, unidade_id, servico_id, data) values (v, p_unidade, p_servico, p_data)
  on conflict (cliente_id, unidade_id, data) do update set servico_id = excluded.servico_id, status = 'aguardando';
end $$;

create or replace function avaliar(p_id uuid, p_nota int, p_comentario text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update agendamentos set avaliacao_nota = p_nota, avaliacao_comentario = nullif(trim(p_comentario), '')
  where id = p_id and cliente_id = auth.uid() and status = 'concluido' and avaliacao_nota is null;
  if not found then raise exception 'Avaliação indisponível.'; end if;
end $$;

-- ---------- Meu Cabelo ----------
create or replace function registrar_medicao(p_cm numeric, p_foto uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid := exigir_cliente(); v_id uuid;
begin
  if p_foto is not null and not exists (select 1 from fotos where id = p_foto and cliente_id = v) then raise exception 'Foto inválida.'; end if;
  insert into medicoes_raiz (cliente_id, cm, foto_id) values (v, p_cm, p_foto) returning id into v_id;
  return v_id;
end $$;

-- ---------- garantia e embaixadoras ----------
create or replace function solicitar_garantia(p_atendimento uuid, p_motivo text, p_foto uuid default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid := exigir_cliente(); at atendimentos; s servicos; v_id uuid;
begin
  select * into at from atendimentos where id = p_atendimento and cliente_id = v;
  select * into s from servicos where id = at.servico_id;
  if at.id is null or s.garantia_dias = 0 then raise exception 'Procedimento sem garantia.'; end if;
  if at.data + s.garantia_dias < current_date then raise exception 'A garantia deste procedimento já terminou.'; end if;
  insert into garantias (cliente_id, atendimento_id, motivo, foto_id) values (v, p_atendimento, trim(p_motivo), p_foto) returning id into v_id;
  perform notificar(v, 'Recebemos seu pedido de garantia', 'Nossa equipe responde em até 24 horas.', '/garantia', 'garantia:' || v_id);
  return v_id;
end $$;

create or replace function candidatar_embaixadora(p_instagram text, p_seguidores int) returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := exigir_cliente();
begin
  if p_seguidores < cfg_num('min_seguidores_embaixadora', 1000) then
    raise exception 'O programa é para perfis a partir de % seguidores.', cfg_num('min_seguidores_embaixadora', 1000)::int;
  end if;
  insert into embaixadoras (cliente_id, instagram, seguidores) values (v, '@' || ltrim(trim(p_instagram), '@'), p_seguidores)
  on conflict (cliente_id) do update set instagram = excluded.instagram, seguidores = excluded.seguidores, status = 'pendente'
  where embaixadoras.status = 'recusada';
end $$;

create or replace function resgatar_saldo_embaixadora() returns text
language plpgsql security definer set search_path = public as $$
declare v uuid := exigir_cliente(); e embaixadoras; v_codigo text;
begin
  select * into e from embaixadoras where cliente_id = v and status = 'ativa' for update;
  if e.cliente_id is null or e.saldo <= 0 then raise exception 'Sem saldo disponível.'; end if;
  v_codigo := gerar_codigo('EMB');
  insert into vouchers (codigo, cliente_id, titulo, origem) values (v_codigo, v, 'Crédito de R$ ' || to_char(e.saldo, 'FM999G990D00') || ' em serviços', 'embaixadora');
  update embaixadoras set saldo = 0 where cliente_id = v;
  return v_codigo;
end $$;

-- ---------- loja, assinatura e pagamentos ----------
create or replace function criar_pedido(p_entrega text, p_unidade text, p_endereco text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid := exigir_cliente(); v_sub numeric; v_desc numeric; v_frete numeric; v_id uuid;
begin
  select sum(c.qtd * p.preco) into v_sub from carrinho c join produtos p on p.id = c.produto_id and p.ativo where c.cliente_id = v;
  if coalesce(v_sub, 0) = 0 then raise exception 'Carrinho vazio.'; end if;
  if p_entrega = 'entrega' and length(coalesce(trim(p_endereco), '')) < 5 then raise exception 'Informe o endereço.'; end if;
  v_desc := round(v_sub * coalesce((plano_ativo(v)).desconto_produtos, 0), 2);
  v_frete := case when p_entrega = 'entrega' then cfg_num('frete', 15) else 0 end;
  insert into pedidos (cliente_id, subtotal, desconto, frete, total, entrega, unidade_id, endereco)
  values (v, v_sub, v_desc, v_frete, v_sub - v_desc + v_frete, p_entrega, case when p_entrega = 'retirada' then p_unidade end, case when p_entrega = 'entrega' then trim(p_endereco) end)
  returning id into v_id;
  insert into pedido_itens (pedido_id, produto_id, qtd, preco_unitario)
  select v_id, c.produto_id, c.qtd, p.preco from carrinho c join produtos p on p.id = c.produto_id where c.cliente_id = v;
  return v_id;
end $$;

create or replace function iniciar_assinatura(p_plano text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid := exigir_cliente(); v_id uuid;
begin
  if not exists (select 1 from planos where id = p_plano and ativo) then raise exception 'Plano indisponível.'; end if;
  if exists (select 1 from assinaturas where cliente_id = v and status = 'ativa') then raise exception 'Você já tem um plano ativo.'; end if;
  delete from assinaturas where cliente_id = v and status = 'pendente';
  insert into assinaturas (cliente_id, plano_id) values (v, p_plano) returning id into v_id;
  return v_id;
end $$;

create or replace function cancelar_assinatura() returns void
language plpgsql security definer set search_path = public as $$
declare v uuid := exigir_cliente();
begin
  -- o cancelamento da cobrança recorrente no gateway é feito pela Edge Function "pagamentos"
  update assinaturas set status = 'cancelada', cancelada_em = current_date where cliente_id = v and status = 'ativa';
  if not found then raise exception 'Nenhum plano ativo.'; end if;
end $$;

/** Cria o pagamento com o valor calculado no servidor. A Edge Function "pagamentos" registra no gateway. */
create or replace function criar_pagamento(p_referente text, p_ref uuid, p_metodo metodo_pagamento, p_parcelas int default 1) returns uuid
language plpgsql security definer set search_path = public as $$
declare v uuid := exigir_cliente(); v_valor numeric; v_id uuid; v_max int;
begin
  if p_referente = 'pedido' then
    select total into v_valor from pedidos where id = p_ref and cliente_id = v and status = 'aguardando_pagamento';
  elsif p_referente = 'assinatura' then
    select p.preco into v_valor from assinaturas a join planos p on p.id = a.plano_id where a.id = p_ref and a.cliente_id = v and a.status = 'pendente';
  elsif p_referente = 'agendamento' then
    select preco into v_valor from agendamentos where id = p_ref and cliente_id = v and not pago and status <> 'cancelado';
  end if;
  if coalesce(v_valor, 0) <= 0 then raise exception 'Nada a pagar.'; end if;
  v_max := case p_metodo when 'pix' then 1 when 'cartao' then cfg_num('parcelas_cartao', 12) else cfg_num('parcelas_imperio_pay', 4) end;
  if p_parcelas < 1 or p_parcelas > v_max then raise exception 'Parcelamento inválido.'; end if;
  if p_metodo = 'imperio_pay' and (select count(*) from atendimentos where cliente_id = v) < 2 then
    raise exception 'O Império Pay é liberado a partir do 2º atendimento.';
  end if;
  insert into pagamentos (cliente_id, referente, ref_id, valor, metodo, parcelas) values (v, p_referente, p_ref, v_valor, p_metodo, p_parcelas) returning id into v_id;
  return v_id;
end $$;

/** Só o servidor (webhook do gateway, service_role) confirma pagamentos. */
create or replace function confirmar_pagamento(p_pagamento uuid, p_gateway text, p_gateway_id text) returns void
language plpgsql security definer set search_path = public as $$
declare pg pagamentos;
begin
  select * into pg from pagamentos where id = p_pagamento for update;
  if pg.id is null then raise exception 'Pagamento não encontrado.'; end if;
  if pg.status = 'aprovado' then return; end if; -- idempotente
  update pagamentos set status = 'aprovado', gateway = p_gateway, gateway_id = p_gateway_id, confirmado_em = now() where id = pg.id;
  if pg.referente = 'pedido' then
    update pedidos set status = 'pago' where id = pg.ref_id;
    delete from carrinho where cliente_id = pg.cliente_id;
    perform notificar(pg.cliente_id, 'Pedido confirmado', 'Avisaremos quando estiver pronto.', '/loja/pedidos', 'pedido:' || pg.ref_id);
  elsif pg.referente = 'assinatura' then
    update assinaturas set status = 'ativa', inicio = current_date, proxima_cobranca = current_date + 30 where id = pg.ref_id;
    perform notificar(pg.cliente_id, 'Assinatura ativa', 'Seus benefícios já valem no próximo agendamento.', '/assinatura', 'assinatura:' || pg.ref_id);
  else
    update agendamentos set pago = true where id = pg.ref_id;
  end if;
  perform creditar(pg.cliente_id, 'cashback', round(pg.valor * cfg_num('cashback_app', 0.05))::int, 'Cashback no app', pg.id, 'cashback:' || pg.id);
end $$;

-- =========================================================
-- Equipe
-- =========================================================
create or replace function equipe_iniciar(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare ag agendamentos;
begin
  perform exigir_equipe();
  update agendamentos set status = 'em_andamento', etapa = 0, etapa_inicio = now()
  where id = p_id and status in ('agendado', 'confirmado', 'chegou') returning * into ag;
  if ag.id is null then raise exception 'Não é possível iniciar este atendimento.'; end if;
  perform notificar(ag.cliente_id, 'Seu atendimento começou', 'Acompanhe cada etapa ao vivo.', '/ao-vivo/' || ag.id, 'inicio:' || ag.id);
end $$;

create or replace function equipe_avancar_etapa(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform exigir_equipe();
  update agendamentos set etapa = least(etapa + 1, jsonb_array_length(cfg('etapas')) - 1), etapa_inicio = now()
  where id = p_id and status = 'em_andamento';
end $$;

/** Conclui: lança atendimento e pontos (valor informado pela equipe, pontos calculados aqui). */
create or replace function equipe_concluir(p_id uuid, p_valor numeric, p_ficha jsonb default null) returns int
language plpgsql security definer set search_path = public as $$
declare v_eq uuid := exigir_equipe(); ag agendamentos; v_pts int; v_at uuid;
begin
  select * into ag from agendamentos where id = p_id for update;
  if ag.id is null or ag.status <> 'em_andamento' then raise exception 'Atendimento não está em andamento.'; end if;
  if p_valor < 0 or p_valor > ag.preco_tabela * 2 then raise exception 'Valor fora do esperado para o serviço.'; end if;
  v_pts := round(p_valor * cfg_num('pontos_por_real', 1) * multiplicador_de(ag.cliente_id) * case when ag.happy_hour then coalesce((cfg('happy_hour')->>'multiplicador')::numeric, 1) else 1 end);
  update agendamentos set status = 'concluido', etapa = jsonb_array_length(cfg('etapas')) - 1 where id = p_id;
  insert into atendimentos (cliente_id, servico_id, unidade_id, profissional_id, agendamento_id, data, valor, pontos, ficha, registrado_por)
  values (ag.cliente_id, ag.servico_id, ag.unidade_id, ag.profissional_id, ag.id, (ag.inicio at time zone fuso())::date, p_valor, v_pts, p_ficha, v_eq)
  returning id into v_at;
  perform creditar(ag.cliente_id, 'atendimento', v_pts, (select nome from servicos where id = ag.servico_id), v_at, 'atendimento:' || v_at);
  perform creditar_indicacao(ag.cliente_id);
  perform notificar(ag.cliente_id, 'Prontinha!', '+' || v_pts || ' pontos no Império Club. Conta pra gente como foi?', '/ao-vivo/' || ag.id, 'concluido:' || ag.id);
  return v_pts;
end $$;

create or replace function equipe_lancar_avulso(p_cliente uuid, p_servico text, p_unidade text, p_profissional text, p_valor numeric, p_ficha jsonb default null) returns int
language plpgsql security definer set search_path = public as $$
declare v_eq uuid := exigir_equipe(); s servicos; v_pts int; v_at uuid;
begin
  select * into s from servicos where id = p_servico;
  if s.id is null or p_valor < 0 or p_valor > s.preco * 2 then raise exception 'Serviço ou valor inválido.'; end if;
  v_pts := round(p_valor * cfg_num('pontos_por_real', 1) * multiplicador_de(p_cliente));
  insert into atendimentos (cliente_id, servico_id, unidade_id, profissional_id, valor, pontos, ficha, registrado_por)
  values (p_cliente, p_servico, p_unidade, p_profissional, p_valor, v_pts, p_ficha, v_eq) returning id into v_at;
  perform creditar(p_cliente, 'atendimento', v_pts, s.nome, v_at, 'atendimento:' || v_at);
  perform creditar_indicacao(p_cliente);
  perform notificar(p_cliente, 'Atendimento registrado', '+' || v_pts || ' pontos no Império Club.', '/club', 'avulso:' || v_at);
  return v_pts;
end $$;

create or replace function equipe_usar_voucher(p_codigo text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_eq uuid := exigir_equipe(); vo vouchers;
begin
  select * into vo from vouchers where codigo = upper(trim(p_codigo)) for update;
  if vo.id is null then raise exception 'Código não encontrado.'; end if;
  if vo.usado_em is not null then raise exception 'Voucher já utilizado em %.', to_char(vo.usado_em at time zone fuso(), 'DD/MM/YYYY'); end if;
  update vouchers set usado_em = now(), usado_por = v_eq where id = vo.id;
  perform notificar(vo.cliente_id, 'Voucher usado', vo.titulo || ' aproveitado.', '/club', 'voucher:' || vo.id);
  return jsonb_build_object('titulo', vo.titulo, 'cliente', (select nome from perfis where id = vo.cliente_id));
end $$;

create or replace function equipe_salvar_passaporte(p_cliente uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_eq uuid := exigir_equipe();
begin
  insert into passaportes (cliente_id, tipo_fio, curvatura, espessura, porosidade, quimicas, produto_preferido, tempo_pausa_min, temperatura_prancha, alergias, reacoes, observacoes, atualizado_por, atualizado_em)
  values (p_cliente, p->>'tipo_fio', p->>'curvatura', p->>'espessura', p->>'porosidade', p->>'quimicas', p->>'produto_preferido',
    (p->>'tempo_pausa_min')::int, (p->>'temperatura_prancha')::int, p->>'alergias', p->>'reacoes', p->>'observacoes', v_eq, now())
  on conflict (cliente_id) do update set
    tipo_fio = excluded.tipo_fio, curvatura = excluded.curvatura, espessura = excluded.espessura, porosidade = excluded.porosidade,
    quimicas = excluded.quimicas, produto_preferido = excluded.produto_preferido, tempo_pausa_min = excluded.tempo_pausa_min,
    temperatura_prancha = excluded.temperatura_prancha, alergias = excluded.alergias, reacoes = excluded.reacoes,
    observacoes = excluded.observacoes, atualizado_por = v_eq, atualizado_em = now();
end $$;

create or replace function equipe_validar_medicao(p_id uuid, p_cm numeric) returns void
language plpgsql security definer set search_path = public as $$
declare v_eq uuid := exigir_equipe();
begin
  update medicoes_raiz set cm = p_cm, origem = 'profissional', validada_por = v_eq where id = p_id;
end $$;

create or replace function equipe_responder_garantia(p_id uuid, p_aprovar boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_eq uuid := exigir_equipe(); g garantias; v_codigo text;
begin
  update garantias set status = case when p_aprovar then 'aprovada'::status_garantia else 'recusada' end, respondido_por = v_eq, respondido_em = now()
  where id = p_id and status = 'analise' returning * into g;
  if g.id is null then raise exception 'Pedido já respondido.'; end if;
  if p_aprovar then
    v_codigo := gerar_codigo('GAR');
    insert into vouchers (codigo, cliente_id, titulo, origem) values (v_codigo, g.cliente_id, 'Retoque grátis (Garantia Império)', 'garantia');
    perform notificar(g.cliente_id, 'Garantia aprovada', 'Seu retoque grátis está liberado.', '/garantia', 'garantia-resp:' || g.id);
  else
    perform notificar(g.cliente_id, 'Sobre seu pedido de garantia', 'Nossa equipe vai falar com você pelo WhatsApp.', '/garantia', 'garantia-resp:' || g.id);
  end if;
end $$;

create or replace function equipe_avancar_pedido(p_id uuid) returns status_pedido
language plpgsql security definer set search_path = public as $$
declare pd pedidos;
begin
  perform exigir_equipe();
  update pedidos set status = case status when 'pago' then 'preparando'::status_pedido when 'preparando' then 'pronto' when 'pronto' then 'entregue' else status end
  where id = p_id returning * into pd;
  if pd.status = 'pronto' then
    perform notificar(pd.cliente_id, case when pd.entrega = 'entrega' then 'Pedido saiu para entrega' else 'Pedido pronto para retirar' end, 'Obrigada pela compra.', '/loja/pedidos', 'pronto:' || pd.id);
  end if;
  return pd.status;
end $$;

create or replace function equipe_avisar_fila(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare f fila_encaixe;
begin
  perform exigir_equipe();
  update fila_encaixe set status = 'avisada' where id = p_id and status = 'aguardando' returning * into f;
  if f.id is not null then
    perform notificar(f.cliente_id, 'Temos um encaixe para você', 'Abriu vaga em ' || to_char(f.data, 'DD/MM') || '. Toque para agendar.',
      '/agendar?unidade=' || f.unidade_id || '&data=' || f.data || '&servico=' || f.servico_id, 'encaixe:' || f.id);
  end if;
end $$;

create or replace function gestao_responder_embaixadora(p_cliente uuid, p_aprovar boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not eh_gestao() then raise exception 'Acesso restrito à gestão.' using errcode = '42501'; end if;
  update embaixadoras set status = case when p_aprovar then 'ativa'::status_embaixadora else 'recusada' end, aprovada_por = auth.uid()
  where cliente_id = p_cliente and status = 'pendente';
  perform notificar(p_cliente, case when p_aprovar then 'Você é Embaixadora Império' else 'Sobre o programa de embaixadoras' end,
    case when p_aprovar then 'Ganhe comissão por amiga que fizer o primeiro procedimento.' else 'Continue indicando e ganhando pontos.' end, '/indicacao', 'embaixadora:' || p_aprovar);
end $$;

create or replace function gestao_definir_papel(p_usuario uuid, p_papel papel, p_unidade text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not eh_gestao() then raise exception 'Acesso restrito à gestão.' using errcode = '42501'; end if;
  if p_usuario = auth.uid() and p_papel <> 'gestao' then raise exception 'Você não pode remover o próprio acesso de gestão.'; end if;
  update perfis set papel = p_papel, unidade_trabalho = p_unidade where id = p_usuario;
end $$;

/** Indicadores do painel de gestão. */
create or replace function gestao_indicadores(p_dias int default 30, p_unidade text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare ini date := current_date - p_dias; ini_ant date := current_date - 2 * p_dias; r jsonb;
begin
  if not eh_gestao() then raise exception 'Acesso restrito à gestão.' using errcode = '42501'; end if;
  with at as (select * from atendimentos where (p_unidade is null or unidade_id = p_unidade)),
  per as (select * from at where data >= ini),
  ant as (select * from at where data >= ini_ant and data < ini)
  select jsonb_build_object(
    'faturamento', coalesce((select sum(valor) from per), 0),
    'faturamento_anterior', coalesce((select sum(valor) from ant), 0),
    'atendimentos', (select count(*) from per),
    'clientes_ativas', (select count(distinct cliente_id) from per),
    'novas_clientes', (select count(*) from perfis where papel = 'cliente' and criado_em >= ini and (p_unidade is null or unidade_preferida = p_unidade)),
    'retencao', (select case when count(distinct a.cliente_id) = 0 then 0 else count(distinct a.cliente_id) filter (where exists (select 1 from per p where p.cliente_id = a.cliente_id))::numeric / count(distinct a.cliente_id) end from ant a),
    'frequencia_media_dias', (select round(avg(gap)) from (select data - lag(data) over (partition by cliente_id order by data) as gap from at) g where gap is not null),
    'pontos_emitidos', coalesce((select sum(pontos) from movimentos_pontos where pontos > 0 and criado_em >= ini), 0),
    'pontos_resgatados', coalesce((select -sum(pontos) from movimentos_pontos where pontos < 0 and criado_em >= ini), 0),
    'assinaturas_ativas', (select count(*) from assinaturas where status = 'ativa'),
    'mrr', coalesce((select sum(p.preco) from assinaturas a join planos p on p.id = a.plano_id where a.status = 'ativa'), 0),
    'cancelamentos', (select count(*) from assinaturas where status = 'cancelada' and cancelada_em >= ini),
    'loja', coalesce((select sum(total) from pedidos where status in ('pago', 'preparando', 'pronto', 'entregue') and criado_em >= ini), 0),
    'satisfacao', (select round(avg(avaliacao_nota), 1) from agendamentos where avaliacao_nota is not null and inicio >= ini),
    'indicacoes', (select count(*) from perfis where indicada_por is not null and criado_em >= ini),
    'por_unidade', (select coalesce(jsonb_agg(jsonb_build_object('unidade', u.nome, 'valor', coalesce(x.v, 0), 'atendimentos', coalesce(x.n, 0))), '[]') from unidades u left join (select unidade_id, sum(valor) v, count(*) n from per group by 1) x on x.unidade_id = u.id where not u.em_breve),
    'por_profissional', (select coalesce(jsonb_agg(jsonb_build_object('profissional', pr.nome, 'valor', x.v, 'atendimentos', x.n) order by x.v desc), '[]') from (select profissional_id, sum(valor) v, count(*) n from per group by 1) x join profissionais pr on pr.id = x.profissional_id),
    'por_mes', (select coalesce(jsonb_agg(jsonb_build_object('mes', m, 'valor', v) order by m), '[]') from (select to_char(data, 'YYYY-MM') m, sum(valor) v from at where data >= current_date - 365 group by 1) x),
    'clientes_em_risco', (select coalesce(jsonb_agg(x), '[]') from (
      select p.id, p.nome, p.telefone, p.unidade_preferida, m.ultimo, -m.dias_restantes as atraso,
        (select sum(valor) from atendimentos where cliente_id = p.id) as valor_historico
      from perfis p cross join lateral manutencoes_de(p.id) m
      where p.papel = 'cliente' and p.excluido_em is null and m.servico_id = 'progressiva' and m.status = 'atrasada'
        and not exists (select 1 from agendamentos a where a.cliente_id = p.id and a.inicio > now() and a.status <> 'cancelado')
      order by valor_historico desc nulls last limit 50) x)
  ) into r;
  return r;
end $$;

-- ---------- auditoria ----------
create or replace function registrar_auditoria() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into auditoria (tabela, registro, acao, antes, depois, por)
  values (tg_table_name, coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'id', (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end) ->> 'cliente_id'),
    tg_op, case when tg_op <> 'INSERT' then to_jsonb(old) end, case when tg_op <> 'DELETE' then to_jsonb(new) end, auth.uid());
  return coalesce(new, old);
end $$;

create trigger auditoria_passaportes after insert or update or delete on passaportes for each row execute function registrar_auditoria();
create trigger auditoria_perfis after update of papel, excluido_em on perfis for each row execute function registrar_auditoria();
create trigger auditoria_movimentos after insert or delete on movimentos_pontos for each row execute function registrar_auditoria();
create trigger auditoria_vouchers after update on vouchers for each row execute function registrar_auditoria();
create trigger auditoria_pagamentos after update on pagamentos for each row execute function registrar_auditoria();
create trigger auditoria_garantias after update on garantias for each row execute function registrar_auditoria();
create trigger auditoria_config after insert or update or delete on config for each row execute function registrar_auditoria();
create trigger auditoria_servicos after update on servicos for each row execute function registrar_auditoria();
