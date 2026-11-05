-- Encargos de vino con día y hora de recogida (05/11/2026). Carlos quiere saber cuándo
-- van a pasar a recogerlos.
--  - laofi.encargos_vino.recogida_en: día y hora que elige el cliente (null en los de antes).
--  - laofi.encargo_vino_recogida(fecha, hora): valida que sea de hoy (con 30 minutos de margen)
--    a 60 días vista, un día que el local abre (horario y cierres puntuales) y dentro de su
--    horario. Un día «consultar» o sin fila de horario se acepta.
--  - laofi_crear_encargo_vino: pide recogida_fecha (AAAA-MM-DD) y recogida_hora (HH:MI); el
--    aviso al móvil lleva el día y la hora. Resto igual que en 20261102140000.
--  - El cliente lo ve en su seguimiento (encargo_vino_publico_json). El panel ya recibe la
--    fila entera (to_jsonb), así que le llega sin más.

alter table laofi.encargos_vino add column if not exists recogida_en timestamptz;
create index if not exists encargos_vino_recogida_idx on laofi.encargos_vino (recogida_en) where recogida_en is not null;

create or replace function laofi.encargo_vino_recogida(p_fecha text, p_hora text)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  v_fecha date;
  v_hora time;
  v_ts timestamptz;
  v_hoy date := (now() at time zone 'Europe/Madrid')::date;
  h laofi.horario;
begin
  if coalesce(p_fecha, '') !~ '^\d{4}-\d{2}-\d{2}$' or coalesce(p_hora, '') !~ '^\d{1,2}:\d{2}$' then
    raise exception 'Elige el día y la hora a la que pasarás a recogerlo' using errcode = 'P0001';
  end if;
  begin
    v_fecha := p_fecha::date;
    v_hora := p_hora::time;
  exception when others then
    raise exception 'Revisa el día y la hora de recogida' using errcode = 'P0001';
  end;
  v_ts := (v_fecha + v_hora) at time zone 'Europe/Madrid';
  if v_ts < now() + interval '30 minutes' then
    raise exception 'Para recogerlo hoy, elige una hora con al menos media hora de margen' using errcode = 'P0001';
  end if;
  if v_fecha > v_hoy + 60 then raise exception 'La recogida, como mucho a dos meses vista' using errcode = 'P0001'; end if;
  if laofi.es_cierre(v_fecha) then raise exception 'Ese día estamos cerrados: elige otro' using errcode = 'P0001'; end if;
  select * into h from laofi.horario hr where hr.dia = extract(isodow from v_fecha);
  if h.estado = 'cerrado' then raise exception 'Ese día estamos cerrados: elige otro' using errcode = 'P0001'; end if;
  if h.estado = 'abierto' and (v_hora < h.desde or (h.hasta <> '00:00' and v_hora > h.hasta)) then
    raise exception 'A esa hora estamos cerrados: ese día abrimos de % a %', to_char(h.desde, 'HH24:MI'),
      case when h.hasta = '00:00' then '00:00' else to_char(h.hasta, 'HH24:MI') end using errcode = 'P0001';
  end if;
  return v_ts;
end;
$$;

revoke all on function laofi.encargo_vino_recogida(text, text) from public, anon, authenticated;

