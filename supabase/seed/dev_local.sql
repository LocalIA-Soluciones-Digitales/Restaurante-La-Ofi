-- =============================================================================
-- DATOS DE PRUEBA SOLO PARA EL BACKEND LOCAL (LAOFI_PGLITE=1). NUNCA en Supabase.
-- -----------------------------------------------------------------------------
-- Las cuatro zonas son los espacios reales del local; las mesas, su número,
-- capacidad y posición son INVENTADAS para poder probar /pedir y /admin: no es
-- el plano de La Ofi (pendiente de croquis, CONTENT_NEEDED.md).
-- =============================================================================
insert into laofi.zonas (slug, nombre, tipo, x, y, ancho, alto, orden) values
  ('barra', 'Barra', 'barra', 2, 2, 26, 56, 1),
  ('comedor', 'Comedor', 'comedor', 30, 2, 46, 56, 2),
  ('despacho', 'El Despacho', 'despacho', 78, 2, 20, 56, 3),
  ('terraza', 'Terraza', 'terraza', 2, 62, 96, 36, 4)
on conflict (slug) do nothing;

insert into laofi.mesas (zona_id, numero, capacidad, forma, pos_x, pos_y, token)
select z.id, m.numero, m.cap, m.forma, m.x, m.y, m.token
from (values
  ('barra', 'B1', 2, 'taburete', 8, 12, 'devbarra0001'), ('barra', 'B2', 2, 'taburete', 8, 26, 'devbarra0002'),
  ('barra', 'B3', 2, 'taburete', 8, 40, 'devbarra0003'), ('barra', 'B4', 4, 'redonda', 20, 30, 'devbarra0004'),
  ('comedor', '1', 4, 'cuadrada', 36, 12, 'devmesa00001'), ('comedor', '2', 4, 'cuadrada', 48, 12, 'devmesa00002'),
  ('comedor', '3', 4, 'cuadrada', 60, 12, 'devmesa00003'), ('comedor', '4', 6, 'rectangular', 36, 32, 'devmesa00004'),
  ('comedor', '5', 6, 'rectangular', 54, 32, 'devmesa00005'), ('comedor', '6', 2, 'redonda', 70, 46, 'devmesa00006'),
  ('despacho', 'D1', 10, 'rectangular', 88, 28, 'devdespacho1'),
  ('terraza', 'T1', 4, 'redonda', 10, 76, 'devterraza01'), ('terraza', 'T2', 4, 'redonda', 24, 76, 'devterraza02'),
  ('terraza', 'T3', 4, 'redonda', 38, 76, 'devterraza03'), ('terraza', 'T4', 6, 'rectangular', 56, 80, 'devterraza04'),
  ('terraza', 'T5', 8, 'rectangular', 78, 80, 'devterraza05')
) as m(zona, numero, cap, forma, x, y, token)
join laofi.zonas z on z.slug = m.zona
on conflict (numero) do nothing;

-- Recogida abierta todo el día y pago en el local (sin Stripe en local).
update laofi.ajustes set valor = '{"activa": true, "desde": "07:30", "hasta": "23:30", "intervalo_min": 15, "capacidad": 6, "antelacion_min": 15, "dias": [1,2,3,4,5,6,7]}' where clave = 'recogida';
update laofi.ajustes set valor = '{"online": false, "en_local": true}' where clave = 'pagos';
update laofi.horario set estado = 'abierto', desde = '07:30', hasta = '00:00';
