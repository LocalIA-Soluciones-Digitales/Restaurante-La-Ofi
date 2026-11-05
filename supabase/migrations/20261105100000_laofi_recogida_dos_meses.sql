-- Recogida con hasta dos meses de antelación (05/11/2026). El calendario de la cesta enseña
-- el mes entero y deja pasar a otros meses: los encargos se aceptan de hoy a 60 días vista.
--  - laofi_crear_pedido: v_hoy + 6 → v_hoy + 60.
--  - laofi_get_config_pedidos: «proximas» trae las franjas de hoy y los 60 días siguientes.
-- Se reescribe la definición que hay en la base (solo cambia el plazo; el resto queda igual).

do $mig$
declare
  def text;
begin
  select pg_get_functiondef('public.laofi_crear_pedido(uuid, jsonb)'::regprocedure) into def;
  if position('v_hoy + 6' in def) = 0 then raise exception 'laofi_crear_pedido: no está «v_hoy + 6»'; end if;
  def := regexp_replace(def, 'v_hoy \+ 6(?![0-9])', 'v_hoy + 60', 'g');
  if position('v_hoy + 60' in def) = 0 then raise exception 'laofi_crear_pedido: no se pudo cambiar el plazo'; end if;
  execute replace(def, 'uno de los próximos 6 días', 'uno de los próximos 60 días');

  select pg_get_functiondef('public.laofi_get_config_pedidos(uuid)'::regprocedure) into def;
  if position('generate_series(0, 6)' in def) = 0 then raise exception 'laofi_get_config_pedidos: no está «generate_series(0, 6)»'; end if;
  execute replace(def, 'generate_series(0, 6)', 'generate_series(0, 60)');
end;
$mig$;
