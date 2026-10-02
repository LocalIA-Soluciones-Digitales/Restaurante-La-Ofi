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
