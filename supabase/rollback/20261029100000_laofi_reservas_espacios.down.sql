-- Reversión de 20261029100000_laofi_reservas_espacios. Ejecutar ANTES que las reversiones anteriores.
-- Las reservas de recogida se borran (el espacio deja de existir); el resto conserva todo menos «comida».

drop function if exists public.laofi_plazas_despacho(uuid, date);
drop function if exists laofi.despacho_ocupado(date, boolean, uuid);
drop function if exists laofi.comida_validada(text, jsonb, uuid);

-- Versión anterior (20261028200000_laofi_reservas_privacidad).
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

  insert into laofi.reservas (nombre, telefono, email, personas, fecha, hora, espacio, evento_id, notas, origen, estado, ip_hash)
  values (btrim(p ->> 'nombre'), v_tel, nullif(btrim(coalesce(p ->> 'email', '')), ''), v_personas, v_fecha, v_hora,
          v_espacio, v_evento, nullif(left(btrim(coalesce(p ->> 'notas', '')), 500), ''), 'web', 'PENDIENTE', v_ip)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'estado', 'PENDIENTE');
end;
$$;

-- Versión anterior (20261002100000_laofi_carta_extendida).
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

-- Versión anterior (20261002130000_laofi_gestion).
create or replace function public.laofi_get_config_reservas(p_site_key uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, laofi
as $$
  select (select valor from laofi.ajustes where clave = 'reservas') where laofi.site_key_valida(p_site_key);
$$;

-- Versión anterior (20261022120000_laofi_eventos_media).
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
    'media', e.media
  );
$$;

drop function if exists laofi.menu_visible_ahora();
drop function if exists laofi.menu_franja();
delete from laofi.ajustes where clave = 'menu_dia';
alter table laofi.eventos drop column if exists aviso_web;
delete from laofi.reservas where espacio = 'recogida';
alter table laofi.reservas drop constraint reservas_espacio_check;
alter table laofi.reservas add constraint reservas_espacio_check check (espacio in ('mesa', 'despacho', 'evento', 'presupuesto'));
alter table laofi.reservas drop column if exists comida;
