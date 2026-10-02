# Rediseño La Ofi — Fase 1: auditoría y plan

Fecha: 2026-10-01. Sin código. Base: `PROMPT_REDISENO.md`. Pendiente de OK antes de la Fase 2.

---

## 1. Estado actual

### La Ofi (este repo)
- Next 15.5.27 · React 19.0.8 · Tailwind 3.4 · Supabase · Vitest + PGlite. Sin librerías de animación.
- `typecheck`, `lint` y `npm test` (33 tests) **en verde** a fecha de hoy.
- Lighthouse móvil (informes en `lighthouse-reports/`): home 93–94 (LCP 2,7–3,1 s), carta 96,
  menú del día 95. Accesibilidad 98–100. **Margen escaso**: la home ya roza el 90 sin JS de animación.
- **Trabajo sin commitear**: la migración de `restaurant.*` a schema propio `laofi`
  (`20261001150000_laofi_schema.sql`, `20261001150100_laofi_rpc_publicas.sql`, rollback, tests,
  `queries.ts`/`types.ts`/`content.ts`/`horario.ts`, seed renombrado). Las 3 migraciones antiguas
  de `restaurant` están borradas en el índice. `README.md` y `ARCHITECTURE.md` §1–2, §5 siguen
  describiendo `restaurant.*`.
- Supabase compartido: el schema `laofi` **no está aplicado** (comprobado en solo lectura).
- `laofi` es **mono-tenant** (sin `cliente_id` en las tablas; RLS `laofi.es_gestor()`). Esto
  simplifica el port: todas las RPC de Palomita con `p_cliente_id` se reducen a comprobar
  `es_gestor()`, y desaparece el hallazgo de seguridad de Palomita §12 (no hay otros tenants
  en `laofi`).
- Contenido real disponible: 6 fotos oficiales (tostadas, salón), 6 de terceros a sustituir,
  ~850×650 px como mucho. **Ningún vídeo.** Sin logo vectorial. Sin carta completa con precios ni
  alérgenos. Sin datos nutricionales.

### Palomita (lógica a portar)
- Next 15.1.9 / React 19.0.3 (vulnerable, ver `ARCHITECTURE.md` §4 de La Ofi).
- ~16.500 líneas en componentes/lib relevantes. Las piezas grandes: `SalonBoard` (1.537),
  `Floorplan3D` (1.418), `admin-queries` (625), `ReservasBoard` (611), `ProductosGestion` (546),
  `CartDrawer` (542), `ProductDetailModal` (533), `CategoryMenu` (466), `KitchenBoard` (442),
  `InformeProfesional` (422).
- **El esquema `restaurant.*` no está en migraciones**: se aplicó por MCP y en el repo solo hay
  scripts sueltos. En la base hay 21 tablas y ~80 funciones (≈71.000 caracteres de SQL) que
  habrá que reconstruir como migraciones de `laofi` a partir de `pg_get_functiondef` (lectura).
- **Macros de Palomita inventados**: `carta_ingredientes_macros_2026-08-19.sql` rellena
  calorías y macros "genéricos, no son análisis de laboratorio". Choca con la regla 1: se porta
  la UI (donut, reparto %), **no** el enfoque de datos.
- `Floorplan3D` está modelado a mano para el local de Palomita (barra en L, botelleros, toldo
  granate…). Para La Ofi hay que hacerlo **dirigido por datos** (zonas y mobiliario desde el
  editor del plano), no copiarlo.
- Precios por zona (barra/salón/terraza) ya existen en Palomita: pregunta abierta para La Ofi.

### Amway (lenguaje visual)
- GSAP 3 + ScrollTrigger, Lenis 1.3, Framer Motion 13, R3F. `SmoothScroll` se monta **global en
  el layout** y los componentes importan GSAP de forma estática. Aquí no se puede copiar así sin
  perder el ≥ 90 en móvil: se copia la lógica, no el modo de carga.

### Seguridad (preexistente, no de este proyecto)
`restaurant.categorias_backup_20260816` y `restaurant.productos_backup_20260816` siguen con
**RLS desactivado** (el advisor de Supabase lo marca crítico). No lo toco; SQL propuesto:
```sql
alter table restaurant.categorias_backup_20260816 enable row level security;
alter table restaurant.productos_backup_20260816 enable row level security;
-- o, si ya no hacen falta: drop table … (decisión de LocalIA)
```

---

## 2. Fase 0 (previa, propuesta)

Cerrar el trabajo pendiente antes de empezar: revisar y commitear la migración a `laofi`, y
actualizar `ARCHITECTURE.md` §1–2/§5 y `README.md` (Supabase) para que describan `laofi`. Un commit.

---

## 3. Componentes

