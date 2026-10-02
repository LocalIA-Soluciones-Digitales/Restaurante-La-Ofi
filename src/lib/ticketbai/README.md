# TicketBAI / Batuz (Bizkaia) — scaffold, **no activo**

La Ofi está en Derio (Bizkaia): TicketBAI es obligatorio para su facturación. Este módulo
es el scaffold de Palomita-Bar (`ARCHITECTURE.md` §19 de Palomita), portado al schema
`laofi`. Está **apagado**: sin `TICKETBAI_ENABLED=true` no hace nada y las cuentas se
imprimen igual que siempre.

## Qué hay

| Pieza | Estado |
|---|---|
| `crc8.ts`, `identificador.ts`, `qr.ts` | Copiados de Palomita, verificados contra los ejemplos numéricos del documento oficial "Especificaciones funcionales y técnicas TicketBAI 1.2" (CRC `237` del identificativo de ejemplo). Tests en `ticketbai.test.ts`. |
| `xml.ts` | Generador del fichero TBAI sin firmar (Anexo 1). **Pendiente de validar contra el XSD real** de Bizkaia (ver comentario del archivo). |
| `firma.ts` | **Sin implementar a propósito**: necesita el certificado digital del titular y XAdES-BES. |
| `envio.ts` | **Sin implementar**: falta confirmar el canal Batuz/LROE. |
| `index.ts` | Orquestación: líneas desde `laofi.pedido_items` (IVA por línea desde `laofi.productos.iva_pct`, invitaciones excluidas), numeración y encadenamiento atómicos (`laofi_tbai_crear`), XML, firma, identificativo y QR. Idempotente: reimprimir = `*** DUPLICADO ***`. |
| SQL | `laofi.ticketbai_facturas` + `laofi_tbai_*` (migración `20261002130000`), escritura SOLO `service_role`; el staff solo lee. Un borrador nunca firmado se descarta antes de numerar (sin huecos en la serie). |
| `/api/ticketbai/emitir` | Lo llama "Imprimir cuenta" en `/admin/salon` (solo staff de sala). |

## Para activarlo (en este orden)

1. Certificado digital del titular de La Ofi (razón social y NIF pendientes en `CONTENT_NEEDED.md`).
2. Implementar y probar la firma en `firma.ts` contra el entorno de pruebas de Bizkaia.
3. Alta en el registro de software TicketBAI → `TICKETBAI_LICENCIA`, `TICKETBAI_ENTIDAD_DESARROLLADORA_NIF`.
4. Validar `xml.ts` contra el XSD y completar `envio.ts`.
5. Elegir una serie que no use ningún otro TPV del local (`TICKETBAI_SERIE`, por defecto `WEB`).
6. Variables (solo servidor): `TICKETBAI_ENABLED=true`, `TICKETBAI_NIF`, `TICKETBAI_RAZON_SOCIAL`, `TICKETBAI_SERIE`,
   `TICKETBAI_LICENCIA`, `TICKETBAI_ENTIDAD_DESARROLLADORA_NIF`, `TICKETBAI_SOFTWARE_NOMBRE`, `TICKETBAI_SOFTWARE_VERSION`.
