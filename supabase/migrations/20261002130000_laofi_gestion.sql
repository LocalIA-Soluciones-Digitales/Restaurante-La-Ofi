-- =============================================================================
-- Restaurante La Ofi — gestión: reservas, menú del día, ventas e informes,
-- fidelización y reseñas (desactivadas por defecto) y TicketBAI (scaffold)
-- -----------------------------------------------------------------------------
-- Aditiva dentro de laofi. Redefine dos funciones propias de 20261002120000
-- (laofi.tabla_admin y public.laofi_admin_salon) para incluir las tablas nuevas y
-- la reserva próxima de cada mesa; la reversión restaura las versiones anteriores.
-- Reversión: supabase/rollback/20261002130000_laofi_gestion.down.sql
-- =============================================================================

-- Ajustes por defecto (todo lo nuevo, APAGADO hasta que el restaurante lo active) --
insert into laofi.ajustes (clave, valor) values
  ('reservas', '{"online": false, "max_personas": 12, "antelacion_dias": 60}'),
  ('fidelizacion', '{"activa": false}'),
  ('resenas', '{"activa": false}'),
  ('fiscal', '{"razon_social": null, "nif": null}'),
  ('ticketbai', '{"activo": false, "serie": "WEB"}')
on conflict (clave) do nothing;

-- Fidelización (portada de Palomita: comensales, reglas, premios) ---------------------
create table laofi.comensales (
  id uuid primary key default gen_random_uuid(),
  nombre text,
  telefono text not null,
  telefono_normalizado text not null unique check (telefono_normalizado ~ '^[0-9]{9}$'),
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table laofi.reglas_promocion (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(btrim(nombre)) > 0),
  visitas_requeridas integer not null check (visitas_requeridas > 0),
  ventana_dias integer check (ventana_dias is null or ventana_dias > 0),
  hora_desde time,
  hora_hasta time,
  premio text not null check (length(btrim(premio)) > 0),
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- Reservas --------------------------------------------------------------------------
create table laofi.reservas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(btrim(nombre)) between 1 and 60),
  telefono text not null check (telefono ~ '^[0-9+ ]{9,16}$'),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  personas smallint not null check (personas between 1 and 220),
  fecha date not null,
  hora time not null,
  duracion_min smallint not null default 90 check (duracion_min between 15 and 600),
  espacio text not null default 'mesa' check (espacio in ('mesa', 'despacho', 'evento')),
  zona_id uuid references laofi.zonas(id) on delete set null,
  evento_id uuid references laofi.eventos(id) on delete set null,
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'CONFIRMADA', 'SENTADA', 'CANCELADA', 'NO_SHOW')),
  notas text check (notas is null or length(notas) <= 500),
  origen text not null default 'admin' check (origen in ('web', 'telefono', 'admin')),
  comensal_id uuid references laofi.comensales(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reservas_fecha_idx on laofi.reservas (fecha, hora);

create table laofi.reserva_mesas (
  reserva_id uuid not null references laofi.reservas(id) on delete cascade,
  mesa_id uuid not null references laofi.mesas(id) on delete cascade,
  primary key (reserva_id, mesa_id)
);

create table laofi.premios_otorgados (
  id uuid primary key default gen_random_uuid(),
  comensal_id uuid not null references laofi.comensales(id) on delete cascade,
  regla_id uuid not null references laofi.reglas_promocion(id) on delete cascade,
  reserva_id uuid not null references laofi.reservas(id) on delete cascade,
  visitas integer not null,
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'CANJEADO')),
  fecha_otorgado timestamptz not null default now(),
  fecha_canjeado timestamptz,
  unique (reserva_id, regla_id)
);

-- Reseñas (moderadas; solo se publican las aprobadas y con la función activa) ------------
create table laofi.resenas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(btrim(nombre)) between 1 and 40),
  puntuacion smallint not null check (puntuacion between 1 and 5),
  texto text not null check (length(btrim(texto)) between 10 and 800),
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'APROBADA', 'RECHAZADA')),
  respuesta text check (respuesta is null or length(respuesta) <= 800),
  created_at timestamptz not null default now()
);

