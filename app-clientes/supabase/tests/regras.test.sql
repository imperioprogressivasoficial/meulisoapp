-- Testes das regras de negócio e da segurança. Rodar com: supabase/tests/rodar.sh
\set ON_ERROR_STOP 1
\set QUIET 1
create schema teste;
create or replace function teste.codigo_de(p uuid) returns text language sql security definer as $$ select codigo_indicacao from public.perfis where id = p $$;
create or replace function teste.como(p uuid) returns void language sql as $$ select set_config('request.jwt.claim.sub', coalesce(p::text, ''), false) $$;
create or replace function teste.ok(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FALHOU: %', msg; end if; raise notice 'ok  %', msg; end $$;
create or replace function teste.falha(sql text, msg text) returns void language plpgsql as $$
begin
  begin execute sql; exception when others then raise notice 'ok  % (%)', msg, sqlerrm; return; end;
  raise exception 'FALHOU: % (era para dar erro)', msg;
end $$;

-- usuárias de teste (só neste banco local)
insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a', '+5571999990001'),
  ('00000000-0000-0000-0000-00000000000b', '5571999990002'),
  ('00000000-0000-0000-0000-0000000000e1', '5571999990003'),
  ('00000000-0000-0000-0000-0000000000e2', '5571999990004');
insert into profissionais (id, nome, unidade_id) values ('p1', 'Profissional 1', 'norte-shopping'), ('p2', 'Profissional 2', 'norte-shopping');
insert into profissionais (id, nome, unidade_id, exclusiva) values ('px', 'Exclusiva', 'norte-shopping', true);

grant usage on schema teste to authenticated, service_role; grant execute on all functions in schema teste to authenticated, service_role;
set role authenticated;

-- 1. cadastro
select teste.como('00000000-0000-0000-0000-00000000000a');
select teste.falha($$select completar_cadastro('Ana Teste', null, 'Imbuí', 'Salvador', 'norte-shopping', null, false)$$, 'cadastro exige consentimento LGPD');
select teste.falha($$select completar_cadastro('Ana Teste', null, null, null, 'feira', null, true)$$, 'unidade "em breve" não aceita cadastro');
select completar_cadastro('Ana Teste', null, 'Imbuí', 'Salvador', 'norte-shopping', null, true);
select teste.ok((meu_resumo()->>'saldo')::int = 100, 'bônus de boas-vindas de 100 pontos');
select teste.ok((meu_resumo()->'nivel'->>'nome') = 'Bronze', 'nível inicial Bronze');
select teste.ok((select telefone from perfis where id = auth.uid()) = '71999990001', 'telefone vem do login, sem DDI');

select teste.como('00000000-0000-0000-0000-00000000000b');
select completar_cadastro('Bia Teste', null, null, null, 'sumare', teste.codigo_de('00000000-0000-0000-0000-00000000000a'), true);

-- 2. isolamento entre clientes (RLS)
select teste.ok((select count(*) from perfis) = 1, 'cliente só enxerga o próprio perfil');
select teste.ok((select count(*) from movimentos_pontos where cliente_id = '00000000-0000-0000-0000-00000000000a') = 0, 'cliente não vê pontos de outra');
select teste.falha($$insert into movimentos_pontos (cliente_id, tipo, pontos, descricao) values (auth.uid(), 'ajuste', 99999, 'hack')$$, 'cliente não insere pontos direto');
select teste.falha($$select creditar(auth.uid(), 'ajuste', 99999, 'hack', null, 'hack')$$, 'cliente não chama a função interna de crédito');
select teste.falha($$update perfis set papel = 'gestao' where id = auth.uid()$$, 'cliente não muda o próprio papel');
select teste.falha($$select confirmar_pagamento(gen_random_uuid(), 'x', 'x')$$, 'cliente não confirma pagamento');
select teste.falha($$select gestao_indicadores()$$, 'cliente não acessa o painel de gestão');
select teste.falha($$select equipe_usar_voucher('IMP-XXXXXX')$$, 'cliente não usa função da equipe');

-- 3. agendamento (próxima terça às 10h = happy hour)
reset role;
create temp table t (k text primary key, v text);
insert into t values ('terca', (current_date + ((9 - extract(dow from current_date)::int) % 7 + 7))::text);
grant select on t to authenticated, service_role;
set role authenticated;
select teste.como('00000000-0000-0000-0000-00000000000a');
select teste.ok((select count(*) from horarios_disponiveis('norte-shopping', 'progressiva', (select v::date from t where k = 'terca'))) > 0, 'há horários disponíveis');
select teste.falha($$select agendar('norte-shopping', 'progressiva', ((select v from t where k='terca') || ' 21:00')::timestamp at time zone 'America/Bahia')$$, 'não agenda fora do expediente');
select teste.falha($$select agendar('norte-shopping', 'progressiva', ((select v from t where k='terca') || ' 10:30')::timestamp at time zone 'America/Bahia')$$, 'não agenda fora da grade de horários');
select teste.falha($$select agendar('norte-shopping', 'progressiva', now() - interval '1 day')$$, 'não agenda no passado');
select teste.falha($$select agendar('norte-shopping', 'progressiva', ((select v from t where k='terca') || ' 10:00')::timestamp at time zone 'America/Bahia', 'px')$$, 'profissional exclusiva bloqueada para Bronze');
reset role; insert into t select 'ag_a', agendar::text from (select 1) x, lateral (select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false)) y, lateral (select agendar('norte-shopping', 'progressiva', ((select v from t where k='terca') || ' 10:00')::timestamp at time zone 'America/Bahia', 'p1')) z; set role authenticated;
select teste.ok((select preco from agendamentos where id = (select v::uuid from t where k = 'ag_a')) = 382.50, 'preço calculado no servidor com happy hour (450 − 15%)');
select teste.falha($$select agendar('norte-shopping', 'hidratacao', ((select v from t where k='terca') || ' 11:00')::timestamp at time zone 'America/Bahia', 'p2')$$, 'cliente não marca dois horários sobrepostos');
select teste.como('00000000-0000-0000-0000-00000000000b');
select teste.falha($$select agendar('sumare', 'hidratacao', ((select v from t where k='terca') || ' 11:00')::timestamp at time zone 'America/Bahia', 'p1')$$, 'profissional precisa ser da unidade');
select teste.falha($$select agendar('norte-shopping', 'hidratacao', ((select v from t where k='terca') || ' 11:00')::timestamp at time zone 'America/Bahia', 'p1')$$, 'mesma profissional não recebe dois horários sobrepostos');
select teste.ok((select count(*) from agendamentos) = 0, 'cliente B não vê o agendamento da A');
select teste.ok(not exists (select 1 from horarios_disponiveis('norte-shopping', 'hidratacao', (select v::date from t where k = 'terca'), 'p1') where hora in ('10:00', '11:00', '12:00')), 'horários ocupados somem da disponibilidade');

