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

-- Menú del día de hoy visible a cualquier hora (en producción, de 8:00 a 16:00) para probar
-- la reserva con menú y la recogida, y un tardeo anunciado con aviso al entrar.
update laofi.ajustes set valor = '{"desde": "00:00", "hasta": "24:00"}' where clave = 'menu_dia';
with m as (
  insert into laofi.menus_dia (fecha, precio_centimos, bebida_incluida, pan_incluido, postre_o_cafe)
  values ((now() at time zone 'Europe/Madrid')::date, 1350, true, true, true)
  on conflict (fecha) do update set disponible = true
  returning id
)
insert into laofi.menu_dia_platos (menu_id, tipo, nombre, orden)
select m.id, x.tipo, x.nombre, x.orden from m,
  (values ('primero', 'Lentejas estofadas (prueba)', 1), ('primero', 'Ensalada mixta (prueba)', 2),
          ('segundo', 'Merluza a la plancha (prueba)', 3), ('segundo', 'Carrilleras al PX (prueba)', 4),
          ('postre', 'Arroz con leche (prueba)', 5)) as x(tipo, nombre, orden);
insert into laofi.eventos (slug, titulo, tipo, descripcion, fecha, hora, precio_centimos, publicado, aviso_web, imagen_url)
values ('tardeo-prueba', 'Tardeo con DJ (prueba)', 'Tardeo', 'Música, pintxos y buen ambiente en la terraza. Evento de prueba del backend local.',
        (now() at time zone 'Europe/Madrid')::date + 2, '18:00', 0, true, true, '/images/local/pro/terraza.webp')
on conflict (slug) do nothing;
