-- =============================================================================
-- Alta del tenant Restaurante La Ofi (Derio) en la plataforma LocalIA
-- -----------------------------------------------------------------------------
-- Separado de las migraciones: solo inserta UNA fila en public.clientes (igual
-- que se dio de alta a Palomita-Bar y Bar La Osa). Sin carta, menús, eventos ni
-- ningún otro dato inventado: ese contenido lo cargará el restaurante desde /admin.
-- Idempotente (on conflict do nothing). NO EJECUTAR EN PRODUCCIÓN sin revisión.
--
-- Tras ejecutarlo, copiar el site_key devuelto a LAOFI_SITE_KEY
-- (Vercel → Settings → Environment Variables) y el id a NEXT_PUBLIC_LAOFI_CLIENTE_ID
-- cuando se construya /admin.
-- =============================================================================

insert into public.clientes (nombre_negocio, slug, tipo_proyecto, estado, notas)
values (
  'Restaurante La Ofi',
  'restaurante-la-ofi',
  'web',
  'activo',
  'Derio (Parque Tecnológico de Bizkaia, edificio 502). Vertical restaurant. Alta en modo DEMO (web aún no publicada en el dominio definitivo).'
)
on conflict (slug) do nothing;

select id as cliente_id, site_key
from public.clientes
where slug = 'restaurante-la-ofi';
