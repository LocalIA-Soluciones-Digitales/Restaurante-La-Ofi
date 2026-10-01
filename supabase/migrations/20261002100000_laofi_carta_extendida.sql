-- =============================================================================
-- Restaurante La Ofi — carta extendida (carta interactiva y pedidos)
-- -----------------------------------------------------------------------------
-- Aditiva dentro del schema laofi: columnas nuevas, todas opcionales o con valor
-- por defecto, y dos tablas nuevas (modificadores). No toca nada fuera de laofi
-- salvo redefinir las RPC propias public.laofi_get_carta / laofi_get_menu_dia.
-- Reversión: supabase/rollback/20261002100000_laofi_carta_extendida.down.sql
--
-- Regla de datos (PROMPT_REDISENO §0.1): nada inventado.
--  · Nutrición: solo si el restaurante la facilita (nutricion_fuente =
--    'restaurante') o, en la demo, como ejemplo marcado ('ejemplo'). Si no hay
--    dato, todo queda a null y la web no muestra la sección (nunca "0 kcal").
--  · Alérgenos: `alergenos_confirmados` distingue "no tiene alérgenos" de "aún no
--    lo sabemos". Los filtros de la carta solo dan por seguro un plato confirmado.
-- =============================================================================

-- Productos -----------------------------------------------------------------
alter table laofi.productos
  add column ingredientes text[] not null default '{}',
  add column calorias integer check (calorias is null or calorias between 0 and 5000),
  add column proteinas_g numeric(6, 1) check (proteinas_g is null or proteinas_g >= 0),
  add column carbohidratos_g numeric(6, 1) check (carbohidratos_g is null or carbohidratos_g >= 0),
  add column grasas_g numeric(6, 1) check (grasas_g is null or grasas_g >= 0),
  add column nutricion_fuente text check (nutricion_fuente in ('restaurante', 'ejemplo')),
  add column alergenos_confirmados boolean not null default false,
  add column imagenes text[] not null default '{}',
  add column video_url text check (video_url is null or video_url ~ '^(https://|/)'),
  add column etiquetas text[] not null default '{}',
  add column momento text[] not null default '{}',
  add column estacion text not null default 'cocina' check (estacion in ('cocina', 'barra')),
  add column maridaje text,
  -- IVA aplicable (hostelería: 10 % comida y bebida sin alcohol, 21 % alcohol).
  add column iva_pct numeric(4, 1) not null default 10 check (iva_pct in (4, 10, 21));

-- Si hay algún dato nutricional, su procedencia es obligatoria.
alter table laofi.productos add constraint productos_nutricion_con_fuente check (
  (calorias is null and proteinas_g is null and carbohidratos_g is null and grasas_g is null)
  or nutricion_fuente is not null
);

