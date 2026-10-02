-- Reversión de 20261002120000_laofi_admin_tpv. Borra staff y cierres de caja
-- (hacer copia antes). Ejecutar ANTES que las reversiones anteriores.
drop function if exists public.laofi_admin_listar(text, jsonb);
drop function if exists public.laofi_admin_guardar(text, jsonb);
drop function if exists public.laofi_admin_borrar(text, text);
drop function if exists public.laofi_admin_yo();
drop function if exists public.laofi_admin_salon();
drop function if exists public.laofi_admin_cuenta_mesa(uuid);
drop function if exists public.laofi_admin_mesa(uuid, text, jsonb);
drop function if exists public.laofi_admin_cocina(boolean);
drop function if exists public.laofi_admin_avanzar(uuid, text, text);
drop function if exists public.laofi_admin_cancelar_pedido(uuid);
drop function if exists public.laofi_admin_crear_pedido(jsonb);
drop function if exists public.laofi_admin_cobrar(jsonb);
drop function if exists public.laofi_admin_caja();
drop function if exists public.laofi_admin_cerrar_caja(integer, integer, text);
drop function if exists public.laofi_admin_cierres(integer);

drop function if exists laofi.pedido_kds_json(laofi.pedidos);
drop function if exists laofi.rango_estado(text);
drop function if exists laofi.pendiente_mesa(uuid);
drop function if exists laofi.tabla_admin(text);

alter table laofi.pagos drop constraint if exists pagos_cierre_fk;
drop table if exists laofi.cierres_caja;
drop index if exists laofi.pagos_mesa_idx;
alter table laofi.pagos drop column if exists cierre_id, drop column if exists mesa_id;

drop function if exists laofi.exigir_rol(text[]);
drop function if exists laofi.mi_rol();
drop table if exists laofi.staff;

revoke execute on function laofi.siguiente_numero_dia(), laofi.linea_validada(laofi.productos, uuid[]) from authenticated;
