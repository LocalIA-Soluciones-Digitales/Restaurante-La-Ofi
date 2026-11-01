-- Seguimiento de la reserva por el cliente (01/11/2026). Hasta ahora, al confirmar una
-- reserva desde el panel el cliente no se enteraba si nadie le llamaba. Ahora:
--  - /reserva/<id>: el cliente ve si está por confirmar, confirmada o cancelada. El uuid de
--    la reserva (no adivinable) es la llave, como en el seguimiento del pedido (laofi_get_pedido).
--    Solo nombre de pila y datos de la reserva: nunca teléfono, email ni notas.
--  - El cliente puede cancelarla él mismo hasta la hora de la reserva; al local le llega un
--    aviso al móvil (mismo tipo de aviso que la reserva nueva).
-- El aviso al confirmar (WhatsApp con un toque y email automático) va en la web/panel.

create or replace function laofi.reserva_publica_json(r laofi.reservas)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'nombre', split_part(btrim(r.nombre), ' ', 1),
    'fecha', r.fecha,
    'hora', to_char(r.hora, 'HH24:MI'),
    'personas', r.personas,
    'espacio', r.espacio,
    'estado', r.estado,
    'evento', (select jsonb_build_object('titulo', e.titulo, 'slug', e.slug) from laofi.eventos e where e.id = r.evento_id),
    'comida', case when r.comida is null then null else jsonb_build_object(
      'modo', r.comida ->> 'modo',
      'lineas', coalesce((select jsonb_agg(jsonb_build_object('nombre', l ->> 'nombre', 'cantidad', (l ->> 'cantidad')::int))
                          from jsonb_array_elements(r.comida -> 'lineas') l), '[]'::jsonb)) end,
    'cancelable', r.estado in ('PENDIENTE', 'CONFIRMADA') and r.fecha + r.hora > (now() at time zone 'Europe/Madrid')
  );
$$;

-- Hasta 30 días después y nunca las ya anonimizadas (laofi.purgar_reservas).
create or replace function public.laofi_get_reserva(p_site_key uuid, p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select laofi.reserva_publica_json(r)
  from laofi.reservas r
  where laofi.site_key_valida(p_site_key) and r.id = p_id
    and r.nombre <> 'Anonimizada' and r.fecha >= (now() at time zone 'Europe/Madrid')::date - 30;
$$;

create or replace function public.laofi_cancelar_reserva(p_site_key uuid, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v laofi.reservas;
  v_tipo text;
  v_que text;
begin
  if not laofi.site_key_valida(p_site_key) then raise exception 'site_key inválida' using errcode = 'P0001'; end if;
  select * into v from laofi.reservas r where r.id = p_id and r.nombre <> 'Anonimizada' for update;
  if v.id is null then raise exception 'Reserva no encontrada' using errcode = 'P0001'; end if;
  if v.estado = 'CANCELADA' then return laofi.reserva_publica_json(v); end if;
  if v.estado not in ('PENDIENTE', 'CONFIRMADA') or v.fecha + v.hora <= (now() at time zone 'Europe/Madrid') then
    raise exception 'Esta reserva ya no se puede cancelar desde la web: llámanos' using errcode = 'P0001';
  end if;
  update laofi.reservas set estado = 'CANCELADA' where id = v.id returning * into v;

  v_tipo := case v.espacio when 'despacho' then 'reservas_despacho' when 'recogida' then 'recogidas_menu'
                           when 'evento' then 'eventos' when 'presupuesto' then 'presupuestos' else 'reservas_comedor' end;
  v_que := case v.espacio when 'recogida' then 'Cancelan un menú para recoger'
                          when 'evento' then 'Se borran de «' || coalesce((select e.titulo from laofi.eventos e where e.id = v.evento_id), 'un evento') || '»'
                          when 'presupuesto' then 'Retiran una petición de presupuesto'
                          else 'Cancelan una reserva' end;
  perform laofi.enviar_aviso(v_tipo, v_que,
    v.nombre || ' · ' || v.personas || ' pers. · ' || laofi.dia_corto(v.fecha) || ' a las ' || to_char(v.hora, 'HH24:MI'),
    '/admin/reservas', 'reserva-' || v.id);
  return laofi.reserva_publica_json(v);
end;
$$;

revoke all on function laofi.reserva_publica_json(laofi.reservas) from public, anon, authenticated;
revoke all on function public.laofi_get_reserva(uuid, uuid), public.laofi_cancelar_reserva(uuid, uuid) from public;
grant execute on function public.laofi_get_reserva(uuid, uuid), public.laofi_cancelar_reserva(uuid, uuid) to anon, authenticated, service_role;
