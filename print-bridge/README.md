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

- Node.js 18 o superior en el PC de la barra/TPV (el instalador lo pone si falta).
- Impresora de cocina en red con IP fija y puerto `9100` (ESC/POS en crudo).
- Impresora de barra en red, o por USB en Windows (hace falta el nombre del
  **puerto**, p. ej. `USB001`, en *Propiedades de la impresora → Puertos*).
- Una cuenta dedicada a este servicio con rol **Cocina** (puede ver la cola, no puede
  cobrar ni editar la carta), que se revoca sin afectar a nadie: créala en Supabase →
  Authentication → Add user (con *Auto Confirm*) y vincúlala con
  `select public.laofi_vincular_staff('<user_id>', 'Impresoras', 'cocina');` (SQL editor).
  En La Ofi se usa la misma cuenta compartida con la que la TPV entra en `/admin`
  (rol encargado): la TPV ya tiene esa sesión abierta, así que una cuenta aparte no
  añade protección.
- Las migraciones de La Ofi aplicadas en Supabase, con `laofi.pedidos` y
  `laofi.pedido_items` en la publicación `supabase_realtime` (lo hace la migración
  `20261002110000`).

## 2. Instalación

### En la TPV con Windows (recomendado)

En PowerShell **como administrador**:

```powershell
irm https://raw.githubusercontent.com/LocalIA-Soluciones-Digitales/Restaurante-La-Ofi/main/print-bridge/instalar.ps1 | iex
```

[`instalar.ps1`](./instalar.ps1) instala Node si falta, descarga el servicio en
`C:\laofi\print-bridge`, pregunta las IPs de las impresoras y la cuenta (comprueba
ambas), imprime un ticket de prueba y lo deja arrancando solo con Windows (tarea
programada `LaOfiPrintBridge` como SYSTEM, que lo relanza si se cae; log en
`bridge.log`). Opcionalmente quita la suspensión y fija las horas activas de Windows
Update. Para cambiar IPs o cuenta, se vuelve a ejecutar. No hace falta NSSM.

También deja la TPV como puesto fijo del panel (opcional, pregunta antes):

- **Panel al encender**: acceso directo en Inicio de Windows (todos los usuarios) y en
  el escritorio que abre `https://www.laofiparke.com/admin` en Chrome en modo
  aplicación, maximizado y con `--kiosk-printing` (imprime sin diálogo en la
  impresora predeterminada). No es kiosko bloqueado: en la TPV sigue su programa de
  cobro. Se entra en el panel **una vez** con la cuenta de la TPV (rol Sala) desde la
  sesión de Windows de la TPV; la sesión se conserva entre reinicios.
- **Inicio de sesión automático**: con Autologon de Sysinternals (contraseña cifrada).
  Con una cuenta Microsoft (correo) se hace a mano: `Win+R` → `netplwiz` → desmarcar
  *Los usuarios deben escribir su nombre y contraseña*. Si esa casilla no aparece:
  Configuración → Cuentas → Opciones de inicio de sesión → desactivar *Para mayor
  seguridad, permitir solo el inicio de sesión de Windows Hello*.

### A mano (otros sistemas o desarrollo)

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

## 3. Arranque automático con NSSM (si no se usa `instalar.ps1`)

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
  `BRIDGE_EMAIL`/`BRIDGE_PASSWORD` y que la cuenta tenga fila activa en `laofi.staff`.
  Con el instalador: `Get-Content C:\laofi\print-bridge\bridge.log -Tail 30`.
