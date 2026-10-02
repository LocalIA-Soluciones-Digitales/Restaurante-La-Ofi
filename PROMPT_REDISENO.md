# Prompt — Rediseño completo de Restaurante La Ofi (web + pedidos + TPV)

> Para ejecutar con Claude Code dentro de `C:\Users\edossantos\Restaurante-La-Ofi`.
> Proyectos de referencia en la misma máquina:
> - `C:\Users\edossantos\Palomita-Bar` → lógica de carta, pedidos, admin/TPV, impresión, mesas, plano 3D.
> - `C:\Users\edossantos\amway-premium` → lenguaje visual: heros, vídeo, scroll storytelling, motion.

---

## 0. Contexto y reglas

Restaurante La Ofi (Barrio de Arteaga 502, Parque Tecnológico de Bizkaia, Derio) tiene hoy una **V1 demo**
correcta pero sencilla (Next 15.5 + React 19 + Tailwind 3.4 + Supabase, schema propio `laofi`, sin
Framer/GSAP, animaciones solo CSS). Quiero convertirla en una web **premium, cinematográfica y con mucho
vídeo**, con **carta interactiva tipo Palomita**, **pedido y cesta**, y un **panel de gestión tipo
Palomita preparado para TPV**.

Antes de tocar nada, lee: `README.md`, `ARCHITECTURE.md`, `RESEARCH.md`, `CONTENT_NEEDED.md`,
`IMAGES_SOURCES.md` de La Ofi; `ARCHITECTURE.md` (§4, §4.5, §10, §11, §16–19) y `print-bridge/README.md`
de Palomita; y en Amway `src/components/home/*`, `src/components/xs-energy/*`, `src/components/espring/*`,
`src/components/layout/SmoothScroll.tsx`, `src/hooks/usePlayWhenVisible.ts`, `src/lib/gsap.ts`.

Reglas que NO se rompen:
1. **Nada inventado.** Mantén el sistema `ContentState` (real → demo marcado → vacío). Precios, alérgenos,
   calorías y macros solo si vienen de Supabase o están marcados como ejemplo. No publiques nombres de
   personas ni reseñas no literales (ver `RESEARCH.md` §5 y §7).
2. **Imágenes/vídeo:** ningún vídeo o foto generado por IA puede hacerse pasar por el local real. El
   hero principal y la galería del local usan material real (o placeholder de marca hasta tenerlo). Lo
   generado por IA solo para recursos ambientales/abstractos y platos genéricos, y anotado en
   `IMAGES_SOURCES.md` como "generado".
3. **Aislamiento de datos:** La Ofi vive en su propio schema `laofi` (migración `20261001150000`). Porta
   la lógica de Palomita **replicando las tablas necesarias dentro de `laofi`**, no reutilizando
   `restaurant.*`. Lectura pública solo por RPC `public.laofi_*` con `site_key`; escritura de staff con
   RLS `laofi.es_gestor()`. `service_role` solo en servidor. Migraciones aditivas, con rollback y tests
   PGlite (`npm test`). No aplicar nada en el Supabase compartido sin mi confirmación.
   (Nota: `ARCHITECTURE.md` §1–2 aún describe `restaurant.*`; actualízalo para reflejar `laofi`.)
4. **Rendimiento:** Lighthouse móvil ≥ 90 en home y carta. GSAP, Lenis, Framer Motion y three.js
   cargados con `dynamic()`/import diferido y solo donde se usen; vídeos `preload="none"` + póster +
   `usePlayWhenVisible`; versión ligera para móvil (720p) y escritorio (1080p); `prefers-reduced-motion`
   → póster estático y sin smooth scroll.
5. **Actualiza Next/React de Palomita** al portar código: La Ofi va en 15.5.27 por seguridad, no bajes.
6. Español primero; deja `eu` preparado. Accesibilidad AA (foco, contraste, diálogos con `useDialogA11y`).
7. Trabaja por fases, con commit por fase, y al final de cada fase: `npm run lint`, `npm run typecheck`,
   `npm test`, `npm run build` y comprobación en navegador (consola sin errores, móvil y escritorio).

---

## 1. Dirección de arte

