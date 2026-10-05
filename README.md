# Restaurante La Ofi — Derio

Web de **Restaurante La Ofi** (Barrio de Arteaga 502, Parque Tecnológico de Bizkaia, Derio) y su
plataforma de carta, menú del día, eventos, pedidos (mesa por QR, recogida, grupos), reservas y
panel `/admin` preparado para TPV. Proyecto de
[LocalIA Soluciones Digitales](https://github.com/LocalIA-Soluciones-Digitales), tenant del Supabase
multi-tenant compartido con **todos sus datos en el schema propio `laofi`**.

> **Estado: DEMO** para enseñar al propietario. Indexación bloqueada, teléfono de pruebas e imágenes
> de terceros pendientes de sustituir. Todas las migraciones están aplicadas en Supabase. Ver [De demo a producción](#de-demo-a-producción).

Documentación: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`RESEARCH.md`](./RESEARCH.md) ·
[`IMAGES_SOURCES.md`](./IMAGES_SOURCES.md) · [`CONTENT_NEEDED.md`](./CONTENT_NEEDED.md) ·
[`PLAN_REDISENO.md`](./PLAN_REDISENO.md) · [`print-bridge/`](./print-bridge/README.md) ·
[`src/lib/ticketbai/`](./src/lib/ticketbai/README.md)

## Stack

- Next.js 15.5 (App Router) + React 19 + TypeScript estricto + Tailwind CSS 3.4
- Supabase (Postgres + RLS + Auth para el staff) — acceso solo por RPC (`src/lib/supabase/rpc.ts`)
- Stripe Checkout (confirmación por webhook), three/R3F solo en `/admin`. Sin librerías de animación en la web pública: CSS (scroll-driven) y transiciones
- Vitest + PGlite (tests de utilidades, migraciones y seguridad sin Docker)
- Vercel

Mismo stack que Palomita-Bar salvo Next 15.1.9 → 15.5.27 por seguridad (ver `ARCHITECTURE.md` §4).

## Requisitos

- Node.js 20 o superior (probado con Node 24) y npm 10+

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y revisa los valores
npm run dev                  # http://localhost:3000 → redirige a /es
```

Sin variables de Supabase la web funciona igual: muestra contenido de ejemplo (si
`NEXT_PUBLIC_SHOW_DEMO_CONTENT=true`) o estados vacíos.

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Sirve el build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm test` | Vitest: utilidades + migraciones de Supabase contra PGlite |
| `npm run dev:local` | Desarrollo con **backend local en memoria** (PGlite + todas las migraciones + datos de prueba): pedidos, `/admin`, TPV y cocina sin tocar el Supabase compartido. `/admin` entra sin login como staff de prueba. Los datos se pierden al reiniciar |

## Rutas

| Ruta | Estado |
|---|---|
| `/es` | Home: hero editorial con comida real (la foto cambia con la hora), «Hoy en La Ofi» (abierto, menú del día y precio, reservar, llegar), platos con foto, «Un día en La Ofi», brasa, local, empresas, galería y cómo llegar |
| `/es/carta` | Carta editorial (lista tipográfica, foto del plato al señalarlo): búsqueda y filtros tras «Buscar y filtrar», 14 alérgenos, nutrición (si la aporta el restaurante). En `/pedir`, tarjetas con cesta |
| `/es/pedir`, `/es/pedido/[id]` | Pedido en mesa por QR (cuenta compartida, "cada uno lo suyo"), recogida por franja, pedido de grupo; estado en vivo |
| `/es/reservar` | Reserva online si está activada en `/admin/configuracion`; si no, teléfono |
| `/es/espacios`, `/es/empresas` | Comedor, terraza y El Despacho; comidas de empresa |
| `/admin` | Panel por roles: Hoy (servicio en vivo en una pantalla: atender ya, pedidos en marcha, próximas reservas), Salón 2D/3D, TPV, Cocina y barra, Reservas, Menú del día, Carta, Eventos, Ventas, Caja, Mesas y QR, Equipo, Configuración |
| `/admin/manual` | Manual del equipo: un pedido de principio a fin (QR → cocina → sala → cobro → cierre) con capturas reales. También en [`docs/MANUAL_PEDIDOS.md`](./docs/MANUAL_PEDIDOS.md) |
| `/es/menu-del-dia` | Menú del día (Supabase) |
| `/es/eventos`, `/es/eventos/[slug]` | Eventos (Supabase) |
| `/es/galeria`, `/es/contacto` | Galería con lightbox; contacto y cómo llegar |
| `/es/aviso-legal`, `/es/privacidad`, `/es/cookies` | Legales (datos del titular pendientes) |
| `/api/stripe/*`, `/api/ticketbai/emitir` | Checkout y webhook; TicketBAI apagado (503) |

Cualquier ruta sin idioma redirige a `/es` conservando la query (los QR `/pedir?mesa=12` funcionan).
`/eu` está preparado y redirige a castellano hasta publicar una traducción revisada.

## Variables de entorno

Todas documentadas en [`.env.example`](./.env.example).

| Variable | Demo | Producción |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | URL de Vercel (`https://<proyecto>.vercel.app`) | Dominio final |
| `NEXT_PUBLIC_IS_DEMO` | `true` | `false` |
| `NEXT_PUBLIC_SHOW_DEMO_CONTENT` | `true` | `false` |
| `NEXT_PUBLIC_CONTACT_PHONE` | `628409781` (pruebas) | `946366479` (confirmar) |
| `NEXT_PUBLIC_WHATSAPP` | vacío | Si el negocio lo confirma |
| `NEXT_PUBLIC_SUPABASE_URL` | opcional | `https://ukhfaphloxlszomccgde.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | opcional | Clave anon/publishable (Supabase → Project Settings → API) |
| `LAOFI_SITE_KEY` (solo servidor, secreta) | opcional | `site_key` devuelto por el seed del tenant |

| `SUPABASE_SERVICE_ROLE_KEY` (secreta) | — | Pagos con Stripe y alta de staff desde el panel |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (secretas) | — | Pago online; sin ellas se paga en el local |
| `TICKETBAI_*` | — | Apagado hasta tener certificado (ver `src/lib/ticketbai/README.md`) |
| `LAOFI_PGLITE` | — | Solo desarrollo local (`npm run dev:local`). **Nunca** en Vercel |

**Nunca** pongas la `service_role` ni claves de Stripe en variables `NEXT_PUBLIC_*`.

## Despliegue en Vercel (paso a paso)

1. Vercel → **Add New… → Project → Import Git Repository** → `LocalIA-Soluciones-Digitales/Restaurante-La-Ofi`.
2. Framework: **Next.js** (autodetectado). Build `npm run build`, output por defecto. No hace falta `vercel.json`.
3. **Environment Variables** (Production y Preview), para la demo:
   ```
   NEXT_PUBLIC_SITE_URL=https://<nombre-del-proyecto>.vercel.app
   NEXT_PUBLIC_IS_DEMO=true
   NEXT_PUBLIC_SHOW_DEMO_CONTENT=true
   NEXT_PUBLIC_CONTACT_PHONE=628409781
   ```
   Las de Supabase se añaden cuando las migraciones estén aplicadas y el tenant dado de alta.
4. **Deploy**. Las variables `NEXT_PUBLIC_*` se incrustan en el build: tras cambiarlas, haz
   **Redeploy**.
5. Comprueba `https://<proyecto>.vercel.app/robots.txt` (debe decir `Disallow: /` en modo demo).

## Supabase

La Ofi usa el proyecto Supabase compartido de LocalIA, pero **todos sus datos están en un schema
propio, `laofi`**, sin tablas compartidas con otros proyectos. Detalle y barreras de aislamiento en
`ARCHITECTURE.md` §1–2.

- `supabase/migrations/` — schema `laofi` (tablas, RLS, índices) y RPC `laofi_*`, **todas aplicadas**
  (las dos primeras el 2026-10-01; carta extendida, salón y pedidos, admin/TPV, gestión y servicio
  de sala el 2026-10-02).
- `supabase/seed/la_ofi_tenant.sql` — alta en `public.clientes` (aplicado). Devuelve la `site_key`.
- `supabase/seed/la_ofi_contenido_publicado.sql` — carta y horario publicados en internet (aplicado).
- `supabase/seed/la_ofi_carta_enriquecida.sql` — opcional, requiere la carta extendida (no aplicado).
- `supabase/seed/la_ofi_salon_provisional.sql` — zonas y mesas provisionales según las fotos públicas (aplicado).
- `supabase/seed/dev_local.sql` — solo para el backend local (incluye un servicio en marcha de prueba); **no** ejecutar en Supabase.
- `supabase/rollback/*.down.sql` — una reversión por migración; la base elimina todo lo de La Ofi sin tocar otros proyectos.
- `supabase/tests/` — réplica mínima de la plataforma + tests con PGlite (`npm test`).

Cambios futuros de esquema: nueva migración en `supabase/migrations/`, `npm test`, aplicarla y revisar
los advisors de Supabase. Con las migraciones aplicadas, el contenido (carta, menú del día, eventos,
mesas, reservas) se edita desde `/admin`.

## De demo a producción

1. **Contenido**: completar [`CONTENT_NEEDED.md`](./CONTENT_NEEDED.md) (⚠️ = bloqueante).
2. **Imágenes**: sustituir todas las de terceros listadas en [`IMAGES_SOURCES.md`](./IMAGES_SOURCES.md)
   y tener por escrito la autorización de las oficiales. Regenerar `public/og/la-ofi-og.jpg` y los iconos con el logo real.
3. **Teléfono**: `NEXT_PUBLIC_CONTACT_PHONE=946366479` (o el que confirme el propietario).
4. **Datos**: completar alérgenos y precios en `laofi.productos`, confirmar el horario (sábado) y
   cargar menús del día y eventos reales.
5. **Legales**: rellenar los `[Pendiente: …]` de `/aviso-legal` y `/privacidad`.
6. **Flags**: `NEXT_PUBLIC_IS_DEMO=false` y `NEXT_PUBLIC_SHOW_DEMO_CONTENT=false`; `NEXT_PUBLIC_SITE_URL` con el dominio final.
7. **Dominio**: añadirlo en Vercel → Settings → Domains. Redeploy.
8. **Plataforma**: aplicar las migraciones `20261002*`, configurar Stripe y su webhook, dar de alta
   al staff, crear zonas/mesas e imprimir los QR (`/admin/mesas/qr`), instalar `print-bridge` en el
   ordenador de cocina si hay impresora.
9. **Verificar**: `robots.txt` y `sitemap.xml` publicados, Lighthouse, Google Search Console y la ficha de Google Business enlazando a la web.