-- 4. equipe conclui e pontos são calculados no servidor
reset role;
insert into perfis (id, papel, nome, telefone, unidade_trabalho) values
  ('00000000-0000-0000-0000-0000000000e1', 'recepcao', 'Recepção Teste', '71999990003', 'norte-shopping'),
  ('00000000-0000-0000-0000-0000000000e2', 'gestao', 'Gestão Teste', '71999990004', null);
set role authenticated;
select teste.como('00000000-0000-0000-0000-0000000000e1');
select equipe_iniciar((select v::uuid from t where k = 'ag_a'));
select teste.falha($$select equipe_concluir((select v::uuid from t where k = 'ag_a'), 5000)$$, 'valor absurdo é recusado');
select teste.ok(equipe_concluir((select v::uuid from t where k = 'ag_a'), 382.50) = 765, 'pontos = valor × multiplicador × 2 do happy hour (765)');
select teste.falha($$select equipe_concluir((select v::uuid from t where k = 'ag_a'), 382.50)$$, 'não conclui duas vezes');
select teste.ok((select count(*) from perfis) >= 2, 'equipe enxerga as clientes');

-- 5. resgate e voucher único
select teste.como('00000000-0000-0000-0000-00000000000a');
select teste.ok((meu_resumo()->>'saldo')::int = 865, 'saldo 100 + 765 = 865');
reset role; insert into t select 'voucher', resgatar from (select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false)) x, lateral (select resgatar('hidratacao')) y; set role authenticated;
select teste.ok((meu_resumo()->>'saldo')::int = 565, 'resgate debita 300 pontos');
select teste.falha($$select resgatar('progressiva50')$$, 'resgate sem saldo suficiente é recusado');
select teste.como('00000000-0000-0000-0000-0000000000e1');
select equipe_usar_voucher((select v from t where k = 'voucher'));
select teste.falha($$select equipe_usar_voucher((select v from t where k = 'voucher'))$$, 'voucher não pode ser usado duas vezes');

