-- =========================================================
-- Configuração inicial do negócio (catálogo e regras).
-- Não contém clientes nem dados fictícios.
-- Valores marcados como SUGESTÃO devem ser confirmados pela gestão.
-- =========================================================

insert into config (chave, valor, descricao) values
  ('pontos_por_real', '1', 'Pontos por R$ 1 gasto'),
  ('validade_pontos_meses', '12', 'Validade dos pontos e janela do nível'),
  ('bonus_boas_vindas', '100', 'SUGESTÃO'),
  ('bonus_aniversario', '200', 'SUGESTÃO'),
  ('bonus_indicacao', '150', 'SUGESTÃO'),
  ('bonus_post', '50', 'SUGESTÃO'),
  ('cashback_app', '0.05', 'SUGESTÃO: fração do valor pago no app que volta em pontos'),
  ('comissao_embaixadora', '30', 'SUGESTÃO: R$ por indicada no 1º procedimento'),
  ('min_seguidores_embaixadora', '1000', 'SUGESTÃO'),
  ('frete', '15', 'SUGESTÃO'),
  ('parcelas_cartao', '12', ''),
  ('parcelas_imperio_pay', '4', 'SUGESTÃO'),
  ('intervalo_retoque_plano', '80', 'Dias mínimos entre retoques inclusos no plano'),
  ('horarios', '["10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"]', 'Horários de início'),
  ('happy_hour', '{"dias":[2,3,4],"horas":["10:00","11:00","12:00"],"desconto":0.15,"multiplicador":2}', 'SUGESTÃO'),
  ('etapas', '[{"nome":"Lavagem","peso":0.12},{"nome":"Aplicação","peso":0.28},{"nome":"Pausa","peso":0.25},{"nome":"Escova","peso":0.2},{"nome":"Finalização","peso":0.15}]', 'Etapas do acompanhamento ao vivo')
on conflict (chave) do nothing;

-- TODO: WhatsApp e coordenadas reais de cada unidade
insert into unidades (id, nome, cidade, whatsapp, lat, lng, abre, fecha, em_breve) values
  ('norte-shopping', 'Salvador Norte Shopping', 'Salvador', null, null, null, '10:00', '22:00', false),
  ('sumare', 'Shopping Sumaré', 'Salvador', null, null, null, '10:00', '22:00', false),
  ('feira', 'Feira de Santana', 'Feira de Santana', null, null, null, '10:00', '22:00', true)
on conflict (id) do nothing;

-- Intervalos de manutenção definidos pela Império; preços são SUGESTÃO
insert into servicos (id, nome, preco, duracao_min, manutencao_dias, garantia_dias) values
  ('progressiva', 'Progressiva', 450, 180, 90, 60),
  ('selagem', 'Selagem', 350, 150, 75, 45),
  ('botox', 'Botox capilar', 220, 120, 60, 30),
  ('reconstrucao', 'Reconstrução', 150, 60, 30, 0),
  ('hidratacao', 'Hidratação', 90, 45, 21, 0),
  ('escova', 'Escova modelada', 60, 45, 0, 0),
  ('corte', 'Corte', 80, 45, 0, 0)
on conflict (id) do nothing;

insert into niveis (nome, ordem, minimo, multiplicador, beneficios) values
  ('Bronze', 1, 0, 1, '{"1 ponto por R$ 1","Bônus de aniversário"}'),
  ('Prata', 2, 1500, 1.25, '{"1,25x pontos","Hidratação de aniversário"}'),
  ('Ouro', 3, 4000, 1.5, '{"1,5x pontos","Prioridade na fila de encaixe","Kit home care de aniversário"}'),
  ('Diamante', 4, 8000, 2, '{"2x pontos","Horário com a Tássia","Evento anual exclusivo"}')
on conflict (nome) do nothing;

insert into recompensas (id, nome, descricao, custo) values
  ('hidratacao', 'Hidratação grátis', 'Uma hidratação profunda em qualquer unidade', 300),
  ('escova', 'Escova modelada', 'Escova com finalização', 350),
  ('desconto50', 'R$ 50 de desconto', 'Vale em qualquer serviço acima de R$ 200', 500),
  ('kit', 'Kit Home Care', 'Shampoo e máscara pós-progressiva', 800),
  ('botox', 'Botox capilar', 'Um botox capilar completo', 1200),
  ('progressiva50', 'Progressiva com 50% off', 'Metade do valor na próxima progressiva', 1800)
on conflict (id) do nothing;

insert into planos (id, nome, preco, hidratacoes_mes, botox_mes, retoque_incluso, desconto_progressiva, desconto_produtos, pontos_em_dobro, acesso_exclusivo, beneficios) values
  ('essencial', 'Essencial', 69.90, 1, 0, false, 0.20, 0.10, false, false, '{"1 hidratação por mês","20% off na progressiva","10% off em produtos"}'),
  ('premium', 'Premium', 149.90, 1, 0, true, 1, 0.15, false, false, '{"Retoque de progressiva a cada 90 dias","1 hidratação por mês","15% off em produtos","Atendimento prioritário"}'),
  ('vip', 'VIP', 219.90, 2, 1, true, 1, 0.20, true, true, '{"Retoque de progressiva a cada 90 dias","2 hidratações e 1 botox por mês","20% off em produtos","Horário com a Tássia","Pontos em dobro"}')
on conflict (id) do nothing;

insert into produtos (id, nome, descricao, preco, categoria, duracao_dias, recomendado_para) values
  ('kit-pos', 'Kit Pós-Química', 'Shampoo sem sal, máscara e leave-in', 159.90, 'kit', 60, '{progressiva,selagem}'),
  ('kit-nutricao', 'Kit Nutrição Intensa', 'Shampoo, condicionador e óleo', 139.90, 'kit', 60, '{hidratacao,botox}'),
  ('kit-reconstrucao', 'Kit Reconstrução', 'Máscara de queratina e ampolas', 129.90, 'kit', 45, '{reconstrucao}'),
  ('shampoo', 'Shampoo Nutrição', 'Sem sal, para cabelos com química', 49.90, 'produto', 45, '{progressiva,selagem}'),
  ('mascara', 'Máscara Pós-Progressiva', 'Hidratação profunda semanal', 69.90, 'produto', 60, '{progressiva,botox}'),
  ('leave-in', 'Leave-in Termoprotetor', 'Protege da prancha e do secador', 54.90, 'produto', 60, '{escova,progressiva}'),
  ('serum', 'Sérum Antifrizz', 'Controle da umidade de Salvador', 59.90, 'produto', 75, '{progressiva,selagem}'),
  ('oleo', 'Óleo Reparador', 'Pontas seladas e brilho', 44.90, 'produto', 90, '{reconstrucao,hidratacao}')
on conflict (id) do nothing;

-- Profissionais: cadastrar os nomes reais pela área de gestão
