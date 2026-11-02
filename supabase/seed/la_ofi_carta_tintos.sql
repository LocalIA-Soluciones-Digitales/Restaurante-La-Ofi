-- =============================================================================
-- La Ofi — vinos tintos (foto de la carta que pasó Carlos el 02/11/2026)
-- -----------------------------------------------------------------------------
-- La otra cara de la carta de vinos: Rioja (crianzas, reservas y vinos de autor),
-- Ribera del Duero, Toro, Navarra y Bierzo, con el precio de la botella. La D.O.,
-- el tipo y la uva van en la descripción, como en los blancos.
-- Los tintos van antes que los blancos. Idempotente. Requiere la carta de vinos
-- (la_ofi_carta_vinos.sql).
-- =============================================================================

insert into laofi.categorias (slug, nombre, descripcion, tipo, orden) values
  ('vinos-tintos', 'Vinos tintos', 'Precio por botella.', 'bebida', 8)
on conflict (slug) do nothing;
update laofi.categorias set orden = 9 where slug = 'vinos-blancos';
update laofi.categorias set orden = 10 where slug = 'vinos-rosados';
update laofi.categorias set orden = 11 where slug = 'cavas-champagnes';
update laofi.categorias set orden = 12 where slug = 'vinos-dulces';

with items (orden, nombre, descripcion, precio_centimos) as (
  values
    -- D.O. Rioja · Crianza
    (1, 'Ondarre 7 Parcelas', 'D.O. Rioja · Crianza · Tempranillo y Mazuelo', 1400),
    (2, 'Cantos Valpiedra', 'D.O. Rioja · Crianza · Tempranillo 100 %', 1800),
    (3, 'Sierra Cantabria', 'D.O. Rioja · Crianza · Tempranillo 100 %', 1700),
    (4, 'Sierra Cantabria (50 cl)', 'D.O. Rioja · Crianza · Tempranillo 100 %', 1200),
    (5, 'Valdebarón', 'D.O. Rioja · Crianza · Tempranillo 100 %', 2000),
    (6, 'Cueva del Monge', 'D.O. Rioja · Crianza · Tempranillo 100 %', 2500),
    (7, 'Sierra Cantabria Cuvée', 'D.O. Rioja · Crianza · Tempranillo 100 %', 2700),
    -- D.O. Rioja · Reservas y gran reserva
    (10, 'Cerro Añón Reserva', 'D.O. Rioja · Reserva · Tempranillo 100 %', 1800),
    (11, 'Marqués de Vargas Reserva', 'D.O. Rioja · Reserva · Tempranillo y Garnacha', 2700),
    (12, 'Finca Valpiedra', 'D.O. Rioja · Reserva · Tempranillo, Graciano y Maturana', 2500),
    (13, 'Sierra Cantabria Reserva', 'D.O. Rioja · Reserva · Tempranillo 100 %', 2600),
    (14, '200 Monges Reserva', 'D.O. Rioja · Reserva · Tempranillo, Graciano y Garnacha', 4900),
    (15, 'Cerro Añón Gran Reserva', 'D.O. Rioja · Gran reserva · Tempranillo, Mazuelo y Graciano', 2100),
    (16, 'Marqués de Vargas Gran Reserva', 'D.O. Rioja · Gran reserva · Tempranillo, Mazuelo y Garnacha', 5000),
    -- D.O. Rioja · Vinos de autor
    (20, 'Senderos de Ukan', 'D.O. Rioja · Vino de autor · Tempranillo 100 %, Rioja Alavesa', 2700),
    (21, 'Ukan', 'D.O. Rioja · Vino de autor · Tempranillo 100 %, Rioja Alavesa', 4200),
    (22, 'San Vicente', 'D.O. Rioja · Vino de autor · Tempranillo Peludo 100 %, Rioja Alta', 4900),
    (23, 'Colección Privada', 'D.O. Rioja · Vino de autor · Tempranillo 100 %, Rioja Alta', 5000),
    -- D.O. Ribera del Duero
    (30, 'Empecinado Crianza', 'D.O. Ribera del Duero · Tinta Fina', 1800),
    (31, 'Valtravieso Crianza', 'D.O. Ribera del Duero · Tinta Fina y Merlot', 1900),
    (32, 'Conde San Cristóbal Crianza', 'D.O. Ribera del Duero · Tinta Fina', 2600),
    (33, 'Ausas Interpretación', 'D.O. Ribera del Duero · Tinta Fina', 4800),
    -- D.O. Toro
    (40, 'Primero Fariña', 'D.O. Toro · Tinta de Toro 100 %', 1400),
    (41, 'Gran Colegiata', 'D.O. Toro · Tinta de Toro 100 %', 2700),
    (42, 'Almirez', 'D.O. Toro · Tinta de Toro 100 %', 2800),
    (43, 'Victorino', 'D.O. Toro · Tinta de Toro 100 %', 5400),
    -- D.O. Navarra
    (50, '400 Inurrieta', 'D.O. Navarra · Cabernet Sauvignon, Merlot, Graciano, Garnacha y Syrah', 1600),
    (51, 'Pago de Cirsus Vendimia Seleccionada', 'D.O. Navarra · Merlot, Cabernet y Syrah', 1800),
    (52, 'Altos de Inurrieta Reserva', 'D.O. Navarra · Graciano, Cabernet y otras variedades', 2200),
    -- D.O. Bierzo
    (60, 'Viernes', 'D.O. Bierzo · Mencía', 1800)
)
insert into laofi.productos (categoria_id, nombre, descripcion, precio_centimos, orden, etiquetas, estacion, iva_pct)
select c.id, i.nombre, i.descripcion, i.precio_centimos, i.orden, '{}'::text[], 'barra', 21
from items i
join laofi.categorias c on c.slug = 'vinos-tintos'
where not exists (
  select 1 from laofi.productos p where p.categoria_id = c.id and p.nombre = i.nombre
);
