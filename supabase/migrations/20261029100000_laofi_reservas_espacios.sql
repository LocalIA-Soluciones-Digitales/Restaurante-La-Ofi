-- Reservas por espacios, menú del día con franja y aviso de eventos (visita a Carlos, 29/10/2026).
--  - El Despacho: se reserva por personas hasta su aforo (30 por defecto, ajustes.reservas.aforo_despacho),
--    por turno (comida: antes de las 17:00; noche: desde las 17:00). Solo carta, nunca menú del día.
--  - Comedor (espacio 'mesa'): menú del día, carta o solo la mesa. Se puede decir qué se va a comer
--    (reservas.comida = {modo, lineas: [{id, nombre, cantidad, …}]}, copia de los nombres y precios).
--  - Recogida ('recogida'): pedir menús del día para llevar. Solo hoy y dentro de la franja del menú.
--  - Menú del día: Carlos lo carga la víspera, pero la web solo lo enseña el mismo día entre
--    ajustes.menu_dia.desde y .hasta (08:00–16:00).
--  - Eventos: aviso_web = sale como aviso emergente al entrar en la web.

alter table laofi.reservas add column comida jsonb check (comida is null or jsonb_typeof(comida) = 'object');
alter table laofi.reservas drop constraint reservas_espacio_check;
alter table laofi.reservas add constraint reservas_espacio_check check (espacio in ('mesa', 'despacho', 'evento', 'presupuesto', 'recogida'));

insert into laofi.ajustes (clave, valor) values ('menu_dia', '{"desde": "08:00", "hasta": "16:00"}') on conflict (clave) do nothing;

alter table laofi.eventos add column if not exists aviso_web boolean not null default true;

-- Menú del día: franja visible ------------------------------------------------------------
create or replace function laofi.menu_franja()
returns table (desde time, hasta time)
language sql
stable
set search_path = ''
as $$
  select coalesce((a.valor ->> 'desde')::time, '08:00'), coalesce((a.valor ->> 'hasta')::time, '16:00')
  from (select 1) x left join laofi.ajustes a on a.clave = 'menu_dia';
$$;

create or replace function laofi.menu_visible_ahora()
returns boolean
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Madrid')::time >= f.desde and (now() at time zone 'Europe/Madrid')::time < f.hasta
  from laofi.menu_franja() f;
$$;

/** Solo el menú de HOY y dentro de la franja (p_fecha se mantiene por compatibilidad: si no es hoy, nada). */
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
    and m.fecha = (now() at time zone 'Europe/Madrid')::date
    and coalesce(p_fecha, m.fecha) = m.fecha
    and laofi.menu_visible_ahora();
$$;

-- Configuración pública: + aforo de El Despacho y franja del menú ---------------------------
create or replace function public.laofi_get_config_reservas(p_site_key uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select coalesce((select valor from laofi.ajustes where clave = 'reservas'), '{}'::jsonb)
         || jsonb_build_object(
              'aforo_despacho', coalesce(((select valor from laofi.ajustes where clave = 'reservas') ->> 'aforo_despacho')::int, 30),
              'menu_desde', (select to_char(f.desde, 'HH24:MI') from laofi.menu_franja() f),
              'menu_hasta', (select to_char(f.hasta, 'HH24:MI') from laofi.menu_franja() f))
  where laofi.site_key_valida(p_site_key);
$$;

-- El Despacho: plazas ocupadas por turno ------------------------------------------------------
create or replace function laofi.despacho_ocupado(p_fecha date, p_noche boolean, p_excluir uuid default null)
returns integer
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(r.personas), 0)::int
  from laofi.reservas r
  where r.espacio = 'despacho' and r.fecha = p_fecha and (r.hora >= '17:00') = p_noche
    and r.estado in ('PENDIENTE', 'CONFIRMADA', 'SENTADA')
    and r.id is distinct from p_excluir;
$$;

