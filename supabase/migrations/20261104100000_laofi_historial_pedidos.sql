-- Historial de pedidos y encargos (04/11/2026). Carlos quiere ver lo entregado por días,
-- ir a un día concreto, buscar por cliente y filtrar; y poder corregir o borrar cualquier
-- pedido o encargo (en curso o ya entregado).
--  - Historial: entregados y anulados entre dos fechas (máx. 1 año), con búsqueda por
--    nombre, teléfono o número. Encargos de vino por el día en que se cerraron (updated_at);
--    pedidos para recoger por su día de servicio.
--  - Editar: datos del cliente y notas (y en los encargos, las botellas de cada vino y el
--    paso). En los pedidos no se tocan platos ni importes: ya pueden estar cobrados o en un
--    ticket.
--  - Borrar: solo admin y encargado. Un pedido con ticket TicketBAI emitido no se borra
--    nunca; uno cobrado, solo mientras su caja sigue abierta (el cobro se borra con él y
--    la caja vuelve a cuadrar). Si ya entró en un cierre, se deja.

-- Encargos de vino ----------------------------------------------------------------------

create or replace function public.laofi_admin_encargos_vino_historial(p_desde date, p_hasta date, p_buscar text default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_b text := nullif(btrim(coalesce(p_buscar, '')), '');
  v_dig text := regexp_replace(coalesce(p_buscar, ''), '\D', '', 'g');
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  if p_desde is null or p_hasta is null or p_hasta < p_desde then raise exception 'Fechas no válidas' using errcode = 'P0001'; end if;
  if p_hasta - p_desde > 366 then raise exception 'Como mucho un año cada vez' using errcode = 'P0001'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(e) - 'ip_hash' order by e.updated_at desc)
    from (
      select * from laofi.encargos_vino e
      where e.estado in ('ENTREGADO', 'CANCELADO')
        and (e.updated_at at time zone 'Europe/Madrid')::date between p_desde and p_hasta
        and (v_b is null
             or e.nombre ilike '%' || v_b || '%'
             or (length(v_dig) >= 3 and regexp_replace(e.telefono, '\D', '', 'g') like '%' || v_dig || '%')
             or e.numero::text = v_b)
      order by e.updated_at desc
      limit 1000
    ) e
  ), '[]'::jsonb);
end;
$$;

