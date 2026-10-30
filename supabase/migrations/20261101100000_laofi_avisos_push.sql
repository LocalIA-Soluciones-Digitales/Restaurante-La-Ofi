-- Avisos al móvil del panel (Web Push), como en Pescadería Arrantza (30/10/2026).
-- Cuando entra desde la web una reserva (comedor, El Despacho, recogida del menú del
-- día, apuntarse a un evento, presupuesto) o un pedido (para recoger o en mesa), se
-- avisa a los móviles/tablets del local que lo han activado en /admin/avisos.
--
-- Reutiliza la infraestructura de la plataforma (la misma que Arrantza):
--  - public.push_suscripciones: un dispositivo suscrito por fila, por cliente_id.
--  - public.settings 'push_notify_url' / 'push_notify_secret' del cliente: la Edge
--    Function push-notify, que envía a todos los dispositivos del cliente_id.
-- Cada tipo de aviso se enciende o apaga en laofi.ajustes 'avisos_push'.
-- Un fallo al avisar NUNCA tumba la reserva ni el pedido.

insert into laofi.ajustes (clave, valor)
values ('avisos_push', '{"reservas_comedor": true, "reservas_despacho": true, "recogidas_menu": true, "pedidos_recoger": true,
                         "eventos": true, "presupuestos": true, "pedidos_mesa": false}')
on conflict (clave) do nothing;

-- Tipos de aviso que se pueden encender/apagar (el resto de claves se ignoran).
create or replace function laofi.tipos_aviso()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['reservas_comedor', 'reservas_despacho', 'recogidas_menu', 'pedidos_recoger', 'eventos', 'presupuestos', 'pedidos_mesa'];
$$;

-- Envía un aviso a los dispositivos de La Ofi si ese tipo está encendido (o siempre,
-- con p_forzar: el aviso de prueba). Devuelve si lo ha mandado a la Edge Function.
create or replace function laofi.enviar_aviso(p_tipo text, p_titulo text, p_cuerpo text, p_url text, p_tag text, p_forzar boolean default false)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cliente uuid := laofi.cliente_id();
  v_url text;
  v_secret text;
begin
  if not p_forzar and coalesce((select (a.valor ->> p_tipo)::boolean from laofi.ajustes a where a.clave = 'avisos_push'), false) is not true then
    return false;
  end if;
  select s.value #>> '{}' into v_url from public.settings s where s.key = 'push_notify_url' and s.cliente_id = v_cliente;
  select s.value #>> '{}' into v_secret from public.settings s where s.key = 'push_notify_secret' and s.cliente_id = v_cliente;
  if v_cliente is null or v_url is null then return false; end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', coalesce(v_secret, '')),
    body := jsonb_build_object('cliente_id', v_cliente, 'titulo', p_titulo, 'cuerpo', p_cuerpo, 'url', p_url, 'tag', p_tag)
  );
  return true;
exception when others then
  raise warning 'laofi.enviar_aviso: %', sqlerrm;
  return false;
end;
$$;

-- «hoy», «mañana» o «31/10», en horario de Madrid.
create or replace function laofi.dia_corto(p_fecha date)
returns text
language sql
stable
set search_path = ''
as $$
  select case p_fecha
           when (now() at time zone 'Europe/Madrid')::date then 'hoy'
           when (now() at time zone 'Europe/Madrid')::date + 1 then 'mañana'
           else to_char(p_fecha, 'DD/MM')
         end;
$$;

-- Reserva nueva desde la web.
create or replace function laofi.avisar_reserva()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo text;
  v_titulo text;
  v_cuerpo text;
  v_cuando text := laofi.dia_corto(new.fecha) || ' a las ' || to_char(new.hora, 'HH24:MI');
  v_evento text;
