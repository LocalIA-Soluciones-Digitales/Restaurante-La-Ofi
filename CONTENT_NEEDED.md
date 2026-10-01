# Contenido pendiente del propietario — Restaurante La Ofi

Checklist para la visita al restaurante. Lo marcado con ⚠️ bloquea el paso a producción.

## Autorizaciones
- [ ] ⚠️ Autorización por escrito para usar en la web sus fotos y vídeos de Instagram (@laofiparke) y Google Business
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
- [ ] Vídeo horizontal para el hero (10–20 s, sin audio)
- [ ] Vídeo vertical (reels/stories)
- [ ] ⚠️ Sustituir las 6 fotos de terceros listadas en `IMAGES_SOURCES.md`

## Datos del negocio
- [ ] ⚠️ Teléfono de reservas: confirmar **946 36 64 79** (el de Google) y configurarlo en `NEXT_PUBLIC_CONTACT_PHONE`. Hoy la demo usa **628 40 97 81**, número de pruebas de LocalIA.
- [ ] WhatsApp (si lo usan para reservas)
- [ ] ⚠️ Horario confirmado por día (desayunos, comidas, cenas, fines de semana). Hay 4 versiones contradictorias en internet.
- [ ] Email de contacto
- [ ] Aforos para publicarlos: comedor (¿70?), terraza cubierta (¿220?), parking (¿220 plazas?)

## Carta y menús
- [ ] ⚠️ Carta completa con precios y **alérgenos** (los 14 del Reglamento UE 1169/2011) por plato
- [ ] ¿Siguen vigentes los precios de la carta de tostadas publicada en Instagram? (seed opcional `supabase/seed/la_ofi_carta_desayunos_instagram.sql`)
- [ ] Menú del día: precio, qué incluye (pan, bebida, postre o café), días y horario
- [ ] Quién lo actualizará cada día (persona y usuario para el futuro /admin)

## Eventos
- [ ] Próximos eventos: tardeo mensual, música, partidos, con fecha, hora, precio y aforo
- [ ] Fotos de cada evento

## Legal
- [ ] ⚠️ Razón social, NIF/CIF y domicilio social (aviso legal y privacidad)
- [ ] Inscripción en el Registro Mercantil, si es sociedad

## Dominio
- [ ] ⚠️ Dominio (¿lo tienen?, ¿quién lo gestiona?) → `NEXT_PUBLIC_SITE_URL`

## Reseñas (opcional)
- [ ] Si quieren sección de opiniones: 2–3 reseñas reales elegidas por ellos, con enlace a Google o Tripadvisor (texto literal)
