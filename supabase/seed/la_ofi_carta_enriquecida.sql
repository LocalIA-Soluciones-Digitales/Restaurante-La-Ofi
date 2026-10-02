-- =============================================================================
-- La Ofi — enriquecer la carta publicada (OPCIONAL, requiere la migración
-- 20261002100000_laofi_carta_extendida). NO EJECUTAR EN PRODUCCIÓN sin revisión.
-- -----------------------------------------------------------------------------
-- Solo datos que ya están en lo publicado, nada inventado:
--  · Fotos oficiales (@laofiparke, uso autorizado) de 4 tostadas, servidas desde
--    /public/images de la propia web.
--  · Momento "desayuno" y estación "barra" para las tostadas (servicio de 9:00 a
--    11:30 según la carta publicada).
--  · Etiqueta "para_picar" en "Para picotear" y "brasa" en los platos cuyo nombre
--    o descripción dice "a la parrilla" / "a la brasa".
--  · La tostada Clásica con sus cuatro opciones, tal cual su descripción
--    ("Mermelada, mantequilla, aceite o tomate"), sin suplemento.
-- Sin alérgenos, nutrición ni precios: siguen pendientes del restaurante.
-- Idempotente.
-- =============================================================================

update laofi.productos p set imagen_url = v.url
from (values
  ('Burrata', '/images/pintxos/tostada-burrata.webp'),
  ('Revuelta', '/images/pintxos/tostada-revuelta.webp'),
  ('Salmón', '/images/pintxos/tostada-salmon.webp'),
  ('Bonita', '/images/pintxos/tostada-bonita.webp')
) as v(nombre, url), laofi.categorias c
where c.id = p.categoria_id and c.slug = 'desayunos' and p.nombre = v.nombre and p.imagen_url is null;

update laofi.productos p set momento = '{desayuno}', estacion = 'barra'
from laofi.categorias c
where c.id = p.categoria_id and c.slug = 'desayunos';

update laofi.productos p
set etiquetas = array(select distinct unnest(p.etiquetas || '{para_picar}'::text[]))
from laofi.categorias c
where c.id = p.categoria_id and c.slug = 'para-picotear' and not ('para_picar' = any (p.etiquetas));

update laofi.productos p
set etiquetas = array(select distinct unnest(p.etiquetas || '{brasa}'::text[]))
where (p.nombre ~* '(parrilla|brasa)' or coalesce(p.descripcion, '') ~* '(parrilla|brasa)')
  and not ('brasa' = any (p.etiquetas));

with clasica as (
  select p.id from laofi.productos p join laofi.categorias c on c.id = p.categoria_id
  where c.slug = 'desayunos' and p.nombre = 'Clásica'
), mod as (
  insert into laofi.modificadores (producto_id, nombre, tipo, obligatorio, orden)
  select id, 'Con', 'unico', true, 1 from clasica
  where not exists (select 1 from laofi.modificadores m where m.producto_id = clasica.id)
  returning id
)
insert into laofi.modificador_opciones (modificador_id, nombre, orden)
select mod.id, o.nombre, o.orden
from mod, (values ('Mermelada', 1), ('Mantequilla', 2), ('Aceite', 3), ('Tomate', 4)) as o(nombre, orden);