-- 6. indicação: B fez o 1º atendimento, A ganha 150
select equipe_lancar_avulso('00000000-0000-0000-0000-00000000000b', 'hidratacao', 'sumare', null, 90);
select teste.como('00000000-0000-0000-0000-00000000000a');
select teste.ok((meu_resumo()->>'saldo')::int = 715, 'indicação credita 150 pontos para quem indicou');
select teste.como('00000000-0000-0000-0000-0000000000e1');
select equipe_lancar_avulso('00000000-0000-0000-0000-00000000000b', 'escova', 'sumare', null, 60);
select teste.como('00000000-0000-0000-0000-00000000000a');
select teste.ok((meu_resumo()->>'saldo')::int = 715, 'indicação só é creditada uma vez');

-- 7. aniversário idempotente
reset role; update perfis set aniversario = make_date(1990, extract(month from now() at time zone 'America/Bahia')::int, 1) where id = '00000000-0000-0000-0000-00000000000a'; set role authenticated;
select teste.ok(creditar_aniversario(), 'bônus de aniversário creditado no mês');
select teste.ok(not creditar_aniversario(), 'bônus de aniversário não duplica');

-- 8. manutenção e lembretes
select teste.ok((select count(*) from minhas_manutencoes() where servico_id = 'progressiva') = 1, 'manutenção da progressiva calculada');
reset role; select gerar_lembretes(); set role authenticated;

-- 9. loja e pagamento (confirmado só pelo servidor)
insert into carrinho values (auth.uid(), 'serum', 2);
reset role; insert into t select 'pedido', criar_pedido::text from (select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false)) x, lateral (select criar_pedido('retirada', 'norte-shopping', null)) y; set role authenticated;
select teste.ok((select total from pedidos where id = (select v::uuid from t where k = 'pedido')) = 119.80, 'total do pedido calculado no servidor');
reset role; insert into t select 'pag', criar_pagamento::text from (select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false)) x, lateral (select criar_pagamento('pedido', (select v::uuid from t where k = 'pedido'), 'pix', 1)) y;
set role service_role; select confirmar_pagamento((select v::uuid from t where k = 'pag'), 'teste', 'gw-1'); select confirmar_pagamento((select v::uuid from t where k = 'pag'), 'teste', 'gw-1');
set role authenticated; select teste.como('00000000-0000-0000-0000-00000000000a');
select teste.ok((select status::text from pedidos where id = (select v::uuid from t where k = 'pedido')) = 'pago', 'webhook marca o pedido como pago');
select teste.ok((select count(*) from movimentos_pontos where tipo = 'cashback') = 1, 'cashback creditado uma única vez');
select teste.falha($$select criar_pagamento('pedido', (select v::uuid from t where k = 'pedido'), 'imperio_pay', 4)$$, 'pedido pago não gera novo pagamento');

-- 10. dados sensíveis
select teste.como('00000000-0000-0000-0000-0000000000e1');
select equipe_salvar_passaporte('00000000-0000-0000-0000-00000000000a', '{"tipo_fio":"Ondulado 2C","alergias":"Nenhuma","tempo_pausa_min":35}');
select teste.como('00000000-0000-0000-0000-00000000000b');
select teste.ok((select count(*) from passaportes) = 0, 'cliente não lê o Passaporte de outra');
select teste.falha($$insert into fotos (cliente_id, tipo, caminho) values (auth.uid(), 'antes', '00000000-0000-0000-0000-00000000000a/x.jpg')$$, 'foto só na própria pasta');
select teste.como('00000000-0000-0000-0000-00000000000a');
select teste.ok((select count(*) from passaportes) = 1, 'cliente lê o próprio Passaporte');
select teste.ok((select count(*) from auditoria) = 0, 'cliente não lê a auditoria');
select teste.como('00000000-0000-0000-0000-0000000000e2');
select teste.ok((select count(*) from auditoria where tabela = 'passaportes') = 1, 'alteração do Passaporte fica na auditoria');
select teste.ok((gestao_indicadores(30)->>'atendimentos')::int >= 1, 'gestão acessa os indicadores');

