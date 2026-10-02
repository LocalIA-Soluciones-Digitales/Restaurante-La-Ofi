// Print bridge de Restaurante La Ofi (portado del de Palomita-Bar, ver README).
// Escucha los pedidos en Supabase (schema laofi, Realtime + sondeo de respaldo)
// e imprime en ESC/POS la comanda de cada estación (COCINA / BARRA) en cuanto
// esa estación la ACEPTA en /admin/cocina. No imprime al crear el pedido.
import "dotenv/config";
import { execFile } from "node:child_process";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { PrinterTypes, ThermalPrinter } from "node-thermal-printer";

const env = process.env;
const PRUEBA = process.argv.includes("--prueba");

for (const k of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "BRIDGE_EMAIL", "BRIDGE_PASSWORD"]) {
  if (!env[k]) {
    console.error(`Falta ${k}. Copia .env.example a .env y rellénalo.`);
    process.exit(1);
  }
}
if (!env.PRINTER_COCINA_INTERFACE && !env.PRINTER_BARRA_INTERFACE && !env.PRINTER_BARRA_PUERTO_WINDOWS) {
  console.error("No hay ninguna impresora configurada (PRINTER_COCINA_INTERFACE / PRINTER_BARRA_*).");
  process.exit(1);
}

const tipo = env.PRINTER_TIPO === "STAR" ? PrinterTypes.STAR : PrinterTypes.EPSON;
const nuevaImpresora = (iface) => new ThermalPrinter({ type: tipo, interface: iface, width: 42, removeSpecialCharacters: false, options: { timeout: 5000 } });

// Destinos: impresora de red (execute) o puerto USB de Windows (copy /b del buffer).
const destinos = {
  cocina: env.PRINTER_COCINA_INTERFACE ? { printer: nuevaImpresora(env.PRINTER_COCINA_INTERFACE), red: true } : null,
  barra: env.PRINTER_BARRA_INTERFACE
    ? { printer: nuevaImpresora(env.PRINTER_BARRA_INTERFACE), red: true }
    : env.PRINTER_BARRA_PUERTO_WINDOWS
      ? { printer: nuevaImpresora("tcp://127.0.0.1:9100"), red: false, puerto: env.PRINTER_BARRA_PUERTO_WINDOWS }
      : null,
};

async function enviarAPuertoWindows(buffer, puerto) {
  const archivo = join(tmpdir(), `laofi-${Date.now()}-${Math.random().toString(16).slice(2)}.prn`);
  await writeFile(archivo, buffer);
  try {
    await new Promise((resolve, reject) =>
      execFile("cmd", ["/c", "copy", "/b", archivo, puerto], (err, _o, stderr) => (err ? reject(new Error(stderr || err.message)) : resolve())),
    );
  } finally {
    await unlink(archivo).catch(() => {});
  }
}

const hora = (iso) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

function etiqueta(p) {
  if (p.tipo === "MESA" && p.mesa) return p.mesa.nombre ?? `Mesa ${p.mesa.numero}`;
  if (p.tipo === "RECOGIDA") return `RECOGER ${p.grupo ? `${p.grupo} · ` : ""}${p.nombre_cliente ?? ""}`;
  return p.nombre_cliente ? `Barra · ${p.nombre_cliente}` : "Barra";
}

