-- Reversión de 20261101100000_laofi_avisos_push. Ejecutar ANTES que las reversiones anteriores.
-- No toca public.push_suscripciones ni public.settings (son de la plataforma): las
-- suscripciones de La Ofi se quedan, pero ya no se envía ningún aviso.
drop trigger if exists avisar_reserva on laofi.reservas;
drop trigger if exists avisar_pedido on laofi.pedidos;
drop function if exists public.laofi_admin_avisos();
drop function if exists public.laofi_admin_avisos_guardar(jsonb);
drop function if exists public.laofi_admin_push_suscribir(text, text, text, text);
drop function if exists public.laofi_admin_push_baja(text);
drop function if exists public.laofi_admin_push_prueba();
drop function if exists laofi.avisos_estado();
drop function if exists laofi.avisos_guardar(jsonb);
drop function if exists laofi.push_suscribir(text, text, text, text);
drop function if exists laofi.push_baja(text);
drop function if exists laofi.push_prueba();
drop function if exists laofi.avisar_reserva();
drop function if exists laofi.avisar_pedido();
drop function if exists laofi.enviar_aviso(text, text, text, text, text, boolean);
drop function if exists laofi.dia_corto(date);
drop function if exists laofi.tipos_aviso();
delete from laofi.ajustes where clave = 'avisos_push';
