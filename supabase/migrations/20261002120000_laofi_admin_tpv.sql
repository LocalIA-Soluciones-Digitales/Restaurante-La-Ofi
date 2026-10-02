-- =============================================================================
-- Restaurante La Ofi — /admin: staff y roles, salón, cocina (KDS), TPV, cobros
-- y cierre de caja
-- -----------------------------------------------------------------------------
-- Todo en laofi. Las RPC de admin son SECURITY INVOKER: se ejecutan como el
-- usuario autenticado, así que la RLS laofi.es_gestor() sigue aislando a La Ofi
-- (el staff de otro proyecto no ve ni toca nada) y, además, cada RPC exige un rol
-- concreto (laofi.exigir_rol). anon no puede ejecutar ninguna.
-- Aditiva. Reversión: supabase/rollback/20261002120000_laofi_admin_tpv.down.sql
-- =============================================================================

-- Staff y roles -----------------------------------------------------------------
create table laofi.staff (
  user_id uuid primary key,
  nombre text not null check (length(btrim(nombre)) between 1 and 40),
  rol text not null check (rol in ('admin', 'encargado', 'camarero', 'cocina')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

/**
 * Rol del usuario en La Ofi: LocalIA (is_developer) = admin; ficha en laofi.staff =
 * su rol (si está activa); cuenta del negocio en usuarios_negocio sin ficha = admin
 * (la cuenta del propietario). Cualquier otro: null.
 */
create or replace function laofi.mi_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when coalesce(public.is_developer(), false) then 'admin'
    when exists (select 1 from laofi.staff s where s.user_id = auth.uid()) then
      (select s.rol from laofi.staff s where s.user_id = auth.uid() and s.activo)
    when public.mi_cliente_id() is not null and public.mi_cliente_id() = laofi.cliente_id() then 'admin'
    else null
  end;
$$;

create or replace function laofi.exigir_rol(variadic p_roles text[])
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if laofi.mi_rol() is null or not (laofi.mi_rol() = any (p_roles)) then
    raise exception 'NO_AUTORIZADO' using errcode = '42501';
  end if;
end;
$$;

alter table laofi.staff enable row level security;
create policy staff_gestores on laofi.staff for all to authenticated using (laofi.es_gestor()) with check (laofi.es_gestor());
revoke all on laofi.staff from public, anon;
grant select, insert, update, delete on laofi.staff to authenticated;
grant all on laofi.staff to service_role;

-- Cobros y caja ---------------------------------------------------------------------
alter table laofi.pagos
  add column mesa_id uuid references laofi.mesas(id) on delete set null,
  add column cierre_id uuid;
create index pagos_mesa_idx on laofi.pagos (mesa_id, created_at);

create table laofi.cierres_caja (
  id uuid primary key default gen_random_uuid(),
  desde timestamptz not null,
  cerrado_at timestamptz not null default now(),
  fondo_inicial_centimos integer not null default 0 check (fondo_inicial_centimos >= 0),
  efectivo_esperado_centimos integer not null,
  efectivo_contado_centimos integer not null check (efectivo_contado_centimos >= 0),
  tarjeta_centimos integer not null default 0,
  online_centimos integer not null default 0,
  descuadre_centimos integer generated always as (efectivo_contado_centimos - efectivo_esperado_centimos) stored,
  tickets integer not null default 0,
  notas text,
  cerrado_por uuid
);
alter table laofi.cierres_caja enable row level security;
create policy cierres_caja_gestores on laofi.cierres_caja for all to authenticated using (laofi.es_gestor()) with check (laofi.es_gestor());
revoke all on laofi.cierres_caja from public, anon;
grant select, insert, update, delete on laofi.cierres_caja to authenticated;
grant all on laofi.cierres_caja to service_role;
alter table laofi.pagos add constraint pagos_cierre_fk foreign key (cierre_id) references laofi.cierres_caja(id) on delete set null;

-- Lo que usan las RPC de admin (antes revocado a todos): ahora también authenticated.
grant execute on function laofi.siguiente_numero_dia(), laofi.linea_validada(laofi.productos, uuid[]) to authenticated;

-- CRUD genérico con lista blanca --------------------------------------------------------
/** Tablas editables desde /admin, su clave y qué roles pueden escribir. */
create or replace function laofi.tabla_admin(p_tabla text)
returns table (pk text, roles text[], orden text)
language sql
immutable
set search_path = ''
as $$
  select t.pk, t.roles, t.orden from (values
    ('categorias', 'id', '{admin,encargado}'::text[], 'orden, nombre'),
    ('productos', 'id', '{admin,encargado}'::text[], 'orden, nombre'),
    ('modificadores', 'id', '{admin,encargado}'::text[], 'orden, nombre'),
    ('modificador_opciones', 'id', '{admin,encargado}'::text[], 'orden, nombre'),
    ('menus_dia', 'id', '{admin,encargado}'::text[], 'fecha desc'),
    ('menu_dia_platos', 'id', '{admin,encargado}'::text[], 'tipo, orden'),
    ('eventos', 'id', '{admin,encargado}'::text[], 'fecha desc'),
    ('horario', 'dia', '{admin,encargado}'::text[], 'dia'),
    ('zonas', 'id', '{admin,encargado}'::text[], 'orden, nombre'),
    ('mesas', 'id', '{admin,encargado}'::text[], 'numero'),
    ('ajustes', 'clave', '{admin}'::text[], 'clave'),
    ('staff', 'user_id', '{admin}'::text[], 'nombre')
  ) as t(nombre, pk, roles, orden)
  where t.nombre = p_tabla;
$$;

create or replace function public.laofi_admin_listar(p_tabla text, p_filtro jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  cfg record;
  r jsonb;
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero', 'cocina');
  select * into cfg from laofi.tabla_admin(p_tabla);
  if cfg.pk is null then raise exception 'Tabla no permitida' using errcode = 'P0001'; end if;
  if p_tabla in ('staff', 'ajustes') then perform laofi.exigir_rol('admin', 'encargado'); end if;
  execute format('select coalesce(jsonb_agg(to_jsonb(t) order by %s), ''[]''::jsonb) from (select * from laofi.%I) t where to_jsonb(t) @> $1',
                 cfg.orden, p_tabla)
    into r using coalesce(p_filtro, '{}'::jsonb);
  return r;
end;
$$;

/** Inserta o actualiza SOLO las columnas presentes en p_fila (las demás conservan su valor o su defecto). */
create or replace function public.laofi_admin_guardar(p_tabla text, p_fila jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  cfg record;
  cols text;
  existe boolean := false;
  r jsonb;
begin
  select * into cfg from laofi.tabla_admin(p_tabla);
  if cfg.pk is null then raise exception 'Tabla no permitida' using errcode = 'P0001'; end if;
  perform laofi.exigir_rol(variadic cfg.roles);

  select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position) into cols
  from information_schema.columns c
  where c.table_schema = 'laofi' and c.table_name = p_tabla
    and c.column_name in (select jsonb_object_keys(p_fila))
    and c.column_name not in ('created_at', 'updated_at', 'descuadre_centimos');
  if cols is null then raise exception 'Nada que guardar' using errcode = 'P0001'; end if;

  if p_fila ? cfg.pk then
    execute format('select exists (select 1 from laofi.%I where %I::text = $1)', p_tabla, cfg.pk) into existe using p_fila ->> cfg.pk;
  end if;

  if existe then
    execute format('update laofi.%I as t set (%s) = (select %s from jsonb_populate_record(null::laofi.%I, $1)) where t.%I::text = $2 returning to_jsonb(t.*)',
                   p_tabla, cols, cols, p_tabla, cfg.pk)
      into r using p_fila, p_fila ->> cfg.pk;
  else
    execute format('insert into laofi.%I as t (%s) select %s from jsonb_populate_record(null::laofi.%I, $1) returning to_jsonb(t.*)',
                   p_tabla, cols, cols, p_tabla)
      into r using p_fila;
  end if;
  return r;
end;
$$;

create or replace function public.laofi_admin_borrar(p_tabla text, p_id text)
returns void
language plpgsql
set search_path = ''
as $$
declare cfg record;
begin
  select * into cfg from laofi.tabla_admin(p_tabla);
  if cfg.pk is null or p_tabla in ('ajustes', 'horario') then raise exception 'Tabla no permitida' using errcode = 'P0001'; end if;
  perform laofi.exigir_rol(variadic cfg.roles);
  execute format('delete from laofi.%I where %I::text = $1', p_tabla, cfg.pk) using p_id;
end;
$$;

create or replace function public.laofi_admin_yo()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'rol', laofi.mi_rol(),
    'nombre', coalesce((select s.nombre from laofi.staff s where s.user_id = auth.uid()), auth.jwt() ->> 'email')
  );
$$;

-- Salón ----------------------------------------------------------------------------------
/** Importe pendiente de una mesa en su ocupación actual (pedidos − cobros). */
create or replace function laofi.pendiente_mesa(p_mesa uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  with m as (select id, entrada_at from laofi.mesas where id = p_mesa),
  ped as (
    select p.id, p.total_centimos from laofi.pedidos p, m
    where p.mesa_id = m.id and m.entrada_at is not null and p.created_at >= m.entrada_at and p.estado <> 'CANCELLED'
  )
  select greatest(0,
    coalesce((select sum(total_centimos) from ped), 0)
    - coalesce((select sum(pg.importe_centimos) from laofi.pagos pg, m
                where pg.estado = 'PAID' and (
                  (pg.mesa_id = m.id and pg.created_at >= m.entrada_at)
                  or pg.pedido_id in (select id from ped)
                  or pg.participante_id in (select sp.id from laofi.sesion_participantes sp
                                            join laofi.mesa_sesiones s on s.id = sp.sesion_id
                                            where s.mesa_id = m.id and s.created_at >= m.entrada_at))), 0)
  )::integer;
$$;

create or replace function public.laofi_admin_salon()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'zonas', coalesce((select jsonb_agg(to_jsonb(z) order by z.orden, z.nombre) from laofi.zonas z where z.activa), '[]'::jsonb),
    'mesas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'zona_id', m.zona_id, 'numero', m.numero, 'nombre', m.nombre, 'capacidad', m.capacidad,
        'forma', m.forma, 'pos_x', m.pos_x, 'pos_y', m.pos_y, 'rotacion', m.rotacion, 'token', m.token,
        'activa', m.activa, 'ocupada', m.ocupada, 'comensales', m.comensales, 'entrada_at', m.entrada_at,
        'bloqueada', m.bloqueada, 'bloqueo_motivo', m.bloqueo_motivo, 'por_limpiar', m.por_limpiar,
        'union_grupo_id', m.union_grupo_id, 'nota', m.nota,
        'sesion', (select jsonb_build_object('id', s.id, 'modo', s.modo,
                     'participantes', (select count(*) from laofi.sesion_participantes sp where sp.sesion_id = s.id))
                   from laofi.mesa_sesiones s where s.mesa_id = m.id and s.estado = 'ACTIVA'),
        'importe_centimos', coalesce((select sum(p.total_centimos) from laofi.pedidos p
                                      where p.mesa_id = m.id and m.entrada_at is not null and p.created_at >= m.entrada_at and p.estado <> 'CANCELLED'), 0),
        'pendiente_centimos', laofi.pendiente_mesa(m.id),
        'pedidos_en_curso', (select count(*) from laofi.pedidos p where p.mesa_id = m.id and p.estado not in ('DELIVERED', 'CANCELLED')),
        'aviso_camarero', exists (select 1 from laofi.avisos a where a.mesa_id = m.id and a.tipo = 'CAMARERO' and a.atendido_at is null),
        'pide_cuenta', exists (select 1 from laofi.avisos a where a.mesa_id = m.id and a.tipo = 'CUENTA' and a.atendido_at is null)
      ) order by m.numero) from laofi.mesas m where m.activa), '[]'::jsonb)
  )
  where laofi.mi_rol() in ('admin', 'encargado', 'camarero');
