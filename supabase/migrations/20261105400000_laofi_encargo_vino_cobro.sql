-- Cobrar los encargos de vino desde «Encargos de vino» (05/11/2026). Hasta ahora «Entregado»
-- no registraba el cobro: había que pasarlo además por el TPV y era fácil que la caja no
-- cuadrara. Ahora, como en los pedidos para recoger, «Cobrar» (efectivo o tarjeta) apunta
-- el cobro en laofi.pagos (entra en el cierre de caja y en los informes por método) y da el
-- encargo por entregado.
--  - laofi.pagos.encargo_vino_id: el cobro de un encargo de vino.
--  - laofi.encargos_vino.cobrado_metodo: cómo se cobró (null: sin cobrar desde aquí).
--  - laofi_admin_encargo_vino_cobrar(id, metodo).
--  - laofi_admin_caja: las ventas del turno incluyen los vinos cobrados.
--  - laofi_admin_encargo_vino_borrar: como con los pedidos, no se borra uno cobrado antes del
--    último cierre de caja; si se borra, su cobro sale de la caja.

alter table laofi.pagos add column if not exists encargo_vino_id uuid references laofi.encargos_vino(id) on delete set null;
create index if not exists pagos_encargo_vino_idx on laofi.pagos (encargo_vino_id) where encargo_vino_id is not null;

alter table laofi.encargos_vino add column if not exists cobrado_metodo text
  check (cobrado_metodo is null or cobrado_metodo in ('EFECTIVO', 'TARJETA'));

create or replace function public.laofi_admin_encargo_vino_cobrar(p_id uuid, p_metodo text)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v laofi.encargos_vino;
begin
  perform laofi.exigir_rol('admin', 'encargado', 'camarero');
  if p_metodo not in ('EFECTIVO', 'TARJETA') then raise exception 'Método no válido' using errcode = 'P0001'; end if;
  select * into v from laofi.encargos_vino where id = p_id for update;
  if v.id is null then raise exception 'Encargo no encontrado' using errcode = 'P0001'; end if;
  if v.estado = 'CANCELADO' then raise exception 'Este encargo está anulado' using errcode = 'P0001'; end if;
  if v.cobrado_metodo is not null then raise exception 'Este encargo ya está cobrado' using errcode = 'P0001'; end if;
  if v.total_centimos > 0 then
    insert into laofi.pagos (encargo_vino_id, metodo, importe_centimos, registrado_por)
    values (p_id, p_metodo, v.total_centimos, auth.uid());
  end if;
  update laofi.encargos_vino set estado = 'ENTREGADO', cobrado_metodo = p_metodo where id = p_id returning * into v;
  return to_jsonb(v) - 'ip_hash';
end;
$$;

-- Cierre de caja: las ventas del turno cuentan también los encargos de vino cobrados aquí
-- (antes solo los pedidos), para que «cobrado» y «vendido» cuadren.
create or replace function public.laofi_admin_caja()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with desde as (
    select coalesce((select max(cerrado_at) from laofi.cierres_caja),
                    ((now() at time zone 'Europe/Madrid')::date at time zone 'Europe/Madrid')) as t
  ), pg as (
    select pg.* from laofi.pagos pg, desde where pg.created_at >= desde.t and pg.estado = 'PAID'
  ), ped as (
    select p.* from laofi.pedidos p, desde where p.created_at >= desde.t and p.estado <> 'CANCELLED'
  ), vino as (
    select * from pg where encargo_vino_id is not null
  )
  select jsonb_build_object(
    'desde', (select t from desde),
    'efectivo_centimos', coalesce((select sum(importe_centimos) from pg where metodo = 'EFECTIVO'), 0),
    'tarjeta_centimos', coalesce((select sum(importe_centimos) from pg where metodo = 'TARJETA'), 0),
    'online_centimos', coalesce((select sum(importe_centimos) from pg where metodo = 'STRIPE'), 0),
    'cobros', (select count(*) from pg),
    'pedidos', (select count(*) from ped) + (select count(distinct encargo_vino_id) from vino),
    'ventas_centimos', coalesce((select sum(total_centimos) from ped), 0) + coalesce((select sum(importe_centimos) from vino), 0),
    'vinos_centimos', coalesce((select sum(importe_centimos) from vino), 0),
    'descuentos_centimos', coalesce((select sum(descuento_centimos) from ped), 0),
    'invitaciones_centimos', coalesce((select sum(i.precio_unitario_centimos * i.cantidad) from laofi.pedido_items i join ped on ped.id = i.pedido_id where i.invitacion), 0),
    'pendiente_cobro_centimos', coalesce((select sum(total_centimos) from ped where payment_status <> 'PAID'), 0)
  )
  where laofi.mi_rol() in ('admin', 'encargado');
$$;

create or replace function public.laofi_admin_encargo_vino_borrar(p_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_cierre timestamptz := (select max(cerrado_at) from laofi.cierres_caja);
begin
  perform laofi.exigir_rol('admin', 'encargado');
  if not exists (select 1 from laofi.encargos_vino where id = p_id) then
    raise exception 'Encargo no encontrado' using errcode = 'P0001';
  end if;
  if exists (select 1 from laofi.pagos pg where pg.encargo_vino_id = p_id and pg.estado = 'PAID'
             and v_cierre is not null and pg.created_at <= v_cierre) then
    raise exception 'Este encargo se cobró antes del último cierre de caja: no se puede borrar' using errcode = 'P0001';
  end if;
  delete from laofi.pagos where encargo_vino_id = p_id;
  delete from laofi.encargos_vino where id = p_id;
end;
$$;

revoke all on function public.laofi_admin_encargo_vino_cobrar(uuid, text) from public, anon;
grant execute on function public.laofi_admin_encargo_vino_cobrar(uuid, text) to authenticated, service_role;
