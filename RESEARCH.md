# Investigación — Restaurante La Ofi (Derio, Bizkaia)

Fecha de consulta de todas las fuentes: **2026-10-01**. Herramientas: búsqueda web, lectura de páginas públicas y navegador headless (Edge) sin iniciar sesión. Cuando una plataforma pidió login, captcha o bloqueó el acceso (Instagram feed, Tripadvisor, DuckDuckGo), **no se intentó saltar la protección**.
Regla de publicación: en la web solo se usa lo marcado **verificado**. Lo demás queda
pendiente en `CONTENT_NEEDED.md` / preguntas al propietario.

Niveles de confianza:
- **verificado**: confirmado por una fuente oficial o por ≥2 fuentes independientes coherentes entre sí y con el dato de partida.
- **probable**: una sola fuente fiable, o varias con matices.
- **no verificado**: fuente única no oficial, contradictoria o desactualizada.

---

## 1. Identificación del negocio (y desambiguación)

| Dato | Valor | Fuente(s) | Confianza |
|---|---|---|---|
| Nombre comercial | **La Ofi** (ficha de Google: "Restaurante La Ofi") | Google (kgmid `/g/11rtmgj80h`, resuelto desde el enlace de partida `share.google/xLJ2KFgDF9i40yuDY`), Deia, AVDG, parke.eus | verificado |
| Ubicación | Parque Científico y Tecnológico de Bizkaia (campus Zamudio/Derio), **edificio/local 502** | parke.eus (sitio oficial del Parque), Tripadvisor, Restaurant Guru, OSM | verificado |
| Dirección postal | **Barrio de Arteaga 502, 48160 Derio, Bizkaia** | Dato de partida (Google), Restaurant Guru ("Bo. Arteaga, 502, 48160 Derio"), MyMenuWeb ("Barrio Arteaga, 502, 48160") | verificado |

**No confundir con** (todas descartadas, distinta ciudad/datos):
- LAOFI / `wearelaofi.com` / `@laofi_vilaseca` — Vila-seca (Tarragona).
- `@laofi.bcn` / `linktr.ee/laofibcn` / "La Ofi Tuset" — Barcelona.
- `@la_ofi_bar` — Malasaña, Madrid.
- `@laofigroup`, `@laofi_cafebar`, Facebook `laofi.co`, `laoficr`, `la.ofi.pdc`, `La.Ofi.Piloto`, "La Ofi Café Bar" (61551938373289) — otros países/ciudades o sin relación demostrable.
- "Restaurante La Ofi en Mungia" (gastroranking.es) — otro municipio, no se ha usado ningún dato.
- **Denda Parke** — OpenStreetMap tiene en el edificio 502 un nodo `amenity=cafe` "Denda Parke" (tel. +34 94 431 79 43, dendaparke.com). Es otro negocio (posiblemente vecino en el mismo edificio, o dato antiguo de OSM). No se usa ningún dato suyo.

## 2. Redes sociales y perfiles oficiales

| Perfil | URL | Cómo se ha verificado | Confianza |
|---|---|---|---|
| **Instagram** | https://www.instagram.com/laofiparke/ | Enlazado como "Instagram" de **La Ofi, Building 502** en la página oficial de servicios del campus Zamudio/Derio del Parque Tecnológico: https://parke.eus/en/campus/zamudio-derio/services/ . Perfil "La ofi", 1.393 seguidores, 104 publicaciones (embed público oficial `instagram.com/laofiparke/embed/`, sin login). El feed completo exige login: solo se han podido ver las 6 últimas publicaciones del embed. Hashtag propio: **#puntodeencuentroybuenrollo**. | verificado |
| Ficha de Google Business | https://share.google/xLJ2KFgDF9i40yuDY → Google Maps "Restaurante La Ofi" (CID `0x93f3f75f48d64b9b`, kgmid `/g/11rtmgj80h`) | Leída con navegador headless (sin sesión, "vista limitada" de Google: sin horario completo y solo 1 foto). Muestra: dirección "Bo. Arteaga, 502, 48160", teléfono **946 36 64 79**, valoración 4,4, accesible en silla de ruedas, botón "Reservar una mesa", Plus Code 74WM+54. | verificado |
| Facebook | — | No se ha encontrado ninguna página de Facebook atribuible a La Ofi de Derio. | — |
| Web propia | — | No tiene. `laofi.eatbu.com` es una mini-web generada por el directorio Eatbu (no responde: HTTP 504 / vacía a fecha de consulta). | no verificado |
| Tripadvisor | https://www.tripadvisor.com/Restaurant_Review-g1078931-d25575378-Reviews-La_ofi-Derio_Province_of_Vizcaya_Basque_Country.html | Ficha "La ofi", Parque tecnológico local 502. | verificado (ficha) |
| Restaurant Guru | https://restaurantguru.com/La-Ofi-Elexalde-Derio | Ficha "Restaurante La Ofi". | verificado (ficha) |