Identidad real del local (`RESEARCH.md` §8): neón lavanda "la ofi" sobre azulejo blanco, madera clara,
lámparas de ratán, baldosa hexagonal gris-azul, jardín vertical, barra azul marino, terraza con carpa
tensada iluminada de noche. Concepto: **"Punto de encuentro y buen rollo" — del café de las 7:30 al
tardeo del viernes.** La web cuenta el día del restaurante.

- Conserva la paleta actual (`crema`, `arena`, `madera`, `ratan`, `marino`, `oliva`, `terracota`,
  `neon`) y añade un modo noche (marino-900 + neón) que se usa en las secciones de tarde/eventos.
- Tipografía display editorial grande (como los heros de Amway: titulares a 9–10vw con revelado por
  palabras), sans limpia para UI.
- Detalles de marca: brillo/parpadeo sutil de neón en el logotipo y titulares nocturnos, textura de
  baldosa hexagonal como patrón de fondo muy suave, grano fotográfico leve.
- Copia de Amway la **lógica** (hero a pantalla completa con vídeo, revelado de titulares con GSAP,
  scroll storytelling con capítulos fijados, "video moments", Lenis + ScrollTrigger, marquesinas,
  CTA final potente) pero adaptada a restaurante: apetito, calor, vapor, brasa, gente, luz del día.

---

## 2. Web pública — estructura de la home

1. **Hero "Un día en La Ofi"** — vídeo a pantalla completa (loop 10–15 s) que cambia según la hora
   real del visitante: mañana (café/tostadas), mediodía (plato del día/comedor), tarde-noche (brasa,
   terraza, neón). Titular con revelado por palabras, estado "Abierto ahora · cierra a las 17:00"
   (de `horario.ts`), CTAs: *Ver carta*, *Pedir*, *Reservar*. Si no hay vídeo → foto con Ken Burns.
2. **Marquesina de confianza**: 4,4 en Google · Parking 220 plazas · Terraza 220 personas ·
   Accesible · Pintxos desde las 7:30 (solo datos verificados).
3. **Scroll story "Del desayuno al tardeo"** (patrón `EnergyScrollStory`): sección fijada con 4–5
   capítulos (Desayunos y tostadas → Pintxos de barra → Plato del día → Brasa → Tardeo y terraza), cada
   uno con su fondo de vídeo/foto, plato protagonista recortado que entra en escena y CTA a su parte
   de la carta.
4. **Menú del día en vivo**: tarjeta destacada con los platos de hoy desde Supabase, precio, qué
   incluye, y aviso "actualizado hoy a las 10:12". Botón *Reservar mesa para hoy*.
5. **Especialidades** (carrusel horizontal con arrastre): pulpo a la brasa, puerros sobre salsa de
   hongos, carrilleras al PX, morcilla de puerro de Zamudio, pescado del día… cada tarjeta con mini-vídeo
   en hover (escritorio) / al entrar en pantalla (móvil).
6. **Video moment "La brasa"**: vídeo grande reproducible bajo demanda (patrón `EnergyVideoMoment`).
7. **Espacios**: barra, comedor (70), "El Despacho" (privado para empresas), terraza (220). Cada espacio
   con foto/vídeo, aforo y CTA (reservar / pedir presupuesto). Enlace al plano 2D/3D público.
8. **Empresas del Parque** (sección nueva, clave por ubicación): menús para reuniones en El Despacho,
   pedidos de grupo para recoger, facturación a empresa, catering de desayunos.
9. **Eventos**: tardeo mensual, partidos, celebraciones; próximos eventos de Supabase con cuenta atrás.
10. **Vinos**: 98 referencias de distintas D.O. + txakoli Magalarte (sin lista inventada: solo el dato).
11. **Galería** masonry con lightbox y vídeos cortos mezclados.
12. **Ubicación** con mapa estático (como ahora) + "cómo llegar desde el Parque" + horario.
13. **CTA final** a pantalla completa con vídeo de terraza de noche.

Páginas: rediseña también `/carta`, `/menu-del-dia`, `/eventos`, `/galeria`, `/contacto`, `/reservar`
con `PageHero` de vídeo/foto y el mismo lenguaje.

---

## 3. Carta interactiva (portar de Palomita)

Base: `Palomita-Bar/src/components/menu/CategoryMenu.tsx` y `ProductDetailModal.tsx`.