function construir(printer, p, items, estacion) {
  printer.clear();
  printer.alignCenter();
  printer.bold(true);
  printer.setTextDoubleHeight();
  printer.println(`* ${estacion.toUpperCase()} *`);
  printer.setTextQuadArea();
  printer.println(`#${p.numero_dia}`);
  printer.setTextNormal();
  printer.println(etiqueta(p));
  printer.bold(false);
  const extra = [p.mesa?.zona, p.mesa?.comensales ? `${p.mesa.comensales} pax` : null, p.camarero ?? p.participante].filter(Boolean).join(" · ");
  if (extra) printer.println(extra);
  if (p.recogida_en) {
    printer.bold(true);
    printer.println(`Recoger a las ${hora(p.recogida_en)}`);
    printer.bold(false);
  }
  printer.println(new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" }));
  printer.alignLeft();
  if (p.notas) printer.println(`Notas: ${p.notas}`);
  printer.drawLine();
  for (const it of items) {
    printer.bold(true);
    printer.setTextDoubleHeight();
    printer.println(`${it.cantidad} x ${it.nombre}`);
    printer.setTextNormal();
    printer.bold(false);
    for (const m of it.modificadores ?? []) printer.println(`   · ${m.modificador}: ${m.opciones.map((o) => o.nombre).join(", ")}`);
    if (it.notas) printer.println(`   -> ${it.notas}`);
  }
  printer.drawLine();
  printer.alignCenter();
  printer.println(`${items.reduce((n, i) => n + i.cantidad, 0)} producto(s)`);
  printer.newLine();
  printer.cut();
}

async function imprimir(estacion, p, items) {
  const d = destinos[estacion];
  if (!d) return;
  try {
    construir(d.printer, p, items, estacion);
    if (d.red) await d.printer.execute();
    else await enviarAPuertoWindows(d.printer.getBuffer(), d.puerto);
    console.log(`[OK] ${estacion.toUpperCase()} · pedido #${p.numero_dia} · ${etiqueta(p)}`);
  } catch (err) {
    console.error(`[ERROR] ${estacion.toUpperCase()} · pedido #${p.numero_dia}:`, err.message);
  }
}

/** Una estación está aceptada cuando ninguna de sus líneas activas sigue en RECEIVED. */
const aceptada = (items) => items.length > 0 && items.every((i) => i.estado !== "RECEIVED");
const deEstacion = (p, est) => (p.items ?? []).filter((i) => i.estacion === est && i.estado !== "CANCELLED");

const impresos = { cocina: new Set(), barra: new Set() };
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

async function cola() {
  const { data, error } = await supabase.rpc("laofi_admin_cocina", { p_historial: false });
  if (error) {
    console.error("[ERROR] laofi_admin_cocina:", error.message);
    return [];
  }
  return data ?? [];
}

let revisando = false;
async function revisar() {
  if (revisando) return;
  revisando = true;
  try {
    for (const p of await cola()) {
      for (const est of ["cocina", "barra"]) {
        const items = deEstacion(p, est);
        if (!impresos[est].has(p.id) && aceptada(items)) {
          impresos[est].add(p.id);
          await imprimir(est, p, items);
        }
      }
    }
  } finally {
    revisando = false;
  }
}

async function main() {
  if (PRUEBA) {
    const p = { numero_dia: 0, tipo: "BARRA", nombre_cliente: "PRUEBA", items: [], notas: "Ticket de prueba del print-bridge" };
    for (const est of ["cocina", "barra"]) await imprimir(est, p, [{ cantidad: 1, nombre: "Prueba de impresión", modificadores: [], notas: null }]);
    process.exit(0);
  }

  console.log("Iniciando sesión en Supabase…");
  const { error } = await supabase.auth.signInWithPassword({ email: env.BRIDGE_EMAIL, password: env.BRIDGE_PASSWORD });
  if (error) {
    console.error("No se pudo iniciar sesión:", error.message);
    process.exit(1);
  }

  // No reimprimir lo ya aceptado antes de arrancar.
  for (const p of await cola()) for (const est of ["cocina", "barra"]) if (aceptada(deEstacion(p, est))) impresos[est].add(p.id);
  console.log("Listo. Esperando aceptaciones…");

  const canal = supabase
    .channel("laofi-print-bridge")
    .on("postgres_changes", { event: "*", schema: "laofi", table: "pedidos" }, () => void revisar())
    .on("postgres_changes", { event: "*", schema: "laofi", table: "pedido_items" }, () => void revisar())
    .subscribe((estado) => console.log("Realtime:", estado));

  // Respaldo por si se pierde algún evento (red inestable, reconexiones).
  setInterval(() => void revisar(), 15_000);
  // Las sesiones caducan: se renuevan solas, pero se registra por si falla.
  supabase.auth.onAuthStateChange((evento) => evento === "SIGNED_OUT" && console.error("[AVISO] Sesión cerrada: reinicia el servicio."));

  process.on("SIGINT", () => {
    void supabase.removeChannel(canal);
    process.exit(0);
  });
}

main();
