-- Reversión de 20261105400000_laofi_encargo_vino_cobro. Ejecutar ANTES que las reversiones anteriores.
-- Los cobros de encargos de vino ya hechos se quedan en laofi.pagos (sin enlace al encargo).
drop function if exists public.laofi_admin_encargo_vino_cobrar(uuid, text);

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

-- laofi_admin_caja como en 20261002120000_laofi_admin_tpv.sql.
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
  )
  select jsonb_build_object(
    'desde', (select t from desde),
    'efectivo_centimos', coalesce((select sum(importe_centimos) from pg where metodo = 'EFECTIVO'), 0),
    'tarjeta_centimos', coalesce((select sum(importe_centimos) from pg where metodo = 'TARJETA'), 0),
    'online_centimos', coalesce((select sum(importe_centimos) from pg where metodo = 'STRIPE'), 0),
    'cobros', (select count(*) from pg),
    'pedidos', (select count(*) from ped),
    'ventas_centimos', coalesce((select sum(total_centimos) from ped), 0),
    'descuentos_centimos', coalesce((select sum(descuento_centimos) from ped), 0),
    'invitaciones_centimos', coalesce((select sum(i.precio_unitario_centimos * i.cantidad) from laofi.pedido_items i join ped on ped.id = i.pedido_id where i.invitacion), 0),
    'pendiente_cobro_centimos', coalesce((select sum(total_centimos) from ped where payment_status <> 'PAID'), 0)
  )
  where laofi.mi_rol() in ('admin', 'encargado');
$$;

drop index if exists laofi.pagos_encargo_vino_idx;
alter table laofi.pagos drop column if exists encargo_vino_id;
alter table laofi.encargos_vino drop column if exists cobrado_metodo;
