"use client";

import { useCallback, useEffect, useState } from "react";
import { AvisoFlotante } from "@/components/admin/AvisoFlotante";
import { Aviso, botonPrimario, botonSecundario, card } from "@/components/admin/ui";
import { Icon, type IconName } from "@/components/ui/Icon";
import { avisoDePrueba, bajaAvisos, guardarAvisos, suscribirAvisos, type EstadoAvisos } from "@/lib/admin/actions";

// Clave pública VAPID de la plataforma (la misma que Pescadería Arrantza: la privada
// vive en los secretos de la Edge Function push-notify, que envía los avisos de los
// dos negocios). Es pública por diseño: el navegador comprueba con ella el emisor.
const VAPID_PUBLIC_KEY = "BBm9hTDmMZtrKirD_YlmHLaYRq1BW7dRbQShlyXEB-WgeXyX8kRQ1oq5zYGN1mtJILbzaaS0m5qb4kbXSBhj-l8";

const TIPOS: { clave: string; titulo: string; texto: string; icon: IconName }[] = [
  { clave: "reservas_comedor", titulo: "Reservas en el comedor", texto: "Con lo que van a comer: menú del día o carta.", icon: "calendar" },
  { clave: "reservas_despacho", titulo: "Reservas de El Despacho", texto: "Grupos y comidas de empresa.", icon: "briefcase" },
  { clave: "recogidas_menu", titulo: "Menús del día para recoger", texto: "Reservas de menús para llevar.", icon: "bag" },
  { clave: "pedidos_recoger", titulo: "Pedidos para recoger", texto: "Pedidos de «Pedir para llevar», con total y hora.", icon: "receipt" },
  { clave: "eventos", titulo: "Gente que se apunta a eventos", texto: "Cada vez que alguien reserva para un evento.", icon: "music" },
  { clave: "presupuestos", titulo: "Peticiones de presupuesto", texto: "Celebraciones y grupos grandes.", icon: "gift" },
  { clave: "pedidos_mesa", titulo: "Pedidos en mesa (QR)", texto: "Cada pedido desde una mesa. Mejor apagado si ya lo veis en cocina.", icon: "qr" },
];

type EstadoDispositivo = "cargando" | "no_soportado" | "instalar" | "denegado" | "desactivado" | "activado";

