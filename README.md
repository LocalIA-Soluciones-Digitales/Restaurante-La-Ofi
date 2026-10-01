# Restaurante La Ofi — Derio

Web de **Restaurante La Ofi** (Barrio de Arteaga 502, Parque Tecnológico de Bizkaia, Derio) y base de
su futura plataforma de carta, menú del día, eventos, pedidos desde mesa, reservas y administración.
Proyecto de [LocalIA Soluciones Digitales](https://github.com/LocalIA-Soluciones-Digitales), tenant
del Supabase multi-tenant compartido (vertical `restaurant`, el mismo que Palomita-Bar).

> **Estado: DEMO** para enseñar al propietario. Indexación bloqueada, teléfono de pruebas e imágenes
> de terceros pendientes de sustituir. Ver [De demo a producción](#de-demo-a-producción).

Documentación: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`RESEARCH.md`](./RESEARCH.md) ·
[`IMAGES_SOURCES.md`](./IMAGES_SOURCES.md) · [`CONTENT_NEEDED.md`](./CONTENT_NEEDED.md)

## Stack

- Next.js 15.5 (App Router) + React 19 + TypeScript estricto + Tailwind CSS 3.4
- Supabase (Postgres + RLS) — proyecto compartido de LocalIA, acceso por RPC con `site_key`
- Vitest + PGlite (tests de utilidades y de migraciones sin Docker)
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

## Rutas

| Ruta | Estado |
|---|---|
| `/es` | Home: hero, La Ofi, para cada momento, menú de hoy, tostadas y pintxos, carta, eventos, galería, ubicación |
| `/es/carta` | Carta por categorías, filtro y leyenda de los 14 alérgenos (Supabase) |
| `/es/menu-del-dia` | Menú del día (Supabase) |
| `/es/eventos`, `/es/eventos/[slug]` | Eventos (Supabase) |
| `/es/galeria`, `/es/contacto` | Galería con lightbox; contacto y cómo llegar |
| `/es/aviso-legal`, `/es/privacidad`, `/es/cookies` | Legales (datos del titular pendientes) |
| `/es/pedir?mesa=<id>`, `/es/reservar`, `/admin` | Preparadas, noindex |

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
| `NEXT_PUBLIC_LAOFI_SITE_KEY` | opcional | `site_key` devuelto por el seed del tenant |

**Nunca** pongas la `service_role` ni claves de Stripe en variables `NEXT_PUBLIC_*`. V1 no las necesita.

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

Lee antes `ARCHITECTURE.md` §1–2 y el `ARCHITECTURE.md` de Palomita-Bar.

- `supabase/migrations/` — 3 migraciones **aditivas** (menú del día, eventos y RPC públicas). **No
  están aplicadas.** No las apliques en producción sin revisarlas.
- `supabase/rollback/` — reversión de cada migración (ejecutar en orden inverso).
- `supabase/seed/la_ofi_tenant.sql` — alta del tenant (una fila en `public.clientes`, sin datos
  inventados). Devuelve `cliente_id` y `site_key`.
- `supabase/seed/la_ofi_carta_desayunos_instagram.sql` — opcional, carta real de tostadas publicada
  en Instagram; ejecutar solo cuando el propietario confirme precios.
- `supabase/tests/` — réplica mínima de la plataforma + tests (`npm test`).

Para aplicarlas: primero `npm test`. Después, en una **rama de Supabase** (Branching) o con
Supabase CLI en local (`supabase db reset`), y solo entonces en el proyecto compartido (SQL Editor o
`supabase db push`), revisando `get_advisors` antes y después. Luego ejecuta el seed del tenant y
copia el `site_key` a `NEXT_PUBLIC_LAOFI_SITE_KEY` en Vercel.

## De demo a producción

1. **Contenido**: completar [`CONTENT_NEEDED.md`](./CONTENT_NEEDED.md) (⚠️ = bloqueante).
2. **Imágenes**: sustituir todas las de terceros listadas en [`IMAGES_SOURCES.md`](./IMAGES_SOURCES.md)
   y tener por escrito la autorización de las oficiales. Regenerar `public/og/la-ofi-og.jpg` y los iconos con el logo real.
3. **Teléfono**: `NEXT_PUBLIC_CONTACT_PHONE=946366479` (o el que confirme el propietario).
4. **Datos**: aplicar migraciones, ejecutar el seed, configurar las variables de Supabase y cargar
   carta, menú del día, eventos y horario reales.
5. **Legales**: rellenar los `[Pendiente: …]` de `/aviso-legal` y `/privacidad`.
6. **Flags**: `NEXT_PUBLIC_IS_DEMO=false` y `NEXT_PUBLIC_SHOW_DEMO_CONTENT=false`; `NEXT_PUBLIC_SITE_URL` con el dominio final.
7. **Dominio**: añadirlo en Vercel → Settings → Domains. Redeploy.
8. **Verificar**: `robots.txt` y `sitemap.xml` publicados, Lighthouse, Google Search Console y la ficha de Google Business enlazando a la web.
