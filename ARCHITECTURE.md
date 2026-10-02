# Restaurante La Ofi — Arquitectura

Estado (2026-10-02): rama `feat/rediseno-premium` con el **rediseño completo**: web pública
cinematográfica con vídeo, carta interactiva, cesta y pedidos (mesa por QR, recogida, grupos,
Stripe), reservas online y `/admin` preparado para TPV (roles, salón 2D/3D, QR, TPV, cocina/KDS,
impresión, caja, ventas, TicketBAI en andamiaje). En producción (`main`) sigue la V1 con las dos
primeras migraciones de `laofi` **aplicadas**. Las cuatro migraciones nuevas
(`20261002100000`–`20261002130000`) están **escritas y probadas en PGlite, sin aplicar** en el
Supabase compartido: requieren confirmación expresa.

---

## 1. Cómo encaja La Ofi en LocalIA

La Ofi es un tenant del proyecto Supabase compartido de LocalIA (`ukhfaphloxlszomccgde`), pero con
**todas sus tablas en un schema propio, `laofi`**: ningún dato suyo vive en tablas compartidas con
otros proyectos (Palomita y Bar La Osa comparten `restaurant`; Amway, hostelería, báscula… usan
tablas con prefijo en `public`). Las tablas que en Palomita están en `restaurant` (mesas, pedidos,
reservas, premios…) se **replican dentro de `laofi`**, nunca se comparten. Lo único común es el
registro de tenants de la plataforma:

```
public.clientes            fila "restaurante-la-ofi": site_key pública, estado (activo/pausado)
public.usuarios_negocio    staff de La Ofi → cliente_id (rol de plataforma "gestion")
public.is_developer() …    helpers de plataforma (LocalIA ve todos los tenants)

laofi.*                    ← SOLO datos de La Ofi
  ├─ carta        categorias, productos (+ nutrición con fuente, alérgenos confirmados,
  │               etiquetas, momento, estación, IVA), modificadores
  ├─ menús        menus_dia, menu_dia_platos
  ├─ eventos      eventos (borradores con publicado = false)
  ├─ horario      7 filas: abierto / cerrado / consultar
  ├─ salón        ajustes, zonas, mesas (token del QR), sesiones de mesa, participantes, avisos
  ├─ pedidos      grupos_pedido, pedidos, pedido_items, repartos, historial, pagos, franjas
  ├─ staff        staff (rol admin/encargado/camarero/cocina), cierres de caja
  ├─ gestión      reservas, reserva_mesas, comensales, reglas_promocion, premios_otorgados, resenas
  └─ fiscal       ticketbai_facturas (andamiaje, apagado)
public.laofi_*             RPC: única puerta de entrada desde la web
```

Barreras de aislamiento (verificadas por `supabase/tests/seguridad.test.ts`, que falla si alguien
las rompe):

1. **anon no tiene `USAGE` sobre `laofi`**: no puede leer ni escribir ninguna tabla. Solo puede
   ejecutar una lista cerrada de RPC públicas (`laofi_get_*`, `laofi_crear_pedido`,
   `laofi_crear_reserva`, sesiones de mesa…), todas con site_key.
2. **Cada RPC pública exige la site_key de La Ofi** (`laofi.site_key_valida`). La site_key la pone
   el **servidor** (Server Actions y Server Components); nunca viaja al navegador.
3. **Precios recalculados en Postgres**: `laofi_crear_pedido` ignora cualquier importe del cliente
   y valida cada línea contra `laofi.productos` y sus modificadores (`laofi.linea_validada`).
4. **RLS en todas las tablas**: `authenticated` solo pasa si `laofi.es_gestor()`. Las RPC
   `laofi_admin_*` son `SECURITY INVOKER` (la RLS sigue aplicando) y además comprueban el rol del
   panel con `laofi.exigir_rol(...)`.
5. **Solo `service_role`** (únicamente en rutas de servidor): marcar pagos (`laofi_marcar_*`, desde
   el webhook de Stripe), leer importes para el checkout, registro TicketBAI (`laofi_tbai_*`) y alta
   de staff (`laofi_vincular_staff`). Ni anon ni authenticated pueden ejecutarlas.
6. **Sin `cliente_id` en las tablas**: al ser un schema de un único tenant no hay columna de tenant
   que olvidar filtrar.

