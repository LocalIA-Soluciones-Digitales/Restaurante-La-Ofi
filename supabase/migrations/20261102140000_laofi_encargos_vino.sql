-- Encargos de vino para llevar (02/11/2026). En Navidad Carlos recibe muchos encargos de
-- botellas: ahora se pueden dejar encargados desde /vinos.
--  - Sin fecha de recogida ni pago online: se encarga, el local lo prepara y avisa, y se
--    paga al recogerlo en el local. Precio el de la carta (copiado aquí al encargar).
--  - Solo vinos de la carta (categorías vinos-* y cavas-*) disponibles y con precio. El
--    servidor copia nombre, D.O. y precio: el navegador solo manda ids y cantidades.
--  - /encargo/<id>: el cliente ve en qué paso está y puede anularlo mientras no esté listo.
--  - Pasos: PENDIENTE (recibido) → CONFIRMADO → LISTO (para recoger) → ENTREGADO, o CANCELADO.
--  - Aviso al móvil del local al entrar uno y al anularlo (tipo «encargos_vino»).
--  - Privacidad como las reservas: ip_hash fuera a los 30 días y anonimizado a los 12 meses.

create table laofi.encargos_vino (
  id uuid primary key default gen_random_uuid(),
  numero integer generated always as identity,
  nombre text not null check (length(btrim(nombre)) between 1 and 60),
  telefono text not null check (telefono ~ '^[0-9+ ]{8,16}$'),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  notas text check (notas is null or length(notas) <= 300),
  -- [{producto_id, nombre, detalle, precio_centimos, cantidad}]: la carta puede cambiar después.
  lineas jsonb not null check (jsonb_typeof(lineas) = 'array' and jsonb_array_length(lineas) between 1 and 40),
  botellas integer not null check (botellas between 1 and 240),
  total_centimos integer not null check (total_centimos >= 0),
  estado text not null default 'PENDIENTE' check (estado in ('PENDIENTE', 'CONFIRMADO', 'LISTO', 'ENTREGADO', 'CANCELADO')),
  ip_hash text check (ip_hash is null or ip_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index encargos_vino_estado_idx on laofi.encargos_vino (estado, created_at);
create index encargos_vino_ip_hash_idx on laofi.encargos_vino (ip_hash, created_at) where ip_hash is not null;
create trigger trg_encargos_vino_updated_at before update on laofi.encargos_vino for each row execute function public.set_updated_at();

alter table laofi.encargos_vino enable row level security;
create policy encargos_vino_gestores on laofi.encargos_vino for all to authenticated using (laofi.es_gestor()) with check (laofi.es_gestor());
revoke all on laofi.encargos_vino from public, anon;
grant select, insert, update, delete on laofi.encargos_vino to authenticated;
grant all on laofi.encargos_vino to service_role;

-- Avisos: el tipo nuevo, encendido por defecto.
create or replace function laofi.tipos_aviso()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['reservas_comedor', 'reservas_despacho', 'recogidas_menu', 'pedidos_recoger', 'eventos', 'presupuestos', 'encargos_vino', 'pedidos_mesa'];
$$;
update laofi.ajustes set valor = valor || '{"encargos_vino": true}' where clave = 'avisos_push' and not valor ? 'encargos_vino';

-- Conservación (política de privacidad). Corre en cada encargo nuevo: sin pg_cron.
create or replace function laofi.purgar_encargos_vino()
returns void
language sql
security definer
set search_path = ''
as $$
  update laofi.encargos_vino set ip_hash = null
  where ip_hash is not null and created_at < now() - interval '30 days';
  -- Teléfono de relleno con 8 dígitos (cumple el CHECK); se quedan las botellas para estadística.
  update laofi.encargos_vino set nombre = 'Anonimizado', telefono = '0000 0000', email = null, notas = null
  where created_at < now() - interval '12 months' and telefono <> '0000 0000';
$$;

-- Lo que ve el cliente: nombre de pila, lo encargado y el paso. Nunca teléfono, email ni notas.
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
    'cancelable', e.estado in ('PENDIENTE', 'CONFIRMADO')
  );
$$;

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

  insert into laofi.encargos_vino (nombre, telefono, email, notas, lineas, botellas, total_centimos, ip_hash)
  values (btrim(p ->> 'nombre'), btrim(v_tel), v_email, nullif(btrim(left(coalesce(p ->> 'notas', ''), 300)), ''),
          v_lineas, v_botellas, v_total, v_ip)
  returning * into v;

  perform laofi.enviar_aviso('encargos_vino', 'Encargo de vino nº ' || v.numero,
    v.nombre || ' · ' || v.botellas || (case when v.botellas = 1 then ' botella' else ' botellas' end) || ' · '
      || replace(to_char(v.total_centimos / 100.0, 'FM999990.00'), '.', ',') || ' €',
    '/admin/encargos', 'encargo-vino-' || v.id);
  return jsonb_build_object('id', v.id, 'numero', v.numero);
end;
$$;

-- Hasta 90 días después de encargarlo y nunca los anonimizados.
create or replace function public.laofi_get_encargo_vino(p_site_key uuid, p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select laofi.encargo_vino_publico_json(e)
  from laofi.encargos_vino e
  where laofi.site_key_valida(p_site_key) and e.id = p_id
    and e.nombre <> 'Anonimizado' and e.created_at > now() - interval '90 days';
$$;

create or replace function public.laofi_cancelar_encargo_vino(p_site_key uuid, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v laofi.encargos_vino;
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  select * into v from laofi.encargos_vino e where e.id = p_id and e.nombre <> 'Anonimizado' for update;
  if v.id is null then raise exception 'Encargo no encontrado' using errcode = 'P0001'; end if;
  if v.estado = 'CANCELADO' then return laofi.encargo_vino_publico_json(v); end if;
  if v.estado not in ('PENDIENTE', 'CONFIRMADO') then
    raise exception 'Tu encargo ya está preparado: llámanos si quieres cambiarlo' using errcode = 'P0001';
  end if;
  update laofi.encargos_vino set estado = 'CANCELADO' where id = v.id returning * into v;
  perform laofi.enviar_aviso('encargos_vino', 'Anulan el encargo de vino nº ' || v.numero,
    v.nombre || ' · ' || v.botellas || (case when v.botellas = 1 then ' botella' else ' botellas' end),
    '/admin/encargos', 'encargo-vino-' || v.id);
  return laofi.encargo_vino_publico_json(v);
end;
$$;

-- Panel: los encargos en curso y, con p_todos, también los entregados y anulados de los últimos 60 días.
create or replace function public.laofi_admin_encargos_vino(p_todos boolean default false)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  return coalesce((
    select jsonb_agg(to_jsonb(e) - 'ip_hash' order by e.created_at)
    from laofi.encargos_vino e
    where e.estado in ('PENDIENTE', 'CONFIRMADO', 'LISTO')
       or (p_todos and e.updated_at > now() - interval '60 days')
  ), '[]'::jsonb);
end;
$$;

create or replace function public.laofi_admin_encargo_vino_estado(p_id uuid, p_estado text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v laofi.encargos_vino;
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  if p_estado not in ('PENDIENTE', 'CONFIRMADO', 'LISTO', 'ENTREGADO', 'CANCELADO') then
    raise exception 'Estado no válido' using errcode = 'P0001';
  end if;
  update laofi.encargos_vino set estado = p_estado where id = p_id returning * into v;
  if v.id is null then raise exception 'Encargo no encontrado' using errcode = 'P0001'; end if;
  return to_jsonb(v) - 'ip_hash';
end;
$$;

revoke all on function laofi.purgar_encargos_vino(), laofi.encargo_vino_publico_json(laofi.encargos_vino) from public, anon, authenticated;
revoke all on function public.laofi_crear_encargo_vino(uuid, jsonb), public.laofi_get_encargo_vino(uuid, uuid),
  public.laofi_cancelar_encargo_vino(uuid, uuid) from public;
grant execute on function public.laofi_crear_encargo_vino(uuid, jsonb), public.laofi_get_encargo_vino(uuid, uuid),
  public.laofi_cancelar_encargo_vino(uuid, uuid) to anon, authenticated, service_role;
revoke all on function public.laofi_admin_encargos_vino(boolean), public.laofi_admin_encargo_vino_estado(uuid, text) from public, anon;
grant execute on function public.laofi_admin_encargos_vino(boolean), public.laofi_admin_encargo_vino_estado(uuid, text) to authenticated, service_role;