begin
  if new.origen <> 'web' then return null; end if;
  case new.espacio
    when 'despacho' then
      v_tipo := 'reservas_despacho';
      v_titulo := 'Reserva en El Despacho';
      v_cuerpo := new.nombre || ' · ' || new.personas || ' pers. · ' || v_cuando;
    when 'recogida' then
      v_tipo := 'recogidas_menu';
      v_titulo := 'Menú del día para recoger';
      v_cuerpo := new.nombre || ' · ' || new.personas || (case when new.personas = 1 then ' menú' else ' menús' end) || ' · recoge ' || v_cuando;
    when 'evento' then
      v_tipo := 'eventos';
      select e.titulo into v_evento from laofi.eventos e where e.id = new.evento_id;
      v_titulo := 'Se apuntan a «' || coalesce(v_evento, 'un evento') || '»';
      v_cuerpo := new.nombre || ' · ' || new.personas || ' pers.';
    when 'presupuesto' then
      v_tipo := 'presupuestos';
      v_titulo := 'Petición de presupuesto';
      v_cuerpo := new.nombre || ' · ' || new.personas || ' pers. · ' || laofi.dia_corto(new.fecha);
    else
      v_tipo := 'reservas_comedor';
      v_titulo := 'Reserva en el comedor';
      v_cuerpo := new.nombre || ' · ' || new.personas || ' pers. · ' || v_cuando
        || case new.comida ->> 'modo' when 'menu' then ' · menú del día' when 'carta' then ' · carta' else '' end;
  end case;
  perform laofi.enviar_aviso(v_tipo, v_titulo, v_cuerpo, '/admin/reservas', 'reserva-' || new.id);
  return null;
exception when others then
  raise warning 'laofi.avisar_reserva: %', sqlerrm;
  return null;
end;
$$;

-- Pedido nuevo desde la web. Va al final de la transacción (constraint trigger
-- diferido): las líneas y el total se guardan después de crear el pedido.
create or replace function laofi.avisar_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  p laofi.pedidos;
  v_mesa text;
  v_total text;
begin
  select * into p from laofi.pedidos where id = new.id;
  if not found or p.origen <> 'web' then return null; end if;
  v_total := replace(to_char(p.total_centimos / 100.0, 'FM999990.00'), '.', ',') || ' €';
  if p.tipo = 'RECOGIDA' then
    perform laofi.enviar_aviso(
      'pedidos_recoger',
      'Pedido para recoger nº ' || p.numero_dia,
      concat_ws(' · ', p.nombre_cliente, v_total,
                case when p.recogida_en is not null then 'recoge a las ' || to_char(p.recogida_en at time zone 'Europe/Madrid', 'HH24:MI') end),
      '/admin/cocina',
      'pedido-' || p.id);
  elsif p.tipo = 'MESA' then
    select m.numero into v_mesa from laofi.mesas m where m.id = p.mesa_id;
    perform laofi.enviar_aviso('pedidos_mesa', 'Pedido en la mesa ' || coalesce(v_mesa, '?'), v_total, '/admin/cocina', 'pedido-' || p.id);
  end if;
  return null;
exception when others then
  raise warning 'laofi.avisar_pedido: %', sqlerrm;
  return null;
end;
$$;

drop trigger if exists avisar_reserva on laofi.reservas;
create trigger avisar_reserva after insert on laofi.reservas for each row execute function laofi.avisar_reserva();

drop trigger if exists avisar_pedido on laofi.pedidos;
create constraint trigger avisar_pedido after insert on laofi.pedidos deferrable initially deferred
  for each row execute function laofi.avisar_pedido();

-- Panel: el trabajo con privilegios va en laofi.* (SECURITY DEFINER, cada una exige su rol)
-- y las RPC public.laofi_admin_* son SECURITY INVOKER que solo las llaman (norma del proyecto).
-- ------------------------------------------------------------------------------------

-- Qué avisos están encendidos, si el envío está configurado y cuántos dispositivos hay.
create or replace function laofi.avisos_estado()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero', 'cocina');
  return jsonb_build_object(
    'tipos', coalesce((select a.valor from laofi.ajustes a where a.clave = 'avisos_push'), '{}'::jsonb),
    'configurado', exists (select 1 from public.settings s where s.key = 'push_notify_url' and s.cliente_id = laofi.cliente_id()),
    'dispositivos', (select count(*) from public.push_suscripciones ps where ps.cliente_id = laofi.cliente_id())
  );
