-- Fotos y vídeos de los eventos: se suben desde /admin/eventos al bucket público
-- laofi-eventos y se guardan en eventos.media como [{tipo, url}, …] (en orden).
alter table laofi.eventos
  add column if not exists media jsonb not null default '[]'::jsonb
    check (jsonb_typeof(media) = 'array' and jsonb_array_length(media) <= 20);

-- Representación pública: la misma de antes + media.
create or replace function laofi.evento_json(e laofi.eventos)
returns jsonb
language sql
stable
set search_path = public, laofi
as $$
  select jsonb_build_object(
    'id', e.id, 'titulo', e.titulo, 'slug', e.slug, 'tipo', e.tipo,
    'descripcion', e.descripcion, 'imagen_url', e.imagen_url,
    'fecha', e.fecha, 'hora', e.hora, 'precio_centimos', e.precio_centimos, 'aforo', e.aforo,
    'estado', case
                when e.estado in ('proximo', 'agotado')
                     and e.fecha < (now() at time zone 'Europe/Madrid')::date then 'finalizado'
                else e.estado
              end,
    'enlace_reserva', e.enlace_reserva,
    'media', e.media
  );
$$;

-- Bucket público (solo en Supabase: PGlite no tiene Storage). Lectura pública por
-- URL; subir y borrar, solo gestores de La Ofi. 50 MB por archivo (vídeos cortos).
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('laofi-eventos', 'laofi-eventos', true, 52428800,
          array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'])
  on conflict (id) do nothing;
  execute 'drop policy if exists laofi_eventos_subida on storage.objects';
  execute 'create policy laofi_eventos_subida on storage.objects for insert to authenticated with check (bucket_id = ''laofi-eventos'' and laofi.es_gestor())';
  execute 'drop policy if exists laofi_eventos_borrado on storage.objects';
  execute 'create policy laofi_eventos_borrado on storage.objects for delete to authenticated using (bucket_id = ''laofi-eventos'' and laofi.es_gestor())';
end;
$$;