-- 11. LGPD
select teste.como('00000000-0000-0000-0000-00000000000a');
select teste.ok(exportar_meus_dados() ? 'passaporte', 'exportação dos dados da cliente');
select excluir_minha_conta();
reset role;
select teste.ok((select excluido_em is not null and nome = 'Conta excluída' from perfis where id = '00000000-0000-0000-0000-00000000000a'), 'conta anonimizada');
select teste.ok(not exists (select 1 from passaportes where cliente_id = '00000000-0000-0000-0000-00000000000a'), 'ficha de saúde apagada');
-- 12. cadastro com Google/Apple (sem telefone no login): WhatsApp digitado e validado no servidor
insert into auth.users values ('c0ffee00-abcd-4000-8000-00000000000c', null), ('00000000-0000-0000-0000-00000000000d', '+5571999990005');
select teste.ok(not has_function_privilege('anon', 'completar_cadastro_v2(text, date, text, text, text, text, boolean, boolean, text, jsonb)', 'execute'), 'visitante sem login não chama o cadastro v2');
set role authenticated;
select teste.como('c0ffee00-abcd-4000-8000-00000000000c');
select teste.falha($$select completar_cadastro('Carla Google', null, null, null, 'norte-shopping', null, true)$$, 'cadastro antigo continua exigindo telefone do login');
select teste.falha($$select completar_cadastro_v2('Carla Google', null, null, null, 'norte-shopping', null, true)$$, 'login sem telefone precisa informar o WhatsApp');
select teste.falha($$select completar_cadastro_v2('Carla Google', null, null, null, 'norte-shopping', null, true, false, '7199999')$$, 'WhatsApp curto é recusado');
select teste.falha($$select completar_cadastro_v2('Carla Google', null, null, null, 'norte-shopping', null, true, false, '(01) 99999-0000')$$, 'DDD inválido é recusado');
select teste.falha($$select completar_cadastro_v2('Carla Google', null, null, null, 'norte-shopping', null, true, false, '71999990002')$$, 'WhatsApp que já tem cadastro é recusado');
select teste.falha($$select completar_cadastro_v2('Carla Google', null, null, null, 'norte-shopping', null, true, false, '71988887777', '["x"]')$$, 'respostas do onboarding precisam ser um objeto');
select teste.falha($$select completar_cadastro_v2('Carla Google', null, null, null, 'norte-shopping', null, false, false, '71988887777')$$, 'cadastro v2 exige consentimento LGPD');
select completar_cadastro_v2('Carla Google', null, 'Pituba', 'Salvador', 'norte-shopping', null, true, true, '+55 (71) 98888-7777',
  '{"objetivos":["manter","pontos"],"ultimaProgressiva":"1-3m","tipoCabelo":"ondulado"}');
