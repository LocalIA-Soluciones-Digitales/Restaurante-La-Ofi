-- =============================================================================
-- OPCIONAL — Carta de La Ofi publicada en internet
-- -----------------------------------------------------------------------------
-- Datos REALES pero no confirmados por el restaurante (consulta 2026-10-01):
--   · Desayunos y tostadas: foto de la carta publicada por @laofiparke en Instagram
--     (serie "7 días 8 tostadas"), con precios.
--   · Para picotear: foto de la carta subida por un cliente a Restaurant Guru
--     (2025). Los precios no se leen → precio_centimos = 0 (la web muestra "Consultar").
-- Alérgenos vacíos a propósito (no se inventan): completarlos desde /admin.
-- Idempotente por categoría. Requiere supabase/seed/la_ofi_tenant.sql.
-- =============================================================================

with tenant as (
  select id from public.clientes where slug = 'restaurante-la-ofi'
),
nuevas (slug, nombre, orden) as (
  values ('desayunos', 'Desayunos y tostadas', 1), ('para-picotear', 'Para picotear', 2)
),
categorias as (
  insert into restaurant.categorias (cliente_id, nombre, slug, tipo, orden)
  select t.id, n.nombre, n.slug, 'comida', n.orden
  from tenant t cross join nuevas n
  where not exists (
    select 1 from restaurant.categorias c where c.cliente_id = t.id and c.slug = n.slug
  )
  returning id, cliente_id, slug
),
items (categoria, orden, nombre, descripcion, precio_centimos) as (
  values
    ('desayunos', 1, 'Clásica', 'Mermelada, mantequilla, aceite o tomate', 210),
    ('desayunos', 2, 'Ibérico', 'Tomate, aceite y jamón', 390),
    ('desayunos', 3, 'Aguacate', 'Aguacate, tomate y jamón ibérico', 560),
    ('desayunos', 4, 'Salmón', 'Salmón, queso crema y sésamo', 650),
    ('desayunos', 5, 'Burrata', 'Burrata, melocotón a la plancha y jamón ibérico', 600),
    ('desayunos', 6, 'Revuelta', 'Queso cottage, huevo revuelto y jamón ibérico', 650),
    ('desayunos', 7, 'Bonita', 'Tortilla francesa de bonito y aguacate', 600),
    ('desayunos', 8, 'Americana', 'Bacon y huevo frito', 650),
    ('desayunos', 9, 'Bowl de yogur', 'Muesli, miel y fruta tropical de temporada', 450),
    ('para-picotear', 1, 'Tabla de ibérico', null, 0),
    ('para-picotear', 2, 'Paletilla ibérica', null, 0),
    ('para-picotear', 3, 'Queso de la casa', null, 0),
    ('para-picotear', 4, 'Croquetas variadas', '6 unidades', 0),
    ('para-picotear', 5, 'Puerros a la parrilla', 'Sobre una base de salsa de hongos', 0),
    ('para-picotear', 6, 'Espárragos a la parrilla', 'Sobre una mahonesa de aguacate', 0),
    ('para-picotear', 7, 'Pimientos del país', '12 unidades', 0),
    ('para-picotear', 8, 'Pulpo a la parrilla', null, 0),
    ('para-picotear', 9, 'Gambas al ajillo', '10 unidades', 0),
    ('para-picotear', 10, 'Morcilla a la brasa', null, 0)
)
insert into restaurant.productos (cliente_id, categoria_id, nombre, descripcion, precio_centimos, disponible, destacado, alergenos, orden)
select c.cliente_id, c.id, i.nombre, i.descripcion, i.precio_centimos, true, false, '{}', i.orden
from categorias c join items i on i.categoria = c.slug;
