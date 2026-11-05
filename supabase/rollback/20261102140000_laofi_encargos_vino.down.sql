-- Las de 20261104100000 (historial, editar y borrar) no tienen reversión propia: se quitan aquí con la tabla.
drop function if exists public.laofi_admin_encargos_vino_historial(date, date, text);
drop function if exists public.laofi_admin_encargo_vino_editar(uuid, jsonb);
drop function if exists public.laofi_admin_encargo_vino_borrar(uuid);
drop function if exists public.laofi_admin_encargo_vino_estado(uuid, text);
drop function if exists public.laofi_admin_encargos_vino(boolean);
drop function if exists public.laofi_cancelar_encargo_vino(uuid, uuid);
drop function if exists public.laofi_get_encargo_vino(uuid, uuid);
drop function if exists public.laofi_crear_encargo_vino(uuid, jsonb);
drop function if exists laofi.encargo_vino_publico_json(laofi.encargos_vino);
drop function if exists laofi.purgar_encargos_vino();
drop table if exists laofi.encargos_vino;
update laofi.ajustes set valor = valor - 'encargos_vino' where clave = 'avisos_push';
create or replace function laofi.tipos_aviso()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['reservas_comedor', 'reservas_despacho', 'recogidas_menu', 'pedidos_recoger', 'eventos', 'presupuestos', 'pedidos_mesa'];
$$;
