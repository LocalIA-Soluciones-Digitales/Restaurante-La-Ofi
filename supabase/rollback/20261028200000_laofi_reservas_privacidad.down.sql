-- Reversión de 20261028200000_laofi_reservas_privacidad. Ejecutar ANTES que las reversiones anteriores.
-- Versión anterior (20261028100000_laofi_auditoria).
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
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  select valor into cfg from laofi.ajustes where clave = 'reservas';
  if not coalesce((cfg ->> 'online')::boolean, false) then
    raise exception 'Las reservas online no están activas: llámanos' using errcode = 'P0001';
  end if;
  if coalesce(p ->> 'web', '') <> '' then raise exception 'Solicitud no válida' using errcode = 'P0001'; end if;
  if v_espacio not in ('mesa', 'despacho', 'evento', 'presupuesto') then raise exception 'Espacio no válido' using errcode = 'P0001'; end if;

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
  v_max := case when v_presupuesto then 220 else coalesce((cfg ->> 'max_personas')::int, 12) end;
  v_antelacion := case when v_presupuesto then 365 else coalesce((cfg ->> 'antelacion_dias')::int, 60) end;
  if v_personas is null or v_personas < 1 or v_personas > v_max then
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

drop function if exists laofi.purgar_reservas();
drop index if exists laofi.reservas_ip_hash_idx;
alter table laofi.reservas drop column if exists ip_hash;
