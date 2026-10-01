-- =============================================================================
-- OPCIONAL — Carta de tostadas del desayuno de La Ofi
-- -----------------------------------------------------------------------------
-- Datos REALES pero no confirmados: transcritos de la foto de la carta publicada
-- por el propio restaurante en Instagram (@laofiparke, serie "7 días 8 tostadas",
-- consultado el 2026-10-01). Ejecutar solo después de que el propietario confirme
-- nombres y precios vigentes. Alérgenos: vacíos a propósito (no se inventan);
-- el restaurante debe completarlos desde /admin antes de publicar.
-- Requiere haber ejecutado antes supabase/seed/la_ofi_tenant.sql.
-- =============================================================================

with tenant as (
  select id from public.clientes where slug = 'restaurante-la-ofi'
),
categoria as (
  insert into restaurant.categorias (cliente_id, nombre, slug, tipo, orden)
  select t.id, 'Desayunos y tostadas', 'desayunos', 'comida', 1
  from tenant t
  -- Idempotente: si la categoría ya existe no se inserta nada (ni productos).
  where not exists (
    select 1 from restaurant.categorias c where c.cliente_id = t.id and c.slug = 'desayunos'
  )
  returning id, cliente_id
),
items (orden, nombre, descripcion, precio_centimos) as (
  values
    (1, 'Clásica', 'Mermelada, mantequilla, aceite o tomate', 210),
    (2, 'Ibérico', 'Tomate, aceite y jamón', 390),
    (3, 'Aguacate', 'Aguacate, tomate y jamón ibérico', 560),
    (4, 'Salmón', 'Salmón, queso crema y sésamo', 650),
    (5, 'Burrata', 'Burrata, melocotón a la plancha y jamón ibérico', 600),
    (6, 'Revuelta', 'Queso cottage, huevo revuelto y jamón ibérico', 650),
    (7, 'Bonita', 'Tortilla francesa de bonito y aguacate', 600),
    (8, 'Americana', 'Bacon y huevo frito', 650),
    (9, 'Bowl de yogur', 'Muesli, miel y fruta tropical de temporada', 450)
)
insert into restaurant.productos (cliente_id, categoria_id, nombre, descripcion, precio_centimos, disponible, destacado, alergenos, orden)
select c.cliente_id, c.id, i.nombre, i.descripcion, i.precio_centimos, true, false, '{}', i.orden
from categoria c cross join items i;
