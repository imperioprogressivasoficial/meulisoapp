-- =========================================================
-- Storage privado das fotos e rotina diária de lembretes
-- (rodar no projeto Supabase; usa os esquemas storage e cron)
-- =========================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-clientes', 'fotos-clientes', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- cada cliente só acessa a própria pasta: fotos-clientes/<id-da-cliente>/arquivo.jpg
create policy "cliente le as proprias fotos" on storage.objects for select
  using (bucket_id = 'fotos-clientes' and ((storage.foldername(name))[1] = auth.uid()::text or public.eh_equipe()));
create policy "cliente envia na propria pasta" on storage.objects for insert
  with check (bucket_id = 'fotos-clientes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "cliente apaga as proprias fotos" on storage.objects for delete
  using (bucket_id = 'fotos-clientes' and (storage.foldername(name))[1] = auth.uid()::text);

-- lembretes todo dia às 9h de Salvador (12h UTC)
create extension if not exists pg_cron;
select cron.schedule('imperio-lembretes', '0 12 * * *', $$ select public.gerar_lembretes() $$);