## 3. Contacto

| Dato | Valor | Fuente(s) | Confianza |
|---|---|---|---|
| Teléfono | **946 36 64 79** (+34 946 36 64 79) | **Ficha de Google Business** (`tel:946366479`), Restaurant Guru, Tripadvisor, MyMenuWeb | **verificado** |
| Teléfono (discrepancia) | +34 94 633 64 79 (= 946 33 64 79) | parke.eus | descartado: Google Business manda; parece una transposición de dígitos en parke.eus |
| Teléfono publicado en la DEMO | **628 40 97 81** | Número de pruebas indicado por LocalIA (no es del restaurante) | TEMPORAL — sustituir por 946 36 64 79 antes de producción |
| WhatsApp | — | Ninguna fuente | no verificado → no se publica |
| Email | Aparece un email personal (gmail) en un resultado de búsqueda | Fuente única, personal | no se publica |

## 4. Coordenadas

| Fuente | Lat | Lng |
|---|---|---|
| Restaurant Guru (JSON-LD de la ficha) | 43.2954410 | -2.8672436 |
| OpenStreetMap — nodo con `addr:housenumber=502`, `addr:postcode=48160` en el edificio | 43.2955154 | -2.8670061 |
| OpenStreetMap — centroide del edificio 502 (way 53158218) | 43.2958399 | -2.8675573 |

| **Google Maps** (URL de la ficha: `!3d43.295441!4d-2.8672436`) | **43.295441** | **-2.8672436** |

Todas caen sobre el edificio 502 (separación ≤ ~45 m). **Se usa 43.295441, -2.8672436**, el pin
exacto de la ficha de Google Business. Confianza: **verificado**.

## 5. Descripción del negocio

Fuente principal: **Deia**, "El género local y la temporada marcan la pauta en La Ofi de Derio",
Itziar Acereda, 13/09/2025 —
https://www.deia.eus/gastronomia/2025/09/13/genero-local-temporada-marcan-pauta-ofi-derio-10073045.html