-- TicketBAI (portado de Palomita §19; escritura SOLO service_role) --------------------------
create table laofi.ticketbai_facturas (
  id uuid primary key default gen_random_uuid(),
  pedido_ids uuid[] not null,
  mesa_id uuid references laofi.mesas(id) on delete set null,
  serie text not null,
  numero integer not null,
  fecha_expedicion date not null,
  hora_expedicion time not null,
  nif_emisor text not null,
  razon_social_emisor text not null,
  descripcion text not null default 'Consumición hostelería',
  importe_total_centimos integer not null,
  desglose_iva jsonb not null,
  lineas jsonb not null,
  encadenamiento_serie_anterior text,
  encadenamiento_numero_anterior integer,
  encadenamiento_fecha_anterior date,
  encadenamiento_firma_anterior text,
  identificativo_tbai text,
  qr_url text,
  xml_sin_firmar text,
  xml_firmado text,
  signature_value text,
  estado text not null default 'BORRADOR' check (estado in ('BORRADOR', 'FIRMADA', 'ENVIADA', 'ERROR', 'ANULADA')),
  error_mensaje text,
  enviado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (serie, numero)
);
create index ticketbai_pedidos_idx on laofi.ticketbai_facturas using gin (pedido_ids);

create trigger trg_reservas_updated_at before update on laofi.reservas for each row execute function public.set_updated_at();
create trigger trg_comensales_updated_at before update on laofi.comensales for each row execute function public.set_updated_at();
create trigger trg_ticketbai_updated_at before update on laofi.ticketbai_facturas for each row execute function public.set_updated_at();

do $$
declare t text;
begin
  foreach t in array array['comensales', 'reglas_promocion', 'reservas', 'reserva_mesas', 'premios_otorgados', 'resenas'] loop
    execute format('alter table laofi.%I enable row level security', t);
    execute format('create policy %I on laofi.%I for all to authenticated using (laofi.es_gestor()) with check (laofi.es_gestor())', t || '_gestores', t);
    execute format('revoke all on laofi.%I from public, anon', t);
    execute format('grant select, insert, update, delete on laofi.%I to authenticated', t);
    execute format('grant all on laofi.%I to service_role', t);
  end loop;
end;
$$;
-- TicketBAI: el staff solo lee; ninguna política de escritura (registro fiscal).
alter table laofi.ticketbai_facturas enable row level security;
create policy ticketbai_lectura on laofi.ticketbai_facturas for select to authenticated using (laofi.es_gestor());
revoke all on laofi.ticketbai_facturas from public, anon;
grant select on laofi.ticketbai_facturas to authenticated;
grant all on laofi.ticketbai_facturas to service_role;

-- Fidelización: triggers (no hacen nada si la función está apagada) ------------------------
create or replace function laofi.fidelizacion_activa()
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce((select (valor ->> 'activa')::boolean from laofi.ajustes where clave = 'fidelizacion'), false); $$;

create or replace function laofi.hora_en_rango(p_hora time, p_desde time, p_hasta time)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_desde is null or p_hasta is null then true
    when p_hasta <= p_desde then p_hora >= p_desde or p_hora < p_hasta
    else p_hora >= p_desde and p_hora < p_hasta
  end;
$$;

create or replace function laofi.vincular_comensal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_tel text := right(regexp_replace(coalesce(new.telefono, ''), '\D', '', 'g'), 9);
begin
  if not laofi.fidelizacion_activa() or length(v_tel) <> 9 then return new; end if;
  insert into laofi.comensales (nombre, telefono, telefono_normalizado, email)
  values (new.nombre, new.telefono, v_tel, nullif(btrim(coalesce(new.email, '')), ''))
  on conflict (telefono_normalizado) do update set nombre = excluded.nombre, email = coalesce(excluded.email, laofi.comensales.email)
  returning id into new.comensal_id;
  return new;
end;
$$;
create trigger trg_reservas_comensal before insert or update of telefono on laofi.reservas for each row execute function laofi.vincular_comensal();

create or replace function laofi.evaluar_premios()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r laofi.reglas_promocion;
  v_n integer;