Acceso desde el código: todo pasa por `src/lib/supabase/rpc.ts` — `rpcPublica` (anon + site_key),
`rpcStaff` (sesión del staff por cookie con `@supabase/ssr`) y `rpcServicio` (`service_role`, solo
en `app/api/stripe/*`, `app/api/ticketbai/*` y el alta de staff).

## 2. Modelo de datos (`supabase/migrations/`)

| Migración | Estado | Contenido |
|---|---|---|
| `20261001150000_laofi_schema.sql` | **aplicada** 2026-10-01 | Schema `laofi`, helpers (`cliente_id`, `es_gestor`, `site_key_valida`, `alergenos_validos`), carta, menú del día, eventos y horario con CHECKs, índices, triggers `updated_at`, RLS y permisos. |
| `20261001150100_laofi_rpc_publicas.sql` | **aplicada** 2026-10-01 | `laofi_get_carta`, `laofi_get_menu_dia`, `laofi_get_eventos`, `laofi_get_evento`, `laofi_get_horario`. |
| `20261002100000_laofi_carta_extendida.sql` | **sin aplicar** | Nutrición por producto con `nutricion_fuente` obligatoria (solo se muestra si la aporta el restaurante), `alergenos_confirmados`, etiquetas, momento, estación de cocina, IVA, modificadores; `laofi_get_menu_dia` devuelve `updated_at` ("actualizado hoy a las…"). |
| `20261002110000_laofi_salon_pedidos.sql` | **sin aplicar** | Ajustes, zonas, mesas con token de QR, sesiones de mesa compartidas, participantes, avisos al camarero, grupos de pedido, pedidos/ítems/repartos/historial/pagos, franjas de recogida. RPC públicas de mesa/pedido/grupo y funciones de pago solo para `service_role`. |
| `20261002120000_laofi_admin_tpv.sql` | **sin aplicar** | Staff con roles, `laofi.mi_rol`/`exigir_rol`, CRUD genérico con lista blanca (`laofi_admin_listar/guardar/borrar`), salón, cuenta de mesa, TPV, cocina por estación, cobro, caja y cierres. |
| `20261002130000_laofi_gestion.sql` | **sin aplicar** | Reservas (con mesas y comensales), promociones/premios y reseñas (**apagadas** por defecto), TicketBAI (registro encadenado, solo `service_role`), menú del día y ventas para el panel, alta de staff. |

- **Aditivas**: no modifican objetos de otros proyectos. Cada una tiene su reversión en
  `supabase/rollback/` (`*.down.sql`), probada en PGlite en orden inverso; la base
  (`20261001150000_laofi.down.sql`) borra el schema y **todas** las `public.laofi_*`.
- **Seeds**: `la_ofi_tenant.sql` y `la_ofi_contenido_publicado.sql` (aplicados);
  `la_ofi_carta_enriquecida.sql` (opcional, requiere la carta extendida: fotos oficiales, momento y
  etiquetas deducidos del texto publicado; sin precios, alérgenos ni nutrición inventados);
  `dev_local.sql` (**solo** backend local: mesas, zonas y staff de prueba).
- **Tests** (`npm test`, 127): réplica mínima de la plataforma en PGlite
  (`supabase/tests/platform-stub.sql`, con los permisos por defecto de Supabase) + migraciones, RLS
  por rol, aislamiento con site_key ajena, precios recalculados, repartos, caja, TicketBAI,
  reversiones y auditoría de seguridad.
- **Para aplicar** (cuando se confirme): las cuatro migraciones en orden, `npm test` antes,
  advisors de Supabase después, y el seed opcional de carta si se quiere.

Menú del día: `tipo` admite `plato` (plato del día a elegir) además de primero/segundo/postre.
Horario: si `laofi.horario` estuviera vacío, la web usa el publicado en Google
(`HORARIO_INTERNET` en `src/lib/horario.ts`).

## 3. Frontend

