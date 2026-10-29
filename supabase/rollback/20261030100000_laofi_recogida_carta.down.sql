-- Reversión de 20261030100000_laofi_recogida_carta. Ejecutar ANTES que las reversiones anteriores.
-- Las recogidas de carta ya hechas se quedan; solo deja de admitir nuevas.
-- Versión anterior (20261029100000_laofi_reservas_espacios).
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