$$;

create or replace function public.laofi_admin_mesa(p_mesa uuid, p_accion text, p_datos jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  m laofi.mesas;
  v_destino laofi.mesas;
  v_grupo uuid;
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  select * into m from laofi.mesas where id = p_mesa for update;
  if m.id is null then raise exception 'Mesa no encontrada' using errcode = 'P0001'; end if;

  case p_accion
    when 'sentar' then
      update laofi.mesas set ocupada = true, por_limpiar = false,
        comensales = greatest(1, coalesce((p_datos ->> 'comensales')::int, 1)), entrada_at = coalesce(entrada_at, now())
      where id = p_mesa;
    when 'comensales' then
      update laofi.mesas set comensales = greatest(0, (p_datos ->> 'comensales')::int) where id = p_mesa;
    when 'liberar' then
      if laofi.pendiente_mesa(p_mesa) > 0 and not coalesce((p_datos ->> 'forzar')::boolean, false) then
        raise exception 'La mesa tiene importe pendiente de cobro' using errcode = 'P0001';
      end if;
      update laofi.mesa_sesiones set estado = 'CERRADA', closed_at = now() where mesa_id = p_mesa and estado = 'ACTIVA';
      update laofi.avisos set atendido_at = now(), atendido_por = auth.uid() where mesa_id = p_mesa and atendido_at is null;
      update laofi.mesas set ocupada = false, comensales = 0, entrada_at = null, por_limpiar = true, union_grupo_id = null where id = p_mesa;
    when 'limpia' then
      update laofi.mesas set por_limpiar = false where id = p_mesa;
    when 'bloquear' then
      update laofi.mesas set bloqueada = true, bloqueo_motivo = nullif(btrim(p_datos ->> 'motivo'), '') where id = p_mesa;
    when 'desbloquear' then
      update laofi.mesas set bloqueada = false, bloqueo_motivo = null where id = p_mesa;
    when 'nota' then
      update laofi.mesas set nota = nullif(btrim(p_datos ->> 'nota'), '') where id = p_mesa;
    when 'mover' then
      perform laofi.exigir_rol('admin', 'encargado');
      update laofi.mesas set pos_x = (p_datos ->> 'pos_x')::numeric, pos_y = (p_datos ->> 'pos_y')::numeric,
        zona_id = coalesce((p_datos ->> 'zona_id')::uuid, zona_id) where id = p_mesa;
    when 'unir' then
      v_grupo := coalesce(m.union_grupo_id, gen_random_uuid());
      update laofi.mesas set union_grupo_id = v_grupo
      where id = p_mesa or id in (select (x)::uuid from jsonb_array_elements_text(coalesce(p_datos -> 'mesas', '[]')) x);
    when 'separar' then
      update laofi.mesas set union_grupo_id = null where union_grupo_id = m.union_grupo_id or id = p_mesa;
    when 'cambiar' then
      select * into v_destino from laofi.mesas where id = (p_datos ->> 'destino')::uuid for update;
      if v_destino.id is null or v_destino.ocupada or v_destino.bloqueada then
        raise exception 'La mesa de destino no está libre' using errcode = 'P0001';
      end if;
      update laofi.mesa_sesiones set mesa_id = v_destino.id where mesa_id = p_mesa and estado = 'ACTIVA';
      update laofi.pedidos set mesa_id = v_destino.id where mesa_id = p_mesa and m.entrada_at is not null and created_at >= m.entrada_at;
      update laofi.pagos set mesa_id = v_destino.id where mesa_id = p_mesa and m.entrada_at is not null and created_at >= m.entrada_at;
      update laofi.avisos set mesa_id = v_destino.id where mesa_id = p_mesa and atendido_at is null;
      update laofi.mesas set ocupada = true, comensales = m.comensales, entrada_at = m.entrada_at, nota = m.nota where id = v_destino.id;
      update laofi.mesas set ocupada = false, comensales = 0, entrada_at = null, por_limpiar = true, nota = null where id = p_mesa;
    when 'regenerar_qr' then
      perform laofi.exigir_rol('admin', 'encargado');
      update laofi.mesas set token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 16) where id = p_mesa;
    when 'atender' then
      update laofi.avisos set atendido_at = now(), atendido_por = auth.uid()
      where mesa_id = p_mesa and atendido_at is null and (p_datos ->> 'tipo' is null or tipo = p_datos ->> 'tipo');
    else
      raise exception 'Acción no válida' using errcode = 'P0001';
  end case;
  return (select to_jsonb(x) from laofi.mesas x where x.id = coalesce(v_destino.id, p_mesa));
