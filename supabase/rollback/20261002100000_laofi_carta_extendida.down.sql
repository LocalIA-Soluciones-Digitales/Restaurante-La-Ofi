-- Reversión de 20261002100000_laofi_carta_extendida.
-- Borra modificadores y las columnas nuevas de productos (se pierden esos datos:
-- hacer copia antes) y restaura las RPC laofi_get_carta / laofi_get_menu_dia de
-- 20261001150100. Ejecutar ANTES que la reversión base si se revierte todo.
drop trigger if exists trg_menu_dia_platos_tocar on laofi.menu_dia_platos;
drop function if exists laofi.tocar_menu_dia();
drop table if exists laofi.modificador_opciones;
drop table if exists laofi.modificadores;

create or replace function public.laofi_get_carta(p_site_key uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id', c.id, 'slug', c.slug, 'nombre', c.nombre, 'descripcion', c.descripcion, 'tipo', c.tipo,
             'productos', (
               select coalesce(jsonb_agg(jsonb_build_object(
                        'id', p.id, 'nombre', p.nombre, 'descripcion', p.descripcion,
                        'precio_centimos', p.precio_centimos, 'imagen_url', p.imagen_url,
                        'alergenos', p.alergenos, 'destacado', p.destacado
                      ) order by p.orden, p.nombre), '[]'::jsonb)
               from laofi.productos p
               where p.categoria_id = c.id and p.disponible
             )
           ) order by c.orden, c.nombre), '[]'::jsonb)
  from laofi.categorias c
  where c.visible and laofi.site_key_valida(p_site_key);
$$;

create or replace function public.laofi_get_menu_dia(p_site_key uuid, p_fecha date default null)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select jsonb_build_object(
    'id', m.id, 'fecha', m.fecha, 'precio_centimos', m.precio_centimos,
    'bebida_incluida', m.bebida_incluida, 'pan_incluido', m.pan_incluido,
    'postre_o_cafe', m.postre_o_cafe, 'notas', m.notas, 'disponible', m.disponible,
    'platos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'tipo', p.tipo, 'nombre', p.nombre,
               'descripcion', p.descripcion, 'alergenos', p.alergenos, 'orden', p.orden
             ) order by p.orden)
      from laofi.menu_dia_platos p where p.menu_id = m.id
    ), '[]'::jsonb)
  )
  from laofi.menus_dia m
  where laofi.site_key_valida(p_site_key) and m.disponible
    and m.fecha = coalesce(p_fecha, (now() at time zone 'Europe/Madrid')::date);
$$;

drop function if exists laofi.producto_json(laofi.productos);

alter table laofi.productos
  drop constraint if exists productos_sin_gluten_coherente,
  drop constraint if exists productos_momento_valido,
  drop constraint if exists productos_etiquetas_validas,
  drop constraint if exists productos_nutricion_con_fuente,
  drop column if exists ingredientes,
  drop column if exists calorias,
  drop column if exists proteinas_g,
  drop column if exists carbohidratos_g,
  drop column if exists grasas_g,
  drop column if exists nutricion_fuente,
  drop column if exists alergenos_confirmados,
  drop column if exists imagenes,
  drop column if exists video_url,
  drop column if exists etiquetas,
  drop column if exists momento,
  drop column if exists estacion,
  drop column if exists maridaje,
  drop column if exists iva_pct;

drop function if exists laofi.etiquetas_validas(text[]);
drop function if exists laofi.momentos_validos(text[]);
