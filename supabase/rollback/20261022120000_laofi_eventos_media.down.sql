-- Reversión de 20261022120000_laofi_eventos_media. Se pierde la lista de fotos y
-- vídeos de cada evento (los archivos quedan en el bucket laofi-eventos).
-- Ejecutar ANTES que las reversiones anteriores.
do $$
begin
  if to_regclass('storage.buckets') is null then return; end if;
  execute 'drop policy if exists laofi_eventos_subida on storage.objects';
  execute 'drop policy if exists laofi_eventos_borrado on storage.objects';
end;
$$;

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
    'enlace_reserva', e.enlace_reserva
  );
$$;

alter table laofi.eventos drop column if exists media;
