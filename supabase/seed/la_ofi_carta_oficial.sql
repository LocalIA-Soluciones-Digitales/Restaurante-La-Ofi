-- =============================================================================
-- La Ofi — carta oficial facilitada por el restaurante (septiembre de 2026)
-- -----------------------------------------------------------------------------
-- Sustituye la carta reconstruida desde internet (la_ofi_contenido_publicado.sql)
-- por las cartas en PDF que ha pasado Carlos:
--   · «La Ofi, tu punto de desayuno» (09/09/2026): las tostadas ya coincidían;
--     solo se actualiza la nota (suplemento 0,90 €) y se quita el aviso de Instagram.
--   · «El Despacho de la Ofi» (02/09/2026): entrantes, brasa, ensaladas, carnes,
--     pescados, postres y vinos dulces, con precios.
-- Las secciones «Para picotear» y «Brasa» (foto de un cliente y Deia, sin precios)
-- se eliminan con sus platos (pedido_items.producto_id es "on delete set null").
-- Chuleta (59 €/kg) y pescado de temporada (por encargo) van con precio null para
-- que no se puedan pedir online a un precio que no es el de la ración.
-- Alérgenos vacíos a propósito: los completa el restaurante desde /admin.
-- Idempotente. Requiere la migración de carta extendida y el seed publicado.
-- =============================================================================

update laofi.categorias
set descripcion = 'Tostadas en pan de masa madre, de 9:00 a 11:30. Suplemento: 0,90 €.'
where slug = 'desayunos';

delete from laofi.productos p using laofi.categorias c
where c.id = p.categoria_id and c.slug in ('para-picotear', 'brasa');
delete from laofi.categorias where slug in ('para-picotear', 'brasa');

insert into laofi.categorias (slug, nombre, descripcion, tipo, orden) values
  ('entrantes', 'Entrantes', 'Carta de El Despacho de la Ofi. Servicio de pan: 2 € por persona.', 'comida', 2),
  ('entrantes-brasa', 'Entrantes a la brasa', null, 'comida', 3),
  ('ensaladas', 'Nuestras ensaladas', null, 'comida', 4),
  ('carnes', 'Nuestras carnes', 'Servicio de pan: 2 € por persona.', 'comida', 5),
  ('pescados', 'Nuestros pescados', null, 'comida', 6),
  ('postres', 'Postres', null, 'comida', 7),
  ('vinos-dulces', 'Vinos dulces', null, 'bebida', 8)
on conflict (slug) do nothing;

with items (categoria, orden, nombre, descripcion, precio_centimos, etiquetas, estacion, iva_pct) as (
  values
    ('entrantes', 1, 'Cecina de Angus', null, 1900, '{para_picar}', 'cocina', 10),
    ('entrantes', 2, 'Tabla de ibérico', null, 2400, '{para_picar}', 'cocina', 10),
    ('entrantes', 3, 'Paletilla ibérica', null, 1600, '{para_picar}', 'cocina', 10),
    ('entrantes', 4, 'Queso de la casa', null, 1600, '{para_picar}', 'cocina', 10),
    ('entrantes', 5, 'Anchoas 00', 'Selección Especial Casa Santoña', 2300, '{para_picar}', 'cocina', 10),
    ('entrantes', 6, 'Gambas al ajillo', null, 1600, '{para_picar}', 'cocina', 10),
    ('entrantes', 7, 'Croquetas de la casa', 'Precio por unidad', 230, '{para_picar,casero}', 'cocina', 10),
    ('entrantes-brasa', 1, 'Puerros con salsa de hongos', null, 1200, '{para_picar,brasa}', 'cocina', 10),
    ('entrantes-brasa', 2, 'Espárragos sobre mahonesa de aguacate', null, 1500, '{para_picar,brasa}', 'cocina', 10),
    ('entrantes-brasa', 3, 'Pulpo', null, 2300, '{para_picar,brasa}', 'cocina', 10),
    ('entrantes-brasa', 4, 'Morcilla de Burgos con pimientos asados', null, 1500, '{para_picar,brasa}', 'cocina', 10),
    ('entrantes-brasa', 5, 'Morcilla de puerro de Zamudio', null, 1500, '{para_picar,brasa}', 'cocina', 10),
    ('entrantes-brasa', 6, 'Flor de alcachofa con papada ibérica y huevo', null, 1500, '{para_picar,brasa}', 'cocina', 10),
    ('ensaladas', 1, 'Ensalada de la casa', 'Mezclum, tartar de tomate y aguacate', 1500, '{}', 'cocina', 10),
    ('ensaladas', 2, 'Ensalada de burrata', null, 1600, '{}', 'cocina', 10),
    ('ensaladas', 3, 'Ensalada de ventresca con pimientos asados', null, 1800, '{}', 'cocina', 10),
    ('ensaladas', 4, 'Bol de lechuga y cebolla', null, 700, '{}', 'cocina', 10),
    ('ensaladas', 5, 'Bol de tomate, lechuga y cebolla', null, 900, '{}', 'cocina', 10),
    ('carnes', 1, 'Escalope milanesa', null, 1600, '{}', 'cocina', 10),
    ('carnes', 2, 'Carrilleras de ternera al PX', null, 2000, '{}', 'cocina', 10),
    ('carnes', 3, 'Rabo guisado', null, 2000, '{}', 'cocina', 10),
    ('carnes', 4, 'Costilla a baja temperatura agridulce', null, 2000, '{}', 'cocina', 10),
    ('carnes', 5, 'Secreto ibérico a la brasa', null, 1800, '{brasa}', 'cocina', 10),
    ('carnes', 6, 'Presa ibérica', null, 1900, '{}', 'cocina', 10),
    ('carnes', 7, 'Entrecot a la brasa', null, 1800, '{brasa}', 'cocina', 10),
    ('carnes', 8, 'Chuleta de ganado mayor', '59 € el kilo', null, '{brasa}', 'cocina', 10),
    ('pescados', 1, 'Bacalao', null, 2400, '{}', 'cocina', 10),
    ('pescados', 2, 'Pescado de temporada a la brasa', 'Por encargo', null, '{brasa,temporada}', 'cocina', 10),
    ('postres', 1, 'Tarta de limón', null, 600, '{}', 'cocina', 10),
    ('postres', 2, 'Pastel vasco', null, 600, '{}', 'cocina', 10),
    ('postres', 3, 'Tarta de queso', null, 900, '{}', 'cocina', 10),
    ('postres', 4, 'Arroz con leche', null, 600, '{}', 'cocina', 10),
    ('postres', 5, 'Helados artesanales', null, 600, '{}', 'cocina', 10),
    ('vinos-dulces', 1, 'Finca Antigua', 'Moscatel', 300, '{}', 'barra', 21),
    ('vinos-dulces', 2, 'Harveys', 'Pedro Ximénez', 400, '{}', 'barra', 21),
    ('vinos-dulces', 3, 'Libamus', 'Mencía', 400, '{}', 'barra', 21),
    ('vinos-dulces', 4, 'Graham''s Tawny', 'Oporto', 400, '{}', 'barra', 21)
)
insert into laofi.productos (categoria_id, nombre, descripcion, precio_centimos, orden, etiquetas, estacion, iva_pct)
select c.id, i.nombre, i.descripcion, i.precio_centimos::integer, i.orden, i.etiquetas::text[], i.estacion, i.iva_pct::numeric
from items i
join laofi.categorias c on c.slug = i.categoria
where not exists (
  select 1 from laofi.productos p where p.categoria_id = c.id and p.nombre = i.nombre
);
