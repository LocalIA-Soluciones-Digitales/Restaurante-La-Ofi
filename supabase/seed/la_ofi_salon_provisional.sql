-- =============================================================================
-- La Ofi — distribución PROVISIONAL del salón (zonas y mesas)
-- -----------------------------------------------------------------------------
-- Deducida de las fotos públicas del local (IMAGES_SOURCES.md), NO de un plano:
--  · Pabellón de una planta con fachada de cristal hacia la terraza: El Despacho
--    (comedor privado), la barra (mostrador con neón y mesas altas con taburetes)
--    y el comedor (mesas cuadradas de 4 bajo lámparas de ratán).
--  · Delante, la terraza bajo carpa (mesas de 4) y la zona chill-out con sofás.
-- El número de mesas, su capacidad y su posición son una estimación para poder
-- empezar a usar el salón, el TPV y los QR: se corrigen desde /admin/mesas (y el
-- plano arrastrando mesas en /admin/salon) cuando el local confirme el croquis
-- (CONTENT_NEEDED.md). Idempotente: no toca zonas ni mesas que ya existan.
-- =============================================================================

insert into laofi.zonas (slug, nombre, tipo, x, y, ancho, alto, orden) values
  ('despacho', 'El Despacho', 'despacho', 2, 4, 18, 46, 1),
  ('barra', 'Barra', 'barra', 20, 4, 32, 46, 2),
  ('comedor', 'Comedor', 'comedor', 52, 4, 46, 46, 3),
  ('terraza', 'Terraza', 'terraza', 2, 54, 66, 43, 4),
  ('chill-out', 'Chill-out', 'otra', 70, 54, 28, 43, 5)
on conflict (slug) do nothing;

insert into laofi.mesas (zona_id, numero, capacidad, forma, pos_x, pos_y)
select z.id, m.numero, m.cap, m.forma, m.x, m.y
from (values
  -- Comedor: 12 mesas cuadradas de 4.
  ('comedor', '1', 4, 'cuadrada', 58, 15), ('comedor', '2', 4, 'cuadrada', 68, 15),
  ('comedor', '3', 4, 'cuadrada', 78, 15), ('comedor', '4', 4, 'cuadrada', 88, 15),
  ('comedor', '5', 4, 'cuadrada', 58, 28.5), ('comedor', '6', 4, 'cuadrada', 68, 28.5),
  ('comedor', '7', 4, 'cuadrada', 78, 28.5), ('comedor', '8', 4, 'cuadrada', 88, 28.5),
  ('comedor', '9', 4, 'cuadrada', 58, 42), ('comedor', '10', 4, 'cuadrada', 68, 42),
  ('comedor', '11', 4, 'cuadrada', 78, 42), ('comedor', '12', 4, 'cuadrada', 88, 42),
  -- Barra: 6 mesas altas con taburetes delante del mostrador.
  ('barra', 'B1', 4, 'taburete', 26, 32), ('barra', 'B2', 4, 'taburete', 36, 32),
  ('barra', 'B3', 4, 'taburete', 46, 32), ('barra', 'B4', 4, 'taburete', 26, 44),
  ('barra', 'B5', 4, 'taburete', 36, 44), ('barra', 'B6', 4, 'taburete', 46, 44),
  -- El Despacho: una mesa larga para grupos.
  ('despacho', 'D1', 12, 'rectangular', 11, 27),
  -- Terraza bajo carpa: 12 mesas de 4 (los huecos dejan sitio a los mástiles).
  ('terraza', 'T1', 4, 'cuadrada', 8, 62), ('terraza', 'T2', 4, 'cuadrada', 28, 62),
  ('terraza', 'T3', 4, 'cuadrada', 42, 62), ('terraza', 'T4', 4, 'cuadrada', 62, 62),
  ('terraza', 'T5', 4, 'cuadrada', 8, 75), ('terraza', 'T6', 4, 'cuadrada', 28, 75),
  ('terraza', 'T7', 4, 'cuadrada', 42, 75), ('terraza', 'T8', 4, 'cuadrada', 62, 75),
  ('terraza', 'T9', 4, 'cuadrada', 8, 88), ('terraza', 'T10', 4, 'cuadrada', 28, 88),
  ('terraza', 'T11', 4, 'cuadrada', 42, 88), ('terraza', 'T12', 4, 'cuadrada', 62, 88)
) as m(zona, numero, cap, forma, x, y)
join laofi.zonas z on z.slug = m.zona
on conflict (numero) do nothing;