end;
$$;

-- Enciende/apaga tipos de aviso (solo los conocidos y solo con true/false).
create or replace function laofi.avisos_guardar(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  perform laofi.exigir_rol('admin', 'encargado');
  select coalesce(a.valor, '{}'::jsonb) into v from laofi.ajustes a where a.clave = 'avisos_push';
  v := coalesce(v, '{}'::jsonb) || coalesce((
    select jsonb_object_agg(k, (p ->> k)::boolean)
    from unnest(laofi.tipos_aviso()) as k
    where jsonb_typeof(p -> k) = 'boolean'
  ), '{}'::jsonb);
  insert into laofi.ajustes (clave, valor) values ('avisos_push', v)
  on conflict (clave) do update set valor = excluded.valor, updated_at = now();
  return v;
end;
$$;

-- Alta (o renovación) de este dispositivo. Cualquier rol del panel puede recibir avisos.
create or replace function laofi.push_suscribir(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero', 'cocina');
  if p_endpoint !~ '^https://' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Suscripción no válida' using errcode = 'P0001';
  end if;
  insert into public.push_suscripciones (cliente_id, user_id, endpoint, p256dh, auth, user_agent)
  values (laofi.cliente_id(), auth.uid(), p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set cliente_id = excluded.cliente_id, user_id = excluded.user_id, p256dh = excluded.p256dh,
        auth = excluded.auth, user_agent = excluded.user_agent, updated_at = now();
end;
$$;

create or replace function laofi.push_baja(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero', 'cocina');
  delete from public.push_suscripciones where endpoint = p_endpoint and cliente_id = laofi.cliente_id();
end;
$$;

-- Aviso de prueba a todos los dispositivos (aunque los tipos estén apagados).
create or replace function laofi.push_prueba()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero', 'cocina');
  return laofi.enviar_aviso('prueba', 'Avisos de La Ofi activados', 'Así te llegarán las reservas y los pedidos nuevos.', '/admin/avisos', 'prueba', true);
end;
$$;


create or replace function public.laofi_admin_avisos()
returns jsonb language sql security invoker set search_path = '' as $$ select laofi.avisos_estado(); $$;
create or replace function public.laofi_admin_avisos_guardar(p jsonb)
returns jsonb language sql security invoker set search_path = '' as $$ select laofi.avisos_guardar(p); $$;
create or replace function public.laofi_admin_push_suscribir(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void language sql security invoker set search_path = '' as $$ select laofi.push_suscribir(p_endpoint, p_p256dh, p_auth, p_user_agent); $$;
create or replace function public.laofi_admin_push_baja(p_endpoint text)
returns void language sql security invoker set search_path = '' as $$ select laofi.push_baja(p_endpoint); $$;
create or replace function public.laofi_admin_push_prueba()
returns boolean language sql security invoker set search_path = '' as $$ select laofi.push_prueba(); $$;

revoke all on function laofi.tipos_aviso(), laofi.enviar_aviso(text, text, text, text, text, boolean), laofi.dia_corto(date),
  laofi.avisar_reserva(), laofi.avisar_pedido() from public, anon, authenticated;
revoke all on function laofi.avisos_estado(), laofi.avisos_guardar(jsonb), laofi.push_suscribir(text, text, text, text),
  laofi.push_baja(text), laofi.push_prueba() from public, anon;
grant execute on function laofi.avisos_estado(), laofi.avisos_guardar(jsonb), laofi.push_suscribir(text, text, text, text),
  laofi.push_baja(text), laofi.push_prueba() to authenticated;
revoke all on function public.laofi_admin_avisos(), public.laofi_admin_avisos_guardar(jsonb),
  public.laofi_admin_push_suscribir(text, text, text, text), public.laofi_admin_push_baja(text), public.laofi_admin_push_prueba() from public, anon;
grant execute on function public.laofi_admin_avisos(), public.laofi_admin_avisos_guardar(jsonb),
  public.laofi_admin_push_suscribir(text, text, text, text), public.laofi_admin_push_baja(text), public.laofi_admin_push_prueba() to authenticated;
