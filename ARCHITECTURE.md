# Restaurante La Ofi — Arquitectura

Estado (2026-10-01): **V1 demo**. Web pública completa; carta, menú del día y eventos leen de
Supabase con caída a contenido de ejemplo marcado o a estados vacíos. Pedidos desde mesa, Stripe,
reservas online y `/admin` están **preparados** (rutas, tipos y modelo de datos), sin lógica completa.
Migraciones escritas y probadas en local, **sin aplicar** en el Supabase compartido.

---

## 1. Cómo encaja La Ofi en LocalIA

La Ofi es **un tenant más** de la plataforma multi-tenant de LocalIA (proyecto Supabase compartido
`ukhfaphloxlszomccgde`), en el mismo vertical `restaurant` que Palomita-Bar y Bar La Osa. No hay base
de datos ni mecanismo de tenants nuevos:

```
public.clientes (tenant)  ←─ cliente_id ─┐
  · site_key (pública)                    │
  · estado = 'activo'                     │
public.usuarios_negocio (staff → tenant)  │
public.settings (key 'horario', …)        │
                                          │
restaurant.*  (schema del vertical, compartido por todos los bares/restaurantes)
  ├─ categorias, productos              ← carta (existente, reutilizada tal cual)
  ├─ mesas, pedidos, pedido_items, …    ← pedido en mesa (existente, fase siguiente)
  ├─ reservas, zonas, …                 ← reservas (existente, fase siguiente)
  ├─ menus_dia, menu_dia_platos         ← NUEVO (genérico, cualquier restaurante)
  └─ eventos                            ← NUEVO (genérico, cualquier restaurante)
```

Reglas que se mantienen exactamente igual que en Palomita (ver su `ARCHITECTURE.md` §3–4):

- **Lectura pública** solo vía RPC `SECURITY DEFINER` en `public` que reciben `p_site_key` y resuelven
  el tenant en Postgres con `cliente_id_from_site_key()` (que exige `estado = 'activo'`). El
  navegador nunca envía un `cliente_id` ni hace `SELECT` directo: `anon` no tiene `USAGE` sobre el
  schema `restaurant`.
- **Escritura de staff** (futuro `/admin`): RLS `is_developer() OR cliente_id = mi_cliente_id()` para
  `authenticated`, más `p_cliente_id` explícito en las RPC de admin (hallazgo de seguridad de
  Palomita §12: `is_developer()` ve todos los tenants).
- **service_role** solo en servidor (`import "server-only"`), y en V1 no se usa en ningún punto.

En V1 toda la lectura se hace **en servidor** (Server Components + ISR de 5 min): la clave anon ni
siquiera llega al navegador.

## 2. Modelo de datos nuevo (`supabase/migrations/`)

| Migración | Contenido |
|---|---|
| `20261001100000_restaurant_menus_dia.sql` | `restaurant.menus_dia` (cliente_id, fecha, precio_centimos, bebida_incluida, pan_incluido, postre_o_cafe, notas, disponible; único por tenant y fecha) y `restaurant.menu_dia_platos` (tipo primero/segundo/postre, nombre, descripción, alérgenos `text[]`, orden). FK compuesta `(menu_id, cliente_id)`: un plato no puede colgar de un menú de otro tenant. RLS + `set_updated_at()` compartido. |
| `20261001100100_restaurant_eventos.sql` | `restaurant.eventos` (titulo, slug único por tenant, tipo, descripción, imagen_url, fecha, hora, precio_centimos, aforo, estado `proximo/agotado/finalizado/cancelado`, enlace_reserva `https://`, `publicado` para borradores). RLS. No reutiliza `public.reservas_eventos` (es de la pescadería: encargos con fecha de entrega). |
| `20261001100200_rpc_publicas_menu_eventos.sql` | `get_menu_dia_publico(site_key, fecha?)`, `get_eventos_publicos(site_key, incluir_pasados?)`, `get_evento_publico(site_key, slug)`. Devuelven JSON sin `cliente_id` ni campos internos; un evento pasado se devuelve como `finalizado`. Helper interno `restaurant.evento_publico_json` sin `EXECUTE` para anon/authenticated. |

- **Aditivas**: cero `ALTER`/`DROP` sobre objetos existentes; no afectan a ningún otro tenant.
- **Reversibles**: `supabase/rollback/*.down.sql` (ejecutar en orden inverso).
- **Seed separado**: `supabase/seed/la_ofi_tenant.sql` (solo la fila de `public.clientes`, idempotente)
  y, opcional, `la_ofi_carta_publicada.sql` (carta publicada en internet: tostadas de
  Instagram y "Para picotear" de una foto de la carta, sin alérgenos inventados; ejecutar cuando el
  propietario la confirme).
