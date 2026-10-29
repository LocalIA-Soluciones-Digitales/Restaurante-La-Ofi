-- =============================================================================
-- La Ofi — carta de vinos (foto de la carta que pasó Carlos el 29/10/2026)
-- -----------------------------------------------------------------------------
-- Blancos (por D.O.), rosados y cavas y champagnes, con el precio de la botella.
-- Los vinos dulces ya estaban (la_ofi_carta_oficial.sql). La D.O. y la uva van en
-- la descripción, como en la carta impresa. Falta la otra cara (tintos): Carlos
-- habla de más de 150 referencias.
-- Idempotente. Requiere la carta oficial (para el orden de las categorías).
-- =============================================================================

insert into laofi.categorias (slug, nombre, descripcion, tipo, orden) values
  ('vinos-blancos', 'Vinos blancos', 'Precio por botella.', 'bebida', 8),
  ('vinos-rosados', 'Vinos rosados', 'Precio por botella.', 'bebida', 9),
  ('cavas-champagnes', 'Cavas y champagnes', 'Precio por botella.', 'bebida', 10)
on conflict (slug) do nothing;
update laofi.categorias set orden = 11 where slug = 'vinos-dulces';

with items (categoria, orden, nombre, descripcion, precio_centimos) as (
  values
    -- Blancos · D.O. Rueda
    ('vinos-blancos', 1, 'Terra Nova', 'D.O. Rueda · Sauvignon Blanc', 1400),
    ('vinos-blancos', 2, 'Empecinado', 'D.O. Rueda · Verdejo 100 %', 1500),
    ('vinos-blancos', 3, 'Barbadillo', 'D.O. Rueda · Verdejo 100 %', 1600),
    ('vinos-blancos', 4, 'Finca Montepedroso', 'D.O. Rueda · Sobre lías', 1600),
    ('vinos-blancos', 5, 'Valtravieso Nogara', 'D.O. Rueda · Sobre lías, barrica', 1700),
    -- Blancos · D.O. Rioja
    ('vinos-blancos', 10, 'La Catedral', 'D.O. Rioja · Viura, Tempranillo Blanco y Verdejo', 1400),
    ('vinos-blancos', 11, 'Sierra Cantabria', 'D.O. Rioja · Sauvignon Blanc, Viura, Tempranillo Blanco y Maturana', 1700),
    ('vinos-blancos', 12, 'Valdebarón', 'D.O. Rioja · Tempranillo Blanco', 1700),
    ('vinos-blancos', 13, 'Cueva de Monge', 'D.O. Rioja · Viura, Malvasía y Garnacha Blanca', 2800),
    ('vinos-blancos', 14, '200 Monges Reserva', 'D.O. Rioja · Viura y Malvasía', 5000),
    -- Blancos · Txakoli
    ('vinos-blancos', 20, 'Magalarte', 'Txakoli · Hondarrabi Zuri y Hondarrabi Zuri Zerratia', 1500),
    ('vinos-blancos', 21, 'Aretxabaleta', 'Txakoli · Hondarrabi Zuri y Hondarrabi Zuri Zerratia', 1700),
    ('vinos-blancos', 22, 'Magalarte Fermentado', 'Txakoli · Hondarrabi Zuri y Hondarrabi Zuri Zerratia', 2000),
    -- Blancos · Galicia
    ('vinos-blancos', 30, 'Finca O''Roncal', 'Galicia · Godello', 1400),
    ('vinos-blancos', 31, 'Sampayolo', 'Galicia · Godello', 1700),
    ('vinos-blancos', 32, 'Godelia', 'D.O. Bierzo · Godello sobre lías', 1800),
    ('vinos-blancos', 33, 'Pazo San Mauro', 'D.O. Rías Baixas · Albariño 100 %', 2400),
    ('vinos-blancos', 34, 'Sanamaro', 'D.O. Rías Baixas · Albariño y Loureiro', 4400),
    ('vinos-blancos', 35, 'Patito Feo (barrica)', 'D.O. Ribeiro · Godello y Treixadura', 1900),
    ('vinos-blancos', 36, 'Patito Feo', 'D.O. Ribeiro · Treixadura sobre lías', 1900),
    -- Blancos · Penedés
    ('vinos-blancos', 40, 'Blanc Pescador', 'Penedés · Xarel·lo, Macabeo y Parellada', 1400),
    ('vinos-blancos', 41, 'Mimat', 'Penedés · Moscatel de grano menudo y Malvasía de Sitges', 1700),
    ('vinos-blancos', 42, 'Karamba', 'Penedés · Macabeo, Xarel·lo, Parellada y Chardonnay', 1800),
    -- Blancos · otras denominaciones
    ('vinos-blancos', 50, 'Orquídea', 'D.O. Navarra · Sauvignon Blanc', 1400),
    ('vinos-blancos', 51, 'Barbadillo Palomino', 'Tierra de Cádiz · Palomino', 1600),
    ('vinos-blancos', 52, 'Finca Río Negro', 'D.O. Pago · Gewürztraminer', 1700),
    ('vinos-blancos', 53, 'Pago de Cirsus', 'D.O. Pago · Fermentado en barrica', 1800),
    -- Rosados
    ('vinos-rosados', 1, 'Mediodía', 'D.O. Navarra · Garnacha', 1400),
    ('vinos-rosados', 2, 'Sierra Cantabria', 'D.O. Rioja', 1500),
    ('vinos-rosados', 3, 'Pago de Cirsus', 'D.O. Pago', 1500),
    ('vinos-rosados', 4, 'Flamingo', 'D.O. Ribera del Duero', 2900),
    -- Cavas y champagnes
    ('cavas-champagnes', 1, 'Giró Ribot Brut Reserva', 'D.O. Cava · Macabeo, Xarel·lo y Parellada', 1700),
    ('cavas-champagnes', 2, 'Giró Ribot Brut Nature', 'D.O. Cava · Macabeo, Xarel·lo y Parellada', 1900),
    ('cavas-champagnes', 3, 'Giró Ribot Mare Brut Nature Gran Reserva', 'D.O. Cava · Macabeo, Xarel·lo y Parellada', 2300),
    ('cavas-champagnes', 4, 'Ayala Brut Majeur', 'D.O. Champagne · Chardonnay, Pinot Noir y Pinot Meunier', 5000),
    ('cavas-champagnes', 5, 'Ayala Brut Majeur Rosé', 'D.O. Champagne · Chardonnay, Pinot Noir y Pinot Meunier', 6000),
    ('cavas-champagnes', 6, 'Bollinger Special Cuvée', 'D.O. Champagne · Chardonnay, Pinot Noir y Pinot Meunier', 7000),
    ('cavas-champagnes', 7, 'Ayala Blanc de Blancs', 'D.O. Champagne · Chardonnay 100 %', 9600)
)
insert into laofi.productos (categoria_id, nombre, descripcion, precio_centimos, orden, etiquetas, estacion, iva_pct)
select c.id, i.nombre, i.descripcion, i.precio_centimos, i.orden, '{}'::text[], 'barra', 21
from items i
join laofi.categorias c on c.slug = i.categoria
where not exists (
  select 1 from laofi.productos p where p.categoria_id = c.id and p.nombre = i.nombre
);
