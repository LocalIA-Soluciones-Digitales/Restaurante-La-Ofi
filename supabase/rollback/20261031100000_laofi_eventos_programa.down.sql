-- Reversión de 20261031100000_laofi_eventos_programa. Ejecutar ANTES que las reversiones anteriores.
-- Versión anterior de evento_json (20261029100000_laofi_reservas_espacios).
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
    'media', e.media,
    'aviso_web', e.aviso_web
  );
$$;

alter table laofi.eventos drop column if exists programa;