/*
 p: { nombre, telefono, email, notas, estado, lineas: [{ producto_id, cantidad }] }
 Las líneas solo pueden cambiar de cantidad o quitarse (cantidad 0): el precio se queda
 el que tenían al encargar. Botellas y total se recalculan aquí.
*/
create or replace function public.laofi_admin_encargo_vino_editar(p_id uuid, p jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v laofi.encargos_vino;
  v_tel text := btrim(regexp_replace(coalesce(p ->> 'telefono', ''), '[^0-9+ ]', '', 'g'));
  v_email text := nullif(btrim(coalesce(p ->> 'email', '')), '');
  v_estado text := coalesce(p ->> 'estado', '');
  v_lineas jsonb := '[]'::jsonb;
  v_botellas integer := 0;
  v_total integer := 0;
  l jsonb;
  v_cant integer;
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  select * into v from laofi.encargos_vino e where e.id = p_id for update;
  if v.id is null then raise exception 'Encargo no encontrado' using errcode = 'P0001'; end if;
  if nullif(btrim(coalesce(p ->> 'nombre', '')), '') is null then raise exception 'Falta el nombre' using errcode = 'P0001'; end if;
  if length(btrim(p ->> 'nombre')) > 60 then raise exception 'El nombre es demasiado largo' using errcode = 'P0001'; end if;
  if v_tel !~ '^[0-9+ ]{8,16}$' then raise exception 'Teléfono no válido' using errcode = 'P0001'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Revisa el email' using errcode = 'P0001'; end if;
  if v_estado = '' then v_estado := v.estado; end if;
  if v_estado not in ('PENDIENTE', 'CONFIRMADO', 'LISTO', 'ENTREGADO', 'CANCELADO') then raise exception 'Paso no válido' using errcode = 'P0001'; end if;

  for l in select * from jsonb_array_elements(v.lineas) loop
    v_cant := null;
    select (x ->> 'cantidad')::int into v_cant
    from jsonb_array_elements(coalesce(p -> 'lineas', '[]'::jsonb)) x
    where x ->> 'producto_id' = l ->> 'producto_id'
    limit 1;
    v_cant := coalesce(v_cant, (l ->> 'cantidad')::int);
    if v_cant < 0 or v_cant > 240 then raise exception 'Cantidad no válida' using errcode = 'P0001'; end if;
    if v_cant > 0 then
      v_lineas := v_lineas || jsonb_set(l, '{cantidad}', to_jsonb(v_cant));
      v_botellas := v_botellas + v_cant;
      v_total := v_total + v_cant * (l ->> 'precio_centimos')::int;
    end if;
  end loop;
  if jsonb_array_length(v_lineas) = 0 then raise exception 'Deja al menos un vino (o elimina el encargo)' using errcode = 'P0001'; end if;
  if v_botellas > 240 then raise exception 'Como mucho 240 botellas' using errcode = 'P0001'; end if;

  update laofi.encargos_vino set
    nombre = btrim(p ->> 'nombre'),
    telefono = v_tel,
    email = v_email,
    notas = nullif(btrim(left(coalesce(p ->> 'notas', ''), 300)), ''),
    estado = v_estado,
    lineas = v_lineas,
    botellas = v_botellas,
    total_centimos = v_total
  where id = v.id
  returning * into v;
  return to_jsonb(v) - 'ip_hash';
end;
$$;

create or replace function public.laofi_admin_encargo_vino_borrar(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  perform laofi.exigir_rol('admin', 'encargado');
  delete from laofi.encargos_vino where id = p_id;
  if not found then raise exception 'Encargo no encontrado' using errcode = 'P0001'; end if;
end;
$$;

-- Pedidos para recoger ------------------------------------------------------------------

create or replace function public.laofi_admin_pedidos_historial(p_desde date, p_hasta date, p_buscar text default null)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_b text := nullif(btrim(coalesce(p_buscar, '')), '');
  v_dig text := regexp_replace(coalesce(p_buscar, ''), '\D', '', 'g');
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  if p_desde is null or p_hasta is null or p_hasta < p_desde then raise exception 'Fechas no válidas' using errcode = 'P0001'; end if;
  if p_hasta - p_desde > 366 then raise exception 'Como mucho un año cada vez' using errcode = 'P0001'; end if;
  return coalesce((
    select jsonb_agg(laofi.pedido_kds_json(p) order by p.fecha_servicio desc, coalesce(p.recogida_en, p.created_at) desc)
    from (
      select * from laofi.pedidos p
      where p.tipo = 'RECOGIDA'
        and p.estado in ('DELIVERED', 'CANCELLED')
        and p.fecha_servicio between p_desde and p_hasta
        and (v_b is null
             or p.nombre_cliente ilike '%' || v_b || '%'
             or (length(v_dig) >= 3 and regexp_replace(coalesce(p.telefono, ''), '\D', '', 'g') like '%' || v_dig || '%')
             or p.numero_dia::text = ltrim(v_b, '#'))
      order by p.fecha_servicio desc, coalesce(p.recogida_en, p.created_at) desc
      limit 1000
    ) p
  ), '[]'::jsonb);
end;
$$;

/* p: { nombre_cliente, telefono, notas, recogida_en }. Platos e importes no se tocan. */
create or replace function public.laofi_admin_pedido_editar(p_id uuid, p jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v laofi.pedidos;
  v_tel text := nullif(btrim(regexp_replace(coalesce(p ->> 'telefono', ''), '[^0-9+ ]', '', 'g')), '');
  v_nombre text := nullif(btrim(coalesce(p ->> 'nombre_cliente', '')), '');
  v_recogida timestamptz;
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  select * into v from laofi.pedidos x where x.id = p_id for update;
  if v.id is null then raise exception 'Pedido no encontrado' using errcode = 'P0001'; end if;
  if v.tipo = 'RECOGIDA' and v_nombre is null then raise exception 'Falta el nombre del cliente' using errcode = 'P0001'; end if;
  if v_nombre is not null and length(v_nombre) > 60 then raise exception 'El nombre es demasiado largo' using errcode = 'P0001'; end if;
  if v_tel is not null and v_tel !~ '^[0-9+ ]{9,16}$' then raise exception 'Teléfono no válido' using errcode = 'P0001'; end if;
  begin
    v_recogida := coalesce(nullif(p ->> 'recogida_en', '')::timestamptz, v.recogida_en);
  exception when others then
    raise exception 'Hora de recogida no válida' using errcode = 'P0001';
  end;

  update laofi.pedidos set
    nombre_cliente = v_nombre,
    telefono = v_tel,
    notas = nullif(btrim(left(coalesce(p ->> 'notas', ''), 300)), ''),
    recogida_en = v_recogida
  where id = v.id
  returning * into v;
  return laofi.pedido_kds_json(v);
end;
$$;

create or replace function public.laofi_admin_pedido_borrar(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v laofi.pedidos;
  v_cierre timestamptz := (select max(cerrado_at) from laofi.cierres_caja);
begin
  perform laofi.exigir_rol('admin', 'encargado');
  select * into v from laofi.pedidos x where x.id = p_id for update;
  if v.id is null then raise exception 'Pedido no encontrado' using errcode = 'P0001'; end if;
  if exists (select 1 from laofi.ticketbai_facturas f where p_id = any (f.pedido_ids) and f.estado in ('FIRMADA', 'ENVIADA')) then
    raise exception 'Este pedido tiene ticket emitido (TicketBAI): no se puede borrar' using errcode = 'P0001';
  end if;
  if exists (select 1 from laofi.pagos pg where pg.pedido_id = p_id and pg.estado = 'PAID'
             and v_cierre is not null and pg.created_at <= v_cierre) then
    raise exception 'Este pedido se cobró antes del último cierre de caja: no se puede borrar' using errcode = 'P0001';
  end if;
  delete from laofi.pagos where pedido_id = p_id;
  delete from laofi.pedidos where id = p_id;
end;
$$;

revoke all on function public.laofi_admin_encargos_vino_historial(date, date, text), public.laofi_admin_encargo_vino_editar(uuid, jsonb),
  public.laofi_admin_encargo_vino_borrar(uuid), public.laofi_admin_pedidos_historial(date, date, text),
  public.laofi_admin_pedido_editar(uuid, jsonb), public.laofi_admin_pedido_borrar(uuid) from public, anon;
grant execute on function public.laofi_admin_encargos_vino_historial(date, date, text), public.laofi_admin_encargo_vino_editar(uuid, jsonb),
  public.laofi_admin_encargo_vino_borrar(uuid), public.laofi_admin_pedidos_historial(date, date, text),
  public.laofi_admin_pedido_editar(uuid, jsonb), public.laofi_admin_pedido_borrar(uuid) to authenticated, service_role;
