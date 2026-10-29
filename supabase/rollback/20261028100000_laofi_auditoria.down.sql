-- Reversión de 20261028100000_laofi_auditoria. Ejecutar ANTES que las reversiones anteriores.
-- Las solicitudes de presupuesto pasan a reservas de mesa para no perderlas.
update laofi.reservas set espacio = 'mesa', notas = left('Presupuesto · ' || coalesce(notas, ''), 500) where espacio = 'presupuesto';
alter table laofi.reservas drop constraint reservas_espacio_check;
alter table laofi.reservas add constraint reservas_espacio_check check (espacio in ('mesa', 'despacho', 'evento'));

-- Versiones anteriores (20261002130000_laofi_gestion y 20261002110000_laofi_salon_pedidos).
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

drop function if exists public.laofi_get_cierres(uuid);
drop function if exists public.laofi_get_titular(uuid);
drop function if exists laofi.es_cierre(date);
delete from laofi.ajustes where clave = 'cierres';
