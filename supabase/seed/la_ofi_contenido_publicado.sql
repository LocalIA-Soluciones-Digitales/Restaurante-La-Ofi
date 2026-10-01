-- =============================================================================
-- Contenido de La Ofi publicado en internet (consulta 2026-10-01)
-- -----------------------------------------------------------------------------
-- Carga en el schema laofi la carta y el horario encontrados en internet, por
-- indicación de LocalIA. Cada sección de la carta indica su procedencia en
-- "descripcion" (visible en la web). Nada inventado:
--   · Desayunos y tostadas: carta publicada por @laofiparke en Instagram (con precios).
--   · Para picotear: foto de la carta subida por un cliente a Restaurant Guru
--     (2025); precios ilegibles → precio null ("Consultar").
--   · Brasa: especialidades citadas por Deia (13/09/2025), sin precio.
--   · Horario: Google Business / Restaurant Guru; sábado sin dato fiable → 'consultar'.
-- Alérgenos vacíos a propósito: los completará el restaurante desde /admin.
-- Idempotente (on conflict). Requiere las migraciones laofi y el seed del tenant.
-- =============================================================================

insert into laofi.categorias (slug, nombre, descripcion, tipo, orden) values
  ('desayunos', 'Desayunos y tostadas',
   'Tostadas en pan de masa madre (de 9:00 a 11:30). Precios según la carta publicada por La Ofi en Instagram: confírmalos en el local.',
   'comida', 1),
  ('para-picotear', 'Para picotear',
   'Platos de la carta de La Ofi según una foto publicada por un cliente (2025). Precio en el local.',
   'comida', 2),
  ('brasa', 'Carnes y pescados a la brasa',
   'Especialidades de la casa citadas por Deia (septiembre de 2025). Disponibilidad y precio según mercado: pregunta en el local.',
   'comida', 3)
on conflict (slug) do nothing;

with items (categoria, orden, nombre, descripcion, precio_centimos) as (
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
    ('para-picotear', 1, 'Tabla de ibérico', null, null),
    ('para-picotear', 2, 'Paletilla ibérica', null, null),
    ('para-picotear', 3, 'Queso de la casa', null, null),
    ('para-picotear', 4, 'Croquetas variadas', '6 unidades', null),
    ('para-picotear', 5, 'Puerros a la parrilla', 'Sobre una base de salsa de hongos', null),
    ('para-picotear', 6, 'Espárragos a la parrilla', 'Sobre una mahonesa de aguacate', null),
    ('para-picotear', 7, 'Pimientos del país', '12 unidades', null),
    ('para-picotear', 8, 'Pulpo a la parrilla', null, null),
    ('para-picotear', 9, 'Gambas al ajillo', '10 unidades', null),
    ('para-picotear', 10, 'Morcilla a la brasa', null, null),
    ('brasa', 1, 'Pescado del día a la parrilla', 'Según mercado: lenguado, rodaballo, lubina, bonito, chicharro… Salvaje bajo reserva.', null),
    ('brasa', 2, 'Solomillo a la brasa', null, null),
    ('brasa', 3, 'Entrecot a la brasa', null, null),
    ('brasa', 4, 'Secreto ibérico a la brasa', null, null),
    ('brasa', 5, 'Rabo de toro', 'Cocido y dorado en la parrilla', null),
    ('brasa', 6, 'Carrilleras al Pedro Ximénez', null, null)
)
insert into laofi.productos (categoria_id, nombre, descripcion, precio_centimos, orden)
select c.id, i.nombre, i.descripcion, i.precio_centimos::integer, i.orden
from items i
join laofi.categorias c on c.slug = i.categoria
where not exists (
  select 1 from laofi.productos p where p.categoria_id = c.id and p.nombre = i.nombre
);

insert into laofi.horario (dia, estado, desde, hasta) values
  (1, 'abierto', '07:30', '17:00'),
  (2, 'abierto', '07:30', '17:00'),
  (3, 'abierto', '07:30', '17:00'),
  (4, 'abierto', '07:30', '17:00'),
  (5, 'abierto', '07:30', '00:00'),
  (6, 'consultar', null, null),
  (7, 'cerrado', null, null)
on conflict (dia) do nothing;