/** Plazas libres de El Despacho en un día: {aforo, comida, noche}. Solo cifras, ningún dato de nadie. */
create or replace function public.laofi_plazas_despacho(p_site_key uuid, p_fecha date)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  with a as (select coalesce(((select valor from laofi.ajustes where clave = 'reservas') ->> 'aforo_despacho')::int, 30) as aforo)
  select jsonb_build_object(
    'aforo', a.aforo,
    'comida', greatest(a.aforo - laofi.despacho_ocupado(p_fecha, false), 0),
    'noche', greatest(a.aforo - laofi.despacho_ocupado(p_fecha, true), 0))
  from a
  where laofi.site_key_valida(p_site_key);
$$;

-- Qué se va a comer: valida las líneas contra el menú de hoy o la carta y copia nombre y precio ---
create or replace function laofi.comida_validada(p_modo text, p_lineas jsonb, p_menu uuid)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v jsonb;
begin
  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' then return '[]'::jsonb; end if;
  if jsonb_array_length(p_lineas) > 40 then raise exception 'Demasiados platos en la reserva' using errcode = 'P0001'; end if;
  begin
    if p_modo = 'menu' then
      select coalesce(jsonb_agg(jsonb_build_object('id', pl.id, 'tipo', pl.tipo, 'nombre', pl.nombre, 'cantidad', x.cantidad)
                                order by array_position(array['plato', 'primero', 'segundo', 'postre'], pl.tipo), pl.orden), '[]'::jsonb)
        into v
      from (select (l ->> 'id')::uuid as id, sum(least((l ->> 'cantidad')::int, 50))::int as cantidad
            from jsonb_array_elements(p_lineas) l group by 1) x
      join laofi.menu_dia_platos pl on pl.id = x.id and pl.menu_id = p_menu
      where x.cantidad > 0;
    else
      select coalesce(jsonb_agg(jsonb_build_object('id', pr.id, 'nombre', pr.nombre, 'precio_centimos', pr.precio_centimos, 'cantidad', x.cantidad)
                                order by c.orden, pr.orden, pr.nombre), '[]'::jsonb)
        into v
      from (select (l ->> 'id')::uuid as id, sum(least((l ->> 'cantidad')::int, 50))::int as cantidad
            from jsonb_array_elements(p_lineas) l group by 1) x
      join laofi.productos pr on pr.id = x.id and pr.disponible
      join laofi.categorias c on c.id = pr.categoria_id and c.visible
      where x.cantidad > 0;
    end if;
  exception when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Revisa los platos elegidos' using errcode = 'P0001';
  end;
  return v;
end;
$$;

