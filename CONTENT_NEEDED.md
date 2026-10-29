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
- [ ] ⚠️ Teléfono de reservas: confirmar **946 36 64 79** (el de Google) y configurarlo en `NEXT_PUBLIC_CONTACT_PHONE`. Hoy la demo usa **628 40 97 81**, número de pruebas de LocalIA.
- [ ] WhatsApp (si lo usan para reservas)
- [ ] Horario: se publica el de Google (L–J 7:30–17:00, V 7:30–00:00, D cerrado). ⚠️ Falta el **sábado** (dato erróneo en internet) y confirmar el resto.
- [ ] Email de contacto
- [ ] Aforos para publicarlos: comedor (¿70?), terraza cubierta (¿220?), El Despacho, parking (¿220 plazas?)
- [ ] Datos para la página de empresas: menús concertados, facturación a empresa, capacidad para grupos

## Carta y menús
- [ ] ⚠️ Carta completa con precios y **alérgenos** (los 14 del Reglamento UE 1169/2011) por plato. Hoy se publica lo encontrado en internet: tostadas (con precios de Instagram), "Para picotear" (sin precios, de una foto de 2025) y especialidades de brasa citadas por Deia.
- [ ] Confirmar precios de las tostadas y de "Para picotear" (seed opcional `supabase/seed/la_ofi_carta_publicada.sql`)
- [ ] Plato del día: confirmar **8,90 €** con bebida, pan y postre (dato de opiniones de clientes), días y horario
- [ ] Quién lo actualizará cada día (persona y usuario de `/admin` → Menú del día)
- [ ] Información nutricional (kcal y macros) **solo si el restaurante la tiene calculada**, con su
      fuente (nutricionista, ficha técnica…). Sin ella la web no muestra nutrición
- [ ] Modificadores y suplementos reales (puntos de la carne, extras con precio)
- [ ] Tipo de IVA por producto si alguno no es el 10 %
- [x] Vinos blancos, rosados, cavas/champagnes y dulces (foto de la carta, 29/10/2026 → `seed/la_ofi_carta_vinos.sql`)
- [ ] Vinos **tintos** (la otra cara de la carta; Carlos habla de más de 150 referencias)
- [ ] Vinos dulces: ¿precio por copa? (3–4 €, hoy sin indicar)

## Pedidos, pagos y salón
- [ ] Mesas y zonas reales (comedor, terraza, barra, El Despacho) con número y capacidad → QR
- [ ] ¿Pedido desde mesa? ¿Recogida? Franjas de recogida, preparación mínima y pedido mínimo
- [ ] ⚠️ Cuenta de Stripe del restaurante (para pago online); si no, solo pago en el local
- [ ] Staff: personas, correo y rol (administración, encargado/a, sala, cocina)
- [ ] Impresora de cocina/barra (modelo, IP) para `print-bridge`
- [x] Reservas (visita del 29/10/2026): El Despacho por personas hasta 30 y solo carta; comedor con
      menú del día, carta o solo mesa; recogida de menús del día; el menú se ve el mismo día de 8:00 a 16:00
- [ ] Confirmar el corte de turnos del Despacho (hoy: mediodía antes de las 17:00, noche desde las 17:00)
      y cuánto dura una reserva (hoy, un turno entero)
- [ ] ¿Recogida de menús: pago en el local al recoger? ¿Precio del menú para llevar igual que en mesa?
- [ ] Activar «Aceptar reservas desde la web» en /admin/configuracion cuando Carlos dé el visto bueno

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
- [ ] ⚠️ Razón social, NIF/CIF y domicilio social (aviso legal y privacidad)
- [ ] Inscripción en el Registro Mercantil, si es sociedad
- [ ] ⚠️ Email de contacto y de protección de datos (también para `public/.well-known/security.txt`)
- [ ] Confirmar plazos: reservas 12 meses; notas de alergias borradas tras el servicio

## Dominio
- [ ] ⚠️ Dominio (¿lo tienen?, ¿quién lo gestiona?) → `NEXT_PUBLIC_SITE_URL`

## Reseñas (opcional)
- [ ] Si quieren sección de opiniones: 2–3 reseñas reales elegidas por ellos, con enlace a Google o Tripadvisor (texto literal)
