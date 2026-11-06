-- =========================================================
-- Império Progressivas: segurança (RLS, permissões e Storage)
-- Regra geral: a cliente lê só o que é dela; a equipe lê tudo
-- o que precisa; escrita sensível só por funções do servidor.
-- =========================================================

-- Liga RLS em todas as tabelas do esquema public
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
  end loop;
end $$;

-- Ninguém escreve direto nas tabelas, exceto onde liberado abaixo
revoke insert, update, delete, truncate on all tables in schema public from anon, authenticated;
revoke all on auditoria, webhooks_recebidos from anon, authenticated;

-- ---------- catálogo público (leitura para todos) ----------
create policy catalogo_leitura on unidades for select using (true);
create policy catalogo_leitura on servicos for select using (true);
create policy catalogo_leitura on niveis for select using (true);
create policy catalogo_leitura on recompensas for select using (true);
create policy catalogo_leitura on planos for select using (true);
create policy catalogo_leitura on produtos for select using (true);
create policy catalogo_leitura on profissionais for select using (true);
create policy config_leitura on config for select using (chave not like 'segredo%');

-- gestão edita o catálogo e as regras (ex.: intervalos de manutenção)
grant insert, update on unidades, servicos, niveis, recompensas, planos, produtos, profissionais, config to authenticated;
create policy gestao_edita on unidades for all using (eh_gestao()) with check (eh_gestao());
create policy gestao_edita on servicos for all using (eh_gestao()) with check (eh_gestao());
create policy gestao_edita on niveis for all using (eh_gestao()) with check (eh_gestao());
create policy gestao_edita on recompensas for all using (eh_gestao()) with check (eh_gestao());
create policy gestao_edita on planos for all using (eh_gestao()) with check (eh_gestao());
create policy gestao_edita on produtos for all using (eh_gestao()) with check (eh_gestao());
create policy gestao_edita on profissionais for all using (eh_gestao()) with check (eh_gestao());
create policy gestao_edita on config for all using (eh_gestao()) with check (eh_gestao());

-- ---------- dados da cliente: dona ou equipe ----------
create policy propria_ou_equipe on perfis for select using (id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on passaportes for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on agendamentos for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on fila_encaixe for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on atendimentos for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on movimentos_pontos for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on vouchers for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on posts_instagram for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on fotos for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on medicoes_raiz for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on diagnosticos for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on assinaturas for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on usos_assinatura for select using (exists (select 1 from assinaturas a where a.id = assinatura_id and (a.cliente_id = auth.uid() or eh_equipe())));
create policy propria_ou_equipe on pedidos for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on pedido_itens for select using (exists (select 1 from pedidos p where p.id = pedido_id and (p.cliente_id = auth.uid() or eh_equipe())));
create policy propria_ou_equipe on pagamentos for select using (cliente_id = auth.uid() or eh_gestao());
create policy propria_ou_equipe on garantias for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on embaixadoras for select using (cliente_id = auth.uid() or eh_equipe());
create policy propria_ou_equipe on comissoes for select using (embaixadora_id = auth.uid() or eh_gestao());
create policy propria on notificacoes for select using (cliente_id = auth.uid());
create policy gestao_le on auditoria for select using (eh_gestao());
grant select on auditoria to authenticated;

-- ---------- o que a cliente pode escrever diretamente ----------
-- marcar notificação como lida (só a coluna "lida")
grant update (lida) on notificacoes to authenticated;
create policy marca_lida on notificacoes for update using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());

-- carrinho e preferências (preço é sempre recalculado no servidor)
grant insert, update, delete on carrinho, recompra_auto, lembretes_live, push_inscricoes to authenticated;
create policy propria on carrinho for all using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());
create policy propria on recompra_auto for all using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());
create policy propria on lembretes_live for all using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());
create policy propria on push_inscricoes for all using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());

-- fotos: a cliente registra as suas, sempre dentro da própria pasta
grant insert, delete on fotos to authenticated;
create policy envia_propria on fotos for insert with check (cliente_id = auth.uid() and caminho like auth.uid()::text || '/%');
create policy apaga_propria on fotos for delete using (cliente_id = auth.uid());

-- diagnóstico: a cliente salva o próprio resultado
grant insert on diagnosticos to authenticated;
create policy cria_proprio on diagnosticos for insert with check (cliente_id = auth.uid());

-- ---------- funções: só o necessário para cada papel ----------
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
-- funções internas ou exclusivas do servidor
revoke execute on function creditar(uuid, tipo_movimento, int, text, uuid, text) from authenticated;
revoke execute on function notificar(uuid, text, text, text, text) from authenticated;
revoke execute on function creditar_indicacao(uuid) from authenticated;
revoke execute on function confirmar_pagamento(uuid, text, text) from authenticated;
revoke execute on function gerar_lembretes() from authenticated;
revoke execute on function liberar_vaga(agendamentos) from authenticated;
revoke execute on function manutencoes_de(uuid) from authenticated;
revoke execute on function saldo_pontos(uuid), pontos_ganhos(uuid), nivel_de(uuid), plano_ativo(uuid), multiplicador_de(uuid), acesso_exclusivo(uuid), preco_para(uuid, text, timestamptz) from authenticated;
-- consulta de horários também para visitantes (sem dados pessoais)
grant execute on function horarios_disponiveis(text, text, date, text) to anon;

-- ---------- resumo da cliente logada ----------
create or replace function meu_resumo() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'saldo', saldo_pontos(auth.uid()),
    'ganhos_12m', pontos_ganhos(auth.uid()),
    'nivel', to_jsonb(nivel_de(auth.uid())),
    'multiplicador', multiplicador_de(auth.uid()),
    'plano', to_jsonb(plano_ativo(auth.uid())),
    'acesso_exclusivo', acesso_exclusivo(auth.uid())
  ) where auth.uid() is not null
$$;
grant execute on function meu_resumo() to authenticated;

create or replace function meu_preco(p_servico text, p_inicio timestamptz)
returns table (preco numeric, cobertura text, happy boolean)
language sql stable security definer set search_path = public as $$
  select * from preco_para(auth.uid(), p_servico, p_inicio)
$$;
grant execute on function meu_preco(text, timestamptz) to authenticated;

-- funções usadas dentro das políticas precisam ser executáveis por todos os papéis
grant execute on function meu_papel(), eh_equipe(), eh_gestao() to anon;
