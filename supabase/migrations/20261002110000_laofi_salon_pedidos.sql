-- =============================================================================
-- Restaurante La Ofi — salón, mesas, pedidos, recogida, grupos y pagos
-- -----------------------------------------------------------------------------
-- Réplica, DENTRO del schema laofi, del modelo de pedido en mesa de Palomita-Bar
-- (restaurant.mesas/pedidos/pedido_items/mesa_sesiones/…; ARCHITECTURE.md de
-- Palomita §4.3, §16.3, §18), sin reutilizar ninguna tabla compartida. Añade lo
-- que Palomita no tiene: pedido para recoger por franja horaria, pedido de grupo
-- por enlace y avisos (camarero / cuenta).
--
-- Seguridad (mismo patrón que el resto de laofi):
--  · Tablas sin acceso para anon; RLS laofi.es_gestor() para el staff.
--  · RPC públicas public.laofi_* SECURITY DEFINER con site_key; nunca confían en
--    precios, totales, mesas ni repartos enviados por el navegador: todo se
--    recalcula aquí. El id (uuid) de pedido/sesión es la "llave" pública, como
--    en Palomita.
--  · Marcar pagos: SOLO service_role (webhook de Stripe). EXECUTE revocado de
--    anon y authenticated de forma explícita (hallazgo de Palomita §16.3).
-- Aditiva. Reversión: supabase/rollback/20261002110000_laofi_salon_pedidos.down.sql
-- =============================================================================

-- Ajustes operativos (recogida, pagos…) ------------------------------------------
create table laofi.ajustes (
  clave text primary key check (clave ~ '^[a-z_]+$'),
  valor jsonb not null,
  updated_at timestamptz not null default now()
);
-- Recogida DESACTIVADA por defecto: franjas, capacidad y antelación las decide el
-- restaurante desde /admin/configuracion (no se inventan aquí).
insert into laofi.ajustes (clave, valor) values
  ('recogida', '{"activa": false, "desde": null, "hasta": null, "intervalo_min": 15, "capacidad": null, "antelacion_min": 20, "dias": [1, 2, 3, 4, 5]}'),
  ('pagos', '{"online": false, "en_local": true}')
on conflict (clave) do nothing;

-- Salón ---------------------------------------------------------------------------
create table laofi.zonas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nombre text not null check (length(btrim(nombre)) > 0),
  tipo text not null default 'comedor' check (tipo in ('barra', 'comedor', 'despacho', 'terraza', 'otra')),
  -- Rectángulo de la zona en el plano, en % del lienzo (0–100).
  x numeric(5, 2) not null default 0 check (x between 0 and 100),
  y numeric(5, 2) not null default 0 check (y between 0 and 100),
  ancho numeric(5, 2) not null default 50 check (ancho > 0 and ancho <= 100),
  alto numeric(5, 2) not null default 50 check (alto > 0 and alto <= 100),
  orden smallint not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table laofi.mesas (
  id uuid primary key default gen_random_uuid(),
  zona_id uuid references laofi.zonas(id) on delete set null,
  numero text not null unique check (length(btrim(numero)) > 0),
  nombre text,
  capacidad smallint not null default 4 check (capacidad between 1 and 40),
  forma text not null default 'cuadrada' check (forma in ('cuadrada', 'redonda', 'rectangular', 'taburete')),
  pos_x numeric(5, 2) check (pos_x between 0 and 100),
  pos_y numeric(5, 2) check (pos_y between 0 and 100),
  rotacion smallint not null default 0 check (rotacion between 0 and 359),
  -- Lo que va en el QR. Regenerable desde /admin si un QR impreso se filtra.
  token text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16)
    check (token ~ '^[A-Za-z0-9_-]{8,64}$'),
  activa boolean not null default true,
  -- Estado de sala (lo gestiona el staff desde /admin/salon).
  ocupada boolean not null default false,
  comensales smallint not null default 0 check (comensales >= 0),
  entrada_at timestamptz,
  bloqueada boolean not null default false,
  bloqueo_motivo text,
  por_limpiar boolean not null default false,
  union_grupo_id uuid,
  nota text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index mesas_zona_idx on laofi.mesas (zona_id);

