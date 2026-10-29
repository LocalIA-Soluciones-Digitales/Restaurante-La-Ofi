# Contenido pendiente del propietario — Restaurante La Ofi

Checklist para la visita al restaurante. Lo marcado con ⚠️ bloquea el paso a producción.

## Autorizaciones
- [x] Autorización para usar sus fotos (confirmada por LocalIA el 2026-10-01) — archivar por escrito
- [ ] ¿Se puede nombrar en la web al chef o al propietario? (la prensa cita al chef Carlos Toro)

## Fotos y vídeo (originales, máxima calidad)
- [ ] ⚠️ Logo en SVG (o PNG grande con fondo transparente) — hoy hay un logotipo tipográfico provisional
- [ ] Fachada (de día)
- [ ] Barra con pintxos
- [ ] Terraza cubierta (de día y de noche)
- [ ] Comedor y "El Despacho"
- [ ] 5–10 fotos de pintxos
- [ ] 3–5 fotos de tortillas
- [ ] Platos a la brasa (pescado, carnes, puerros, pulpo…)
- [ ] Fotos de tardeos, actuaciones y celebraciones
- [ ] Vídeos reales para la web (lista de planos en `IMAGES_SOURCES.md` → "Vídeos por grabar"). Hoy
      el hero usa fotos con bruma/brasas/vapor **generados** (abstractos, no imitan el local)
- [ ] Vídeo vertical (reels/stories)
- [ ] Croquis o plano del local con medidas aproximadas (para el salón 2D/3D y "Espacios")
- [ ] ⚠️ Sustituir las 6 fotos de terceros listadas en `IMAGES_SOURCES.md`

## Datos del negocio
- [x] Teléfono de reservas: **946 36 64 79**, confirmado por Carlos el 29/10/2026 (en `site.ts`).
- [ ] WhatsApp (si lo usan para reservas)
- [x] Horario confirmado por Carlos (29/10/2026): L–J 7:30–16:30, V 7:30–00:00, S 11:00–00:00. Domingo cerrado (confirmado).
- [ ] Email de contacto
- [ ] Aforos para publicarlos: comedor (¿70?), terraza cubierta (¿220?), El Despacho, parking (¿220 plazas?)
- [ ] Datos para la página de empresas: menús concertados, facturación a empresa, capacidad para grupos

## Carta y menús
- [ ] Alérgenos deducidos de la receta (29/10/2026, a petición de Carlos) en `carta-fichas.ts`: se muestran con aviso «según la receta habitual». ⚠️ Que cocina los revise y los confirme en /admin → Carta.
- [ ] Carta completa con precios y **alérgenos** (los 14 del Reglamento UE 1169/2011) por plato. Hoy se publica lo encontrado en internet: tostadas (con precios de Instagram), "Para picotear" (sin precios, de una foto de 2025) y especialidades de brasa citadas por Deia.
- [ ] Confirmar precios de las tostadas y de "Para picotear" (seed opcional `supabase/seed/la_ofi_carta_publicada.sql`)
- [x] Plato del día: lo publica Carlos cada día en /admin → Menú del día (normalmente plato único a elegir)
- [ ] ⚠️ Pedir el menú del día para recoger: aplicar en Supabase `20261029120000_laofi_pedido_menu_dia` y poner `MENU_DIA_PEDIBLE = true` (`src/lib/restaurant/menu-pedido.ts`)
- [x] Información nutricional: estimada por ración en `carta-fichas.ts` (Carlos la acepta, 29/10/2026); la web la marca con «≈»
- [ ] Modificadores y suplementos reales (puntos de la carne, extras con precio)
- [ ] Tipo de IVA por producto si alguno no es el 10 %
- [ ] Vinos: referencias, bodegas y precios (la sección de vinos espera esos datos)

## Pedidos, pagos y salón
- [ ] Mesas y zonas reales (comedor, terraza, barra, El Despacho) con número y capacidad → QR
- [x] Pedidos para recoger (carta y menú del día), pago al recoger. Sin señal en reservas, grupos ni celebraciones; los eventos llevan su precio de entrada
- [ ] Cuenta de Stripe del restaurante: pago online «próximamente» (Carlos, 29/10/2026); hasta entonces, solo pago en el local
- [ ] Staff: personas, correo y rol (administración, encargado/a, sala, cocina)
- [ ] Impresora de cocina/barra (modelo, IP) para `print-bridge`
- [ ] Reservas online: ¿sí o no?, máximo de personas, antelación, turnos

## Fiscal
- [ ] ⚠️ TicketBAI: certificado de dispositivo, NIF, licencia del software garante y alta en Batuz
      (hasta entonces el TPV no emite factura fiscal; ver `src/lib/ticketbai/README.md`)

## Fidelización y reseñas (apagadas)
- [ ] ¿Quieren programa de puntos/premios? Reglas y texto de privacidad (datos de clientes)
- [ ] ¿Quieren pedir reseña tras la visita? Enlace a su ficha de Google

## Eventos
- [ ] Próximos eventos: tardeo mensual, música, partidos, con fecha, hora, precio y aforo
- [ ] Fotos de cada evento

## Legal
Los datos del titular van en `TITULAR` (`src/lib/site.ts`): aviso legal, privacidad y condiciones del pedido
los toman de ahí. Mientras falten, esas páginas muestran «[Pendiente: …]».
- [x] Orotela, S.L., NIF B16982597, Edificio 502 del Parque Tecnológico (Derio): escritura del 6/10/2021 y Carlos (29/10/2026)
- [x] Registro Mercantil de Bizkaia, tomo 6042, folio 1, hoja BI-77552, inscripción 1.ª
- [x] Email de contacto y de protección de datos: laofiparke@gmail.com (Carlos, 29/10/2026)
- [x] Plazos confirmados: reservas 12 meses; notas de alergias borradas tras el servicio
- [x] Permiso para la foto de la celebración de la galería (Carlos, 29/10/2026)

## Dominio
- [ ] ⚠️ Dominio (¿lo tienen?, ¿quién lo gestiona?) → `NEXT_PUBLIC_SITE_URL`

## Reseñas (opcional)
- [ ] Si quieren sección de opiniones: 2–3 reseñas reales elegidas por ellos, con enlace a Google o Tripadvisor (texto literal)