### Nuevos (motion y media, Fase 2)
| Componente | Origen | Notas |
|---|---|---|
| `lib/motion/gsap.ts` | Amway `lib/gsap.ts` | Import **dinámico** (`await import("gsap")`), registro de ScrollTrigger una vez. |
| `SmoothScroll` | Amway | Solo escritorio (`pointer: fine`), sin `prefers-reduced-motion`, cargado tras `requestIdleCallback`. Fuera de `/carta`, `/pedir` y `/admin`. |
| `usePlayWhenVisible` | Amway | Igual + respeta `saveData` y conexión lenta. |
| `useReducedMotion`, `useHydrated` | nuevo | |
| `VideoHero` | Amway `Hero` + `HeroVideo` actual | Póster `next/image priority` = LCP; vídeo `preload="none"` que arranca tras `load`. 720p/1080p por `<source media>`. Franja horaria (mañana/mediodía/noche) en cliente para no romper ISR. Sin vídeo → Ken Burns. |
| `WordReveal` | Amway | Primer render ya visible (sin JS el titular se lee); la animación es mejora. |
| `ScrollStory` | `EnergyScrollStory` | Escritorio fijado; móvil = capítulos apilados con `animation-timeline: view()` (sin GSAP). |
| `VideoMoment` | `EnergyVideoMoment` | Sin Framer: el vídeo solo se descarga al pulsar. |
| `Marquee` | nuevo, CSS puro | Pausa con hover y reduced-motion. |
| `NeonText`, `HexPattern`, `Grain` | nuevo | CSS/SVG, sin imágenes. |
| `DragCarousel` | nuevo | `scroll-snap` nativo + arrastre con puntero; sin librería. |

### A portar de Palomita
| Fase | Piezas | Adaptación |
|---|---|---|
| 4 Carta | `CategoryMenu`, `ProductDetailModal`, `menu-jsonld` | Unificar con `CartaView`/`allergens.ts` actuales; filtros nuevos (momento, brasa, vegetariano, sin gluten); nutrición solo si existe. |
| 5 Pedido | `cart-context`, `CartBar`, `CartDrawer`, `PedirExperience`, `table-session-context`, `TableEntry`, `CuentaMesaDrawer`, `SessionNotifications`, `ActiveOrderBanner`, `PedidoStatus`, `/pedido/[id]`, `split.ts`, `haptics.ts`, rutas `/api/stripe/*`, `stripe/server.ts`, `supabase/service-role.ts` | RPC `public.laofi_*`; recogida por franja y pedido de grupo son **nuevos** (Palomita no los tiene). |
| 6 Admin | `admin/login`, layout protegido, `AdminNav`, `SalonBoard`, `MesasGestion`, `MesaMultiSelect`, `BloqueoMesaModal`, `Floorplan3D` (reescrito por datos), `BarraPOS`, `ProductGridPicker`, `PedidoRapidoForm`, `KitchenBoard`, `CocinaTabs`, `HistorialPedidos`, `print/ticket.ts`, `notify-sound.ts`, `print-bridge/` | `@supabase/ssr` en middleware solo para `/admin`; PWA (manifest propio de `/admin`). |
| 7 Gestión | `ProductosGestion`, `CategoriasGestion`, `CartaTabs`, `HorarioGestion`, `ReservasBoard`, `ReservasTimeline`, `ReservaModal`, `VentasCharts`, `InformeProfesional`, `export-csv.ts`, `CamarerosGestion`, `ticketbai/*`, fidelización y reseñas (apagadas) | Menú del día y eventos: editores **nuevos** (Palomita no los tiene). Cierre de caja: **nuevo**. |

### No se portan
Home de Palomita, `ThemeToggle`, `useScrollReveal` (sustituido), el SQL de macros genéricos, la
geometría fija de `Floorplan3D`, `cocteleria`.

---

## 4. Cambios de esquema (`laofi`, todo aditivo, con rollback y PGlite)

