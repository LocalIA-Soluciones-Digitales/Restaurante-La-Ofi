-- Programa de un evento (29/10/2026): un mismo día puede tener varias partes, p. ej.
-- actuación a las 13:00 y DJ de 17:00 a 23:30, cada una con su cartel. Se guarda en
-- eventos.programa como [{hora, hora_fin, titulo, descripcion, imagen}, …] (en orden).
alter table laofi.eventos
  add column if not exists programa jsonb not null default '[]'::jsonb
    check (jsonb_typeof(programa) = 'array' and jsonb_array_length(programa) <= 12);

-- Representación pública: la misma de 20261029100000 + programa.
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
    'aviso_web', e.aviso_web,
    'programa', e.programa
  );
$$;