function base64AUint8(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalada = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.matchMedia("(display-mode: fullscreen)").matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const registro = () => navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin/" }).then(() => navigator.serviceWorker.ready);

async function guardarEnServidor(sub: PushSubscription) {
  const json = sub.toJSON();
  const r = await suscribirAvisos({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "", userAgent: navigator.userAgent });
  if (!r.ok) throw new Error(r.error);
}

/**
 * Avisos al móvil: arriba, activarlos en ESTE dispositivo (cada móvil o tablet se
 * activa en el suyo); abajo, qué avisos se mandan (para todos los dispositivos).
 */
export function AvisosMovil({ inicial, puedeEditar }: { inicial: EstadoAvisos; puedeEditar: boolean }) {
  const [tipos, setTipos] = useState(inicial.tipos);
  const [dispositivos, setDispositivos] = useState(inicial.dispositivos);
  const [estado, setEstado] = useState<EstadoDispositivo>("cargando");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) {
        return setEstado(esIOS() && !instalada() ? "instalar" : "no_soportado");
      }
      if (Notification.permission === "denied") return setEstado("denegado");
      const reg = await registro();
      const sub = await reg.pushManager.getSubscription();
      if (cancelado) return;
      if (sub && Notification.permission === "granted") {
        setEstado("activado");
        // Se vuelve a guardar al entrar: si push-notify la borró por caducada, vuelve a recibir.
        guardarEnServidor(sub).catch(() => undefined);
      } else setEstado("desactivado");
    })().catch(() => !cancelado && setEstado("no_soportado"));
    return () => {
      cancelado = true;
    };
  }, []);

  const activar = useCallback(async () => {
    setOcupado(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") return setEstado(permiso === "denied" ? "denegado" : "desactivado");
      const reg = await registro();
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64AUint8(VAPID_PUBLIC_KEY) }));
      await guardarEnServidor(sub);
      setEstado("activado");
      setDispositivos((n) => n + 1);
      const p = await avisoDePrueba();
      setAviso({ tono: "ok", texto: p.ok && p.data ? "Avisos activados. Te hemos mandado uno de prueba." : "Avisos activados en este dispositivo." });
    } catch (e) {
      setAviso({ tono: "error", texto: e instanceof Error ? e.message : "No se han podido activar los avisos." });
    } finally {
      setOcupado(false);
    }
  }, []);

  const desactivar = useCallback(async () => {
    setOcupado(true);
    try {
      const reg = await registro();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await bajaAvisos(sub.endpoint);
        await sub.unsubscribe();
        setDispositivos((n) => Math.max(0, n - 1));
      }
      setEstado("desactivado");
      setAviso({ tono: "ok", texto: "Este dispositivo ya no recibirá avisos." });
    } catch (e) {
      setAviso({ tono: "error", texto: e instanceof Error ? e.message : "No se han podido desactivar." });
    } finally {
      setOcupado(false);
    }
  }, []);

  const probar = async () => {
    setOcupado(true);
    const r = await avisoDePrueba();
    setOcupado(false);
    setAviso(r.ok && r.data ? { tono: "ok", texto: "Aviso de prueba enviado: debería llegarte en unos segundos." } : { tono: "error", texto: r.ok ? "El envío de avisos no está configurado todavía." : r.error });
  };

  const alternar = async (clave: string) => {
    const valor = !tipos[clave];
    setTipos((t) => ({ ...t, [clave]: valor }));
    const r = await guardarAvisos({ [clave]: valor });
    if (!r.ok) {
      setTipos((t) => ({ ...t, [clave]: !valor }));
      setAviso({ tono: "error", texto: r.error });
    } else setTipos(r.data);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-start">
      <AvisoFlotante aviso={aviso} onCerrar={() => setAviso(null)} />

      <section className={`${card} p-5 sm:p-6`} aria-labelledby="este-dispositivo">
        <div className="flex items-start gap-4">
          <span
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
              estado === "activado" ? "bg-oliva-soft text-oliva" : "bg-marino/[0.08] text-marino dark:bg-neon/15 dark:text-neon"
            }`}
          >
            <Icon name="bell" className="h-6 w-6" />
          </span>
          <div>
            <h2 id="este-dispositivo" className="font-display text-2xl">
              Este dispositivo
            </h2>
            <p className="mt-1 text-sm text-carbon-muted dark:text-crema/65">
              {estado === "activado"
                ? "Recibe avisos. Suenan y vibran aunque el panel esté cerrado."
                : "Activa los avisos en cada móvil o tablet que los tenga que recibir."}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {estado === "cargando" ? <p className="text-sm opacity-60">Comprobando…</p> : null}
          {estado === "desactivado" ? (
            <button type="button" onClick={() => void activar()} disabled={ocupado || !inicial.configurado} className={botonPrimario}>
              <Icon name="bell" className="h-4 w-4" />
              Activar avisos en este dispositivo
            </button>
          ) : null}
          {estado === "activado" ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void probar()} disabled={ocupado} className={botonPrimario}>
                Enviar un aviso de prueba
              </button>
              <button type="button" onClick={() => void desactivar()} disabled={ocupado} className={botonSecundario}>
                Desactivar aquí
              </button>
            </div>
          ) : null}
          {estado === "instalar" ? (
            <Aviso tono="info">
              En iPhone, los avisos solo funcionan con el panel instalado: en Safari, toca Compartir → «Añadir a pantalla de inicio», abre La Ofi desde
              ese icono y vuelve aquí.
            </Aviso>
          ) : null}
          {estado === "denegado" ? (
            <Aviso>Este navegador tiene los avisos bloqueados para La Ofi. Permítelos en los ajustes del navegador (candado junto a la dirección) y recarga.</Aviso>
          ) : null}
          {estado === "no_soportado" ? <Aviso tono="info">Este navegador no admite avisos. Prueba con Chrome en Android o con el panel instalado en iPhone.</Aviso> : null}
          {!inicial.configurado ? <Aviso tono="info">El envío de avisos aún no está dado de alta para La Ofi. Avisa a LocalIA.</Aviso> : null}
          <p className="text-xs text-carbon-muted dark:text-crema/55">
            {dispositivos === 1 ? "1 dispositivo recibe avisos." : `${dispositivos} dispositivos reciben avisos.`}
          </p>
        </div>
      </section>

      <section className={`${card} p-5 sm:p-6`} aria-labelledby="que-avisos">
        <h2 id="que-avisos" className="font-display text-2xl">
          Qué avisos se mandan
        </h2>
        <p className="mt-1 text-sm text-carbon-muted dark:text-crema/65">
          Solo de lo que entra por la web. Vale para todos los dispositivos.{puedeEditar ? "" : " Lo cambia el encargado."}
        </p>
        <ul className="mt-4 divide-y divide-carbon/[0.08] dark:divide-crema/10">
          {TIPOS.map((t) => {
            const on = Boolean(tipos[t.clave]);
            return (
              <li key={t.clave} className="flex items-center gap-4 py-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-arena text-carbon dark:bg-noche-3 dark:text-crema">
                  <Icon name={t.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{t.titulo}</span>
                  <span className="block text-sm text-carbon-muted dark:text-crema/60">{t.texto}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={t.titulo}
                  disabled={!puedeEditar}
                  onClick={() => void alternar(t.clave)}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? "bg-oliva" : "bg-carbon/20 dark:bg-crema/20"}`}
                >
                  <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] ${on ? "left-7" : "left-1"}`} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