begin
  if not laofi.fidelizacion_activa() or new.comensal_id is null or new.estado <> 'SENTADA' or old.estado = 'SENTADA' then
    return new;
  end if;
  perform 1 from laofi.comensales where id = new.comensal_id for update;
  for r in select * from laofi.reglas_promocion where activa loop
    select count(*) into v_n from laofi.reservas x
    where x.comensal_id = new.comensal_id and (x.estado = 'SENTADA' or x.id = new.id)
      and laofi.hora_en_rango(x.hora, r.hora_desde, r.hora_hasta)
      and (r.ventana_dias is null or x.fecha >= new.fecha - r.ventana_dias);
    if v_n > 0 and v_n % r.visitas_requeridas = 0 then
      insert into laofi.premios_otorgados (comensal_id, regla_id, reserva_id, visitas)
      values (new.comensal_id, r.id, new.id, v_n) on conflict (reserva_id, regla_id) do nothing;
    end if;
  end loop;
  return new;
end;
$$;
create trigger trg_reservas_premios after update of estado on laofi.reservas for each row execute function laofi.evaluar_premios();

-- Reservas: RPC pública ------------------------------------------------------------------
create or replace function public.laofi_get_config_reservas(p_site_key uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select (select valor from laofi.ajustes where clave = 'reservas') where laofi.site_key_valida(p_site_key);
$$;

/*
 p: nombre, telefono, email, personas, fecha (YYYY-MM-DD), hora (HH:MM), espacio ('mesa'|'despacho'|'evento'),
    evento_slug, notas, web (campo trampa: debe venir vacío)
*/
create or replace function public.laofi_crear_reserva(p_site_key uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, laofi
as $$
declare
  cfg jsonb;
  v_fecha date;
  v_hora time;
  v_personas integer;
  v_tel text := regexp_replace(coalesce(p ->> 'telefono', ''), '[^0-9+ ]', '', 'g');
  v_espacio text := coalesce(p ->> 'espacio', 'mesa');
  v_evento uuid;
  h laofi.horario;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  v_id uuid;
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  select valor into cfg from laofi.ajustes where clave = 'reservas';
  if not coalesce((cfg ->> 'online')::boolean, false) then
    raise exception 'Las reservas online no están activas: llámanos' using errcode = 'P0001';
  end if;
  if coalesce(p ->> 'web', '') <> '' then raise exception 'Solicitud no válida' using errcode = 'P0001'; end if;

  v_fecha := (p ->> 'fecha')::date;
  v_hora := (p ->> 'hora')::time;
  v_personas := (p ->> 'personas')::int;
  if nullif(btrim(p ->> 'nombre'), '') is null then raise exception 'Falta el nombre' using errcode = 'P0001'; end if;
  if length(regexp_replace(v_tel, '\D', '', 'g')) < 9 then raise exception 'Teléfono no válido' using errcode = 'P0001'; end if;
  if v_personas is null or v_personas < 1 or v_personas > coalesce((cfg ->> 'max_personas')::int, 12) then
    raise exception 'Para grupos de más de % personas, llámanos', coalesce((cfg ->> 'max_personas')::int, 12) using errcode = 'P0001';
  end if;
  if v_fecha < hoy or v_fecha > hoy + coalesce((cfg ->> 'antelacion_dias')::int, 60) then
    raise exception 'Fecha fuera del periodo de reservas' using errcode = 'P0001';
  end if;
  if v_fecha = hoy and v_hora < (now() at time zone 'Europe/Madrid')::time + interval '30 minutes' then
    raise exception 'Para hoy, reserva con al menos 30 minutos de antelación o llámanos' using errcode = 'P0001';
  end if;

  select * into h from laofi.horario hr where hr.dia = extract(isodow from v_fecha);
  if h.estado = 'cerrado' then raise exception 'Ese día estamos cerrados' using errcode = 'P0001'; end if;
  if h.estado = 'abierto' and (v_hora < h.desde or (h.hasta <> '00:00' and v_hora > h.hasta - interval '30 minutes')) then
    raise exception 'Esa hora está fuera del horario (% a %)', to_char(h.desde, 'HH24:MI'), to_char(h.hasta, 'HH24:MI') using errcode = 'P0001';
  end if;

  if v_espacio not in ('mesa', 'despacho', 'evento') then raise exception 'Espacio no válido' using errcode = 'P0001'; end if;
  if v_espacio = 'evento' then
    select id into v_evento from laofi.eventos e
    where e.slug = p ->> 'evento_slug' and e.publicado and e.fecha >= hoy and e.estado = 'proximo';
    if v_evento is null then raise exception 'Ese evento no admite reservas' using errcode = 'P0001'; end if;
  end if;

  -- Freno a abusos: dos solicitudes como mucho por teléfono y día.
  if (select count(*) from laofi.reservas
      where regexp_replace(telefono, '\D', '', 'g') = regexp_replace(v_tel, '\D', '', 'g')
        and fecha = v_fecha and estado in ('PENDIENTE', 'CONFIRMADA')) >= 2 then
    raise exception 'Ya tienes reservas ese día: llámanos para cambiarlas' using errcode = 'P0001';
  end if;

  insert into laofi.reservas (nombre, telefono, email, personas, fecha, hora, espacio, evento_id, notas, origen, estado)
  values (btrim(p ->> 'nombre'), v_tel, nullif(btrim(coalesce(p ->> 'email', '')), ''), v_personas, v_fecha, v_hora,
          v_espacio, v_evento, nullif(left(btrim(coalesce(p ->> 'notas', '')), 500), ''), 'web', 'PENDIENTE')
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'estado', 'PENDIENTE');
end;
$$;

-- Reseñas: RPC públicas (sin efecto si están desactivadas) ----------------------------------
create or replace function public.laofi_get_resenas(p_site_key uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select coalesce(jsonb_agg(jsonb_build_object('nombre', r.nombre, 'puntuacion', r.puntuacion, 'texto', r.texto,
                                               'respuesta', r.respuesta, 'fecha', r.created_at::date) order by r.created_at desc), '[]'::jsonb)
  from laofi.resenas r
  where laofi.site_key_valida(p_site_key) and r.estado = 'APROBADA'
    and coalesce((select (valor ->> 'activa')::boolean from laofi.ajustes where clave = 'resenas'), false);
$$;

create or replace function public.laofi_crear_resena(p_site_key uuid, p jsonb)
returns void
language plpgsql
security definer
set search_path = public, laofi
as $$
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  if not coalesce((select (valor ->> 'activa')::boolean from laofi.ajustes where clave = 'resenas'), false) then
    raise exception 'Las opiniones no están activas' using errcode = 'P0001';
  end if;
  if coalesce(p ->> 'web', '') <> '' then raise exception 'Solicitud no válida' using errcode = 'P0001'; end if;
  insert into laofi.resenas (nombre, puntuacion, texto) values (btrim(p ->> 'nombre'), (p ->> 'puntuacion')::int, btrim(p ->> 'texto'));
end;
$$;

-- Admin: reservas ---------------------------------------------------------------------------
create or replace function laofi.reserva_json(r laofi.reservas)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select to_jsonb(r) || jsonb_build_object(
    'hora', to_char(r.hora, 'HH24:MI'),
    'mesas', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'numero', m.numero) order by m.numero)
                       from laofi.reserva_mesas rm join laofi.mesas m on m.id = rm.mesa_id where rm.reserva_id = r.id), '[]'::jsonb),
    'evento', (select e.titulo from laofi.eventos e where e.id = r.evento_id),
    'zona', (select z.nombre from laofi.zonas z where z.id = r.zona_id)
  );