end;
$$;

/** Cuenta de la ocupación actual de una mesa: líneas, descuentos, cobrado y pendiente. */
create or replace function public.laofi_admin_cuenta_mesa(p_mesa uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with m as (select * from laofi.mesas where id = p_mesa),
  ped as (
    select p.* from laofi.pedidos p, m
    where p.mesa_id = m.id and m.entrada_at is not null and p.created_at >= m.entrada_at and p.estado <> 'CANCELLED'
  )
  select jsonb_build_object(
    'mesa', (select jsonb_build_object('numero', numero, 'nombre', nombre, 'comensales', comensales) from m),
    'pedido_ids', coalesce((select jsonb_agg(id) from ped), '[]'::jsonb),
    'lineas', coalesce((select jsonb_agg(jsonb_build_object('nombre', i.nombre, 'cantidad', i.cantidad,
                          'precio_unitario_centimos', i.precio_unitario_centimos, 'iva_pct', i.iva_pct, 'invitacion', i.invitacion)
                        order by i.created_at)
                        from laofi.pedido_items i join ped on ped.id = i.pedido_id where i.estado <> 'CANCELLED'), '[]'::jsonb),
    'descuento_centimos', coalesce((select sum(descuento_centimos) from ped), 0),
    'total_centimos', coalesce((select sum(total_centimos) from ped), 0),
    'pendiente_centimos', laofi.pendiente_mesa(p_mesa),
    'camarero', (select s.nombre from laofi.staff s join ped on ped.creado_por = s.user_id order by ped.created_at limit 1)
  )
  where laofi.mi_rol() in ('admin', 'encargado', 'camarero');
$$;

-- Cocina y barra (KDS) ----------------------------------------------------------------------
create or replace function laofi.rango_estado(p text)
returns integer
language sql
immutable
set search_path = ''
as $$ select array_position(array['RECEIVED', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED'], p); $$;

create or replace function laofi.pedido_kds_json(p laofi.pedidos)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'numero_dia', p.numero_dia, 'tipo', p.tipo, 'estado', p.estado, 'origen', p.origen,
    'payment_method', p.payment_method, 'payment_status', p.payment_status, 'total_centimos', p.total_centimos,
    'notas', p.notas, 'nombre_cliente', p.nombre_cliente, 'recogida_en', p.recogida_en,
    'created_at', p.created_at, 'updated_at', p.updated_at,
    'mesa', (select jsonb_build_object('id', m.id, 'numero', m.numero, 'nombre', m.nombre, 'comensales', m.comensales,
                                       'zona', (select z.nombre from laofi.zonas z where z.id = m.zona_id))
             from laofi.mesas m where m.id = p.mesa_id),
    'grupo', (select g.nombre from laofi.grupos_pedido g where g.id = p.grupo_id),
    'participante', (select sp.nombre from laofi.sesion_participantes sp where sp.id = p.participante_id),
    'camarero', (select s.nombre from laofi.staff s where s.user_id = p.creado_por),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'id', i.id, 'nombre', i.nombre, 'cantidad', i.cantidad, 'precio_unitario_centimos', i.precio_unitario_centimos,
        'modificadores', i.modificadores, 'notas', i.notas, 'estacion', i.estacion, 'estado', i.estado,
        'iva_pct', i.iva_pct, 'invitacion', i.invitacion) order by i.created_at)
      from laofi.pedido_items i where i.pedido_id = p.id), '[]'::jsonb)
  );