/*
 p: nombre, telefono, email, personas, fecha, hora, espacio ('mesa'|'despacho'|'evento'|'presupuesto'|'recogida'),
    evento_slug, notas, ip_hash, web (trampa), comida {modo: 'nada'|'menu'|'carta', lineas: [{id, cantidad}]}
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
  v_presupuesto boolean := coalesce(p ->> 'espacio', 'mesa') = 'presupuesto';
  v_max integer;
  v_antelacion integer;
  v_evento uuid;
  h laofi.horario;
  v_desde time;
  v_hasta time;
  hoy date := (now() at time zone 'Europe/Madrid')::date;
  v_id uuid;
  v_ip text := case when coalesce(p ->> 'ip_hash', '') ~ '^[0-9a-f]{64}$' then p ->> 'ip_hash' end;
  v_modo text := coalesce(nullif(p -> 'comida' ->> 'modo', ''), 'nada');
  v_comida jsonb;
  v_menu uuid;
  v_franja record;
  v_aforo integer;
  v_libres integer;
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  select valor into cfg from laofi.ajustes where clave = 'reservas';
  if not coalesce((cfg ->> 'online')::boolean, false) then
    raise exception 'Las reservas online no están activas: llámanos' using errcode = 'P0001';
  end if;
  if coalesce(p ->> 'web', '') <> '' then raise exception 'Solicitud no válida' using errcode = 'P0001'; end if;
  perform laofi.purgar_reservas();
  -- Freno a abusos por conexión (hash de la IP, nunca la IP): 5 solicitudes por hora.
  if v_ip is not null and (select count(*) from laofi.reservas r
      where r.ip_hash = v_ip and r.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Demasiadas solicitudes seguidas: llámanos o inténtalo más tarde' using errcode = 'P0001';
  end if;
  if v_espacio not in ('mesa', 'despacho', 'evento', 'presupuesto', 'recogida') then raise exception 'Espacio no válido' using errcode = 'P0001'; end if;
  if v_modo not in ('nada', 'menu', 'carta') then raise exception 'Elige menú del día, carta o solo la mesa' using errcode = 'P0001'; end if;
  if v_espacio in ('evento', 'presupuesto') then v_modo := 'nada'; end if;
  if v_espacio = 'despacho' and v_modo = 'menu' then
    raise exception 'En El Despacho se come de carta: el menú del día es en el comedor' using errcode = 'P0001';
  end if;
  if v_espacio = 'recogida' and v_modo <> 'menu' then
    raise exception 'Para recoger, elige los platos del menú del día' using errcode = 'P0001';
  end if;

  begin
    v_fecha := (p ->> 'fecha')::date;
    v_hora := coalesce(nullif(p ->> 'hora', ''), '14:00')::time;
    v_personas := (p ->> 'personas')::int;
  exception when others then
    raise exception 'Revisa el día, la hora y el número de personas' using errcode = 'P0001';
  end;
  if v_fecha is null then raise exception 'Elige el día' using errcode = 'P0001'; end if;
  if nullif(btrim(p ->> 'nombre'), '') is null then raise exception 'Falta el nombre' using errcode = 'P0001'; end if;
  if length(regexp_replace(v_tel, '\D', '', 'g')) < 9 then raise exception 'Teléfono no válido' using errcode = 'P0001'; end if;

  -- Presupuesto de grupo: hasta el aforo de la terraza (220) y con más antelación.
  -- El Despacho: hasta su aforo (lo que quede libre se comprueba abajo).
  v_aforo := coalesce((cfg ->> 'aforo_despacho')::int, 30);
  v_max := case v_espacio when 'presupuesto' then 220 when 'despacho' then v_aforo when 'recogida' then 30
                else coalesce((cfg ->> 'max_personas')::int, 12) end;
  v_antelacion := case when v_presupuesto then 365 else coalesce((cfg ->> 'antelacion_dias')::int, 60) end;
  if v_personas is null or v_personas < 1 or v_personas > v_max then
    if v_espacio = 'recogida' then raise exception 'Para más de % menús, llámanos', v_max using errcode = 'P0001'; end if;
    raise exception 'Para grupos de más de % personas, llámanos', v_max using errcode = 'P0001';
  end if;
  if v_fecha < hoy or v_fecha > hoy + v_antelacion then
    raise exception 'Fecha fuera del periodo de reservas' using errcode = 'P0001';
  end if;

  if not v_presupuesto then
    if laofi.es_cierre(v_fecha) then raise exception 'Ese día estamos cerrados' using errcode = 'P0001'; end if;
    if v_fecha = hoy and v_hora < (now() at time zone 'Europe/Madrid')::time + interval '30 minutes' then
      raise exception 'Para hoy, reserva con al menos 30 minutos de antelación o llámanos' using errcode = 'P0001';
    end if;

    select * into h from laofi.horario hr where hr.dia = extract(isodow from v_fecha);
    if h.estado = 'cerrado' then raise exception 'Ese día estamos cerrados' using errcode = 'P0001'; end if;
    if h.estado = 'abierto' then
      v_desde := h.desde;
      v_hasta := h.hasta;
    else
      -- Día sin horario confirmado: como mucho, el más amplio de los días abiertos.
      select min(hr.desde), max(case when hr.hasta = '00:00' then '23:59'::time else hr.hasta end)
        into v_desde, v_hasta
      from laofi.horario hr where hr.estado = 'abierto';
    end if;
    if v_desde is not null and (v_hora < v_desde or (v_hasta <> '00:00' and v_hora > v_hasta - interval '30 minutes')) then
      raise exception 'Esa hora está fuera del horario (% a %)', to_char(v_desde, 'HH24:MI'), to_char(v_hasta, 'HH24:MI') using errcode = 'P0001';
    end if;
  end if;

  -- Menú del día: solo el de hoy, mientras está publicado y para una hora dentro de su franja.
  if v_modo = 'menu' then
    select * into v_franja from laofi.menu_franja();
    if v_fecha <> hoy then
      raise exception 'El menú del día se publica el mismo día a las %: para otro día, reserva de carta o solo la mesa', to_char(v_franja.desde, 'HH24:MI') using errcode = 'P0001';
    end if;
    if not laofi.menu_visible_ahora() then
      raise exception 'El menú del día se puede pedir de % a %', to_char(v_franja.desde, 'HH24:MI'), to_char(v_franja.hasta, 'HH24:MI') using errcode = 'P0001';
    end if;
    select m.id into v_menu from laofi.menus_dia m where m.fecha = hoy and m.disponible;
    if v_menu is null then raise exception 'Hoy no hay menú del día publicado' using errcode = 'P0001'; end if;
    if v_hora < v_franja.desde or v_hora > v_franja.hasta then
      raise exception 'El menú del día es de % a %', to_char(v_franja.desde, 'HH24:MI'), to_char(v_franja.hasta, 'HH24:MI') using errcode = 'P0001';
    end if;
  end if;
  if v_modo <> 'nada' then
    v_comida := jsonb_build_object('modo', v_modo, 'lineas', laofi.comida_validada(v_modo, p -> 'comida' -> 'lineas', v_menu));
    if v_espacio = 'recogida' and jsonb_array_length(v_comida -> 'lineas') = 0 then
      raise exception 'Elige los platos que vas a recoger' using errcode = 'P0001';
    end if;
  end if;

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

  -- El Despacho por personas hasta el aforo del turno. El candado evita que dos
  -- solicitudes simultáneas se lleven las mismas plazas.
  if v_espacio = 'despacho' then
    perform pg_advisory_xact_lock(hashtext('laofi.despacho:' || v_fecha::text));
    v_libres := v_aforo - laofi.despacho_ocupado(v_fecha, v_hora >= '17:00');
    if v_libres <= 0 then
      raise exception 'El Despacho está completo en ese turno: prueba el comedor u otro día' using errcode = 'P0001';
    elsif v_personas > v_libres then
      raise exception 'En El Despacho quedan % plazas en ese turno', v_libres using errcode = 'P0001';
    end if;
  end if;

  insert into laofi.reservas (nombre, telefono, email, personas, fecha, hora, espacio, evento_id, notas, origen, estado, ip_hash, comida)
  values (btrim(p ->> 'nombre'), v_tel, nullif(btrim(coalesce(p ->> 'email', '')), ''), v_personas, v_fecha, v_hora,
          v_espacio, v_evento, nullif(left(btrim(coalesce(p ->> 'notas', '')), 500), ''), 'web', 'PENDIENTE', v_ip, v_comida)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'estado', 'PENDIENTE');
end;
$$;

-- Eventos: + aviso_web ----------------------------------------------------------------------
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

-- Permisos ------------------------------------------------------------------------------------
revoke all on function laofi.menu_franja(), laofi.menu_visible_ahora(), laofi.despacho_ocupado(date, boolean, uuid),
  laofi.comida_validada(text, jsonb, uuid) from public, anon;
grant execute on function laofi.menu_franja(), laofi.menu_visible_ahora(), laofi.despacho_ocupado(date, boolean, uuid),
  laofi.comida_validada(text, jsonb, uuid) to authenticated, service_role;
revoke all on function public.laofi_plazas_despacho(uuid, date) from public;
grant execute on function public.laofi_plazas_despacho(uuid, date) to anon, authenticated, service_role;
revoke all on function public.laofi_get_menu_dia(uuid, date), public.laofi_get_config_reservas(uuid), public.laofi_crear_reserva(uuid, jsonb) from public;
grant execute on function public.laofi_get_menu_dia(uuid, date), public.laofi_get_config_reservas(uuid), public.laofi_crear_reserva(uuid, jsonb)
  to anon, authenticated, service_role;
