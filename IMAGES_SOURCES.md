# Procedencia de imágenes y vídeo — Restaurante La Ofi

Consulta y descarga: **2026-10-01**. Todas las imágenes están en `public/images/`, recortadas y
exportadas a WebP (q86). `next/image` sirve automáticamente AVIF/WebP en varios tamaños.

**Estado global: DEMO.** Ninguna imagen tiene todavía autorización del propietario. Antes de pasar a
producción hay que (1) obtener la autorización por escrito para las oficiales y (2) sustituir todas
las de terceros por fotos originales del restaurante.

| Archivo | Origen (URL) | Tipo | Autor | Estado |
|---|---|---|---|---|
| `eventos/salon-celebracion-noche.webp` (1170×776) | Google Maps, ficha "Restaurante La Ofi", foto subida por el propietario (ene 2024): `https://lh3.googleusercontent.com/grass-cs/ACvplmMx7_OzZJvFhwFMPpSipCbJoWCO3sdCilJrtQw-GWLjeLsXonovLLFXMDr_4hgRLI3mdt7qZgARIGmDCQf5qjYLtSK-1gaMe_xw9We0H0D8JJ9V_Mbap1pV4RQm06XTyBqRD9Pnuw=s2400` (recortada la franja central del formato story) | **Oficial del restaurante** | Restaurante La Ofi | oficial – pendiente de autorización |
| `carta/carta-tostadas-desayuno.webp` (1080²) | Instagram @laofiparke, embed público `https://www.instagram.com/laofiparke/embed/` (publicación "7 dias 8 tostadas hoy Americana…") | **Oficial del restaurante** | @laofiparke | oficial – pendiente de autorización |
| `pintxos/tostada-bonita.webp` (1080²) | Instagram @laofiparke, embed público (publicación "…hoy la bonita…") | **Oficial del restaurante** | @laofiparke | oficial – pendiente de autorización |
| `pintxos/tostada-revuelta.webp` (1080²) | Instagram @laofiparke, embed público (publicación "…hoy la REVUELTA…") | **Oficial del restaurante** | @laofiparke | oficial – pendiente de autorización |
| `pintxos/tostada-salmon.webp` (1080×960) | Instagram @laofiparke, embed público (publicación "…Hoy SALMON…"; recortado el rótulo superior) | **Oficial del restaurante** | @laofiparke | oficial – pendiente de autorización |
| `pintxos/tostada-burrata.webp` (1080²) | Instagram @laofiparke, embed público (publicación "…os presentamos a la BURRATA…") | **Oficial del restaurante** | @laofiparke | oficial – pendiente de autorización |
| `hero/comedor-ratan-avdg.webp` (858×651) | Academia Vasca de Gastronomía: `https://academiavascadegastronomia.com/wp-content/uploads/2025/03/La-Ofi-Derio-Zamudio.png` (parece captura de Instagram del local; la misma foto está en parke.eus) | Tercero | AVDG (origen probable: el restaurante) | **DEMO – sustituir antes de producción** |
| `local/barra-deia.webp` (544×495) | Deia, 13/09/2025: `https://estaticosgn-cdn.deia.eus/clip/3781ab02-9aff-451d-a5d9-d77cb8c92895_16-9-aspect-ratio_default_0.jpg` (mitad izquierda) | Tercero (prensa) | Itziar Acereda / Deia | **DEMO – sustituir antes de producción** |
| `carta/pulpo-brasa-deia.webp` (880×495) | Deia: `https://estaticosgn-cdn.deia.eus/clip/38ef1331-a427-45fd-8585-2e53a795cad8_16-9-aspect-ratio_default_0.jpg` | Tercero (prensa) | Itziar Acereda / Deia | **DEMO – sustituir antes de producción** |
| `local/terraza-noche-deia.webp` (880×495) | Deia: `https://estaticosgn-cdn.deia.eus/clip/3950895b-aadb-43c4-877d-a0063c6635ce_16-9-aspect-ratio_default_0.jpg` | Tercero (prensa) | Itziar Acereda / Deia | **DEMO – sustituir antes de producción** |
| `local/rotulo-neon-rg.webp` (630×395) | Restaurant Guru: `https://img02.restaurantguru.com/caa7-design-Restaurante-La-Ofi.jpg` (cuadrante inferior, sin la mascota superpuesta) | Tercero (foto de cliente) | Desconocido | **DEMO – sustituir antes de producción** |
| `local/terraza-carpa-rg.webp` (408×245) | Restaurant Guru: `https://img02.restaurantguru.com/c35f-Restaurante-La-Ofi-Derio-interior-1.jpg` (cuadrante superior derecho) | Tercero (foto de cliente) | Desconocido | **DEMO – sustituir antes de producción** |
| `local/mapa-la-ofi-osm.webp` (1200×760) | Generado con teselas de `tile.openstreetmap.org` (z16) + marcador propio | Generada | © OpenStreetMap contributors (ODbL) — atribución visible en la web | Válida para producción (mantener la atribución) |
| `public/og/la-ofi-og.jpg` (1200×630) | Composición propia con `hero/comedor-ratan-avdg.webp` | Generada | — | **DEMO – regenerar con foto oficial** |
| `app/icon.svg`, `app/apple-icon.png`, `public/icons/*` | Monograma provisional "lo" | Generada | LocalIA | Provisional – sustituir por el logo oficial |

**Placeholders de marca** (sin foto, con textura hexagonal y la etiqueta "Foto pendiente"): tortilla
(home → "Para cada momento" y sección de tostadas) y pintxos de la barra. Nunca se usan fotos de stock.

**Vídeo:** no hay ningún vídeo accesible del restaurante. `src/lib/media.ts` tiene `HERO_VIDEO = null`:
el hero muestra la foto con movimiento sutil. Cuando haya vídeo real: MP4 H.264 horizontal (~1080p,
< 4 MB, sin audio) + póster en `public/videos/` y rellenar `HERO_VIDEO`.

## Fuentes descartadas (calidad o acceso)

- **Restaurant Guru, resto de collages** (`img02.restaurantguru.com/c171-…`, `c3c0-…`, `c621-…`, `c648-…`, `c7cd-…`, `c869-…`, `c9df-…`, `cbad-…`, `cc52-…`, `ce4c-…`, `ceeb-…`): cuadrantes de ~240–430 px con una mascota de dibujos superpuesta. Calidad insuficiente.
- **Tripadvisor**: bloquea el acceso automatizado (HTTP 403). No se ha intentado saltar.
- **Instagram (feed completo)** y **Google Maps (resto de fotos)**: exigen iniciar sesión. No se ha intentado saltar.

## Descarga manual recomendada (para la demo de esta tarde o para producción)

Con sesión iniciada, desde el perfil y la ficha oficiales:
1. https://www.instagram.com/laofiparke/ — las mejores fotos de: fachada, barra con pintxos, tortilla, terraza cubierta (de día y de noche), comedor, tardeos/actuaciones, platos a la brasa. Y cualquier **vídeo/reel** del local (hero).
2. Google Maps → "Restaurante La Ofi" → Fotos → pestaña **"Del propietario"**: https://share.google/xLJ2KFgDF9i40yuDY

Colocarlas en `public/images/<carpeta>/` (hero, carta, pintxos, local, eventos, galeria), añadirlas en
`src/lib/images.ts` y en esta tabla. Lo ideal es pedir al propietario los **originales a máxima
resolución**: las de Instagram llegan comprimidas a 1080 px.