```
app/
  (site)/[locale]/            raíz pública (es; eu preparado y desactivado)
    page.tsx                  home "Un día en La Ofi": hero en vídeo por franja, historia fijada,
                              menú de hoy, especialidades, espacios, empresas, vinos, eventos, CTA
    carta/                    carta interactiva (filtros, alérgenos, nutrición si existe, modificadores)
    pedir/ pedido/[id]/       cesta, mesa por QR, recogida, grupos; estado del pedido
    reservar/                 reserva online si está activada en /admin; si no, teléfono
    espacios/ empresas/ menu-del-dia/ eventos/ galeria/ contacto/ legales
  (internal)/admin/           raíz independiente (PWA), login y panel por roles:
    Hoy · Salón (2D/3D) · TPV · Cocina y barra (KDS) · Reservas · Menú del día · Carta ·
    Eventos · Ventas · Caja · Mesas y QR · Equipo · Configuración · Fidelización y Reseñas (apagadas)
  api/stripe/{checkout,checkout-participante,webhook}   pagos (confirmación SOLO por webhook)
  api/ticketbai/emitir        andamiaje: 503 salvo TICKETBAI_ENABLED=true
middleware.ts                 /x → /es/x (conserva la query de los QR); sesión de /admin
src/
  components/home|media|motion|pedir|admin|carta|…
  lib/supabase/rpc.ts         único acceso a datos (ver §1)
  lib/supabase/dev-pglite.ts  backend local en memoria (LAOFI_PGLITE=1)
  lib/pedidos|admin|reservas  Server Actions
  lib/media.ts                registro de vídeos (real / generado) y escenas del hero
  lib/ticketbai/              XML, CRC-8, identificador y QR (portados de Palomita); firma y envío pendientes
print-bridge/                 puente de impresión ESC/POS para la impresora de cocina (Node, red local)
supabase/                     migrations, rollback, seed, tests
```

**Motion y rendimiento.** Revelado de titulares con CSS (`clip-path`), GSAP cargado bajo demanda
(`lib/motion/gsap.ts`), Lenis solo en escritorio con puntero fino y tras la carga, historia fijada
solo en `lg` (`dynamic(ssr:false)`), three/R3F solo en el salón 3D de `/admin`. Sin Framer Motion en
la web pública. Vídeos con `preload="none"`, póster, 720p/1080p por media query y reproducción solo
cuando son visibles (`usePlayWhenVisible`); con `prefers-reduced-motion` todo queda estático.

**Backend local.** `npm run dev:local` arranca Next con PGlite en memoria: aplica el stub de la
plataforma, todas las migraciones y los seeds, y entra en `/admin` como staff de prueba sin login.
Permite probar pedidos, TPV, KDS, caja y reservas sin Docker ni tocar el Supabase compartido.

Flags (`src/lib/env.ts`): `NEXT_PUBLIC_IS_DEMO` (por defecto **true**: nunca se indexa un despliegue
sin configurar), `NEXT_PUBLIC_SHOW_DEMO_CONTENT`, `NEXT_PUBLIC_SITE_URL`. Lo que depende de claves
(Stripe, alta de staff, TicketBAI) se desactiva solo y lo explica en pantalla si faltan.

Procedencia del contenido (`ContentState`): `real` (Supabase) → `demo` (solo con
`SHOW_DEMO_CONTENT=true`, siempre con distintivo) → `empty` (estados vacíos diseñados). JSON-LD
`Menu` y `Event` solo con datos reales y fuera del modo demo.

## 4. Decisiones y desviaciones respecto a Palomita-Bar

| Decisión | Motivo |
|---|---|
| **Next 15.5.27 / React 19.0.8** (Palomita: 15.1.9 / 19.0.3) | Next 15.1.9 tiene vulnerabilidades **críticas** (RCE en imágenes AVIF, bypass de middleware…). 15.5.27 es la última 15.x, misma API. **Palomita y Bar La Osa deberían actualizarse.** |
| `@supabase/ssr` 0.12.4 (no 0.12.7) | 0.12.7 exige `supabase-js` ≥ 2.114. |
| Schema propio `laofi` con las tablas de Palomita replicadas | Datos de cada proyecto en tablas distintas, sin posibilidad de cruce. Ver §1. |
| Sin Framer Motion; GSAP, Lenis y three bajo demanda | Lighthouse móvil ≥ 90 en home y carta. |
| Vídeos ambientales abstractos generados | No hay vídeo real del local. Solo bruma, brasas y vapor, nunca imitando el restaurante; marcados `generado` en `lib/media.ts` e `IMAGES_SOURCES.md`. |
| Un solo precio por producto | Sin precios por tamaño ni por franja hasta que el restaurante lo pida. |
| Nutrición solo si la aporta el restaurante | `nutricion_fuente` obligatoria; sin ella la web no la muestra. |
| Staff por roles (admin / encargado / camarero / cocina) | El rol de plataforma sigue siendo `gestion`; el rol fino vive en `laofi.staff` y lo comprueba Postgres. |
| TicketBAI en andamiaje y apagado | Faltan certificado, firma XAdES y envío a Batuz; no se emite nada fiscal sin ello. |
| Fidelización y reseñas apagadas | Requieren decisión del restaurante y textos de privacidad. |
| Revalidación por rutas concretas tras editar en `/admin` | `revalidatePath` con `dynamicParams = false` en el layout daba 404; se quitó esa opción. |
| Vitest + PGlite | `npm test` cubre utilidades, migraciones y seguridad sin Docker. |

