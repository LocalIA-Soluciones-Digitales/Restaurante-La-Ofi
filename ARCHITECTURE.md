# Restaurante La Ofi — Arquitectura

Estado (2026-10-01): **V1 demo en producción** (https://restaurante-la-ofi.vercel.app). Web pública
completa. Carta y horario se leen de Supabase (schema propio `laofi`, **aplicado**); menú del día y
eventos también, con caída a contenido de referencia marcado mientras no haya registros. Pedidos
desde mesa, Stripe, reservas online y `/admin` están **preparados**, sin lógica completa.

---

## 1. Cómo encaja La Ofi en LocalIA

La Ofi es un tenant del proyecto Supabase compartido de LocalIA (`ukhfaphloxlszomccgde`), pero con
**todas sus tablas en un schema propio, `laofi`**: ningún dato suyo vive en tablas compartidas con
otros proyectos (Palomita y Bar La Osa comparten `restaurant`; Amway, hostelería, báscula… usan
tablas con prefijo en `public`). Lo único común es el registro de tenants de la plataforma:

```
public.clientes            fila "restaurante-la-ofi": site_key pública, estado (activo/pausado)
public.usuarios_negocio    staff de La Ofi → cliente_id (para el futuro /admin)
public.is_developer() …    helpers de plataforma (LocalIA ve todos los tenants)

laofi.*                    ← SOLO datos de La Ofi
  ├─ categorias, productos      carta (alérgenos como claves UE validadas por CHECK)
  ├─ menus_dia, menu_dia_platos menú / plato del día (único por fecha)
  ├─ eventos                    con borradores (publicado = false)
  └─ horario                    7 filas: abierto / cerrado / consultar
public.laofi_get_*         RPC de lectura pública (única puerta de entrada para anon)
```

Barreras de aislamiento (todas verificadas con tests y en producción):

1. **anon no tiene `USAGE` sobre `laofi`**: no puede leer ni escribir ninguna tabla, ni siquiera
   resolver sus nombres. Solo puede ejecutar las RPC `public.laofi_get_*`.
2. **Cada RPC exige la site_key de La Ofi** (`laofi.site_key_valida`: la site_key debe ser la de La
   Ofi y el tenant estar activo). Con la de Palomita u otra cualquiera devuelven vacío.
3. **RLS en las 6 tablas**: `authenticated` solo pasa si `laofi.es_gestor()` (LocalIA o un usuario
   de `usuarios_negocio` vinculado a La Ofi). El staff de otro proyecto no ve ni escribe nada.
4. **Sin `cliente_id` en las tablas**: al ser un schema de un único tenant no hay columnas de tenant
   que filtrar ni que olvidar filtrar (el fallo real que tuvo Palomita en §12 no puede darse aquí).
5. La web lee solo **en servidor** (Server Components + ISR 5 min) con la clave publishable; la
   site_key va en `LAOFI_SITE_KEY` (secreta en Vercel, nunca llega al navegador). `service_role` no
   se usa.

## 2. Modelo de datos (`supabase/migrations/`, aplicado el 2026-10-01)

| Migración | Contenido |
|---|---|
| `20261001150000_laofi_schema.sql` | Schema `laofi`, helpers (`cliente_id`, `es_gestor`, `site_key_valida`, `alergenos_validos`), 6 tablas con CHECKs (slugs, precios ≥ 0, estados, `https://` en enlaces, horas obligatorias si abierto, solo los 14 alérgenos UE), índices (carta por categoría+orden, platos por menú, eventos publicados por fecha), triggers `updated_at` con la función compartida `public.set_updated_at()`, RLS y permisos. |
| `20261001150100_laofi_rpc_publicas.sql` | `laofi_get_carta` (categorías con productos en una sola llamada), `laofi_get_menu_dia`, `laofi_get_eventos`, `laofi_get_evento`, `laofi_get_horario`. SECURITY DEFINER con `search_path` fijo, solo lectura, sin campos internos; un evento pasado se devuelve como `finalizado`. |

- **Aditivas**: no modifican ningún objeto existente de otros proyectos.
- **Reversión**: `supabase/rollback/20261001150000_laofi.down.sql` elimina el schema y las RPC; la fila
  de `public.clientes` se conserva.
- **Seeds** (aplicados): `la_ofi_tenant.sql` (alta en `public.clientes`) y
  `la_ofi_contenido_publicado.sql` (carta y horario publicados en internet, cada sección con su
  procedencia en `descripcion`; alérgenos vacíos a propósito). Ambos idempotentes.
- **Tests**: `npm test` reproduce el núcleo de la plataforma en PGlite (`supabase/tests/`) y verifica
  seeds, RPC, aislamiento con site_key ajena, RLS (anon / staff propio / staff de otro tenant /
  LocalIA), validaciones y reversión (22 tests de base de datos).
- **Advisors** tras aplicar: sin avisos nuevos de seguridad salvo el aviso esperado "SECURITY DEFINER
  ejecutable por anon" de las RPC públicas (mismo diseño que Palomita); en rendimiento, solo "índice
  aún no usado" en tablas vacías.

Menú del día: `tipo` admite `plato` (plato del día a elegir, el formato de La Ofi) además de
primero/segundo/postre. Horario: si `laofi.horario` estuviera vacío, la web usa el publicado en
Google (`HORARIO_INTERNET` en `src/lib/horario.ts`).

## 3. Frontend

```
app/
  (site)/[locale]/            raíz pública con idioma (es; eu preparado y desactivado)
    page.tsx                  home (hero, La Ofi, momentos, menú de hoy, tostadas, carta, eventos, galería, ubicación)
    carta/ menu-del-dia/ eventos/ eventos/[slug]/ galeria/ contacto/
    aviso-legal/ privacidad/ cookies/
    pedir/ reservar/          preparados (noindex)
    [...rest]/ not-found.tsx  404 con el diseño del sitio
  (internal)/admin/           raíz independiente, preparada (noindex)
  robots.ts sitemap.ts manifest.ts icon.svg apple-icon.png
middleware.ts                 /x → /es/x (conserva la query de los QR); /eu → /es mientras esté desactivado
src/
  lib/restaurant/             types, queries (RPC), content (real → ejemplo → vacío), demo-content, jsonld
  lib/                        env (flags), site (datos verificados), seo, i18n, allergens, horario, images, format
  components/                 layout, home, menu, eventos, gallery, map, media, legal, ui
supabase/                     migrations, rollback, seed, tests
```

Flags (`src/lib/env.ts`): `NEXT_PUBLIC_IS_DEMO` (por defecto **true**: un despliegue sin configurar
nunca se indexa), `NEXT_PUBLIC_SHOW_DEMO_CONTENT`, `NEXT_PUBLIC_SITE_URL`.

Procedencia del contenido (`ContentState`): `real` (Supabase) → `demo` (solo con
`SHOW_DEMO_CONTENT=true`, siempre con distintivo "Ejemplo" / "Según Instagram" / "Según prensa") →
`empty` (estados vacíos diseñados). JSON-LD `Menu` y `Event` solo se emiten con datos reales y fuera
del modo demo; `Restaurant` solo fuera del modo demo.

## 4. Decisiones y desviaciones respecto a Palomita-Bar

| Decisión | Motivo |
|---|---|
| **Next 15.5.27 / React 19.0.8** (Palomita: 15.1.9 / 19.0.3) | `npm audit` marca Next 15.1.9 con vulnerabilidades **críticas** (RCE en la optimización de imágenes con AVIF, bypass de middleware, envenenamiento de caché, etc.). 15.5.27 es la última 15.x, misma API. **Palomita y Bar La Osa están afectados: conviene actualizarlos.** Queda un aviso moderado/alto por el PostCSS empaquetado dentro de Next (solo build, sobre CSS propio), que solo se corrige en Next 16. |
| Sin `three`, `qrcode`, `stripe`, `@supabase/ssr` | No se usan en V1. Se añadirán con `/admin`, QR de mesas y pagos. |
| Sin Framer Motion | Animaciones con CSS: *scroll-driven animations* (`animation-timeline: view()`) como mejora progresiva, Ken Burns en escritorio y transición de cabecera con un listener mínimo. Cero JS de animación. Respeta `prefers-reduced-motion`. |
| Schema propio `laofi` (Palomita y La Osa comparten `restaurant`) | Petición de LocalIA: datos de cada proyecto en tablas distintas, sin posibilidad de cruce. Ver §1. |
| Vitest + PGlite | Palomita no tiene tests ejecutables; aquí `npm test` cubre utilidades y migraciones. |
| `experimental.inlineCss` + `content-visibility: auto` en secciones bajo el pliegue | Necesario para Lighthouse móvil ≥ 90 (el cuello de botella era style/layout, no JS). |
| ESLint con `ignores` (`.next`, `next-env.d.ts`) | La config de Palomita analiza `.next/` con ESLint 9. |
| Mapa estático OSM + Google Maps solo bajo demanda | Sin cookies de terceros sin consentimiento. |

## 5. Fases siguientes (sin rehacer nada)

Todas añaden tablas al schema `laofi` y RPC `laofi_*`, con las mismas barreras de §1.

**Pedido desde mesa (`/es/pedir?mesa=<id>`).** Crear `laofi.mesas`, `laofi.pedidos` y
`laofi.pedido_items` (estados de cocina y validación de precio contra `laofi.productos` en la RPC),
y portar de Palomita `CartProvider`, `PedirExperience`, `CartDrawer` y `/pedido/[id]`.

**Stripe.** Mismo flujo que Palomita §10: crear el pedido → `POST /api/stripe/checkout` → confirmación
solo por webhook, con la RPC de marcar pagado ejecutable únicamente por `service_role`.

**Reservas.** `laofi.reservas` + RPC `laofi_crear_reserva` (con límite de tasa). Tipo `ReservaInput`
preparado; hoy `/reservar` deriva al teléfono.

**`/admin`.** Supabase Auth + `usuarios_negocio` (rol `gestion`) con el `cliente_id` de La Ofi. La
RLS (`laofi.es_gestor()`) ya permite al staff editar carta, precios, fotos, disponibilidad, menú del
día, eventos y horario directamente sobre las tablas de `laofi`.

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

- Sin secretos en el repo; `.env*` ignorado salvo `.env.example`. En V1 no se usa `service_role`.
- Cabeceras: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`;
  `poweredByHeader: false`.
- JSON-LD escapado (`<` → `<`).
- **Hallazgo preexistente (no corregido, fuera de alcance):** `restaurant.categorias_backup_20260816` y
  `restaurant.productos_backup_20260816` tienen **RLS desactivado**. `anon` no tiene `USAGE` sobre el
  schema `restaurant`, pero `authenticated` sí, así que cualquier usuario autenticado de cualquier
  tenant podría leerlas o modificarlas. Propuesta (a decidir por LocalIA):
  `alter table restaurant.categorias_backup_20260816 enable row level security;` (ídem productos), o
  borrarlas si ya no hacen falta.