create table laofi.mesa_sesiones (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid not null references laofi.mesas(id) on delete cascade,
  modo text not null check (modo in ('JUNTOS', 'SEPARADO')),
  estado text not null default 'ACTIVA' check (estado in ('ACTIVA', 'CERRADA')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
-- Una única sesión activa por mesa.
create unique index mesa_sesiones_activa_uq on laofi.mesa_sesiones (mesa_id) where estado = 'ACTIVA';

create table laofi.sesion_participantes (
  id uuid primary key default gen_random_uuid(),
  sesion_id uuid not null references laofi.mesa_sesiones(id) on delete cascade,
  nombre text not null check (length(btrim(nombre)) between 1 and 40),
  device_id text not null check (length(device_id) between 8 and 80),
  created_at timestamptz not null default now(),
  unique (sesion_id, device_id)
);

create table laofi.avisos (
  id uuid primary key default gen_random_uuid(),
  mesa_id uuid not null references laofi.mesas(id) on delete cascade,
  tipo text not null check (tipo in ('CAMARERO', 'CUENTA')),
  created_at timestamptz not null default now(),
  atendido_at timestamptz,
  atendido_por uuid
);
create index avisos_pendientes_idx on laofi.avisos (created_at) where atendido_at is null;

-- Pedidos de grupo (recogida) -------------------------------------------------------
create table laofi.grupos_pedido (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  nombre text not null check (length(btrim(nombre)) between 1 and 60),
  organizador text not null check (length(btrim(organizador)) between 1 and 40),
  recogida_en timestamptz not null,
  -- Hasta cuándo se pueden añadir pedidos al grupo.
  cierra_en timestamptz not null,
  estado text not null default 'ABIERTO' check (estado in ('ABIERTO', 'CERRADO', 'CANCELADO')),
  created_at timestamptz not null default now(),
  check (cierra_en <= recogida_en)
);

-- Pedidos -------------------------------------------------------------------------
create table laofi.pedidos (
  id uuid primary key default gen_random_uuid(),
  -- Número corto del día para cocina y para el cliente ("#12").
  numero_dia integer not null,
  fecha_servicio date not null default (now() at time zone 'Europe/Madrid')::date,
  tipo text not null check (tipo in ('MESA', 'RECOGIDA', 'BARRA')),
  mesa_id uuid references laofi.mesas(id) on delete set null,
  sesion_id uuid references laofi.mesa_sesiones(id) on delete set null,
  participante_id uuid references laofi.sesion_participantes(id) on delete set null,
  grupo_id uuid references laofi.grupos_pedido(id) on delete set null,
  nombre_cliente text check (nombre_cliente is null or length(btrim(nombre_cliente)) between 1 and 60),
  telefono text check (telefono is null or telefono ~ '^[0-9+ ]{9,16}$'),
  recogida_en timestamptz,
  estado text not null default 'RECEIVED' check (estado in ('RECEIVED', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED')),
  payment_method text not null check (payment_method in ('ONLINE', 'LOCAL')),
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  subtotal_centimos integer not null default 0 check (subtotal_centimos >= 0),
  descuento_centimos integer not null default 0 check (descuento_centimos >= 0),
  total_centimos integer not null default 0 check (total_centimos >= 0),
  notas text check (notas is null or length(notas) <= 300),
  origen text not null default 'web' check (origen in ('web', 'tpv')),
  creado_por uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fecha_servicio, numero_dia),
  check (tipo <> 'MESA' or mesa_id is not null),
  check (tipo <> 'RECOGIDA' or (recogida_en is not null and nombre_cliente is not null))
);
create index pedidos_estado_idx on laofi.pedidos (estado, created_at);
create index pedidos_recogida_idx on laofi.pedidos (recogida_en) where recogida_en is not null;
create index pedidos_mesa_idx on laofi.pedidos (mesa_id);
create index pedidos_sesion_idx on laofi.pedidos (sesion_id);
create index pedidos_grupo_idx on laofi.pedidos (grupo_id);

create table laofi.pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references laofi.pedidos(id) on delete cascade,
  producto_id uuid references laofi.productos(id) on delete set null,
  -- Instantánea del plato al pedir: la comanda y el ticket no cambian si luego
  -- se edita la carta.
  nombre text not null,
  cantidad integer not null check (cantidad between 1 and 50),
  precio_unitario_centimos integer not null check (precio_unitario_centimos >= 0),
  modificadores jsonb not null default '[]',
  notas text check (notas is null or length(notas) <= 140),
  estacion text not null default 'cocina' check (estacion in ('cocina', 'barra')),
  iva_pct numeric(4, 1) not null default 10,
  invitacion boolean not null default false,
  estado text not null default 'RECEIVED' check (estado in ('RECEIVED', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED')),
  created_at timestamptz not null default now()
);
create index pedido_items_pedido_idx on laofi.pedido_items (pedido_id);

create table laofi.pedido_item_repartos (
  id uuid primary key default gen_random_uuid(),
  pedido_item_id uuid not null references laofi.pedido_items(id) on delete cascade,
  participante_id uuid not null references laofi.sesion_participantes(id) on delete cascade,
  importe_centimos integer not null check (importe_centimos >= 0),
  pagado boolean not null default false,
  asumido_de_participante_id uuid references laofi.sesion_participantes(id) on delete set null,
  stripe_session_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index repartos_item_idx on laofi.pedido_item_repartos (pedido_item_id);
create index repartos_participante_idx on laofi.pedido_item_repartos (participante_id);

create table laofi.pedido_estado_historial (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references laofi.pedidos(id) on delete cascade,
  estado_anterior text,
  estado_nuevo text not null,
  user_id uuid,
  created_at timestamptz not null default now()
);
create index historial_pedido_idx on laofi.pedido_estado_historial (pedido_id);

-- Cobros: Stripe (online) y, desde el TPV, efectivo/tarjeta.
create table laofi.pagos (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references laofi.pedidos(id) on delete set null,
  participante_id uuid references laofi.sesion_participantes(id) on delete set null,
  metodo text not null check (metodo in ('STRIPE', 'EFECTIVO', 'TARJETA')),
  importe_centimos integer not null check (importe_centimos > 0),
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  estado text not null default 'PAID' check (estado in ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  registrado_por uuid,
  created_at timestamptz not null default now()
);
create index pagos_fecha_idx on laofi.pagos (created_at);

-- Triggers --------------------------------------------------------------------------
create trigger trg_mesas_updated_at before update on laofi.mesas for each row execute function public.set_updated_at();
create trigger trg_ajustes_updated_at before update on laofi.ajustes for each row execute function public.set_updated_at();

create or replace function laofi.transicion_permitida(p_de text, p_a text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_de = p_a or case p_de
    when 'RECEIVED' then p_a in ('ACCEPTED', 'CANCELLED')
    when 'ACCEPTED' then p_a in ('PREPARING', 'CANCELLED')
    when 'PREPARING' then p_a in ('READY', 'CANCELLED')
    when 'READY' then p_a in ('DELIVERED', 'CANCELLED')
    else false
  end;
$$;

-- Mismo control que Palomita: la base de datos bloquea saltos de estado no
-- permitidos y registra el historial, venga el UPDATE de donde venga.
create or replace function laofi.validar_estado_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado then
    if not laofi.transicion_permitida(old.estado, new.estado) then
      raise exception 'Transición de estado no permitida: % -> %', old.estado, new.estado using errcode = 'P0001';
    end if;
    insert into laofi.pedido_estado_historial (pedido_id, estado_anterior, estado_nuevo, user_id)
    values (new.id, old.estado, new.estado, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger trg_pedidos_estado before update on laofi.pedidos for each row execute function laofi.validar_estado_pedido();

create or replace function laofi.validar_estado_item()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado and not laofi.transicion_permitida(old.estado, new.estado) then
    raise exception 'Transición de estado de línea no permitida: % -> %', old.estado, new.estado using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger trg_pedido_items_estado before update of estado on laofi.pedido_items for each row execute function laofi.validar_estado_item();

-- RLS ----------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['ajustes', 'zonas', 'mesas', 'mesa_sesiones', 'sesion_participantes', 'avisos', 'grupos_pedido',
                           'pedidos', 'pedido_items', 'pedido_item_repartos', 'pedido_estado_historial', 'pagos'] loop
    execute format('alter table laofi.%I enable row level security', t);
    execute format('create policy %I on laofi.%I for all to authenticated using (laofi.es_gestor()) with check (laofi.es_gestor())', t || '_gestores', t);
    execute format('revoke all on laofi.%I from public, anon', t);
    execute format('grant select, insert, update, delete on laofi.%I to authenticated', t);
    execute format('grant all on laofi.%I to service_role', t);
  end loop;
end;
$$;

-- Tiempo real para cocina, salón y print-bridge (solo si existe la publicación
-- de Supabase; en los tests locales no existe). Aditivo: no quita nada de ella.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table laofi.pedidos, laofi.pedido_items, laofi.avisos, laofi.mesas;
  end if;
end;
$$;

-- Helpers internos --------------------------------------------------------------------
create or replace function laofi.ahora_madrid()
returns timestamp
language sql
stable
set search_path = ''
as $$ select now() at time zone 'Europe/Madrid'; $$;

/** Siguiente número de pedido del día (serializado con un advisory lock). */
create or replace function laofi.siguiente_numero_dia()
returns integer
language plpgsql
set search_path = ''
as $$
declare v integer;
begin
  perform pg_advisory_xact_lock(hashtext('laofi.pedidos.numero_dia'));
  select coalesce(max(numero_dia), 0) + 1 into v
  from laofi.pedidos where fecha_servicio = (now() at time zone 'Europe/Madrid')::date;
  return v;
end;
$$;

/** Franjas de recogida de HOY con plazas libres (vacío si la recogida está desactivada). */
create or replace function laofi.franjas_recogida_hoy()
returns table (hora timestamptz, libres integer)
language plpgsql
stable
set search_path = ''
as $$
declare
  cfg jsonb;
  ahora timestamp := now() at time zone 'Europe/Madrid';
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  v_dia smallint := extract(isodow from (now() at time zone 'Europe/Madrid'))::smallint;
  h laofi.horario;
  desde time;
  hasta time;
  paso interval;
  t timestamp;
  ocupadas integer;
begin
  select valor into cfg from laofi.ajustes where clave = 'recogida';
  if cfg is null or not coalesce((cfg ->> 'activa')::boolean, false)
     or cfg ->> 'desde' is null or cfg ->> 'hasta' is null or cfg ->> 'capacidad' is null
     or not (cfg -> 'dias') @> to_jsonb(v_dia) then
    return;
  end if;

  select * into h from laofi.horario hr where hr.dia = v_dia;
  if h.estado is distinct from 'abierto' then
    return;
  end if;

  desde := greatest((cfg ->> 'desde')::time, h.desde);
  hasta := least((cfg ->> 'hasta')::time, case when h.hasta = '00:00' then '23:59'::time else h.hasta end);
  paso := make_interval(mins => (cfg ->> 'intervalo_min')::int);
  t := hoy + desde;
  while t <= hoy + hasta loop
    if t >= ahora + make_interval(mins => coalesce((cfg ->> 'antelacion_min')::int, 0)) then
      select count(*) into ocupadas from (
        select coalesce(p.grupo_id, p.id) from laofi.pedidos p
        where p.recogida_en = (t at time zone 'Europe/Madrid') and p.estado <> 'CANCELLED' and p.grupo_id is null
        union all
        select g.id from laofi.grupos_pedido g
        where g.recogida_en = (t at time zone 'Europe/Madrid') and g.estado <> 'CANCELADO'
      ) x;
      hora := t at time zone 'Europe/Madrid';
      libres := greatest((cfg ->> 'capacidad')::int - ocupadas, 0);
      return next;
    end if;
    t := t + paso;
  end loop;
end;
$$;

/** Precio unitario validado (precio + suplementos) y la instantánea de modificadores. */
create or replace function laofi.linea_validada(p_producto laofi.productos, p_opciones uuid[])
returns table (precio integer, modificadores jsonb)
language plpgsql
stable
set search_path = ''
as $$
declare
  m laofi.modificadores;
  elegidas uuid[];
  extra integer := 0;
  snap jsonb := '[]'::jsonb;
  op record;
  validas integer;
begin
  -- Toda opción enviada debe existir, estar disponible y ser de este producto.
  select count(*) into validas
  from laofi.modificador_opciones o join laofi.modificadores mm on mm.id = o.modificador_id
  where o.id = any (coalesce(p_opciones, '{}')) and o.disponible and mm.producto_id = p_producto.id;
  if validas <> coalesce(cardinality(p_opciones), 0) then
    raise exception 'Opción no válida para %', p_producto.nombre using errcode = 'P0001';
  end if;

  for m in select * from laofi.modificadores where producto_id = p_producto.id order by orden, nombre loop
    select coalesce(array_agg(o.id), '{}') into elegidas
    from laofi.modificador_opciones o where o.modificador_id = m.id and o.id = any (coalesce(p_opciones, '{}'));
    if m.obligatorio and cardinality(elegidas) = 0 then
      raise exception 'Falta elegir % en %', lower(m.nombre), p_producto.nombre using errcode = 'P0001';
    end if;
    if m.tipo = 'unico' and cardinality(elegidas) > 1 then
      raise exception 'Solo una opción de % en %', lower(m.nombre), p_producto.nombre using errcode = 'P0001';
    end if;
    if m.max_opciones is not null and cardinality(elegidas) > m.max_opciones then
      raise exception 'Demasiadas opciones de % en %', lower(m.nombre), p_producto.nombre using errcode = 'P0001';
    end if;
    if cardinality(elegidas) > 0 then
      for op in select o.nombre, o.precio_extra_centimos from laofi.modificador_opciones o where o.id = any (elegidas) order by o.orden loop
        extra := extra + op.precio_extra_centimos;
      end loop;
      snap := snap || jsonb_build_object(
        'modificador', m.nombre,
        'opciones', (select jsonb_agg(jsonb_build_object('nombre', o.nombre, 'precio_extra_centimos', o.precio_extra_centimos) order by o.orden)
                     from laofi.modificador_opciones o where o.id = any (elegidas))
      );
    end if;
  end loop;

  precio := p_producto.precio_centimos + extra;
  modificadores := snap;
  return next;
end;
$$;

-- RPC públicas: mesa y sesión ----------------------------------------------------------
create or replace function public.laofi_validar_mesa(p_site_key uuid, p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select jsonb_build_object('id', m.id, 'numero', m.numero, 'nombre', m.nombre, 'zona', z.nombre,
                            'sesion_id', (select s.id from laofi.mesa_sesiones s where s.mesa_id = m.id and s.estado = 'ACTIVA'),
                            'modo', (select s.modo from laofi.mesa_sesiones s where s.mesa_id = m.id and s.estado = 'ACTIVA'))
  from laofi.mesas m left join laofi.zonas z on z.id = m.zona_id
  where laofi.site_key_valida(p_site_key) and m.token = p_token and m.activa;
$$;

create or replace function public.laofi_iniciar_sesion_mesa(p_site_key uuid, p_token text, p_modo text)
returns jsonb
language plpgsql
security definer
set search_path = public, laofi
as $$
declare
  v_mesa laofi.mesas;
  v_sesion laofi.mesa_sesiones;
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  if p_modo not in ('JUNTOS', 'SEPARADO') then raise exception 'Modo no válido' using errcode = 'P0001'; end if;
  select * into v_mesa from laofi.mesas where token = p_token and activa;
  if v_mesa.id is null then raise exception 'Mesa no válida' using errcode = 'P0001'; end if;
  if v_mesa.bloqueada then raise exception 'Mesa no disponible' using errcode = 'P0001'; end if;

  select * into v_sesion from laofi.mesa_sesiones where mesa_id = v_mesa.id and estado = 'ACTIVA' for update;
  if v_sesion.id is null then
    insert into laofi.mesa_sesiones (mesa_id, modo) values (v_mesa.id, p_modo) returning * into v_sesion;
    update laofi.mesas set ocupada = true, entrada_at = coalesce(entrada_at, now()) where id = v_mesa.id;
  end if;
  return jsonb_build_object('id', v_sesion.id, 'modo', v_sesion.modo);
end;
$$;

create or replace function public.laofi_unirse_sesion(p_site_key uuid, p_sesion_id uuid, p_nombre text, p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, laofi
as $$
declare v laofi.sesion_participantes;
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  if not exists (select 1 from laofi.mesa_sesiones where id = p_sesion_id and estado = 'ACTIVA') then
    raise exception 'Sesión de mesa no válida o cerrada' using errcode = 'P0001';
  end if;
  insert into laofi.sesion_participantes (sesion_id, nombre, device_id)
  values (p_sesion_id, btrim(p_nombre), p_device_id)
  on conflict (sesion_id, device_id) do update set nombre = excluded.nombre
  returning * into v;
  return jsonb_build_object('id', v.id, 'nombre', v.nombre);
end;
$$;

create or replace function public.laofi_get_sesion(p_site_key uuid, p_sesion_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select jsonb_build_object(
    'id', s.id, 'modo', s.modo, 'estado', s.estado,
    'mesa', jsonb_build_object('numero', m.numero, 'nombre', m.nombre),
    'participantes', coalesce((select jsonb_agg(jsonb_build_object('id', sp.id, 'nombre', sp.nombre) order by sp.created_at)
                               from laofi.sesion_participantes sp where sp.sesion_id = s.id), '[]'::jsonb),
    'pedidos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id, 'numero_dia', o.numero_dia, 'estado', o.estado, 'payment_method', o.payment_method,
        'payment_status', o.payment_status, 'participante_id', o.participante_id, 'total_centimos', o.total_centimos,
        'created_at', o.created_at,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', i.id, 'nombre', i.nombre, 'cantidad', i.cantidad, 'precio_unitario_centimos', i.precio_unitario_centimos,
            'estado', i.estado,
            'repartos', coalesce((select jsonb_agg(jsonb_build_object(
                          'id', r.id, 'participante_id', r.participante_id, 'importe_centimos', r.importe_centimos,
                          'pagado', r.pagado, 'asumido_de_participante_id', r.asumido_de_participante_id))
                        from laofi.pedido_item_repartos r where r.pedido_item_id = i.id), '[]'::jsonb)
          ) order by i.created_at) from laofi.pedido_items i where i.pedido_id = o.id), '[]'::jsonb)
      ) order by o.created_at) from laofi.pedidos o where o.sesion_id = s.id), '[]'::jsonb)
  )
  from laofi.mesa_sesiones s join laofi.mesas m on m.id = s.mesa_id
  where laofi.site_key_valida(p_site_key) and s.id = p_sesion_id;
$$;

/** Un comensal asume (paga) la parte pendiente de otro en la misma sesión. */
create or replace function public.laofi_asumir_reparto(p_site_key uuid, p_reparto_id uuid, p_participante_id uuid)
returns void
language plpgsql
security definer
set search_path = public, laofi
as $$
declare r record;
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  select rp.*, sp.sesion_id into r
  from laofi.pedido_item_repartos rp join laofi.sesion_participantes sp on sp.id = rp.participante_id
  where rp.id = p_reparto_id for update of rp;
  if r.id is null or r.pagado then raise exception 'Parte no disponible' using errcode = 'P0001'; end if;
  if not exists (select 1 from laofi.sesion_participantes where id = p_participante_id and sesion_id = r.sesion_id) then
    raise exception 'Solo entre comensales de la misma mesa' using errcode = 'P0001';
  end if;
  update laofi.pedido_item_repartos
  set asumido_de_participante_id = coalesce(asumido_de_participante_id, participante_id), participante_id = p_participante_id
  where id = p_reparto_id;
end;
$$;

create or replace function public.laofi_avisar(p_site_key uuid, p_token text, p_tipo text)
returns void
language plpgsql
security definer
set search_path = public, laofi
as $$
declare v_mesa uuid;
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  if p_tipo not in ('CAMARERO', 'CUENTA') then raise exception 'Aviso no válido' using errcode = 'P0001'; end if;
  select id into v_mesa from laofi.mesas where token = p_token and activa;
  if v_mesa is null then raise exception 'Mesa no válida' using errcode = 'P0001'; end if;
  -- Un aviso pendiente por tipo y mesa: pulsar diez veces no genera diez avisos.
  if not exists (select 1 from laofi.avisos where mesa_id = v_mesa and tipo = p_tipo and atendido_at is null) then
    insert into laofi.avisos (mesa_id, tipo) values (v_mesa, p_tipo);
  end if;
end;
$$;

-- RPC públicas: recogida y grupos -----------------------------------------------------
create or replace function public.laofi_get_config_pedidos(p_site_key uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select jsonb_build_object(
    'pagos', (select valor from laofi.ajustes where clave = 'pagos'),
    'recogida_activa', exists (select 1 from laofi.franjas_recogida_hoy()),
    'franjas', coalesce((select jsonb_agg(jsonb_build_object('hora', f.hora, 'libres', f.libres) order by f.hora)
                         from laofi.franjas_recogida_hoy() f), '[]'::jsonb)
  )
  where laofi.site_key_valida(p_site_key);
$$;

create or replace function public.laofi_crear_grupo(p_site_key uuid, p_nombre text, p_organizador text, p_recogida_en timestamptz)
returns jsonb
language plpgsql
security definer
set search_path = public, laofi
as $$
declare
  v_libres integer;
  v_antelacion integer;
  v laofi.grupos_pedido;
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  select f.libres into v_libres from laofi.franjas_recogida_hoy() f where f.hora = p_recogida_en;
  if v_libres is null or v_libres < 1 then raise exception 'Franja de recogida no disponible' using errcode = 'P0001'; end if;
  select coalesce((valor ->> 'antelacion_min')::int, 0) into v_antelacion from laofi.ajustes where clave = 'recogida';
  insert into laofi.grupos_pedido (nombre, organizador, recogida_en, cierra_en)
  values (btrim(p_nombre), btrim(p_organizador), p_recogida_en, p_recogida_en - make_interval(mins => v_antelacion))
  returning * into v;
  return jsonb_build_object('token', v.token, 'recogida_en', v.recogida_en, 'cierra_en', v.cierra_en);
end;
$$;

create or replace function public.laofi_get_grupo(p_site_key uuid, p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select jsonb_build_object(
    'token', g.token, 'nombre', g.nombre, 'organizador', g.organizador,
    'recogida_en', g.recogida_en, 'cierra_en', g.cierra_en,
    'abierto', g.estado = 'ABIERTO' and now() < g.cierra_en,
    -- Solo nombres y nº de platos: nadie ve lo que pagan los demás.
    'pedidos', coalesce((select jsonb_agg(jsonb_build_object('nombre', p.nombre_cliente,
                                   'platos', (select coalesce(sum(i.cantidad), 0) from laofi.pedido_items i where i.pedido_id = p.id))
                                 order by p.created_at)
                         from laofi.pedidos p where p.grupo_id = g.id and p.estado <> 'CANCELLED'), '[]'::jsonb)
  )
  from laofi.grupos_pedido g
  where laofi.site_key_valida(p_site_key) and g.token = p_token and g.estado <> 'CANCELADO';
$$;

-- RPC pública: crear pedido -------------------------------------------------------------
/*
 p_pedido (jsonb):
   tipo: 'MESA' | 'RECOGIDA'
   mesa_token, sesion_id, participante_id      (MESA)
   recogida_en, grupo_token                    (RECOGIDA)
   nombre, telefono, notas, payment_method ('ONLINE' | 'LOCAL')
   total_esperado_centimos                     (opcional: si no cuadra → PRECIO_CAMBIADO)
   items: [{ producto_id, cantidad, opciones: [uuid], notas, reparto: [{participante_id, importe_centimos}] }]
*/
create or replace function public.laofi_crear_pedido(p_site_key uuid, p_pedido jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, laofi
as $$
declare
  v_tipo text := p_pedido ->> 'tipo';
  v_pago text := coalesce(p_pedido ->> 'payment_method', 'LOCAL');
  v_pagos jsonb;
  v_mesa laofi.mesas;
  v_sesion laofi.mesa_sesiones;
  v_participante uuid := nullif(p_pedido ->> 'participante_id', '')::uuid;
  v_grupo laofi.grupos_pedido;
  v_recogida timestamptz;
  v_pedido_id uuid;
  v_numero integer;
  v_item jsonb;
  v_reparto jsonb;
  v_producto laofi.productos;
  v_linea record;
  v_cantidad integer;
  v_item_id uuid;
  v_subtotal integer := 0;
  v_linea_total integer;
  v_suma integer;
  v_opciones uuid[];
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  if v_tipo not in ('MESA', 'RECOGIDA') then raise exception 'Tipo de pedido no válido' using errcode = 'P0001'; end if;
  if v_pago not in ('ONLINE', 'LOCAL') then raise exception 'Método de pago no válido' using errcode = 'P0001'; end if;
  select valor into v_pagos from laofi.ajustes where clave = 'pagos';
  if v_pago = 'ONLINE' and not coalesce((v_pagos ->> 'online')::boolean, false) then
    raise exception 'El pago online no está activo' using errcode = 'P0001';
  end if;
  if v_pago = 'LOCAL' and not coalesce((v_pagos ->> 'en_local')::boolean, true) then
    raise exception 'El pago en el local no está activo' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_pedido -> 'items') is distinct from 'array' or jsonb_array_length(p_pedido -> 'items') = 0 then
    raise exception 'El pedido no tiene productos' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_pedido -> 'items') > 60 then raise exception 'Demasiadas líneas' using errcode = 'P0001'; end if;

  if v_tipo = 'MESA' then
    select * into v_mesa from laofi.mesas where token = p_pedido ->> 'mesa_token' and activa;
    if v_mesa.id is null then raise exception 'Mesa no válida' using errcode = 'P0001'; end if;
    if p_pedido ? 'sesion_id' then
      select * into v_sesion from laofi.mesa_sesiones
      where id = (p_pedido ->> 'sesion_id')::uuid and mesa_id = v_mesa.id and estado = 'ACTIVA';
      if v_sesion.id is null then raise exception 'Sesión de mesa no válida o cerrada' using errcode = 'P0001'; end if;
      if v_participante is not null and not exists (
        select 1 from laofi.sesion_participantes where id = v_participante and sesion_id = v_sesion.id) then
        raise exception 'Comensal no válido para esta mesa' using errcode = 'P0001';
      end if;
    end if;
  else
    if p_pedido ? 'grupo_token' then
      select * into v_grupo from laofi.grupos_pedido where token = p_pedido ->> 'grupo_token' for update;
      if v_grupo.id is null or v_grupo.estado <> 'ABIERTO' or now() >= v_grupo.cierra_en then
        raise exception 'El pedido de grupo ya está cerrado' using errcode = 'P0001';
      end if;
      v_recogida := v_grupo.recogida_en;
    else
      v_recogida := (p_pedido ->> 'recogida_en')::timestamptz;
      perform pg_advisory_xact_lock(hashtext('laofi.recogida'));
      if not exists (select 1 from laofi.franjas_recogida_hoy() f where f.hora = v_recogida and f.libres > 0) then
        raise exception 'Franja de recogida no disponible' using errcode = 'P0001';
      end if;
    end if;
    if nullif(btrim(p_pedido ->> 'nombre'), '') is null then
      raise exception 'Falta el nombre para la recogida' using errcode = 'P0001';
    end if;
  end if;

  v_numero := laofi.siguiente_numero_dia();
  insert into laofi.pedidos (numero_dia, tipo, mesa_id, sesion_id, participante_id, grupo_id, nombre_cliente, telefono,
                             recogida_en, payment_method, notas)
  values (v_numero, v_tipo, v_mesa.id, v_sesion.id, v_participante, v_grupo.id,
          nullif(btrim(p_pedido ->> 'nombre'), ''), nullif(regexp_replace(coalesce(p_pedido ->> 'telefono', ''), '[^0-9+ ]', '', 'g'), ''),
          v_recogida, v_pago, nullif(btrim(p_pedido ->> 'notas'), ''))
  returning id into v_pedido_id;

  for v_item in select * from jsonb_array_elements(p_pedido -> 'items') loop
    select * into v_producto from laofi.productos where id = (v_item ->> 'producto_id')::uuid and disponible;
    if v_producto.id is null then
      raise exception 'AGOTADO:%', coalesce(v_item ->> 'producto_id', '') using errcode = 'P0001';
    end if;
    if v_producto.precio_centimos is null then
      raise exception '% no se puede pedir online (precio en el local)', v_producto.nombre using errcode = 'P0001';
    end if;
    v_cantidad := coalesce((v_item ->> 'cantidad')::integer, 1);
    if v_cantidad < 1 or v_cantidad > 50 then raise exception 'Cantidad no válida' using errcode = 'P0001'; end if;
    select coalesce(array_agg(x::uuid), '{}') into v_opciones from jsonb_array_elements_text(coalesce(v_item -> 'opciones', '[]')) x;
    select * into v_linea from laofi.linea_validada(v_producto, v_opciones);

    insert into laofi.pedido_items (pedido_id, producto_id, nombre, cantidad, precio_unitario_centimos, modificadores, notas, estacion, iva_pct)
    values (v_pedido_id, v_producto.id, v_producto.nombre, v_cantidad, v_linea.precio, v_linea.modificadores,
            nullif(left(btrim(v_item ->> 'notas'), 140), ''), v_producto.estacion, v_producto.iva_pct)
    returning id into v_item_id;

    v_linea_total := v_linea.precio * v_cantidad;
    v_subtotal := v_subtotal + v_linea_total;

    -- Reparto entre comensales (modo "cada uno lo suyo"): debe cuadrar al céntimo.
    if v_sesion.id is not null and v_sesion.modo = 'SEPARADO' then
      if jsonb_typeof(v_item -> 'reparto') = 'array' and jsonb_array_length(v_item -> 'reparto') > 0 then
        v_suma := 0;
        for v_reparto in select * from jsonb_array_elements(v_item -> 'reparto') loop
          if not exists (select 1 from laofi.sesion_participantes
                         where id = (v_reparto ->> 'participante_id')::uuid and sesion_id = v_sesion.id) then
            raise exception 'Reparto con un comensal de otra mesa' using errcode = 'P0001';
          end if;
          insert into laofi.pedido_item_repartos (pedido_item_id, participante_id, importe_centimos)
          values (v_item_id, (v_reparto ->> 'participante_id')::uuid, (v_reparto ->> 'importe_centimos')::integer);
          v_suma := v_suma + (v_reparto ->> 'importe_centimos')::integer;
        end loop;
        if v_suma <> v_linea_total then
          raise exception 'PRECIO_CAMBIADO:el reparto de % no cuadra con su precio', v_producto.nombre using errcode = 'P0001';
        end if;
      elsif v_participante is not null then
        insert into laofi.pedido_item_repartos (pedido_item_id, participante_id, importe_centimos)
        values (v_item_id, v_participante, v_linea_total);
      end if;
    end if;
  end loop;

  if p_pedido ? 'total_esperado_centimos' and (p_pedido ->> 'total_esperado_centimos')::integer <> v_subtotal then
    raise exception 'PRECIO_CAMBIADO:%', v_subtotal using errcode = 'P0001';
  end if;

  update laofi.pedidos set subtotal_centimos = v_subtotal, total_centimos = v_subtotal where id = v_pedido_id;
  return jsonb_build_object('id', v_pedido_id, 'numero_dia', v_numero, 'total_centimos', v_subtotal);
end;
$$;

create or replace function public.laofi_get_pedido(p_site_key uuid, p_pedido_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select jsonb_build_object(
    'id', p.id, 'numero_dia', p.numero_dia, 'tipo', p.tipo, 'estado', p.estado,
    'payment_method', p.payment_method, 'payment_status', p.payment_status,
    'total_centimos', p.total_centimos, 'recogida_en', p.recogida_en, 'nombre', p.nombre_cliente,
    'mesa', case when m.id is null then null else jsonb_build_object('numero', m.numero, 'nombre', m.nombre) end,
    'grupo', case when g.id is null then null else jsonb_build_object('nombre', g.nombre, 'token', g.token) end,
    'created_at', p.created_at, 'updated_at', p.updated_at,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
                         'nombre', i.nombre, 'cantidad', i.cantidad, 'precio_unitario_centimos', i.precio_unitario_centimos,
                         'modificadores', i.modificadores, 'notas', i.notas, 'estado', i.estado) order by i.created_at)
                       from laofi.pedido_items i where i.pedido_id = p.id), '[]'::jsonb)
  )
  from laofi.pedidos p
  left join laofi.mesas m on m.id = p.mesa_id
  left join laofi.grupos_pedido g on g.id = p.grupo_id
  where laofi.site_key_valida(p_site_key) and p.id = p_pedido_id;
$$;

-- Pagos (SOLO service_role: webhook y creación del checkout) ----------------------------
create or replace function public.laofi_get_pedido_para_pago(p_pedido_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select jsonb_build_object(
    'id', p.id, 'numero_dia', p.numero_dia, 'payment_method', p.payment_method, 'payment_status', p.payment_status,
    'estado', p.estado, 'total_centimos', p.total_centimos,
    'lineas', coalesce((select jsonb_agg(jsonb_build_object('nombre', i.nombre, 'cantidad', i.cantidad,
                                                            'precio_unitario_centimos', i.precio_unitario_centimos))
                        from laofi.pedido_items i where i.pedido_id = p.id and not i.invitacion), '[]'::jsonb)
  )
  from laofi.pedidos p where p.id = p_pedido_id;
$$;

create or replace function public.laofi_get_reparto_para_pago(p_participante_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select jsonb_build_object(
    'participante_id', sp.id, 'nombre', sp.nombre, 'sesion_id', sp.sesion_id,
    'lineas', coalesce((select jsonb_agg(jsonb_build_object('reparto_id', r.id, 'nombre', i.nombre, 'importe_centimos', r.importe_centimos))
                        from laofi.pedido_item_repartos r join laofi.pedido_items i on i.id = r.pedido_item_id
                        join laofi.pedidos p on p.id = i.pedido_id
                        where r.participante_id = sp.id and not r.pagado and p.estado <> 'CANCELLED'), '[]'::jsonb)
  )
  from laofi.sesion_participantes sp where sp.id = p_participante_id;
$$;

/** Webhook de Stripe: pedido completo pagado. Idempotente por stripe_session_id. */
create or replace function public.laofi_marcar_pedido_pagado(p_pedido_id uuid, p_stripe_session_id text, p_payment_intent text, p_importe_centimos integer)
returns void
language plpgsql
security definer
set search_path = public, laofi
as $$
begin
  if exists (select 1 from laofi.pagos where stripe_session_id = p_stripe_session_id) then return; end if;
  if p_importe_centimos <> (select total_centimos from laofi.pedidos where id = p_pedido_id) then
    raise exception 'El importe cobrado no coincide con el pedido' using errcode = 'P0001';
  end if;
  insert into laofi.pagos (pedido_id, metodo, importe_centimos, stripe_session_id, stripe_payment_intent_id)
  values (p_pedido_id, 'STRIPE', p_importe_centimos, p_stripe_session_id, p_payment_intent);
  update laofi.pedidos set payment_status = 'PAID' where id = p_pedido_id;
end;
$$;

/** Webhook de Stripe: un comensal ha pagado sus partes (modo "cada uno lo suyo"). */
create or replace function public.laofi_marcar_repartos_pagados(p_participante_id uuid, p_reparto_ids uuid[], p_stripe_session_id text, p_payment_intent text, p_importe_centimos integer)
returns void
language plpgsql
security definer
set search_path = public, laofi
as $$
declare v_suma integer;
begin
  if exists (select 1 from laofi.pagos where stripe_session_id = p_stripe_session_id) then return; end if;
  select coalesce(sum(importe_centimos), 0) into v_suma from laofi.pedido_item_repartos
  where id = any (p_reparto_ids) and participante_id = p_participante_id and not pagado;
  if v_suma <> p_importe_centimos then
    raise exception 'El importe cobrado no coincide con las partes' using errcode = 'P0001';
  end if;
  update laofi.pedido_item_repartos set pagado = true, paid_at = now(), stripe_session_id = p_stripe_session_id
  where id = any (p_reparto_ids) and participante_id = p_participante_id;
  insert into laofi.pagos (participante_id, metodo, importe_centimos, stripe_session_id, stripe_payment_intent_id)
  values (p_participante_id, 'STRIPE', p_importe_centimos, p_stripe_session_id, p_payment_intent);
  -- Un pedido cuyas partes están todas pagadas queda pagado.
  update laofi.pedidos p set payment_status = 'PAID'
  where p.payment_status <> 'PAID' and p.id in (
    select i.pedido_id from laofi.pedido_items i join laofi.pedido_item_repartos r on r.pedido_item_id = i.id where r.id = any (p_reparto_ids)
  ) and not exists (
    select 1 from laofi.pedido_items i join laofi.pedido_item_repartos r on r.pedido_item_id = i.id
    where i.pedido_id = p.id and not r.pagado
  );
end;
$$;

-- Permisos ------------------------------------------------------------------------------
-- Helpers internos: nadie de fuera.
revoke all on function laofi.transicion_permitida(text, text), laofi.validar_estado_pedido(), laofi.validar_estado_item(),
  laofi.ahora_madrid(), laofi.siguiente_numero_dia(), laofi.franjas_recogida_hoy(),
  laofi.linea_validada(laofi.productos, uuid[]) from public, anon;
grant execute on function laofi.transicion_permitida(text, text), laofi.ahora_madrid(), laofi.franjas_recogida_hoy()
  to authenticated, service_role;

-- RPC públicas (anon): las de lectura y creación de pedido.
do $$
declare f text;
begin
  foreach f in array array[
    'public.laofi_validar_mesa(uuid, text)', 'public.laofi_iniciar_sesion_mesa(uuid, text, text)',
    'public.laofi_unirse_sesion(uuid, uuid, text, text)', 'public.laofi_get_sesion(uuid, uuid)',
    'public.laofi_asumir_reparto(uuid, uuid, uuid)', 'public.laofi_avisar(uuid, text, text)',
    'public.laofi_get_config_pedidos(uuid)', 'public.laofi_crear_grupo(uuid, text, text, timestamptz)',
    'public.laofi_get_grupo(uuid, text)', 'public.laofi_crear_pedido(uuid, jsonb)', 'public.laofi_get_pedido(uuid, uuid)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated, service_role', f);
  end loop;

  -- Pagos: SOLO service_role. Revocado explícitamente de anon y authenticated
  -- (Supabase les concede EXECUTE por defecto en funciones nuevas).
  foreach f in array array[
    'public.laofi_get_pedido_para_pago(uuid)', 'public.laofi_get_reparto_para_pago(uuid)',
    'public.laofi_marcar_pedido_pagado(uuid, text, text, integer)',
    'public.laofi_marcar_repartos_pagados(uuid, uuid[], text, text, integer)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;