- **Probadas** sin Docker ni coste con **PGlite** (Postgres real en WASM): `npm test` levanta una
  réplica mínima del núcleo de la plataforma (`supabase/tests/platform-stub.sql`, funciones copiadas
  literalmente de producción) y verifica aislamiento entre tenants, RLS (anon / staff del tenant /
  usuario sin tenant), borradores, validaciones, idempotencia de seeds y reversión limpia (18 tests de base de datos, 30 en total).

Alérgenos: se reutiliza el `text[]` existente de `restaurant.productos` con los nombres en castellano
que ya usa la base (`gluten`, `crustáceos`, `frutos de cáscara`…). `src/lib/allergens.ts` los
normaliza a las 14 claves del Reglamento UE 1169/2011. No hace falta cambiar el esquema.

Horario: mismo formato que Palomita (`public.settings`, key `horario`, valor `hjson:[…7 días…]`,
leído con la RPC existente `get_horario_publico`). Si no hay valor en Supabase se usa el publicado en
Google (`HORARIO_INTERNET` en `src/lib/horario.ts`), con los días dudosos como "Consultar".

Menú del día: además de primeros/segundos/postres, `menu_dia_platos.tipo` admite `plato` para el
formato "plato del día a elegir" que usa La Ofi.

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
| Vitest + PGlite | Palomita no tiene tests ejecutables; aquí `npm test` cubre utilidades y migraciones. |
| `experimental.inlineCss` + `content-visibility: auto` en secciones bajo el pliegue | Necesario para Lighthouse móvil ≥ 90 (el cuello de botella era style/layout, no JS). |
| ESLint con `ignores` (`.next`, `next-env.d.ts`) | La config de Palomita analiza `.next/` con ESLint 9. |
| Mapa estático OSM + Google Maps solo bajo demanda | Sin cookies de terceros sin consentimiento. |

## 5. Fases siguientes (sin rehacer nada)

**Pedido desde mesa (`/es/pedir?mesa=<id>`).** La ruta ya valida la mesa con la RPC existente
`validar_mesa`. Falta portar de Palomita `CartProvider`, `PedirExperience`, `CartDrawer`,
`TableSessionProvider`, `TableEntry` y `/pedido/[id]`, y llamar a `crear_pedido_restaurant`. Las
tablas (`restaurant.mesas`, `pedidos`, `pedido_items`, `mesa_sesiones`…) ya existen; La Ofi solo
necesita dar de alta sus mesas.

**Stripe.** Mismo flujo que Palomita §10: crear el pedido → `POST /api/stripe/checkout` → confirmación
solo por webhook (`marcar_pedido_pagado`, ejecutable solo por `service_role`). Variables ya
documentadas en `.env.example`.

**Reservas.** RPC compartida `crear_reserva_publica` (`restaurant.reservas`). Tipo `ReservaInput`
preparado; hoy `/reservar` deriva al teléfono.

**`/admin`.** Supabase Auth + `usuarios_negocio` (rol `gestion`) + RPC de admin con `p_cliente_id`.
El modelo ya cubre: menú del día (`menus_dia`/`menu_dia_platos`), carta, precios, fotos y
disponibilidad (`productos`), eventos (con borradores), reservas, pedidos y horario (`settings`).

## 6. Candidatos a paquete compartido de LocalIA

Copiados o adaptados de Palomita y que deberían vivir en un paquete común (p. ej.
`@localia/restaurant`) para no mantener N copias:

| Pieza | Aquí | Notas |
|---|---|---|
| `useDialogA11y` | `src/hooks/useDialogA11y.ts` | Copia de Palomita (+ genérico de tipo). |
| Cliente Supabase server-side + patrón RPC por `site_key` | `src/lib/supabase/client.ts`, `src/lib/restaurant/queries.ts` | Palomita lanza error si falta la env; aquí devuelve `null` (mejor para builds sin Supabase). |
| Tipos del vertical restaurant | `src/lib/restaurant/types.ts` | Debería generarse con `supabase gen types`. |
| Formato y parseo de horario | `src/lib/horario.ts` | Compatible con `hjson:` de Palomita. |
| Alérgenos UE (14, iconos, normalización) | `src/lib/allergens.ts`, `components/menu/Allergen*` | Palomita solo muestra texto libre: sería una mejora para todos los tenants. |
| JSON-LD (Restaurant, Menu, Event) | `src/lib/restaurant/jsonld.ts` | Palomita tiene `menu-jsonld.ts` equivalente. |
| Carta navegable + filtro de alérgenos | `components/menu/CartaView.tsx` | Adaptado de `CategoryMenu` de Palomita. |
| Menú del día y eventos | `components/menu/MenuDelDia.tsx`, `components/eventos/EventCard.tsx`, migraciones | Nuevos y genéricos: reutilizables por Palomita, La Osa, etc. |
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