create or replace function public.laofi_crear_encargo_vino(p_site_key uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tel text := regexp_replace(coalesce(p ->> 'telefono', ''), '[^0-9+ ]', '', 'g');
  v_email text := nullif(btrim(coalesce(p ->> 'email', '')), '');
  v_ip text := case when coalesce(p ->> 'ip_hash', '') ~ '^[0-9a-f]{64}$' then p ->> 'ip_hash' end;
  v_lineas jsonb := '[]'::jsonb;
  v_botellas integer := 0;
  v_total integer := 0;
  l jsonb;
  v_cantidad integer;
  v_prod record;
  v_id uuid;
  v_recogida timestamptz;
  v laofi.encargos_vino;
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  if coalesce(p ->> 'web', '') <> '' then raise exception 'Solicitud no válida' using errcode = 'P0001'; end if;
  perform laofi.purgar_encargos_vino();
  if v_ip is not null and (select count(*) from laofi.encargos_vino e
      where e.ip_hash = v_ip and e.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Demasiados encargos seguidos: llámanos o inténtalo más tarde' using errcode = 'P0001';
  end if;
  if nullif(btrim(p ->> 'nombre'), '') is null then raise exception 'Falta el nombre' using errcode = 'P0001'; end if;
  if length(regexp_replace(v_tel, '\D', '', 'g')) < 9 then raise exception 'Teléfono no válido' using errcode = 'P0001'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Revisa el email' using errcode = 'P0001'; end if;
  if coalesce((p ->> 'mayor_edad')::boolean, false) is not true then
    raise exception 'Para encargar vino tienes que ser mayor de edad' using errcode = 'P0001';
  end if;
  if coalesce(jsonb_typeof(p -> 'lineas'), '') <> 'array' or jsonb_array_length(p -> 'lineas') = 0 then
    raise exception 'Elige al menos un vino' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p -> 'lineas') > 40 then raise exception 'Demasiadas referencias: llámanos' using errcode = 'P0001'; end if;

  for l in select * from jsonb_array_elements(p -> 'lineas') loop
    begin
      v_cantidad := (l ->> 'cantidad')::int;
    exception when others then
      raise exception 'Cantidad no válida' using errcode = 'P0001';
    end;
    if v_cantidad is null or v_cantidad < 1 or v_cantidad > 48 then
      raise exception 'De cada vino, entre 1 y 48 botellas (para más, llámanos)' using errcode = 'P0001';
    end if;
    select pr.id, pr.nombre, pr.descripcion, pr.precio_centimos into v_prod
    from laofi.productos pr join laofi.categorias c on c.id = pr.categoria_id
    where pr.id::text = l ->> 'id' and pr.disponible and c.visible and c.slug ~ '^(vinos|cavas)-';
    if v_prod.id is null then raise exception 'Uno de los vinos ya no está en la carta: revisa el encargo' using errcode = 'P0001'; end if;
    if v_prod.precio_centimos is null then
      raise exception '«%» se consulta en el local: llámanos', v_prod.nombre using errcode = 'P0001';
    end if;
    if v_lineas @> jsonb_build_array(jsonb_build_object('producto_id', v_prod.id)) then
      raise exception 'Vino repetido en el encargo' using errcode = 'P0001';
    end if;
    v_lineas := v_lineas || jsonb_build_object('producto_id', v_prod.id, 'nombre', v_prod.nombre, 'detalle', v_prod.descripcion,
                                               'precio_centimos', v_prod.precio_centimos, 'cantidad', v_cantidad);
    v_botellas := v_botellas + v_cantidad;
    v_total := v_total + v_cantidad * v_prod.precio_centimos;
  end loop;
  if v_botellas > 240 then raise exception 'Para más de 240 botellas, llámanos' using errcode = 'P0001'; end if;

  -- Cuándo pasa a recogerlo (20261105300000): un día y una hora con el local abierto.
  v_recogida := laofi.encargo_vino_recogida(p ->> 'recogida_fecha', p ->> 'recogida_hora');

  insert into laofi.encargos_vino (nombre, telefono, email, notas, lineas, botellas, total_centimos, ip_hash, recogida_en)
  values (btrim(p ->> 'nombre'), btrim(v_tel), v_email, nullif(btrim(left(coalesce(p ->> 'notas', ''), 300)), ''),
          v_lineas, v_botellas, v_total, v_ip, v_recogida)
  returning * into v;

  perform laofi.enviar_aviso('encargos_vino', 'Encargo de vino nº ' || v.numero,
    v.nombre || ' · ' || v.botellas || (case when v.botellas = 1 then ' botella' else ' botellas' end) || ' · '
      || replace(to_char(v.total_centimos / 100.0, 'FM999990.00'), '.', ',') || ' €'
      || ' · recoge ' || to_char(v.recogida_en at time zone 'Europe/Madrid', 'DD/MM HH24:MI'),
    '/admin/encargos', 'encargo-vino-' || v.id);
  return jsonb_build_object('id', v.id, 'numero', v.numero);
end;
$$;

-- Lo que ve el cliente: ahora también cuándo pasa a recogerlo.
create or replace function laofi.encargo_vino_publico_json(e laofi.encargos_vino)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', e.id,
    'numero', e.numero,
    'nombre', split_part(btrim(e.nombre), ' ', 1),
    'lineas', coalesce((select jsonb_agg(jsonb_build_object('nombre', l ->> 'nombre', 'detalle', l ->> 'detalle',
                                                            'cantidad', (l ->> 'cantidad')::int, 'precio_centimos', (l ->> 'precio_centimos')::int))
                        from jsonb_array_elements(e.lineas) l), '[]'::jsonb),
    'botellas', e.botellas,
    'total_centimos', e.total_centimos,
    'estado', e.estado,
    'creado', e.created_at,
    'recogida_en', e.recogida_en,
    'cancelable', e.estado in ('PENDIENTE', 'CONFIRMADO')
  );
$$;
