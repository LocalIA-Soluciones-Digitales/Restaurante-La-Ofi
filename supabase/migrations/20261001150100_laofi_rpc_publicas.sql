-- =============================================================================
-- Restaurante La Ofi — RPC públicas de lectura (prefijo laofi_)
-- -----------------------------------------------------------------------------
-- Única vía de lectura para la web pública (anon). SECURITY DEFINER con
-- search_path fijo; cada función comprueba que la site_key recibida es la de
-- La Ofi y que el tenant está activo (laofi.site_key_valida). Con cualquier otra
-- site_key devuelven vacío: no exponen datos de La Ofi a otros proyectos ni al
-- revés. Solo lectura y sin campos internos. Reversión: supabase/rollback/.
-- =============================================================================

-- Carta completa en una sola llamada: categorías visibles con sus productos disponibles.
create or replace function public.laofi_get_carta(p_site_key uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', c.id,
             'slug', c.slug,
             'nombre', c.nombre,
             'descripcion', c.descripcion,
             'tipo', c.tipo,
             'productos', (
               select coalesce(jsonb_agg(jsonb_build_object(
                        'id', p.id,
                        'nombre', p.nombre,
                        'descripcion', p.descripcion,
                        'precio_centimos', p.precio_centimos,
                        'imagen_url', p.imagen_url,
                        'alergenos', p.alergenos,
                        'destacado', p.destacado
                      ) order by p.orden, p.nombre), '[]'::jsonb)
               from laofi.productos p
               where p.categoria_id = c.id and p.disponible
             )
           ) order by c.orden, c.nombre), '[]'::jsonb)
  from laofi.categorias c
  where c.visible and laofi.site_key_valida(p_site_key);
$$;

-- Menú/plato del día de una fecha (por defecto hoy en horario peninsular). null si no hay.
create or replace function public.laofi_get_menu_dia(p_site_key uuid, p_fecha date default null)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select jsonb_build_object(
    'id', m.id,
    'fecha', m.fecha,
    'precio_centimos', m.precio_centimos,
    'bebida_incluida', m.bebida_incluida,
    'pan_incluido', m.pan_incluido,
    'postre_o_cafe', m.postre_o_cafe,
    'notas', m.notas,
    'disponible', m.disponible,
    'platos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'tipo', p.tipo, 'nombre', p.nombre,
               'descripcion', p.descripcion, 'alergenos', p.alergenos, 'orden', p.orden
             ) order by p.orden)
      from laofi.menu_dia_platos p
      where p.menu_id = m.id
    ), '[]'::jsonb)
  )
  from laofi.menus_dia m
  where laofi.site_key_valida(p_site_key)
    and m.disponible
    and m.fecha = coalesce(p_fecha, (now() at time zone 'Europe/Madrid')::date);
$$;

-- Representación pública de un evento. Un evento "proximo"/"agotado" cuya fecha
-- ya pasó se devuelve como "finalizado".
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

create or replace function public.laofi_get_eventos(p_site_key uuid, p_incluir_pasados boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select coalesce(jsonb_agg(laofi.evento_json(e) order by e.fecha, e.hora nulls last), '[]'::jsonb)
  from laofi.eventos e
  where laofi.site_key_valida(p_site_key)
    and e.publicado
    and (p_incluir_pasados or e.fecha >= (now() at time zone 'Europe/Madrid')::date);
$$;

create or replace function public.laofi_get_evento(p_site_key uuid, p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select laofi.evento_json(e)
  from laofi.eventos e
  where laofi.site_key_valida(p_site_key) and e.publicado and e.slug = p_slug;
$$;

-- Horario semanal (7 filas como mucho, ordenadas de lunes a domingo).
create or replace function public.laofi_get_horario(p_site_key uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'dia', h.dia,
           'estado', h.estado,
           'desde', to_char(h.desde, 'HH24:MI'),
           'hasta', to_char(h.hasta, 'HH24:MI')
         ) order by h.dia), '[]'::jsonb)
  from laofi.horario h
  where laofi.site_key_valida(p_site_key);
$$;

-- Permisos --------------------------------------------------------------------
revoke all on function laofi.evento_json(laofi.eventos) from public, anon;
grant execute on function laofi.evento_json(laofi.eventos) to authenticated, service_role;

revoke all on function public.laofi_get_carta(uuid) from public;
revoke all on function public.laofi_get_menu_dia(uuid, date) from public;
revoke all on function public.laofi_get_eventos(uuid, boolean) from public;
revoke all on function public.laofi_get_evento(uuid, text) from public;
revoke all on function public.laofi_get_horario(uuid) from public;
grant execute on function public.laofi_get_carta(uuid) to anon, authenticated, service_role;
grant execute on function public.laofi_get_menu_dia(uuid, date) to anon, authenticated, service_role;
grant execute on function public.laofi_get_eventos(uuid, boolean) to anon, authenticated, service_role;
grant execute on function public.laofi_get_evento(uuid, text) to anon, authenticated, service_role;
grant execute on function public.laofi_get_horario(uuid) to anon, authenticated, service_role;