select teste.ok((select telefone from perfis where id = auth.uid()) = '71988887777', 'WhatsApp digitado é salvo só com DDD e número');
select teste.ok((select onboarding->>'tipoCabelo' from perfis where id = auth.uid()) = 'ondulado', 'respostas do onboarding salvas no perfil');
select teste.ok((meu_resumo()->>'saldo')::int = 100, 'cadastro v2 também dá o bônus de boas-vindas');
select teste.falha($$select completar_cadastro_v2('Carla Google', null, null, null, 'norte-shopping', null, true, false, '71988887777')$$, 'cadastro v2 não duplica');
select teste.como('00000000-0000-0000-0000-00000000000d');
select completar_cadastro_v2('Dani Zap', null, null, null, 'sumare', null, true, false, '71911112222');
select teste.ok((select telefone from perfis where id = auth.uid()) = '71999990005', 'no login por WhatsApp vale o telefone confirmado, não o digitado');
select teste.ok((select onboarding from perfis where id = auth.uid()) is null, 'onboarding é opcional');
-- 13. editar o perfil de cabelo depois do cadastro
select atualizar_meu_onboarding('{"estado":"ressecado","lavagens":3,"quimicas":["coloracao"]}');
select teste.ok((select onboarding->>'estado' = 'ressecado' and (onboarding->>'lavagens')::int = 3 from perfis where id = auth.uid()), 'cliente sem onboarding passa a ter perfil de cabelo');
select teste.falha($$select atualizar_meu_onboarding('["x"]')$$, 'perfil de cabelo precisa ser um objeto');
select teste.falha($$select atualizar_meu_onboarding(null)$$, 'perfil de cabelo vazio é recusado');
select teste.falha($$select atualizar_meu_onboarding(jsonb_build_object('apelido', repeat('a', 2100)))$$, 'perfil de cabelo grande demais é recusado');
select teste.como('c0ffee00-abcd-4000-8000-00000000000c');
select atualizar_meu_onboarding('{"incomodos":["frizz","pontas"],"tipoCabelo":"cacheado"}');
select teste.ok((select onboarding->>'tipoCabelo' = 'cacheado' and onboarding->'incomodos'->>0 = 'frizz' and onboarding->'objetivos'->>0 = 'manter' from perfis where id = auth.uid()),
  'editar o perfil de cabelo mescla com as respostas do cadastro');
