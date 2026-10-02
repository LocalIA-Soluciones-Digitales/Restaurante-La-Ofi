# Print bridge — comandas automáticas de cocina y barra

Servicio local (Node.js) que escucha los pedidos de La Ofi en Supabase y, en cuanto
**una estación acepta** una comanda en `/admin/cocina` (pestaña Todos, Cocina o Barra),
imprime automáticamente esa estación en su impresora térmica (ESC/POS):

- **COCINA**: solo las líneas con estación `cocina`.
- **BARRA**: solo las líneas con estación `barra` (la estación de cada plato se
  configura en `/admin/carta`).

No imprime al crear el pedido sino al aceptarlo. Las comandas llevan número del día,
mesa o "Recoger a las 14:00", modificadores ("Punto: al punto") y notas. Los botones
"Imprimir" de `/admin/cocina`, `/admin/salon` y `/admin/tpv` siguen funcionando aparte
(diálogo de impresión del navegador) para reimprimir algo puntual.

Portado del `print-bridge/` de Palomita-Bar: mismo funcionamiento, adaptado al schema
`laofi` (RPC `laofi_admin_cocina`, Realtime sobre `laofi.pedidos` / `laofi.pedido_items`)
y con impresora de barra en red **o** por USB.

## 1. Requisitos

- Node.js 18 o superior en el PC de la barra/TPV.
- Impresora de cocina en red con IP fija y puerto `9100` (ESC/POS en crudo).
- Impresora de barra en red, o por USB en Windows (hace falta el nombre del
  **puerto**, p. ej. `USB001`, en *Propiedades de la impresora → Puertos*).
- Una cuenta de `/admin` dedicada a este servicio: créala en `/admin/staff` con rol
  **Cocina** (puede ver la cola, no puede cobrar ni editar la carta) y revócala sin
  afectar a nadie si hace falta.
- Las migraciones de La Ofi aplicadas en Supabase, con `laofi.pedidos` y
  `laofi.pedido_items` en la publicación `supabase_realtime` (lo hace la migración
  `20261002110000`).

## 2. Instalación

```bash
cd print-bridge
npm install
cp .env.example .env   # y rellénalo
npm run prueba         # imprime un ticket de prueba en cada impresora configurada
npm start
```

En consola:

```
Realtime: SUBSCRIBED
[OK] COCINA · pedido #12 · Mesa 4
[OK] BARRA · pedido #12 · Mesa 4
```

Al arrancar marca como ya impresas las estaciones que estuvieran aceptadas: solo
imprime lo que se acepte desde ese momento. Además de Realtime, revisa la cola cada
15 s por si se pierde algún evento.

## 3. Arranque automático con Windows (NSSM)

```powershell
nssm install LaOfiPrintBridge "C:\Program Files\nodejs\node.exe" "C:\ruta\print-bridge\src\index.js"
nssm set LaOfiPrintBridge AppDirectory "C:\ruta\print-bridge"
nssm start LaOfiPrintBridge
```

## 4. Problemas habituales

- **No conecta con la impresora de red**: revisa IP/puerto y que el PC y la impresora
  estén en la misma red (`ping`).
- **USB: `[ERROR] … BARRA`**: el puerto de `PRINTER_BARRA_PUERTO_WINDOWS` debe coincidir
  exactamente (mayúsculas incluidas). Prueba `copy /b archivo.txt USB001` en `cmd`.
- **Caracteres raros o no corta**: cambia `PRINTER_TIPO=STAR`.
- **No imprime nada**: la consola debe decir `Realtime: SUBSCRIBED`; si no, revisa
  `BRIDGE_EMAIL`/`BRIDGE_PASSWORD` y que la cuenta tenga rol en `/admin/staff`.
