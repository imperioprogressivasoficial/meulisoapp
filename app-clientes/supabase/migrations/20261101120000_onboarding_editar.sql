-- =========================================================
-- Império Progressivas: editar o perfil de cabelo depois do cadastro
-- Só acrescenta (nenhuma tabela, coluna ou dado é apagado):
--  - função atualizar_meu_onboarding, para a cliente corrigir as respostas
--    do primeiro acesso na tela "Meu perfil de cabelo".
-- As respostas são mescladas com as que já existem (chaves novas entram, as enviadas
-- substituem as antigas). completar_cadastro_v2 continua igual: ela já aceita qualquer
-- objeto de até 2000 caracteres, então os campos novos do onboarding cabem nela.
-- =========================================================

create or replace function atualizar_meu_onboarding(p_onboarding jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v uuid := exigir_cliente();
  v_novo jsonb;
begin
  if p_onboarding is null or jsonb_typeof(p_onboarding) <> 'object' then
    raise exception 'Respostas inválidas.';
  end if;
  select coalesce(onboarding, '{}'::jsonb) || p_onboarding into v_novo from perfis where id = v;
  if length(v_novo::text) > 2000 then raise exception 'Respostas inválidas.'; end if;
  update perfis set onboarding = v_novo where id = v;
end $$;

revoke execute on function atualizar_meu_onboarding(jsonb) from public, anon;
grant execute on function atualizar_meu_onboarding(jsonb) to authenticated;