select teste.como(null);
select teste.falha($$select atualizar_meu_onboarding('{"estado":"saudavel"}')$$, 'sem login não edita perfil de cabelo');
reset role;
select teste.ok(not has_function_privilege('anon', 'atualizar_meu_onboarding(jsonb)', 'execute'), 'visitante sem login não chama a edição do perfil de cabelo');
select teste.ok((select onboarding->>'estado' from perfis where id = '00000000-0000-0000-0000-00000000000d') = 'ressecado' and (select onboarding->>'tipoCabelo' from perfis where id = '00000000-0000-0000-0000-00000000000d') is null, 'editar o próprio perfil não mexe no de outra cliente');
set role authenticated;
select teste.como('c0ffee00-abcd-4000-8000-00000000000c');
select excluir_minha_conta();
reset role;
select teste.ok((select onboarding is null and telefone like '00%' from perfis where id = 'c0ffee00-abcd-4000-8000-00000000000c'), 'excluir conta apaga as respostas do onboarding (id com letras não quebra a anonimização)');
-- 14. Meu Liso B2C: cadastro sem unidade (v3), cronograma, diário, diagnóstico e fotos na nuvem
grant usage on schema teste to anon; grant execute on all functions in schema teste to anon;
insert into auth.users values ('00000000-0000-0000-0000-0000000000f1', null), ('00000000-0000-0000-0000-0000000000f2', '+5571999990006');
select teste.ok(not has_function_privilege('anon', 'completar_cadastro_v3(text, date, boolean, boolean, text, jsonb)', 'execute'), 'visitante sem login não chama o cadastro v3');
select teste.ok(has_function_privilege('authenticated', 'completar_cadastro_v3(text, date, boolean, boolean, text, jsonb)', 'execute'), 'cliente logada chama o cadastro v3');
select teste.ok(not has_function_privilege('authenticated', 'tocar_atualizado_em()', 'execute'), 'função interna do atualizado_em não é chamável');
select teste.ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.cronogramas'::regclass), 'RLS ligada no cronograma');
select teste.ok((select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.diario_cabelo'::regclass), 'RLS ligada no diário');
select teste.ok(not has_table_privilege('anon', 'cronogramas', 'select') and not has_table_privilege('anon', 'diario_cabelo', 'select')
  and not has_table_privilege('anon', 'cronogramas', 'insert') and not has_table_privilege('anon', 'diario_cabelo', 'insert'), 'visitante (anon) sem permissão no cronograma e no diário');
set role anon;
select teste.falha($$select * from cronogramas$$, 'visitante não lê cronogramas');
select teste.falha($$select * from diario_cabelo$$, 'visitante não lê o diário');
select teste.falha($$select completar_cadastro_v3('Visitante', null, true)$$, 'visitante não se cadastra sem login');
set role authenticated;
select teste.como(null);
select teste.falha($$select completar_cadastro_v3('Sem Login', null, true)$$, 'cadastro v3 exige login');
select teste.como('00000000-0000-0000-0000-0000000000f1');
select teste.falha($$insert into cronogramas (cliente_id, feitos) values (auth.uid(), '{}')$$, 'sem cadastro não grava cronograma');
select teste.falha($$select completar_cadastro_v3('Fernanda Google', null, false, false, '71977776666')$$, 'cadastro v3 exige consentimento LGPD');
select teste.falha($$select completar_cadastro_v3('Fernanda Google', null, true)$$, 'cadastro v3 sem telefone no login pede o WhatsApp');
select teste.falha($$select completar_cadastro_v3('Fernanda Google', null, true, false, '(01) 99999-0000')$$, 'cadastro v3 recusa DDD inválido');
select teste.falha($$select completar_cadastro_v3('Fernanda Google', null, true, false, '71999990002')$$, 'cadastro v3 recusa WhatsApp que já tem cadastro');
select teste.falha($$select completar_cadastro_v3('Fernanda Google', null, true, false, '71977776666', '[1]')$$, 'cadastro v3: respostas precisam ser um objeto');
select teste.falha($$select completar_cadastro_v3('F', null, true, false, '71977776666')$$, 'cadastro v3 recusa nome curto');
select completar_cadastro_v3('Fernanda Google', '2000-03-15', true, true, '+55 71 97777-6666', '{"tipoCabelo":"cacheado","estado":"ressecado"}');
select teste.ok((select unidade_preferida is null and telefone = '71977776666' and aniversario = '2000-03-15' and consentimento_marketing
  and onboarding->>'tipoCabelo' = 'cacheado' and papel = 'cliente' from perfis where id = auth.uid()), 'cadastro v3 sem unidade do salão');
select teste.ok((select count(*) from movimentos_pontos) = 0, 'cadastro v3 não credita pontos do programa do salão');
select teste.ok((select count(*) from notificacoes where rota = '/cuidados' and chave = 'boas-vindas') = 1 and (select count(*) from notificacoes where rota = '/club') = 0, 'cadastro v3 cria o aviso de boas-vindas do app');
select teste.falha($$select completar_cadastro_v3('Fernanda Google', null, true, false, '71977776666')$$, 'cadastro v3 não duplica');
select teste.como('00000000-0000-0000-0000-0000000000f2');
select completar_cadastro_v3('Gabi Zap', null, true, false, '71900000000');
select teste.ok((select telefone from perfis where id = auth.uid()) = '71999990006', 'cadastro v3: no login por WhatsApp vale o telefone confirmado');
select teste.ok((select onboarding is null and unidade_preferida is null from perfis where id = auth.uid()), 'cadastro v3: onboarding é opcional');

-- cronograma: cada cliente só o seu
select teste.como('00000000-0000-0000-0000-0000000000f1');
insert into cronogramas (cliente_id, perfil, feitos, inicio, atualizado_em)
  values (auth.uid(), '{"estado":"ressecado","lavagens":3,"inicio":"2026-11-02","lembretes":true}', '{2026-11-02,2026-11-04}', '2026-11-02', '2000-01-01');
select teste.ok((select atualizado_em > now() - interval '1 minute' from cronogramas), 'atualizado_em do cronograma vem do servidor, não da cliente');
select teste.falha($$insert into cronogramas (cliente_id, feitos) values (auth.uid(), '{}')$$, 'um cronograma por cliente');
insert into cronogramas (cliente_id, perfil, feitos, inicio) values (auth.uid(), '{"estado":"ressecado","lavagens":3,"inicio":"2026-11-02","lembretes":false}', '{2026-11-02}', '2026-11-02')
  on conflict (cliente_id) do update set perfil = excluded.perfil, feitos = excluded.feitos, inicio = excluded.inicio;
select teste.ok((select perfil->>'lembretes' = 'false' and feitos = '{2026-11-02}'::date[] from cronogramas), 'cronograma regravado (upsert) pela dona');
select teste.falha($$update cronogramas set perfil = '[1]'$$, 'perfil do cronograma precisa ser um objeto');
select teste.falha($$update cronogramas set perfil = jsonb_build_object('x', repeat('a', 1100))$$, 'perfil do cronograma grande demais é recusado');
select teste.como('00000000-0000-0000-0000-0000000000f2');
select teste.ok((select count(*) from cronogramas) = 0, 'cliente não vê o cronograma de outra');
select teste.falha($$insert into cronogramas (cliente_id, feitos) values ('00000000-0000-0000-0000-0000000000f1', '{}')$$, 'cliente não grava cronograma em nome de outra');
update cronogramas set feitos = '{}' where cliente_id = '00000000-0000-0000-0000-0000000000f1';
delete from cronogramas where cliente_id = '00000000-0000-0000-0000-0000000000f1';
insert into cronogramas (cliente_id, feitos) values (auth.uid(), '{2026-11-03}');
select teste.falha($$update cronogramas set cliente_id = '00000000-0000-0000-0000-0000000000f1'$$, 'cliente não passa o próprio cronograma para outra');
select teste.como('00000000-0000-0000-0000-0000000000f1');
select teste.ok((select count(*) = 1 and bool_and(feitos = '{2026-11-02}'::date[]) from cronogramas), 'outra cliente não altera nem apaga o cronograma');

-- diário: um registro por dia, notas de 1 a 5
insert into diario_cabelo (cliente_id, dia, frizz, brilho, maciez) values (auth.uid(), '2026-11-01', 4, 2, 2), (auth.uid(), '2026-11-02', 3, 3, 3);
select teste.falha($$insert into diario_cabelo (cliente_id, dia, frizz, brilho, maciez) values (auth.uid(), '2026-11-03', 0, 3, 3)$$, 'nota de frizz abaixo de 1 é recusada');
select teste.falha($$insert into diario_cabelo (cliente_id, dia, frizz, brilho, maciez) values (auth.uid(), '2026-11-03', 3, 6, 3)$$, 'nota de brilho acima de 5 é recusada');
select teste.falha($$insert into diario_cabelo (cliente_id, dia, frizz, brilho, maciez) values (auth.uid(), '2026-11-03', 3, 3, null)$$, 'nota de maciez é obrigatória');
select teste.falha($$insert into diario_cabelo (cliente_id, dia, frizz, brilho, maciez) values (auth.uid(), '2026-11-01', 1, 1, 1)$$, 'um registro do diário por dia');
insert into diario_cabelo (cliente_id, dia, frizz, brilho, maciez) values (auth.uid(), '2026-11-01', 2, 4, 5)
  on conflict (cliente_id, dia) do update set frizz = excluded.frizz, brilho = excluded.brilho, maciez = excluded.maciez;
select teste.ok((select frizz = 2 and maciez = 5 from diario_cabelo where dia = '2026-11-01'), 'registro do dia regravado (upsert)');
select teste.como('00000000-0000-0000-0000-0000000000f2');
insert into diario_cabelo (cliente_id, dia, frizz, brilho, maciez) values (auth.uid(), '2026-11-01', 5, 1, 1);
select teste.ok((select count(*) from diario_cabelo) = 1, 'cliente só vê o próprio diário (o mesmo dia de outra não conflita)');
select teste.falha($$insert into diario_cabelo (cliente_id, dia, frizz, brilho, maciez) values ('00000000-0000-0000-0000-0000000000f1', '2026-11-05', 1, 1, 1)$$, 'cliente não grava no diário de outra');
update diario_cabelo set frizz = 1 where cliente_id = '00000000-0000-0000-0000-0000000000f1';
delete from diario_cabelo where cliente_id = '00000000-0000-0000-0000-0000000000f1';
select teste.como('00000000-0000-0000-0000-0000000000f1');
select teste.ok((select count(*) = 2 and sum(frizz) = 5 from diario_cabelo), 'outra cliente não altera nem apaga o diário');

-- diagnóstico (tabela já existente) e fotos da Evolução com o tipo novo
insert into diagnosticos (cliente_id, respostas, resultado) values (auth.uid(), '{"tipo":"cacheado"}', '{"foco":"N","fio":"Cacheado, médio"}');
insert into fotos (cliente_id, tipo, caminho) values (auth.uid(), 'evolucao', '00000000-0000-0000-0000-0000000000f1/evo1.jpg');
select teste.falha($$insert into diagnosticos (cliente_id, respostas, resultado) values ('00000000-0000-0000-0000-0000000000f2', '{}', '{}')$$, 'cliente não grava diagnóstico em nome de outra');
select teste.como('00000000-0000-0000-0000-0000000000f2');
select teste.ok((select count(*) from diagnosticos) = 0 and (select count(*) from fotos) = 0, 'cliente não vê diagnóstico nem fotos de outra');
select teste.falha($$insert into fotos (cliente_id, tipo, caminho) values (auth.uid(), 'evolucao', '00000000-0000-0000-0000-0000000000f1/evo2.jpg')$$, 'foto da Evolução só na própria pasta');
select teste.falha($$insert into fotos (cliente_id, tipo, caminho) values (auth.uid(), 'qualquer', '00000000-0000-0000-0000-0000000000f2/x.jpg')$$, 'tipo de foto fora da lista é recusado');

-- LGPD: exportação traz os dados novos; exclusão apaga
select teste.como('00000000-0000-0000-0000-0000000000f1');
select teste.ok((select (d->'cronograma'->'perfil'->>'estado') = 'ressecado' and jsonb_array_length(d->'diario_cabelo') = 2
  and (d->'diario_cabelo'->0->>'dia') = '2026-11-01' and jsonb_array_length(d->'diagnosticos') = 1
  and (d->'fotos'->0->>'tipo') = 'evolucao' and d ? 'passaporte' and d ? 'pontos' from (select exportar_meus_dados() d) x), 'exportação inclui cronograma, diário, diagnóstico e fotos');
select teste.como('00000000-0000-0000-0000-0000000000f2');
select teste.ok((select jsonb_array_length(d->'diario_cabelo') = 1 and (d->'cronograma'->>'cliente_id') = '00000000-0000-0000-0000-0000000000f2'
  and jsonb_array_length(d->'diagnosticos') = 0 from (select exportar_meus_dados() d) x), 'exportação só traz os dados da própria cliente');
select teste.como('00000000-0000-0000-0000-0000000000f1');
select excluir_minha_conta();
select teste.falha($$insert into diario_cabelo (cliente_id, dia, frizz, brilho, maciez) values (auth.uid(), '2026-11-06', 3, 3, 3)$$, 'conta excluída não grava mais no diário');
select teste.ok((select count(*) from cronogramas) = 0, 'conta excluída não lê mais o cronograma');
reset role;
select teste.ok(not exists (select 1 from cronogramas where cliente_id = '00000000-0000-0000-0000-0000000000f1'), 'excluir conta apaga o cronograma');
select teste.ok(not exists (select 1 from diario_cabelo where cliente_id = '00000000-0000-0000-0000-0000000000f1'), 'excluir conta apaga o diário');
select teste.ok(not exists (select 1 from diagnosticos where cliente_id = '00000000-0000-0000-0000-0000000000f1')
  and not exists (select 1 from fotos where cliente_id = '00000000-0000-0000-0000-0000000000f1'), 'excluir conta apaga diagnóstico e fotos');
select teste.ok((select excluido_em is not null and onboarding is null and telefone like '00%' from perfis where id = '00000000-0000-0000-0000-0000000000f1'), 'conta do cadastro v3 anonimizada');
select teste.ok((select count(*) from cronogramas where cliente_id = '00000000-0000-0000-0000-0000000000f2') = 1
  and (select count(*) from diario_cabelo where cliente_id = '00000000-0000-0000-0000-0000000000f2') = 1, 'excluir uma conta não mexe nos dados de outra');
select teste.ok(has_function_privilege('authenticated', 'completar_cadastro_v2(text, date, text, text, text, text, boolean, boolean, text, jsonb)', 'execute'), 'cadastro v2 continua disponível (versões antigas do app)');
\echo '\nTODOS OS TESTES PASSARAM'
