-- Reversión de 20261022100000_laofi_gastos. Borra los gastos y la memoria de
-- proveedores (exportar antes el CSV si hay datos). Los documentos del bucket
-- laofi-gastos se quedan: borrarlos desde el panel de Storage si sobran.
-- Ejecutar ANTES que las reversiones anteriores.
drop function if exists public.laofi_admin_gastos(date, date);
drop function if exists public.laofi_admin_guardar_gasto(jsonb);
drop function if exists public.laofi_admin_borrar_gasto(uuid);
drop function if exists public.laofi_admin_proveedor_gasto(uuid, jsonb);
drop table if exists laofi.gastos;
drop table if exists laofi.gastos_proveedores;
drop function if exists laofi.norm_gasto(text);

do $$
begin
  if to_regclass('storage.objects') is null then return; end if;
  execute 'drop policy if exists laofi_gastos_lectura on storage.objects';
  execute 'drop policy if exists laofi_gastos_subida on storage.objects';
  execute 'drop policy if exists laofi_gastos_borrado on storage.objects';
end;
$$;
