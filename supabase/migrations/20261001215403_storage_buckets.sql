-- ============================================================================
-- 4) Supabase Storage — mídia dos exercícios (imagens, GIFs, animações, vídeos)
--
-- Os arquivos NUNCA ficam nas tabelas: a tabela `exercise_media` guarda só os metadados
-- (bucket + caminho + tipo/tamanho/dimensões) e o app lê o arquivo pelo Storage.
--
--   catalog-media  PÚBLICO para leitura; só administradores (catalog.manage) escrevem.
--   user-media     PRIVADO; cada usuário só enxerga/escreve a pasta   <user_id>/…
--
-- Limite de 50 MB por arquivo (teto do plano gratuito).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalog-media', 'catalog-media', true, 52428800,
   array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm']),
  ('user-media', 'user-media', false, 52428800,
   array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
         'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- user-media: pasta = id do usuário
create policy user_media_select on storage.objects for select to authenticated
  using (bucket_id = 'user-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy user_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'user-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy user_media_update on storage.objects for update to authenticated
  using (bucket_id = 'user-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'user-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy user_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'user-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- catalog-media: leitura pública pelo bucket; escrita só de quem gerencia o catálogo
create policy catalog_media_write on storage.objects for all to authenticated
  using (bucket_id = 'catalog-media' and (select private.has_permission('catalog.manage')))
  with check (bucket_id = 'catalog-media' and (select private.has_permission('catalog.manage')));