create or replace function laofi.etiquetas_validas(p text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p <@ array['casero', 'temporada', 'brasa', 'recomendado', 'vegetariano', 'vegano', 'sin_gluten',
                    'para_picar', 'picante', 'nuevo'];
$$;

create or replace function laofi.momentos_validos(p text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p <@ array['desayuno', 'mediodia', 'tarde'];
$$;

alter table laofi.productos
  add constraint productos_etiquetas_validas check (laofi.etiquetas_validas(etiquetas)),
  add constraint productos_momento_valido check (laofi.momentos_validos(momento)),
  -- "sin_gluten" es una afirmación de seguridad alimentaria: solo con alérgenos
  -- confirmados y sin gluten declarado.
  add constraint productos_sin_gluten_coherente check (
    not ('sin_gluten' = any (etiquetas)) or (alergenos_confirmados and not ('gluten' = any (alergenos)))
  );

-- Modificadores (punto de la carne, sin cebolla, extra…) ------------------------
create table laofi.modificadores (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references laofi.productos(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  -- unico = elegir una opción (radio); multiple = varias (checkbox).
  tipo text not null default 'unico' check (tipo in ('unico', 'multiple')),
  obligatorio boolean not null default false,
  max_opciones smallint check (max_opciones is null or max_opciones > 0),
  orden smallint not null default 0
);
create index modificadores_producto_idx on laofi.modificadores (producto_id, orden);

create table laofi.modificador_opciones (
  id uuid primary key default gen_random_uuid(),
  modificador_id uuid not null references laofi.modificadores(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) > 0),
  precio_extra_centimos integer not null default 0 check (precio_extra_centimos >= 0),
  disponible boolean not null default true,
  orden smallint not null default 0
);
create index modificador_opciones_mod_idx on laofi.modificador_opciones (modificador_id, orden);

do $$
declare t text;
begin
  foreach t in array array['modificadores', 'modificador_opciones'] loop
    execute format('alter table laofi.%I enable row level security', t);
    execute format('create policy %I on laofi.%I for all to authenticated using (laofi.es_gestor()) with check (laofi.es_gestor())', t || '_gestores', t);
    execute format('revoke all on laofi.%I from public, anon', t);
    execute format('grant select, insert, update, delete on laofi.%I to authenticated', t);
    execute format('grant all on laofi.%I to service_role', t);
  end loop;
end;
$$;

-- Menú del día: editar un plato actualiza la marca de tiempo del menú --------------
-- ("actualizado hoy a las 10:12" en la web).
create or replace function laofi.tocar_menu_dia()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  update laofi.menus_dia set updated_at = now()
  where id = coalesce(new.menu_id, old.menu_id);
  return null;
end;
$$;

create trigger trg_menu_dia_platos_tocar
after insert or update or delete on laofi.menu_dia_platos
for each row execute function laofi.tocar_menu_dia();

-- RPC públicas (redefinidas con los campos nuevos) -----------------------------
create or replace function laofi.producto_json(p laofi.productos)
returns jsonb
language sql
stable
set search_path = public, laofi
as $$
  select jsonb_build_object(
    'id', p.id,
    'nombre', p.nombre,
    'descripcion', p.descripcion,
    'precio_centimos', p.precio_centimos,
    'imagen_url', p.imagen_url,
    'imagenes', p.imagenes,
    'video_url', p.video_url,
    'alergenos', p.alergenos,
    'alergenos_confirmados', p.alergenos_confirmados,
    'destacado', p.destacado,
    'ingredientes', p.ingredientes,
    'nutricion', case when p.nutricion_fuente is null then null else jsonb_build_object(
      'calorias', p.calorias,
      'proteinas_g', p.proteinas_g,
      'carbohidratos_g', p.carbohidratos_g,
      'grasas_g', p.grasas_g,
      'fuente', p.nutricion_fuente
    ) end,
    'etiquetas', p.etiquetas,
    'momento', p.momento,
    'estacion', p.estacion,
    'maridaje', p.maridaje,
    'modificadores', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'nombre', m.nombre, 'tipo', m.tipo, 'obligatorio', m.obligatorio,
               'max_opciones', m.max_opciones,
               'opciones', coalesce((
                 select jsonb_agg(jsonb_build_object('id', o.id, 'nombre', o.nombre, 'precio_extra_centimos', o.precio_extra_centimos) order by o.orden, o.nombre)
                 from laofi.modificador_opciones o
                 where o.modificador_id = m.id and o.disponible
               ), '[]'::jsonb)
             ) order by m.orden, m.nombre)
      from laofi.modificadores m
      where m.producto_id = p.id
    ), '[]'::jsonb)
  );
$$;

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
               select coalesce(jsonb_agg(laofi.producto_json(p) order by p.orden, p.nombre), '[]'::jsonb)
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
    'id', m.id,
    'fecha', m.fecha,
    'precio_centimos', m.precio_centimos,
    'bebida_incluida', m.bebida_incluida,
    'pan_incluido', m.pan_incluido,
    'postre_o_cafe', m.postre_o_cafe,
    'notas', m.notas,
    'disponible', m.disponible,
    'updated_at', m.updated_at,
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

-- Permisos ------------------------------------------------------------------------
revoke all on function laofi.producto_json(laofi.productos) from public, anon;
grant execute on function laofi.producto_json(laofi.productos) to authenticated, service_role;
revoke all on function laofi.tocar_menu_dia() from public, anon;
grant execute on function laofi.etiquetas_validas(text[]), laofi.momentos_validos(text[]) to authenticated, service_role;
-- create or replace conserva los GRANT existentes de las RPC públicas; se repiten
-- explícitamente para que la migración sea autocontenida.
revoke all on function public.laofi_get_carta(uuid) from public;
revoke all on function public.laofi_get_menu_dia(uuid, date) from public;
grant execute on function public.laofi_get_carta(uuid) to anon, authenticated, service_role;
grant execute on function public.laofi_get_menu_dia(uuid, date) to anon, authenticated, service_role;