| Dato | Detalle (según la fuente) | Fuente | Confianza |
|---|---|---|---|
| Cocina | Recetas tradicionales; producto de temporada de baserris cercanos (tomates, pimientos, huevos, carnes). | Deia | probable (prensa, 2025) |
| Brasa / parrilla | Pescado a la parrilla según mercado (lenguado, rodaballo, lubina, bonito, chicharro; salvaje previa reserva), pulpo, carnes, pimientos, puerros, espárragos a la brasa. | Deia; Tripadvisor (reseña: "pescado, costilla y puerros a la brasa") | probable |
| Carnes | Ganado mayor; solomillo, entrecot, secreto ibérico a la brasa, rabo de toro. | Deia | probable |
| Plato del día | **De lunes a viernes**, a elegir entre **siete opciones** (ensalada, cuchara, pasta/arroz, carne/ave). | Deia | probable — sin precio confirmado |
| Carta | 20–25 opciones; especialidades: puerros a la parrilla sobre salsa de hongos, carrilleras al Pedro Ximénez; todo casero, postres incluidos; morcilla de puerro de Zamudio. | Deia | probable |
| Pintxos / desayunos | Barra con **pintxos desde el desayuno** para las empresas de la zona. | Deia; AVDG ("pintxos", "tortillas") | verificado (2 fuentes) |
| Carta de tostadas del desayuno | Foto de la carta publicada por @laofiparke: servicio **9:00–11:30**; Clásica 2,10 · Ibérico 3,90 · Aguacate 5,60 · Salmón 6,50 · Burrata 6 · Revuelta 6,50 · Bonita 6 · Americana 6,50 · Bowl de yogur 4,50 €. Serie "7 días 8 tostadas" en pan de masa madre. | Instagram oficial (embed público), publicaciones recientes a 2026-10-01 | oficial — **vigencia de precios por confirmar** (se muestra marcada "Según Instagram") |
| Tortillas | "Diferentes tortillas" destacadas. | AVDG (18/03/2025) | probable |
| Espacios | 4 zonas: **barra** (pintxos y desayunos), **comedor** del plato del día (**70 comensales**), comedor privado **"El Despacho"** (carta / reuniones de empresa con reserva), **terraza cubierta** para **220 personas sentadas**. | Deia; AVDG (3 espacios: terraza, cafetería con barra, comedor divisible para eventos de empresa) | verificado (estructura) / probable (cifras) |
| Eventos | Menús concertados para celebraciones (bautizos, comuniones), postbodas. **Organizan un tardeo cada mes.** Retransmiten partidos (servicio audiovisual). | Deia; Restaurant Guru ("live music evenings", "private events") | probable — **sin fechas de próximos eventos** |
| Vinos | 98 referencias de tintos de distintas D.O., algún chileno y argentino; txakoli Magalarte. | Deia | probable |
| Servicios | Parking para 220 coches; accesible en todo el local; terraza. | Deia; Restaurant Guru | verificado (parking, terraza, accesible) |
| Vinculación local | Socios-colaboradores del Club de Fútbol de Derio. | Deia | probable |
| Personas | Chef: Carlos Toro; el propietario atiende la sala. | AVDG | no verificado → **no se publica** (nombres de personas sin autorización) |
| Tipos de cocina en directorios | "Chilean, South American, Spanish, Grill, Cafe". | Restaurant Guru, Tripadvisor | no verificado (categoría automática del directorio) |
| Precio medio | "~10 €" (AVDG); "10–20 € por persona" (Restaurant Guru). | Varias | no se publica |
| Plato del día | **8,90 €** con bebida, pan y postre, a elegir entre seis platos (ej.: secreto con patatas, arroz caldoso de presa ibérica, pasta con crema de calabaza, muslo de pollo asado con patatas). | menu-world.com (agregador de reseñas, sin fecha; resumido por el buscador; la página devuelve 403) — coherente con Deia (plato del día a elegir entre varias opciones) | probable — **se publica marcado "Según clientes · confirmar en el local"** por indicación de LocalIA |
| Carta "Para picotear" | Tabla de ibérico, paletilla ibérica, queso de la casa, croquetas variadas (6 und), puerros a la parrilla sobre salsa de hongos, espárragos a la parrilla sobre mahonesa de aguacate, pimientos del país (12 und), pulpo a la parrilla, gambas al ajillo (10 und), morcilla a la brasa. Precios ilegibles (cortados en la foto). | Foto de la carta subida por un usuario a Restaurant Guru "hace un año": https://menu02.restaurantguru.com/m8/menu-Restaurante-La-Ofi-7n7.jpg | probable — se publica sin precios, marcado "Según carta" |

Fuente secundaria: **Academia Vasca de Gastronomía (AVDG)**, "La Ofi en Derio-Zamudio", 18/03/2025 —
https://academiavascadegastronomia.com/la-ofi-en-derio-zamudio/

## 6. Horario

| Fuente | Horario |
|---|---|
| Restaurant Guru | L–J 7:30–17:00 · V 7:30–24:00 · S 11:22(sic)–24:00 · D cerrado |
| MyMenuWeb | M–J 7:00–18:00 · V 7:00–20:30 · S 7:00–24:00 · D 10:30–24:00 |
| Instagram @laofiparke (descripción vista vía buscador) | L–J 6:30–18:00 · V–S 6:30–00:00 · D 10:30–18:00 |
| Google Business (vista limitada, 2026-10-01, jueves) | "Abierto · Cierre: 17:00" (solo el día de la consulta) |
| Tripadvisor | No disponible |