$$;

create or replace function public.laofi_admin_cocina(p_historial boolean default false)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(laofi.pedido_kds_json(p) order by coalesce(p.recogida_en, p.created_at), p.created_at), '[]'::jsonb)
  from laofi.pedidos p
  where laofi.mi_rol() is not null
    and case when p_historial
      then p.fecha_servicio = (now() at time zone 'Europe/Madrid')::date and p.estado in ('DELIVERED', 'CANCELLED')
      -- Online sin pagar no se prepara (Palomita §10).
      else p.estado not in ('DELIVERED', 'CANCELLED') and not (p.payment_method = 'ONLINE' and p.payment_status <> 'PAID')
    end;
$$;

/**
 * Avanza las líneas de una estación (o de todo el pedido si p_estacion es null)
 * hasta p_estado, paso a paso (el trigger solo admite un salto cada vez), y deja
 * el pedido en el progreso MÍNIMO de sus líneas activas (Palomita §18): un pedido
 * mixto no está "listo" hasta que cocina y barra han terminado.
 */
create or replace function public.laofi_admin_avanzar(p_pedido uuid, p_estado text, p_estacion text default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  it record;
  objetivo integer := laofi.rango_estado(p_estado);
  minimo integer;
  actual text;
  pasos text[] := array['RECEIVED', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED'];
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero', 'cocina');
  if objetivo is null then raise exception 'Estado no válido' using errcode = 'P0001'; end if;
  if p_estacion is not null and p_estacion not in ('cocina', 'barra') then raise exception 'Estación no válida' using errcode = 'P0001'; end if;

  for it in select i.id, i.estado from laofi.pedido_items i
            where i.pedido_id = p_pedido and i.estado <> 'CANCELLED' and (p_estacion is null or i.estacion = p_estacion)
            for update loop
    for k in laofi.rango_estado(it.estado) + 1 .. objetivo loop
      update laofi.pedido_items set estado = pasos[k] where id = it.id;
    end loop;
  end loop;

  select min(laofi.rango_estado(i.estado)) into minimo from laofi.pedido_items i where i.pedido_id = p_pedido and i.estado <> 'CANCELLED';
  select estado into actual from laofi.pedidos where id = p_pedido for update;
  if minimo is not null and actual <> 'CANCELLED' then
    for k in laofi.rango_estado(actual) + 1 .. minimo loop
      update laofi.pedidos set estado = pasos[k] where id = p_pedido;
    end loop;
  end if;
  return (select laofi.pedido_kds_json(p) from laofi.pedidos p where p.id = p_pedido);
end;
$$;

create or replace function public.laofi_admin_cancelar_pedido(p_pedido uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  update laofi.pedido_items set estado = 'CANCELLED' where pedido_id = p_pedido and estado not in ('DELIVERED', 'CANCELLED');
  update laofi.pedidos set estado = 'CANCELLED' where id = p_pedido and estado not in ('DELIVERED', 'CANCELLED');
end;
$$;

-- TPV -----------------------------------------------------------------------------------------
/*
 p (jsonb): tipo 'MESA' | 'BARRA', mesa_id, nombre, notas, descuento_centimos,
   items: [{ producto_id, cantidad, opciones: [uuid], notas, invitacion, precio_manual_centimos }]
 precio_manual_centimos solo para platos sin precio en carta ("según mercado").
*/
create or replace function public.laofi_admin_crear_pedido(p jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_tipo text := coalesce(p ->> 'tipo', 'BARRA');
  v_mesa laofi.mesas;
  v_sesion uuid;
  v_id uuid;
  v_item jsonb;
  v_prod laofi.productos;
  v_linea record;
  v_precio integer;
  v_cant integer;
  v_invit boolean;
  v_subtotal integer := 0;
  v_descuento integer := greatest(0, coalesce((p ->> 'descuento_centimos')::int, 0));
  v_opciones uuid[];
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  if v_tipo not in ('MESA', 'BARRA') then raise exception 'Tipo no válido' using errcode = 'P0001'; end if;
  if jsonb_typeof(p -> 'items') is distinct from 'array' or jsonb_array_length(p -> 'items') = 0 then
    raise exception 'La comanda está vacía' using errcode = 'P0001';
  end if;
  if v_descuento > 0 then perform laofi.exigir_rol('admin', 'encargado'); end if;

  if v_tipo = 'MESA' then
    select * into v_mesa from laofi.mesas where id = (p ->> 'mesa_id')::uuid and activa for update;
    if v_mesa.id is null then raise exception 'Mesa no válida' using errcode = 'P0001'; end if;
    if not v_mesa.ocupada then
      update laofi.mesas set ocupada = true, por_limpiar = false, comensales = greatest(comensales, 1), entrada_at = coalesce(entrada_at, now())
      where id = v_mesa.id;
    end if;
    select id into v_sesion from laofi.mesa_sesiones where mesa_id = v_mesa.id and estado = 'ACTIVA';
  end if;

  insert into laofi.pedidos (numero_dia, tipo, mesa_id, sesion_id, nombre_cliente, payment_method, notas, origen, creado_por)
  values (laofi.siguiente_numero_dia(), v_tipo, v_mesa.id, v_sesion, nullif(btrim(p ->> 'nombre'), ''), 'LOCAL',
          nullif(btrim(p ->> 'notas'), ''), 'tpv', auth.uid())
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p -> 'items') loop
    select * into v_prod from laofi.productos where id = (v_item ->> 'producto_id')::uuid;
    if v_prod.id is null then raise exception 'Producto no encontrado' using errcode = 'P0001'; end if;
    v_cant := coalesce((v_item ->> 'cantidad')::int, 1);
    v_invit := coalesce((v_item ->> 'invitacion')::boolean, false);
    if v_invit then perform laofi.exigir_rol('admin', 'encargado', 'camarero'); end if;
    if v_prod.precio_centimos is null then
      v_precio := (v_item ->> 'precio_manual_centimos')::int;
      if v_precio is null or v_precio < 0 then
        raise exception '% necesita precio (según mercado)', v_prod.nombre using errcode = 'P0001';
      end if;
      v_prod.precio_centimos := v_precio;
    end if;
    select coalesce(array_agg(x::uuid), '{}') into v_opciones from jsonb_array_elements_text(coalesce(v_item -> 'opciones', '[]')) x;
    select * into v_linea from laofi.linea_validada(v_prod, v_opciones);
    insert into laofi.pedido_items (pedido_id, producto_id, nombre, cantidad, precio_unitario_centimos, modificadores, notas, estacion, iva_pct, invitacion)
    values (v_id, v_prod.id, v_prod.nombre, v_cant, v_linea.precio, v_linea.modificadores,
            nullif(left(btrim(v_item ->> 'notas'), 140), ''), v_prod.estacion, v_prod.iva_pct, v_invit);
    if not v_invit then v_subtotal := v_subtotal + v_linea.precio * v_cant; end if;
  end loop;

  update laofi.pedidos set subtotal_centimos = v_subtotal, descuento_centimos = least(v_descuento, v_subtotal),
    total_centimos = v_subtotal - least(v_descuento, v_subtotal)
  where id = v_id;
  return (select laofi.pedido_kds_json(x) from laofi.pedidos x where x.id = v_id);
end;
$$;

/**
 * Cobro en TPV (efectivo o tarjeta) de una mesa (cuenta completa o parcial,
 * p. ej. dividida entre comensales) o de un pedido de barra/recogida. Cuando no
 * queda nada pendiente, los pedidos quedan pagados.
 */
create or replace function public.laofi_admin_cobrar(p jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_metodo text := p ->> 'metodo';
  v_importe integer := (p ->> 'importe_centimos')::int;
  v_mesa uuid := nullif(p ->> 'mesa_id', '')::uuid;
  v_pedido uuid := nullif(p ->> 'pedido_id', '')::uuid;
  v_pendiente integer;
  m laofi.mesas;
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  if v_metodo not in ('EFECTIVO', 'TARJETA') then raise exception 'Método no válido' using errcode = 'P0001'; end if;
  if v_importe is null or v_importe <= 0 then raise exception 'Importe no válido' using errcode = 'P0001'; end if;

  if v_mesa is not null then
    v_pendiente := laofi.pendiente_mesa(v_mesa);
    if v_importe > v_pendiente then raise exception 'El cobro supera lo pendiente (%)', v_pendiente using errcode = 'P0001'; end if;
    insert into laofi.pagos (mesa_id, metodo, importe_centimos, registrado_por) values (v_mesa, v_metodo, v_importe, auth.uid());
    v_pendiente := laofi.pendiente_mesa(v_mesa);
    if v_pendiente = 0 then
      select * into m from laofi.mesas where id = v_mesa;
      update laofi.pedidos set payment_status = 'PAID'
      where mesa_id = v_mesa and created_at >= m.entrada_at and estado <> 'CANCELLED' and payment_status <> 'PAID';
      update laofi.avisos set atendido_at = now(), atendido_por = auth.uid() where mesa_id = v_mesa and tipo = 'CUENTA' and atendido_at is null;
    end if;
  elsif v_pedido is not null then
    select total_centimos - coalesce((select sum(importe_centimos) from laofi.pagos where pedido_id = v_pedido and estado = 'PAID'), 0)
      into v_pendiente from laofi.pedidos where id = v_pedido;
    if v_pendiente is null then raise exception 'Pedido no encontrado' using errcode = 'P0001'; end if;
    if v_importe > v_pendiente then raise exception 'El cobro supera lo pendiente (%)', v_pendiente using errcode = 'P0001'; end if;
    insert into laofi.pagos (pedido_id, metodo, importe_centimos, registrado_por) values (v_pedido, v_metodo, v_importe, auth.uid());
    v_pendiente := v_pendiente - v_importe;
    if v_pendiente = 0 then update laofi.pedidos set payment_status = 'PAID' where id = v_pedido; end if;
  else
    raise exception 'Indica mesa o pedido' using errcode = 'P0001';
  end if;
  return jsonb_build_object('pendiente_centimos', v_pendiente);
end;
$$;

-- Cierre de caja (arqueo) ---------------------------------------------------------------------
create or replace function public.laofi_admin_caja()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with desde as (
    select coalesce((select max(cerrado_at) from laofi.cierres_caja),
                    ((now() at time zone 'Europe/Madrid')::date at time zone 'Europe/Madrid')) as t
  ), pg as (
    select pg.* from laofi.pagos pg, desde where pg.created_at >= desde.t and pg.estado = 'PAID'
  ), ped as (
    select p.* from laofi.pedidos p, desde where p.created_at >= desde.t and p.estado <> 'CANCELLED'
  )
  select jsonb_build_object(
    'desde', (select t from desde),
    'efectivo_centimos', coalesce((select sum(importe_centimos) from pg where metodo = 'EFECTIVO'), 0),
    'tarjeta_centimos', coalesce((select sum(importe_centimos) from pg where metodo = 'TARJETA'), 0),
    'online_centimos', coalesce((select sum(importe_centimos) from pg where metodo = 'STRIPE'), 0),
    'cobros', (select count(*) from pg),
    'pedidos', (select count(*) from ped),
    'ventas_centimos', coalesce((select sum(total_centimos) from ped), 0),
    'descuentos_centimos', coalesce((select sum(descuento_centimos) from ped), 0),
    'invitaciones_centimos', coalesce((select sum(i.precio_unitario_centimos * i.cantidad) from laofi.pedido_items i join ped on ped.id = i.pedido_id where i.invitacion), 0),
    'pendiente_cobro_centimos', coalesce((select sum(total_centimos) from ped where payment_status <> 'PAID'), 0)
  )
  where laofi.mi_rol() in ('admin', 'encargado');
$$;

create or replace function public.laofi_admin_cerrar_caja(p_fondo_inicial_centimos integer, p_efectivo_contado_centimos integer, p_notas text default null)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  c jsonb;
  v laofi.cierres_caja;
begin
  perform laofi.exigir_rol('admin', 'encargado');
  c := public.laofi_admin_caja();
  insert into laofi.cierres_caja (desde, fondo_inicial_centimos, efectivo_esperado_centimos, efectivo_contado_centimos,
                                  tarjeta_centimos, online_centimos, tickets, notas, cerrado_por)
  values ((c ->> 'desde')::timestamptz, p_fondo_inicial_centimos,
          p_fondo_inicial_centimos + (c ->> 'efectivo_centimos')::int, p_efectivo_contado_centimos,
          (c ->> 'tarjeta_centimos')::int, (c ->> 'online_centimos')::int, (c ->> 'cobros')::int,
          nullif(btrim(p_notas), ''), auth.uid())
  returning * into v;
  update laofi.pagos set cierre_id = v.id where cierre_id is null and created_at >= v.desde and created_at <= v.cerrado_at;
  return to_jsonb(v);
end;
$$;

create or replace function public.laofi_admin_cierres(p_limite integer default 30)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(x order by (x ->> 'cerrado_at') desc), '[]'::jsonb) from (
    select to_jsonb(c) || jsonb_build_object('cerrado_por_nombre', (select s.nombre from laofi.staff s where s.user_id = c.cerrado_por)) as x
    from laofi.cierres_caja c order by c.cerrado_at desc limit p_limite
  ) t
  where laofi.mi_rol() in ('admin', 'encargado');
$$;

-- Permisos -------------------------------------------------------------------------------
revoke all on function laofi.mi_rol(), laofi.exigir_rol(text[]), laofi.tabla_admin(text), laofi.pendiente_mesa(uuid),
  laofi.rango_estado(text), laofi.pedido_kds_json(laofi.pedidos) from public, anon;
grant execute on function laofi.mi_rol(), laofi.exigir_rol(text[]), laofi.tabla_admin(text), laofi.pendiente_mesa(uuid),
  laofi.rango_estado(text), laofi.pedido_kds_json(laofi.pedidos) to authenticated, service_role;

do $$
declare f text;
begin
  foreach f in array array[
    'public.laofi_admin_listar(text, jsonb)', 'public.laofi_admin_guardar(text, jsonb)', 'public.laofi_admin_borrar(text, text)',
    'public.laofi_admin_yo()', 'public.laofi_admin_salon()', 'public.laofi_admin_mesa(uuid, text, jsonb)',
    'public.laofi_admin_cuenta_mesa(uuid)',
    'public.laofi_admin_cocina(boolean)', 'public.laofi_admin_avanzar(uuid, text, text)', 'public.laofi_admin_cancelar_pedido(uuid)',
    'public.laofi_admin_crear_pedido(jsonb)', 'public.laofi_admin_cobrar(jsonb)', 'public.laofi_admin_caja()',
    'public.laofi_admin_cerrar_caja(integer, integer, text)', 'public.laofi_admin_cierres(integer)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end;
$$;