- Navegación por categorías pegajosa con scroll-spy; buscador; filtros por **alérgeno excluido**
  (14 de la UE, reutilizando `src/lib/allergens.ts`), vegetariano, sin gluten, "para picar",
  "a la brasa"; filtro por momento del día (desayuno / mediodía / tarde).
- **Tarjeta por producto**: foto (o vídeo corto si existe), nombre, descripción, precio, iconos de
  alérgenos, kcal, etiquetas (casero, de temporada, brasa, recomendado), botón **+ añadir** con
  contador inline.
- **Modal de detalle** (como Palomita): galería, ingredientes, **calorías y donut de macros**
  (proteínas, carbohidratos, grasas, con su reparto % por kcal), alérgenos con icono y nombre,
  maridaje sugerido, modificadores (punto de la carne, sin cebolla, extra…), notas para cocina,
  cantidad y añadir a la cesta.
- Datos: añade a `laofi.productos` (o equivalente) `ingredientes text[]`, `calorias`, `proteinas_g`,
  `carbohidratos_g`, `grasas_g`, `imagenes text[]`, `video_url`, `etiquetas text[]`, `momento`,
  `estacion` (cocina/barra), `destacado`, `disponible`, `orden`, y tabla de modificadores. Si no hay
  dato nutricional, la sección no se muestra (nunca "0 kcal").
- JSON-LD `Menu` solo con datos reales.

## 4. Pedido y cesta (portar de Palomita)

Portar `cart-context`, `CartBar`, `CartDrawer`, `PedirExperience`, `table-session-context`,
`TableEntry`, `CuentaMesaDrawer`, `ActiveOrderBanner`, `PedidoStatus` y `/pedido/[id]`.

- **QR por mesa** → `/es/pedir?mesa=<id>` (el middleware ya conserva la query). Sesión de mesa
  compartida: pedir "juntos" o "cada uno lo suyo" (Palomita §16.3), estado del pedido en tiempo real,
  llamar al camarero, pedir la cuenta.
- **Pedido para recoger** (fuera de mesa): elegir franja horaria — pensado para los trabajadores del
  Parque (pedir a las 12:30, recoger a las 14:00). Pedido de grupo por enlace compartido.
- Pago: Stripe Checkout con confirmación solo por webhook (Palomita §10) y opción "pagar en barra".
  Variables ya documentadas en `.env.example`.
- Cesta persistente, CartBar flotante animada, haptics en móvil, avisos de cambio de precio o producto
  agotado antes de confirmar.

## 5. Panel de gestión `/admin` (portar de Palomita, preparado para TPV)

Login propio de La Ofi, roles (admin, encargado, camarero, cocina), PWA instalable en la tablet/TPV,
modo pantalla completa, botones grandes táctiles, modo oscuro para cocina.

- **Salón / Mesas**: plano **2D** (vista superior, arrastrar mesas) y **3D** (`Floorplan3D` con
  react-three-fiber) con las 4 zonas reales: barra, comedor, El Despacho, terraza. Estado por color
  (libre, ocupada, reservada, bloqueada, pide cuenta), unir/separar mesas, mover comensales, tiempo
  sentado, importe acumulado. Editor del plano (crear zonas, mesas, capacidad).
- **QR por mesa**: generar, descargar e imprimir en lote (PDF A4 con plantillas de marca para
  metacrilato / pegatina), regenerar token si se filtra.
- **TPV / Barra** (`BarraPOS`, `ProductGridPicker`, `PedidoRapidoForm`): rejilla de productos táctil,
  comanda rápida por mesa o barra, modificadores, dividir cuenta, cobro efectivo/tarjeta, descuentos,
  invitaciones.
- **Cocina y barra (KDS)**: tablero por estación, aceptar/preparar/listo, tiempos, sonido de aviso,
  historial (Palomita §18).
- **Impresión**: comandas por estación y tickets/cuentas (`src/lib/print/ticket.ts`, 80 mm) +
  `print-bridge/` para impresión automática a térmicas ESC/POS por red/USB al aceptar.
- **TicketBAI / Batuz**: obligatorio en Bizkaia. Porta el scaffold de Palomita (§19) y déjalo listo
  para activar con el certificado del negocio; QR TicketBAI en el ticket.
