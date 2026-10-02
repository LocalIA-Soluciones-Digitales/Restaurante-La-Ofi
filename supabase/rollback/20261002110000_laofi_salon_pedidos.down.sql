-- Reversión de 20261002110000_laofi_salon_pedidos.
-- ATENCIÓN: borra mesas, pedidos, pagos, grupos y ajustes de La Ofi. Hacer copia
-- antes. Ejecutar ANTES que las reversiones de migraciones anteriores.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime drop table laofi.pedidos, laofi.pedido_items, laofi.avisos, laofi.mesas;
    exception when undefined_object then null;
    end;
  end if;
end;
$$;

drop function if exists public.laofi_validar_mesa(uuid, text);
drop function if exists public.laofi_iniciar_sesion_mesa(uuid, text, text);
drop function if exists public.laofi_unirse_sesion(uuid, uuid, text, text);
drop function if exists public.laofi_get_sesion(uuid, uuid);
drop function if exists public.laofi_asumir_reparto(uuid, uuid, uuid);
drop function if exists public.laofi_avisar(uuid, text, text);
drop function if exists public.laofi_get_config_pedidos(uuid);
drop function if exists public.laofi_crear_grupo(uuid, text, text, timestamptz);
drop function if exists public.laofi_get_grupo(uuid, text);
drop function if exists public.laofi_crear_pedido(uuid, jsonb);
drop function if exists public.laofi_get_pedido(uuid, uuid);
drop function if exists public.laofi_get_pedido_para_pago(uuid);
drop function if exists public.laofi_get_reparto_para_pago(uuid);
drop function if exists public.laofi_marcar_pedido_pagado(uuid, text, text, integer);
drop function if exists public.laofi_marcar_repartos_pagados(uuid, uuid[], text, text, integer);

drop table if exists laofi.pagos;
drop table if exists laofi.pedido_estado_historial;
drop table if exists laofi.pedido_item_repartos;
drop table if exists laofi.pedido_items;
drop table if exists laofi.pedidos;
drop table if exists laofi.grupos_pedido;
drop table if exists laofi.avisos;
drop table if exists laofi.sesion_participantes;
drop table if exists laofi.mesa_sesiones;
drop table if exists laofi.mesas;
drop table if exists laofi.zonas;
drop table if exists laofi.ajustes;

drop function if exists laofi.linea_validada(laofi.productos, uuid[]);
drop function if exists laofi.franjas_recogida_hoy();
drop function if exists laofi.siguiente_numero_dia();
drop function if exists laofi.ahora_madrid();
drop function if exists laofi.validar_estado_item();
drop function if exists laofi.validar_estado_pedido();
drop function if exists laofi.transicion_permitida(text, text);
