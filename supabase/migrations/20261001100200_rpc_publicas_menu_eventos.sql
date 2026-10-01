-- =============================================================================
-- RPC públicas de menú del día y eventos (lectura por site_key)
-- -----------------------------------------------------------------------------
-- Mismo patrón que get_carta_publica / get_categorias_publica: SECURITY DEFINER,
-- search_path fijo, el tenant se resuelve SIEMPRE en servidor con
-- cliente_id_from_site_key() (que además exige clientes.estado = 'activo').
-- Nunca se acepta un cliente_id del navegador. Solo lectura.
-- Reversión: supabase/rollback/. NO APLICAR EN PRODUCCIÓN sin revisión.
-- =============================================================================

-- Menú del día de una fecha (por defecto, hoy en horario peninsular). null si no hay.
create or replace function public.get_menu_dia_publico(p_site_key uuid, p_fecha date default null)
returns jsonb
language sql
stable
security definer
set search_path = public, restaurant
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
               'id', p.id,
               'tipo', p.tipo,
               'nombre', p.nombre,
               'descripcion', p.descripcion,
               'alergenos', p.alergenos,
               'orden', p.orden
             ) order by p.orden, p.created_at)
      from restaurant.menu_dia_platos p
      where p.menu_id = m.id and p.cliente_id = m.cliente_id
    ), '[]'::jsonb)
  )
  from restaurant.menus_dia m
  where m.cliente_id = public.cliente_id_from_site_key(p_site_key)
    and m.fecha = coalesce(p_fecha, (now() at time zone 'Europe/Madrid')::date)
    and m.disponible;
$$;

-- Representación pública de un evento (sin cliente_id ni campos internos). Un
-- evento "proximo" cuya fecha ya pasó se devuelve como "finalizado".
create or replace function restaurant.evento_publico_json(e restaurant.eventos)
returns jsonb
language sql
stable
set search_path = public, restaurant
as $$
  select jsonb_build_object(
    'id', e.id,
    'titulo', e.titulo,
    'slug', e.slug,
    'tipo', e.tipo,
    'descripcion', e.descripcion,
    'imagen_url', e.imagen_url,
    'fecha', e.fecha,
    'hora', e.hora,
    'precio_centimos', e.precio_centimos,
    'aforo', e.aforo,
    'estado', case
                when e.estado in ('proximo', 'agotado')
                     and e.fecha < (now() at time zone 'Europe/Madrid')::date then 'finalizado'
                else e.estado
              end,
    'enlace_reserva', e.enlace_reserva
  );
$$;

-- Eventos publicados del tenant. Por defecto solo los de hoy en adelante.
create or replace function public.get_eventos_publicos(p_site_key uuid, p_incluir_pasados boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = public, restaurant
as $$
  select coalesce(jsonb_agg(restaurant.evento_publico_json(e) order by e.fecha, e.hora nulls last), '[]'::jsonb)
  from restaurant.eventos e
  where e.cliente_id = public.cliente_id_from_site_key(p_site_key)
    and e.publicado
    and (p_incluir_pasados or e.fecha >= (now() at time zone 'Europe/Madrid')::date);
$$;

-- Un evento publicado por slug (null si no existe o no está publicado).
create or replace function public.get_evento_publico(p_site_key uuid, p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, restaurant
as $$
  select restaurant.evento_publico_json(e)
  from restaurant.eventos e
  where e.cliente_id = public.cliente_id_from_site_key(p_site_key)
    and e.slug = p_slug
    and e.publicado;
$$;

-- Permisos: las RPC públicas son la única vía de lectura para anon (diseño
-- intencionado de la plataforma). El helper interno no es invocable desde la API.
revoke all on function restaurant.evento_publico_json(restaurant.eventos) from public, anon, authenticated;
grant execute on function restaurant.evento_publico_json(restaurant.eventos) to service_role;

revoke all on function public.get_menu_dia_publico(uuid, date) from public;
revoke all on function public.get_eventos_publicos(uuid, boolean) from public;
revoke all on function public.get_evento_publico(uuid, text) from public;
grant execute on function public.get_menu_dia_publico(uuid, date) to anon, authenticated, service_role;
grant execute on function public.get_eventos_publicos(uuid, boolean) to anon, authenticated, service_role;
grant execute on function public.get_evento_publico(uuid, text) to anon, authenticated, service_role;