**Decisión (2026-10-01, por indicación de LocalIA: publicar lo más reciente de internet):** se
publica el horario de Restaurant Guru, que replica la ficha de Google y coincide con Google
Business en el día comprobado (jueves, cierre 17:00): **L–J 7:30–17:00 · V 7:30–00:00 · D cerrado**.
El sábado aparece como "11:22–00:00", dato evidentemente erróneo: se muestra **"Consultar"** y no
entra en el JSON-LD. Fuente del JSON-LD de Restaurant Guru: `openingHoursSpecification`.
En la web se acompaña de "Horario publicado en Google". Cuando haya horario en
`public.settings` (editable desde `/admin`), sustituye automáticamente a este.

## 7. Valoraciones y reseñas

| Plataforma | Dato | Confianza |
|---|---|---|
| Google | 4,4/5 (leído en la ficha; nº de reseñas no visible en vista limitada) | verificado (nota a 2026-10-01) |
| Tripadvisor | 3,8/5, 6 opiniones | verificado (a fecha de consulta) |
| Restaurant Guru | 4,8 (agregado propio) | no verificado |

Reseñas citables: las de Tripadvisor solo se han obtenido **traducidas automáticamente** por la
herramienta de lectura; no se tiene el texto original literal. **Decisión: la sección "Opiniones" se
omite en V1** (la regla exige cita literal + enlace verificable). Se puede activar cuando se
copie a mano el texto original de 2–3 reseñas con su enlace.

## 8. Identidad visual observada (fotos públicas del local)

- Rótulo de neón **"la ofi"** en minúsculas, tipografía redondeada, luz lavanda/blanca, sobre azulejo blanco tras la barra. Es la única pieza de marca identificada. **No se ha encontrado logotipo en formato vectorial.**
- Materiales: madera clara (listones verticales en la barra), mobiliario de madera natural, **lámparas de ratán/fibra** grandes, suelo de **baldosa hexagonal** en grises/azules, **jardín vertical**, estantería de vinos.
- Color: frontal de barra **azul marino**, blancos, madera, verde de las plantas.
- Terraza cubierta con carpa tensada (de noche, iluminación RGB) y zona de césped con sofás.
- Hay cartelería de marcas de cerveza (Águila, Heineken): **no** forma parte de la identidad de La Ofi y no se usa.

## 9. Fotos y vídeo — disponibilidad

Detalle por archivo en `IMAGES_SOURCES.md`. Resumen:
- **Instagram @laofiparke**: el embed público oficial da las 6 últimas publicaciones a 1080 px (5 usadas: tostadas y la carta del desayuno). El resto del feed exige login → pendiente de descarga manual o de que el propietario entregue originales.
- **Google Business**: 1 foto del propietario (ene 2024, 1170×2080, formato story) accesible sin sesión; el resto exige sesión.
- **Deia** (fotos de Itziar Acereda, ©Deia): barra+comedor, pulpo a la brasa, fachada/terraza de noche. ~880×495 px.
- **AVDG / parke.eus**: misma foto del comedor (ratán, baldosa hexagonal), 894×651 / 720×480 px.
- **Restaurant Guru**: 13 collages de fotos de usuarios, ~645 px de alto, con una **mascota de dibujos superpuesta** en una esquina → solo se pueden usar recortes de los cuadrantes limpios, a muy baja resolución.
- **Vídeo**: ninguno accesible. No se simula ningún vídeo.

Conclusión: no hay fotos de calidad suficiente para un hero a pantalla completa en escritorio ni
fotos utilizables de pintxos/tortillas. Se diseñará en consecuencia (ver plan).

## 10. Preguntas abiertas para el propietario

1. Confirmar 946 36 64 79 como teléfono de reservas (es el de Google). ¿Tiene WhatsApp?
2. Horario del **sábado** (el publicado en internet es erróneo) y confirmar el resto.
3. Precio del plato/menú del día y qué incluye. ¿Siguen vigentes los precios de la carta de tostadas de Instagram?
4. Calendario del tardeo mensual y otros eventos (música en directo, partidos).
5. Logo en SVG/PNG y fotos/vídeos originales (Instagram).
6. ¿Se puede nombrar al chef/propietario en la web?
7. Razón social y CIF (páginas legales).
