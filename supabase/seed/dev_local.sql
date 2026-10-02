-- =============================================================================
-- DATOS DE PRUEBA SOLO PARA EL BACKEND LOCAL (LAOFI_PGLITE=1). NUNCA en Supabase.
-- -----------------------------------------------------------------------------
-- Las zonas y mesas salen de la_ofi_salon_provisional.sql (las mismas que en
-- producción, que dev-pglite carga antes que este archivo); aquí solo se abre
-- todo (recogida, horario, reservas) para poder probar /pedir y /admin.
-- =============================================================================

-- Recogida abierta todo el día y pago en el local (sin Stripe en local).
update laofi.ajustes set valor = '{"activa": true, "desde": "07:30", "hasta": "23:30", "intervalo_min": 15, "capacidad": 6, "antelacion_min": 15, "dias": [1,2,3,4,5,6,7]}' where clave = 'recogida';
update laofi.ajustes set valor = '{"online": false, "en_local": true}' where clave = 'pagos';
update laofi.horario set estado = 'abierto', desde = '07:30', hasta = '00:00';

-- Reservas online activas en local (en producción vienen apagadas).
update laofi.ajustes set valor = '{"online": true, "max_personas": 12, "antelacion_dias": 60}' where clave = 'reservas';

-- Un servicio en marcha para probar el salón (solo local): dos reservas de hoy,
-- la mesa 5 sentada hace 95 min con dos platos listos en cocina, la T3 llamando
-- al camarero y la 2 por limpiar.
insert into laofi.reservas (nombre, telefono, personas, fecha, hora, estado, origen)
values ('Reserva de prueba A', '600000001', 4, (now() at time zone 'Europe/Madrid')::date, '14:00', 'CONFIRMADA', 'telefono'),
       ('Reserva de prueba B', '600000002', 8, (now() at time zone 'Europe/Madrid')::date, '21:00', 'PENDIENTE', 'telefono');
update laofi.mesas set ocupada = true, comensales = 3, entrada_at = now() - interval '95 minutes' where numero = '5';
with p as (
  insert into laofi.pedidos (numero_dia, tipo, mesa_id, payment_method, subtotal_centimos, total_centimos, estado, origen, created_at)
  select 1, 'MESA', id, 'LOCAL', 1800, 1800, 'PREPARING', 'tpv', now() - interval '80 minutes' from laofi.mesas where numero = '5'
  returning id
)
insert into laofi.pedido_items (pedido_id, nombre, cantidad, precio_unitario_centimos, estado)
select p.id, 'Croquetas variadas (prueba)', 2, 900, 'READY' from p;
insert into laofi.avisos (mesa_id, tipo) select id, 'CAMARERO' from laofi.mesas where numero = 'T3';
update laofi.mesas set ocupada = true, comensales = 2, entrada_at = now() - interval '20 minutes' where numero = 'T3';
update laofi.mesas set por_limpiar = true where numero = '2';