$$;

create or replace function public.laofi_admin_reservas(p_desde date, p_hasta date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(laofi.reserva_json(r) order by r.fecha, r.hora), '[]'::jsonb)
  from laofi.reservas r
  where laofi.mi_rol() in ('admin', 'encargado', 'camarero') and r.fecha between p_desde and p_hasta;
$$;

create or replace function public.laofi_admin_guardar_reserva(p jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v laofi.reservas;
  v_id uuid := nullif(p ->> 'id', '')::uuid;
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  if v_id is null then
    insert into laofi.reservas (nombre, telefono, email, personas, fecha, hora, duracion_min, espacio, zona_id, evento_id, notas, origen, estado)
    values (btrim(p ->> 'nombre'), regexp_replace(coalesce(p ->> 'telefono', ''), '[^0-9+ ]', '', 'g'), nullif(btrim(coalesce(p ->> 'email', '')), ''),
            (p ->> 'personas')::int, (p ->> 'fecha')::date, (p ->> 'hora')::time, coalesce((p ->> 'duracion_min')::int, 90),
            coalesce(p ->> 'espacio', 'mesa'), nullif(p ->> 'zona_id', '')::uuid, nullif(p ->> 'evento_id', '')::uuid,
            nullif(btrim(coalesce(p ->> 'notas', '')), ''), coalesce(p ->> 'origen', 'telefono'), coalesce(p ->> 'estado', 'CONFIRMADA'))
    returning * into v;
  else
    update laofi.reservas set
      nombre = coalesce(btrim(p ->> 'nombre'), nombre),
      telefono = coalesce(regexp_replace(p ->> 'telefono', '[^0-9+ ]', '', 'g'), telefono),
      email = case when p ? 'email' then nullif(btrim(coalesce(p ->> 'email', '')), '') else email end,
      personas = coalesce((p ->> 'personas')::int, personas),
      fecha = coalesce((p ->> 'fecha')::date, fecha),
      hora = coalesce((p ->> 'hora')::time, hora),
      duracion_min = coalesce((p ->> 'duracion_min')::int, duracion_min),
      espacio = coalesce(p ->> 'espacio', espacio),
      zona_id = case when p ? 'zona_id' then nullif(p ->> 'zona_id', '')::uuid else zona_id end,
      notas = case when p ? 'notas' then nullif(btrim(coalesce(p ->> 'notas', '')), '') else notas end
    where id = v_id returning * into v;
    if v.id is null then raise exception 'Reserva no encontrada' using errcode = 'P0001'; end if;
  end if;
  if p ? 'mesas' then
    delete from laofi.reserva_mesas where reserva_id = v.id;
    insert into laofi.reserva_mesas (reserva_id, mesa_id)
    select v.id, (x)::uuid from jsonb_array_elements_text(p -> 'mesas') x;
  end if;
  return laofi.reserva_json(v);
end;
$$;

create or replace function public.laofi_admin_reserva_estado(p_id uuid, p_estado text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare v laofi.reservas;
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  if p_estado not in ('PENDIENTE', 'CONFIRMADA', 'SENTADA', 'CANCELADA', 'NO_SHOW') then
    raise exception 'Estado no válido' using errcode = 'P0001';
  end if;
  update laofi.reservas set estado = p_estado where id = p_id returning * into v;
  if v.id is null then raise exception 'Reserva no encontrada' using errcode = 'P0001'; end if;
  -- Sentar la reserva sienta sus mesas.
  if p_estado = 'SENTADA' then
    update laofi.mesas m set ocupada = true, por_limpiar = false, comensales = greatest(m.comensales, 1),
      entrada_at = coalesce(m.entrada_at, now())
    where m.id in (select mesa_id from laofi.reserva_mesas where reserva_id = v.id) and not m.bloqueada;
    update laofi.mesas m set comensales = v.personas
    where m.id = (select mesa_id from laofi.reserva_mesas where reserva_id = v.id limit 1);
  end if;
  return laofi.reserva_json(v);
end;
$$;

-- Admin: menú del día ----------------------------------------------------------------------
create or replace function public.laofi_admin_menu_dia(p_fecha date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select to_jsonb(m) || jsonb_build_object('platos', coalesce((select jsonb_agg(to_jsonb(pl) order by pl.tipo, pl.orden)
                                                             from laofi.menu_dia_platos pl where pl.menu_id = m.id), '[]'::jsonb))
  from laofi.menus_dia m
  where laofi.mi_rol() in ('admin', 'encargado') and m.fecha = p_fecha;
$$;

/** Guarda el menú de un día y sustituye sus platos en una sola operación ("menú del día en 1 minuto"). */
create or replace function public.laofi_admin_guardar_menu_dia(p jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare v_id uuid;
begin
  perform laofi.exigir_rol('admin', 'encargado');
  insert into laofi.menus_dia (fecha, precio_centimos, bebida_incluida, pan_incluido, postre_o_cafe, notas, disponible)
  values ((p ->> 'fecha')::date, (p ->> 'precio_centimos')::int, coalesce((p ->> 'bebida_incluida')::boolean, false),
          coalesce((p ->> 'pan_incluido')::boolean, false), coalesce((p ->> 'postre_o_cafe')::boolean, false),
          nullif(btrim(coalesce(p ->> 'notas', '')), ''), coalesce((p ->> 'disponible')::boolean, true))
  on conflict (fecha) do update set
    precio_centimos = excluded.precio_centimos, bebida_incluida = excluded.bebida_incluida, pan_incluido = excluded.pan_incluido,
    postre_o_cafe = excluded.postre_o_cafe, notas = excluded.notas, disponible = excluded.disponible, updated_at = now()
  returning id into v_id;
  delete from laofi.menu_dia_platos where menu_id = v_id;
  insert into laofi.menu_dia_platos (menu_id, tipo, nombre, descripcion, alergenos, orden)
  select v_id, x ->> 'tipo', btrim(x ->> 'nombre'), nullif(btrim(coalesce(x ->> 'descripcion', '')), ''),
         coalesce((select array_agg(a) from jsonb_array_elements_text(coalesce(x -> 'alergenos', '[]')) a), '{}'), (ord)::smallint
  from jsonb_array_elements(coalesce(p -> 'platos', '[]')) with ordinality as t(x, ord)
  where nullif(btrim(x ->> 'nombre'), '') is not null;
  return public.laofi_admin_menu_dia((p ->> 'fecha')::date);
end;
$$;

-- Admin: ventas e informes ------------------------------------------------------------------
create or replace function public.laofi_admin_ventas(p_desde date, p_hasta date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with ped as (
    select * from laofi.pedidos where fecha_servicio between p_desde and p_hasta and estado <> 'CANCELLED'
  ), it as (
    select i.* from laofi.pedido_items i join ped on ped.id = i.pedido_id where i.estado <> 'CANCELLED'
  ), pg as (
    select * from laofi.pagos
    where estado = 'PAID' and (created_at at time zone 'Europe/Madrid')::date between p_desde and p_hasta
  )
  select jsonb_build_object(
    'resumen', jsonb_build_object(
      'ventas_centimos', coalesce((select sum(total_centimos) from ped), 0),
      'pedidos', (select count(*) from ped),
      'ticket_medio_centimos', coalesce((select round(avg(total_centimos)) from ped), 0),
      'descuentos_centimos', coalesce((select sum(descuento_centimos) from ped), 0),
      'invitaciones_centimos', coalesce((select sum(precio_unitario_centimos * cantidad) from it where invitacion), 0),
      'cancelados', (select count(*) from laofi.pedidos where fecha_servicio between p_desde and p_hasta and estado = 'CANCELLED'),
      'productos_vendidos', coalesce((select sum(cantidad) from it where not invitacion), 0)
    ),
    'por_dia', coalesce((select jsonb_agg(jsonb_build_object('fecha', d.fecha, 'ventas_centimos', d.v, 'pedidos', d.n) order by d.fecha)
                         from (select fecha_servicio as fecha, sum(total_centimos) as v, count(*) as n from ped group by 1) d), '[]'::jsonb),
    'por_hora', coalesce((select jsonb_agg(jsonb_build_object('hora', h.hora, 'ventas_centimos', h.v, 'pedidos', h.n) order by h.hora)
                          from (select extract(hour from created_at at time zone 'Europe/Madrid')::int as hora, sum(total_centimos) as v, count(*) as n
                                from ped group by 1) h), '[]'::jsonb),
    'por_producto', coalesce((select jsonb_agg(jsonb_build_object('nombre', x.nombre, 'cantidad', x.c, 'importe_centimos', x.v) order by x.v desc)
                              from (select nombre, sum(cantidad) as c, sum(case when invitacion then 0 else precio_unitario_centimos * cantidad end) as v
                                    from it group by nombre order by 3 desc limit 50) x), '[]'::jsonb),
    'por_camarero', coalesce((select jsonb_agg(jsonb_build_object('nombre', x.nombre, 'pedidos', x.n, 'ventas_centimos', x.v) order by x.v desc)
                              from (select coalesce(s.nombre, case when ped.origen = 'web' then 'Web / QR' else 'Sin asignar' end) as nombre,
                                           count(*) as n, sum(ped.total_centimos) as v
                                    from ped left join laofi.staff s on s.user_id = ped.creado_por group by 1) x), '[]'::jsonb),
    'por_tipo', coalesce((select jsonb_agg(jsonb_build_object('tipo', x.tipo, 'pedidos', x.n, 'ventas_centimos', x.v))
                          from (select tipo, count(*) as n, sum(total_centimos) as v from ped group by tipo) x), '[]'::jsonb),
    'por_metodo', coalesce((select jsonb_agg(jsonb_build_object('metodo', x.metodo, 'importe_centimos', x.v))
                            from (select metodo, sum(importe_centimos) as v from pg group by metodo) x), '[]'::jsonb)
  )
  where laofi.mi_rol() in ('admin', 'encargado');
$$;

-- TicketBAI (SOLO service_role) -------------------------------------------------------------
create or replace function public.laofi_tbai_lineas(p_pedido_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'descripcion', i.nombre, 'cantidad', i.cantidad, 'importe_unitario_centimos', i.precio_unitario_centimos,
    'importe_total_centimos', i.precio_unitario_centimos * i.cantidad, 'tipo_impositivo', i.iva_pct
  ) order by i.created_at), '[]'::jsonb)
  from laofi.pedido_items i
  where i.pedido_id = any (p_pedido_ids) and i.estado <> 'CANCELLED' and not i.invitacion;
$$;

/** Factura ya emitida para estos pedidos (reimprimir = DUPLICADO, nunca reemitir). */
create or replace function public.laofi_tbai_buscar(p_pedido_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select to_jsonb(f) from laofi.ticketbai_facturas f
  where f.estado in ('FIRMADA', 'ENVIADA') and f.pedido_ids <@ p_pedido_ids and f.pedido_ids && p_pedido_ids
  order by f.created_at desc limit 1;
$$;

/** Alta con número correlativo y encadenamiento atómicos (advisory lock por serie). */
create or replace function public.laofi_tbai_crear(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, laofi
as $$
declare
  v_ant laofi.ticketbai_facturas;
  v laofi.ticketbai_facturas;
begin
  perform pg_advisory_xact_lock(hashtext('laofi.tbai|' || (p ->> 'serie')));
  -- Un borrador (o error) nunca firmado no se ha emitido: se descarta para que la
  -- numeración siga correlativa y sin huecos entre facturas emitidas.
  delete from laofi.ticketbai_facturas where serie = p ->> 'serie' and estado in ('BORRADOR', 'ERROR');
  select * into v_ant from laofi.ticketbai_facturas
  where serie = p ->> 'serie' and estado in ('FIRMADA', 'ENVIADA') order by numero desc limit 1;
  insert into laofi.ticketbai_facturas (pedido_ids, mesa_id, serie, numero, fecha_expedicion, hora_expedicion, nif_emisor,
    razon_social_emisor, importe_total_centimos, desglose_iva, lineas, encadenamiento_serie_anterior,
    encadenamiento_numero_anterior, encadenamiento_fecha_anterior, encadenamiento_firma_anterior)
  values (coalesce((select array_agg(x::uuid) from jsonb_array_elements_text(p -> 'pedido_ids') x), '{}'), nullif(p ->> 'mesa_id', '')::uuid,
    p ->> 'serie', coalesce(v_ant.numero, 0) + 1, (now() at time zone 'Europe/Madrid')::date, (now() at time zone 'Europe/Madrid')::time,
    p ->> 'nif_emisor', p ->> 'razon_social_emisor', (p ->> 'importe_total_centimos')::int, p -> 'desglose_iva', p -> 'lineas',
    v_ant.serie, v_ant.numero, v_ant.fecha_expedicion, left(v_ant.signature_value, 100))
  returning * into v;
  return to_jsonb(v);
end;
$$;

create or replace function public.laofi_tbai_actualizar(p_id uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, laofi
as $$
declare v laofi.ticketbai_facturas;
begin
  update laofi.ticketbai_facturas set
    estado = coalesce(p ->> 'estado', estado), identificativo_tbai = coalesce(p ->> 'identificativo_tbai', identificativo_tbai),
    qr_url = coalesce(p ->> 'qr_url', qr_url), xml_sin_firmar = coalesce(p ->> 'xml_sin_firmar', xml_sin_firmar),
    xml_firmado = coalesce(p ->> 'xml_firmado', xml_firmado), signature_value = coalesce(p ->> 'signature_value', signature_value),
    error_mensaje = p ->> 'error_mensaje', enviado_at = case when p ->> 'estado' = 'ENVIADA' then now() else enviado_at end
  where id = p_id returning * into v;
  return to_jsonb(v);
end;
$$;

-- Alta de staff (SOLO service_role, desde /admin/staff tras crear el usuario en Auth) --------
create or replace function public.laofi_vincular_staff(p_user_id uuid, p_nombre text, p_rol text)
returns void
language plpgsql
security definer
set search_path = public, laofi
as $$
begin
  if laofi.cliente_id() is null then raise exception 'La Ofi no está dada de alta en public.clientes' using errcode = 'P0001'; end if;
  insert into public.usuarios_negocio (user_id, cliente_id, rol) values (p_user_id, laofi.cliente_id(), 'gestion')
  on conflict (user_id) do nothing;
  insert into laofi.staff (user_id, nombre, rol) values (p_user_id, btrim(p_nombre), p_rol)
  on conflict (user_id) do update set nombre = excluded.nombre, rol = excluded.rol, activo = true;
end;
$$;

-- Redefiniciones: lista blanca ampliada y reserva próxima en el salón -------------------------
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
    ('staff', 'user_id', '{admin}'::text[], 'nombre'),
    ('reglas_promocion', 'id', '{admin,encargado}'::text[], 'nombre'),
    ('premios_otorgados', 'id', '{admin,encargado}'::text[], 'fecha_otorgado desc'),
    ('comensales', 'id', '{admin,encargado}'::text[], 'nombre'),
    ('resenas', 'id', '{admin,encargado}'::text[], 'created_at desc')
  ) as t(nombre, pk, roles, orden)
  where t.nombre = p_tabla;
$$;

/** Reserva próxima (de 30 min antes a 2 h después) con esta mesa asignada. */
create or replace function laofi.reserva_proxima(p_mesa uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('nombre', r.nombre, 'hora', to_char(r.hora, 'HH24:MI'), 'personas', r.personas)
  from laofi.reservas r join laofi.reserva_mesas rm on rm.reserva_id = r.id
  where rm.mesa_id = p_mesa and r.estado in ('PENDIENTE', 'CONFIRMADA')
    and r.fecha = (now() at time zone 'Europe/Madrid')::date
    and r.hora between ((now() at time zone 'Europe/Madrid')::time - interval '30 minutes')
                   and ((now() at time zone 'Europe/Madrid')::time + interval '2 hours')
  order by r.hora limit 1;
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
        'pide_cuenta', exists (select 1 from laofi.avisos a where a.mesa_id = m.id and a.tipo = 'CUENTA' and a.atendido_at is null),
        'reserva', laofi.reserva_proxima(m.id)
      ) order by m.numero) from laofi.mesas m where m.activa), '[]'::jsonb)
  )
  where laofi.mi_rol() in ('admin', 'encargado', 'camarero');
$$;

-- Permisos ----------------------------------------------------------------------------------
revoke all on function laofi.fidelizacion_activa(), laofi.hora_en_rango(time, time, time), laofi.vincular_comensal(),
  laofi.evaluar_premios(), laofi.reserva_json(laofi.reservas), laofi.reserva_proxima(uuid) from public, anon;
grant execute on function laofi.fidelizacion_activa(), laofi.hora_en_rango(time, time, time), laofi.reserva_json(laofi.reservas),
  laofi.reserva_proxima(uuid) to authenticated, service_role;

do $$
declare f text;
begin
  -- Públicas (anon).
  foreach f in array array['public.laofi_get_config_reservas(uuid)', 'public.laofi_crear_reserva(uuid, jsonb)',
                           'public.laofi_get_resenas(uuid)', 'public.laofi_crear_resena(uuid, jsonb)'] loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated, service_role', f);
  end loop;
  -- Staff (authenticated; cada una exige su rol).
  foreach f in array array['public.laofi_admin_reservas(date, date)', 'public.laofi_admin_guardar_reserva(jsonb)',
                           'public.laofi_admin_reserva_estado(uuid, text)', 'public.laofi_admin_menu_dia(date)',
                           'public.laofi_admin_guardar_menu_dia(jsonb)', 'public.laofi_admin_ventas(date, date)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
  -- TicketBAI: SOLO service_role (registro fiscal).
  foreach f in array array['public.laofi_tbai_lineas(uuid[])', 'public.laofi_tbai_buscar(uuid[])',
                           'public.laofi_tbai_crear(jsonb)', 'public.laofi_tbai_actualizar(uuid, jsonb)',
                           'public.laofi_vincular_staff(uuid, text, text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end;
$$;