## 5. Pendiente para producción

1. Confirmar y aplicar las cuatro migraciones nuevas (ver §2) y revisar los advisors.
2. Variables en Vercel: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   (webhook en `/api/stripe/webhook`).
3. Dar de alta al staff desde `/admin/staff` (o el dashboard de Supabase) y crear mesas y QR.
4. Contenido real del restaurante: ver `CONTENT_NEEDED.md`.
5. TicketBAI: ver `src/lib/ticketbai/README.md`.

## 6. Candidatos a paquete compartido de LocalIA

Copiados o adaptados de Palomita y que deberían vivir en un paquete común (p. ej.
`@localia/restaurant`) para no mantener N copias:

| Pieza | Aquí | Notas |
|---|---|---|
| `useDialogA11y` | `src/hooks/useDialogA11y.ts` | Copia de Palomita (+ genérico de tipo). |
| Cliente Supabase server-side + patrón RPC por `site_key` | `src/lib/supabase/client.ts`, `src/lib/restaurant/queries.ts` | Palomita lanza error si falta la env; aquí devuelve `null` (mejor para builds sin Supabase). |
| Tipos de la web | `src/lib/restaurant/types.ts` | Debería generarse con `supabase gen types --schema laofi`. |
| Horario (agrupación, schema.org) | `src/lib/horario.ts` | Lee `laofi.horario`; la agrupación y el JSON-LD son genéricos. |
| Alérgenos UE (14, iconos, normalización) | `src/lib/allergens.ts`, `components/menu/Allergen*` | Palomita solo muestra texto libre: sería una mejora para todos los tenants. |
| JSON-LD (Restaurant, Menu, Event) | `src/lib/restaurant/jsonld.ts` | Palomita tiene `menu-jsonld.ts` equivalente. |
| Carta navegable + filtro de alérgenos | `components/menu/CartaView.tsx` | Adaptado de `CategoryMenu` de Palomita. |
| Menú del día y eventos | `components/menu/MenuDelDia.tsx`, `components/eventos/EventCard.tsx`, migraciones | Componentes genéricos; las tablas se replicarían por schema en cada proyecto. |
| Utilidades de formato | `src/lib/format.ts` | `formatCentimos`, teléfonos, fechas en Europe/Madrid. |
| Stub de plataforma + tests PGlite | `supabase/tests/` | Permitiría probar migraciones de cualquier tenant sin Docker. |

## 7. Seguridad

- Sin secretos en el repo; `.env*` ignorado salvo `.env.example`. `service_role` solo en rutas de servidor (Stripe, TicketBAI, alta de staff), nunca en el navegador.
- Cabeceras: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`;
  `poweredByHeader: false`.
- JSON-LD escapado (`<` → `<`).
- **Hallazgo preexistente (no corregido, fuera de alcance):** `restaurant.categorias_backup_20260816` y
  `restaurant.productos_backup_20260816` tienen **RLS desactivado**. `anon` no tiene `USAGE` sobre el
  schema `restaurant`, pero `authenticated` sí, así que cualquier usuario autenticado de cualquier
  tenant podría leerlas o modificarlas. Propuesta (a decidir por LocalIA):
  `alter table restaurant.categorias_backup_20260816 enable row level security;` (ídem productos), o
  borrarlas si ya no hacen falta.
