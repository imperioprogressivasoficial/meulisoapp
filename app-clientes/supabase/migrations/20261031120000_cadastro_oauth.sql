-- =========================================================
-- Império Progressivas: cadastro para quem entra com Google ou Apple
-- Só acrescenta (nenhuma tabela, coluna ou dado é apagado):
--  - coluna perfis.onboarding (respostas do primeiro acesso), opcional;
--  - função completar_cadastro_v2, que aceita o WhatsApp digitado
--    quando o login não veio por telefone (auth.users.phone vazio);
--  - excluir_minha_conta passa a limpar também as respostas do onboarding.
-- A função antiga completar_cadastro continua igual (versões antigas do app seguem funcionando).
-- Observação: no login por Google/Apple o WhatsApp é digitado, não confirmado por código.
-- =========================================================

alter table perfis add column if not exists onboarding jsonb;

create or replace function completar_cadastro_v2(
  p_nome text, p_aniversario date, p_bairro text, p_cidade text, p_unidade text,
  p_codigo_indicacao text, p_consentimento boolean, p_marketing boolean default false,
  p_telefone text default null, p_onboarding jsonb default null
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

  -- Login por WhatsApp: o telefone confirmado no login sempre vale (o parâmetro é ignorado).
  select regexp_replace(coalesce(phone, ''), '^\+?55', '') into v_tel from auth.users where id = v;
  if coalesce(v_tel, '') = '' then
    -- Login por Google/Apple: o WhatsApp vem do formulário e é validado aqui.
    v_tel := regexp_replace(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), '^55(?=[0-9]{10,11}$)', '');
    if v_tel = '' then raise exception 'Informe seu WhatsApp.'; end if;
    -- DDD de 11 a 99 (sem zero) e celular com 9 dígitos começando por 9, ou fixo com 8 dígitos
    if v_tel !~ '^[1-9][1-9](9[0-9]{8}|[2-5][0-9]{7})$' then raise exception 'WhatsApp inválido. Confira o DDD e o número.'; end if;
    if exists (select 1 from perfis where telefone = v_tel) then
      raise exception 'Este WhatsApp já tem cadastro. Entre com "Continuar com WhatsApp".';
    end if;
  end if;

  if p_onboarding is not null and (jsonb_typeof(p_onboarding) <> 'object' or length(p_onboarding::text) > 2000) then
    raise exception 'Respostas inválidas.';
  end if;

  if p_codigo_indicacao is not null and trim(p_codigo_indicacao) <> '' then
    select id into v_indicou from perfis where codigo_indicacao = upper(trim(p_codigo_indicacao));
  end if;
  insert into perfis (id, nome, telefone, aniversario, bairro, cidade, unidade_preferida, indicada_por, consentimento_lgpd_em, consentimento_marketing, onboarding)
  values (v, trim(p_nome), v_tel, p_aniversario, nullif(trim(p_bairro), ''), nullif(trim(p_cidade), ''), p_unidade, v_indicou, now(), coalesce(p_marketing, false), p_onboarding);
  perform creditar(v, 'boas_vindas', cfg_num('bonus_boas_vindas', 100)::int, 'Bônus de boas-vindas', null, 'boas_vindas:' || v);
  perform notificar(v, 'Bem-vinda ao Império Club', 'Você começa com ' || cfg_num('bonus_boas_vindas', 100)::int || ' pontos.', '/club', 'boas_vindas');
  return v;
end $$;

revoke execute on function completar_cadastro_v2(text, date, text, text, text, text, boolean, boolean, text, jsonb) from public, anon;
grant execute on function completar_cadastro_v2(text, date, text, text, text, text, boolean, boolean, text, jsonb) to authenticated;

-- LGPD: ao excluir a conta, as respostas do onboarding também somem.
-- Corrige também o telefone anonimizado: antes eram letras do uuid (a regra da coluna só aceita
-- dígitos e o valor podia repetir); agora são 11 dígitos derivados do id, sem repetir.
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
  update agendamentos set status = 'cancelado' where cliente_id = v and status in ('agendado', 'confirmado');
  update perfis set nome = 'Conta excluída', telefone = v_anon, aniversario = null, bairro = null,
    consentimento_marketing = false, onboarding = null, excluido_em = now() where id = v;
end $$;