- **Carta**: CRUD de categorías y productos con nutrición, alérgenos, fotos/vídeo, disponibilidad
  instantánea ("agotado"), y **menú del día editable en 1 minuto desde el móvil**.
- **Reservas**: tablero + timeline, bloqueo de mesas, reservas de El Despacho y de eventos.
- **Eventos**: CRUD (tardeos, partidos, celebraciones) con imagen y aforo.
- **Ventas e informes**: gráficas, ventas por producto/hora/camarero, **cierre de caja (arqueo)**,
  exportación CSV, informe profesional (portar `InformeProfesional`).
- **Fidelización y reseñas** (portar, desactivado por defecto).
- **Configuración**: horario, datos fiscales, impresoras, métodos de pago.

---

## 6. Assets: vídeos y fotos a crear

Guarda en `public/videos/<seccion>/` (MP4 H.264 + WebM, sin audio, 1080p escritorio < 6 MB,
720p móvil < 2,5 MB, póster `.webp` del primer frame) y lista cada uno en `IMAGES_SOURCES.md`.

### Grabar en el local (reales — prioridad, sustituyen lo actual de terceros)
| # | Archivo | Plano | Duración |
|---|---|---|---|
| 1 | `hero/manana.mp4` | Café saliendo de la cafetera + tostada de masa madre emplatándose en la barra, luz de mañana | 10–12 s loop |
| 2 | `hero/mediodia.mp4` | Comedor lleno, platos saliendo, lámparas de ratán, travelling lento | 10–12 s loop |
| 3 | `hero/noche.mp4` | Terraza con carpa iluminada, gente brindando, neón "la ofi" | 10–12 s loop |
| 4 | `brasa/parrilla.mp4` | Macro de la parrilla: pulpo, puerros, chuletón, llamas y humo | 15–20 s (video moment) |
| 5 | `historia/pintxos.mp4` | Barra llenándose de pintxos a cámara cenital | 8 s loop |
| 6 | `historia/plato-dia.mp4` | Pizarra/plato del día, cuchara de guiso con vapor | 8 s loop |
| 7 | `espacios/despacho.mp4` | El Despacho montado para reunión | 6–8 s |
| 8 | `neon/rotulo.mp4` | Neón encendiéndose en primer plano | 4 s loop |
| 9 | Clips por plato estrella | 4–6 s, cenital o 45°, para hover de tarjetas | 4–6 s |

Fotos reales: logo en SVG; 1 foto por plato de la carta (fondo neutro arena/madera, misma luz, 4:5 y
1:1); 6–8 recortes PNG/WebP transparentes de platos estrella para el scroll story; fachada de día;
cada espacio vacío y con gente; detalles (ratán, baldosa, neón, vinos); terraza de noche.

### Generables con IA (solo ambiente, nunca "el local")
- Loops abstractos: humo de brasa sobre negro, vapor de café a contraluz, gotas sobre copa de txakoli,
  partículas de luz lavanda tipo neón (para fondos de transición y CTA final).
- Texturas: baldosa hexagonal, madera clara, grano de papel.
- Placeholders de platos genéricos marcados como "Imagen ilustrativa" hasta tener las fotos reales.

---

## 7. Fases

1. **Auditoría y plan** (sin código): estado actual, lista de componentes a portar, cambios de esquema,
   presupuesto de rendimiento. Espera mi OK.
2. Sistema de diseño + infraestructura de motion (Lenis, GSAP, `usePlayWhenVisible`, componentes
   `VideoHero`, `VideoMoment`, `ScrollStory`, `Marquee`).
3. Home y páginas públicas.
4. Carta interactiva + migraciones de producto/nutrición (con tests PGlite).
5. Cesta, pedido en mesa, QR, recogida y Stripe.
6. `/admin`: auth, salón 2D/3D, TPV, KDS, impresión, print-bridge.
7. Carta/menú del día/reservas/eventos/informes/cierre de caja en admin; TicketBAI scaffold.
8. QA: Lighthouse, accesibilidad, móvil real, flujos completos de pedido de punta a punta,
   auditoría de seguridad RLS/RPC (Palomita §12), y actualización de `ARCHITECTURE.md`,
   `README.md` y `CONTENT_NEEDED.md`.