| Migración | Contenido |
|---|---|
| `…_laofi_carta_extendida` | `productos`: `ingredientes text[]`, `calorias`, `proteinas_g`, `carbohidratos_g`, `grasas_g`, `nutricion_fuente` (`restaurante`/`ejemplo`, null = sin dato), `imagenes text[]`, `video_url`, `etiquetas text[]` (check contra lista cerrada), `momento text[]` (desayuno/mediodia/tarde), `estacion` (cocina/barra), `maridaje`, `iva_pct`. `modificadores` + `modificador_opciones` (min/max, suplemento). Las columnas `disponible`, `destacado`, `orden` ya existen. RPC `laofi_get_carta` ampliada. |
| `…_laofi_mesas` | `zonas` (barra, comedor, El Despacho, terraza; geometría del plano), `mesas` (zona, capacidad, posición, token QR regenerable, estado, grupo de unión), `mesa_bloqueos`. |
| `…_laofi_pedidos` | `pedidos` (mesa / recogida / barra, franja de recogida, estado, pago), `pedido_items` (estado por estación, modificadores jsonb, notas), `pedido_estado_historial` + triggers de transición, `pagos`, `mesa_sesiones`, `sesion_participantes`, `pedido_item_repartos`, `avisos_camarero`, `grupos_pedido` (enlace compartido), `franjas_recogida` (capacidad). Publicación Realtime (aditiva). |
| `…_laofi_staff` | `staff` (user_id → rol `admin/encargado/camarero/cocina`), `laofi.tiene_rol()`; `es_gestor()` sigue igual. |
| `…_laofi_reservas` | `reservas`, `reserva_mesas`, espacio (`despacho`, evento). |
| `…_laofi_caja` | `cierres_caja` (arqueo: efectivo contado, esperado, descuadre, usuario), descuentos/invitaciones en `pedido_items`. |
| `…_laofi_ticketbai` | `ticketbai_facturas` (serie propia, encadenamiento), RPC solo `service_role`. |
| `…_laofi_fidelizacion` | `comensales`, `reglas_promocion`, `premios_otorgados` (apagado por flag). |
| RPC | Públicas `public.laofi_*` con `p_site_key` (`SECURITY DEFINER`, revocadas explícitamente de lo que no toque); admin `public.laofi_admin_*` `SECURITY INVOKER` + `es_gestor()`/`tiene_rol()`; `laofi_marcar_*_pagado` solo `service_role` (revoke explícito de `anon` y `authenticated`, lección de Palomita §16.3). |

Tests PGlite por migración: aislamiento anon, roles, transiciones de estado, reparto que cuadra con
el subtotal, precios recalculados en servidor, idempotencia, rollback limpio. No se aplica nada en
el Supabase compartido sin tu confirmación; aplicación en rama de Supabase primero.

---

## 5. Presupuesto de rendimiento

Objetivo: Lighthouse móvil ≥ 90 en home y carta (hoy 93–94 / 96).

| Recurso | Presupuesto | Cómo |
|---|---|---|
| JS inicial home (gz) | ≤ +25 KB sobre el actual | GSAP (~28 KB) y ScrollTrigger (~18 KB) solo tras `load`/idle y solo si la sección está cerca del viewport; en móvil la scroll story no usa GSAP. |
| Lenis | 0 KB en móvil | Solo `pointer: fine` y sin reduced-motion. |
| Framer Motion | 0 KB en web pública | No hace falta: CSS + GSAP. Si se usa, solo en `/admin`. |
| three / R3F | 0 KB fuera de `/admin/salon` | `dynamic(() => import(...), { ssr: false })`. |
| LCP | ≤ 2,5 s móvil | El LCP es el póster WebP/AVIF (≤ 120 KB a 720 px), nunca el vídeo. |
| Vídeo hero | 720p ≤ 2,5 MB · 1080p ≤ 6 MB | `preload="none"`, arranca tras `load`; `saveData` → solo póster. |
| CLS | ≤ 0,05 | Alturas reservadas en vídeos y carrusel. |
| TBT | ≤ 200 ms | Sin hidratación pesada: secciones de servidor, islas cliente pequeñas. |

Cada fase pública termina con Lighthouse móvil en home y carta; si baja de 90 se corrige antes del
commit.

---

## 6. Riesgos y bloqueos

1. **No hay vídeo real ni fotos a resolución de hero.** El "Un día en La Ofi" saldrá con las fotos
   actuales (≤ 858 px) en Ken Burns hasta grabar (§6 del prompt). A pantalla completa en escritorio
   se verán blandas. Lo ambiental generado por IA es posible, pero el MCP de Higgsfield da error
   502 en esta sesión.
2. **Sin carta real**: carta interactiva, TPV y KDS funcionarán con datos de ejemplo marcados.
3. **Sin plano del local**: el plano 2D/3D necesita medidas o un croquis de las 4 zonas.
4. **Volumen**: las fases 5–7 son el grueso (~80 funciones SQL a reconstruir y ~12.000 líneas de
   UI a adaptar). Cada fase se commitea por separado, pero es trabajo de varias sesiones.
5. **TicketBAI**: sin certificado, NIF ni registro de software, queda apagado (igual que Palomita).
6. **Stripe**: hace falta cuenta y webhook; sin eso funciona "pagar en barra".

---

## 7. Decisiones que necesito

1. ¿Commiteo primero la migración a `laofi` que está a medias (Fase 0)?
2. ¿Precios distintos en terraza/barra (como Palomita) o precio único?
3. Datos nutricionales: ¿solo cuando el restaurante los facilite (y si no, no se muestran)?
   Propuesta: columna `nutricion_fuente`, y en demo los de ejemplo con distintivo "Ejemplo".
4. ¿Framer Motion fuera de la web pública (propuesta) o lo quieres igualmente?
5. Pedido de recogida: ¿capacidad por franja (p. ej. 15 pedidos cada 15 min) y hora límite?
6. ¿Cuenta de LocalIA (`is_developer`) + cuentas de staff de La Ofi por rol, como en Palomita §11.1?
