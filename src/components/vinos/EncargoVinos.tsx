"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { SelectorFechaHora, primerDiaRecogida } from "@/components/ui/SelectorFechaHora";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { encargarVinos } from "@/lib/encargos/actions";
import { formatCentimos } from "@/lib/format";
import type { Cierre, Semana } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { CAVA_DE_REGALO, conCavaDeRegalo } from "@/lib/lanzamiento";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";
import { SITE } from "@/lib/site";

// El encargo de vinos para llevar (/vinos/encargar): se eligen botellas en la lista de la
// tienda, el resumen lleva la cuenta y el panel recoge los datos y el día y la hora a la
// que se pasará a recogerlo (con el local abierto). Sin pago online: se paga al recogerlo.
// El borrador se guarda en este navegador.

const CLAVE = "laofi:encargo-vinos";
const MAX_BOTELLAS = 48;

export interface LineaEncargo {
  vino: CartaItem;
  cantidad: number;
}

interface EncargoCtx {
  botellas: number;
  total: number;
  lineas: LineaEncargo[];
  hidratado: boolean;
  cantidad: (id: string) => number;
  cambiar: (id: string, n: number) => void;
  /** Abre el panel con los datos para dejarlo encargado. */
  abrir: () => void;
}

const Ctx = createContext<EncargoCtx | null>(null);

/** null fuera de la tienda de encargos (las cartas de vinos son solo de consulta). */
export const useEncargoVinos = () => useContext(Ctx);

const leerBorrador = (): Record<string, number> => {
  try {
    const v = JSON.parse(window.localStorage.getItem(CLAVE) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
};

export function EncargoVinos({
  secciones,
  locale,
  privacidadHref,
  semana,
  cierres,
  children,
}: {
  secciones: CartaSeccion[];
  locale: Locale;
  privacidadHref: string;
  /** Horario y cierres del local: los días y horas en que se puede pasar a recogerlo. */
  semana: Semana;
  cierres: readonly Cierre[];
  children: ReactNode;
}) {
  const vinos = useMemo(() => new Map(secciones.flatMap((s) => s.items).filter((v) => v.precioCentimos !== null).map((v) => [v.id, v])), [secciones]);
  const [encargo, setEncargo] = useState<Record<string, number>>({});
  const [hidratado, setHidratado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  // Solo los vinos que siguen en la carta.
  useEffect(() => {
    setEncargo(Object.fromEntries(Object.entries(leerBorrador()).filter(([id, n]) => vinos.has(id) && Number.isInteger(n) && n > 0)));
    setHidratado(true);
  }, [vinos]);

  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(encargo));
    } catch {}
  }, [encargo, hidratado]);

  const cambiar = useCallback((id: string, n: number) => {
    setEncargo((e) => {
      // Cambiar la cantidad no mueve la línea de sitio en el panel.
      if (n > 0) return { ...e, [id]: Math.min(n, MAX_BOTELLAS) };
      const resto = { ...e };
      delete resto[id];
      return resto;
    });
  }, []);
  const lineas = Object.entries(encargo).flatMap(([id, n]) => {
    const v = vinos.get(id);
    return v ? [{ vino: v, cantidad: n }] : [];
  });
  const botellas = lineas.reduce((a, l) => a + l.cantidad, 0);
  const total = lineas.reduce((a, l) => a + l.cantidad * (l.vino.precioCentimos ?? 0), 0);
  const abrir = useCallback(() => setAbierto(true), []);
  const ctx = useMemo<EncargoCtx>(
    () => ({ botellas, total, lineas, hidratado, cantidad: (id) => encargo[id] ?? 0, cambiar, abrir }),
    // lineas sale de encargo y vinos: basta con depender de ellos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [botellas, total, encargo, vinos, hidratado, cambiar, abrir],
  );

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {abierto ? (
        <PanelEncargo
          lineas={lineas}
          botellas={botellas}
          total={total}
          locale={locale}
          privacidadHref={privacidadHref}
          semana={semana}
          cierres={cierres}
          onVaciar={() => setEncargo({})}
          onCerrar={() => setAbierto(false)}
        />
      ) : null}
    </Ctx.Provider>
  );
}

/**
 * «+» y, con botellas, «− 2 +». En las fichas de la tienda, grande y relleno (se ve de
 * lejos que se puede añadir); en el panel del encargo, discreto.
 */
export function Botellas({ vino, variante = "tienda" }: { vino: CartaItem; variante?: "tienda" | "oscuro" | "panel" }) {
  const e = useEncargoVinos();
  if (!e || vino.precioCentimos === null) return null;
  const n = e.cantidad(vino.id);
  const panel = variante === "panel";
  const oscuro = variante === "oscuro";
  const tam = panel ? "h-8 w-8" : "h-9 w-9";
  const redondo = `grid ${tam} shrink-0 place-items-center rounded-full transition-[background-color,color,box-shadow,transform] duration-150 active:scale-90`;
  if (n === 0) {
    return (
      <button
        type="button"
        onClick={() => e.cambiar(vino.id, 1)}
        aria-label={`Añadir ${vino.nombre} al encargo`}
        title="Añadir al encargo"
        className={`${redondo} ring-1 ${
          oscuro ? "text-crema ring-crema/35 hover:bg-[#E2B98A] hover:text-carbon hover:ring-[#E2B98A]" : "text-carbon ring-carbon/30 hover:bg-carbon hover:text-crema hover:ring-carbon"
        }`}
      >
        <Icon name="plus" className="h-[1.1rem] w-[1.1rem]" />
      </button>
    );
  }
  const relleno = panel ? "bg-white ring-1 ring-carbon/15" : oscuro ? "bg-[#E2B98A] text-carbon" : "bg-carbon text-crema";
  const hover = panel ? "hover:bg-arena" : oscuro ? "hover:bg-black/10" : "hover:bg-white/10";
  return (
    <span
      className={`inline-flex ${panel ? "h-8 w-[5.5rem]" : "h-9 w-[6.25rem] motion-safe:animate-[encargo-abre_220ms_cubic-bezier(0.22,1,0.36,1)]"} shrink-0 items-center overflow-hidden rounded-full font-sans ${relleno}`}
    >
      <button type="button" onClick={() => e.cambiar(vino.id, n - 1)} aria-label={`Una botella menos de ${vino.nombre}`} className={`${redondo} ${hover}`}>
        <Icon name={n === 1 ? "close" : "minus"} className="h-4 w-4" />
      </button>
      <span aria-live="polite" className="flex-1 text-center text-sm font-semibold tabular-nums">
        {n}
        <span className="sr-only"> {n === 1 ? "botella" : "botellas"}</span>
      </span>
      <button
        type="button"
        onClick={() => e.cambiar(vino.id, n + 1)}
        disabled={n >= MAX_BOTELLAS}
        aria-label={`Una botella más de ${vino.nombre}`}
        className={`${redondo} disabled:opacity-40 ${hover}`}
      >
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </span>
  );
}

/**
 * La promoción del cava (CAVA_DE_REGALO): cuánto falta para el regalo, con una barra que se
 * llena, o «cava de regalo incluido» cuando el encargo pasa del importe.
 */
export function CavaDeRegalo({ total, oscuro = false, className = "" }: { total: number; oscuro?: boolean; className?: string }) {
  if (!CAVA_DE_REGALO) return null;
  const umbral = CAVA_DE_REGALO.masDeCentimos;
  const euros = formatCentimos(umbral).replace(/,00(\s?€)$/, "$1");
  if (conCavaDeRegalo(total)) {
    return (
      <p className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${oscuro ? "bg-[#E2B98A] text-carbon" : "bg-oliva-soft text-oliva"} ${className}`}>
        <Icon name="gift" className="h-4 w-4 shrink-0" />
        ¡Cava de regalo incluido en tu encargo!
      </p>
    );
  }
  const falta = umbral - total;
  return (
    <div className={`rounded-xl px-3.5 py-2.5 text-sm ${oscuro ? "bg-white/[0.08] text-crema/85" : "bg-[#F6F0E5] text-carbon-muted ring-1 ring-tinta-line"} ${className}`}>
      <p className="flex items-center gap-2.5">
        <Icon name="gift" className={`h-4 w-4 shrink-0 ${oscuro ? "text-[#E2B98A]" : "text-madera-oscura"}`} />
        <span>
          {total === 0 ? (
            <>
              Con más de {euros}, <b className={oscuro ? "text-crema" : "text-carbon"}>un cava de regalo</b>
            </>
          ) : falta > 0 ? (
            <>
              Te faltan <b className={`tabular-nums ${oscuro ? "text-crema" : "text-carbon"}`}>{formatCentimos(falta)}</b> para tu cava de regalo
            </>
          ) : (
            <>Una botella más y te regalamos un cava</>
          )}
        </span>
      </p>
      <span aria-hidden="true" className={`mt-2 block h-1 overflow-hidden rounded-full ${oscuro ? "bg-white/15" : "bg-carbon/10"}`}>
        <span className={`block h-full rounded-full transition-[width] duration-500 ${oscuro ? "bg-[#E2B98A]" : "bg-madera-oscura"}`} style={{ width: `${Math.min(100, (total / umbral) * 100)}%` }} />
      </span>
    </div>
  );
}

export const botellasTexto = (n: number) => `${n} ${n === 1 ? "botella" : "botellas"}`;

const DIA_RECOGE = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** «hoy a las 18:30», «mañana a las 12:00», «el viernes, 6 de noviembre a las 18:30». */
export function cuandoRecoge(fecha: string, hora: string, hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date())): string {
  const manana = new Date(`${hoy}T12:00:00Z`);
  manana.setUTCDate(manana.getUTCDate() + 1);
  if (fecha === hoy) return `hoy a las ${hora}`;
  if (fecha === manana.toISOString().slice(0, 10)) return `mañana a las ${hora}`;
  return `el ${DIA_RECOGE.format(new Date(`${fecha}T12:00:00Z`))} a las ${hora}`;
}

const campo =
  "h-12 w-full rounded-xl border border-carbon/15 bg-white px-4 text-base text-carbon placeholder:text-carbon-muted/70 focus:border-carbon focus:outline-none";

function PanelEncargo({
  lineas,
  botellas,
  total,
  locale,
  privacidadHref,
  semana,
  cierres,
  onVaciar,
  onCerrar,
}: {
  lineas: { vino: CartaItem; cantidad: number }[];
  botellas: number;
  total: number;
  locale: Locale;
  privacidadHref: string;
  semana: Semana;
  cierres: readonly Cierre[];
  onVaciar: () => void;
  onCerrar: () => void;
}) {
  const ref = useDialogA11y<HTMLDivElement>(onCerrar);
  const [f, setF] = useState({ nombre: "", telefono: "", email: "", notas: "", mayor_edad: false, web: "" });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<{ id: string; numero: number; botellas: number; total: number; cuando: string } | null>(null);
  // Cuándo pasa a recogerlo: de salida, hoy (o el primer día que abrimos) y la hora por elegir.
  const [recogida, setRecogida] = useState(() => ({ fecha: primerDiaRecogida(semana, cierres), hora: "" }));
  const recogidaRef = useRef<HTMLFieldSetElement>(null);

  const enviar = async () => {
    if (!recogida.hora) {
      setError("Elige a qué hora pasarás a recogerlo.");
      recogidaRef.current?.querySelector<HTMLButtonElement>("button[aria-labelledby$='-hora']")?.click();
      return;
    }
    setEnviando(true);
    setError(null);
    const r = await encargarVinos({
      ...f,
      recogida_fecha: recogida.fecha,
      recogida_hora: recogida.hora,
      lineas: lineas.map((l) => ({ id: l.vino.id, cantidad: l.cantidad })),
    });
    setEnviando(false);
    if (!r.ok) return setError(r.error);
    setHecho({ ...r.data, botellas, total, cuando: cuandoRecoge(recogida.fecha, recogida.hora) });
    onVaciar();
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="encargo-titulo"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-end justify-center bg-carbon/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div className="flex max-h-[94svh] w-full max-w-xl flex-col overflow-hidden rounded-t-[2rem] bg-[#F6F0E5] text-carbon shadow-lift animate-sheet-up sm:rounded-[2rem]">
        <header className="flex items-start justify-between gap-4 border-b border-tinta-line px-6 pb-5 pt-6">
          <div>
            <p className="kicker text-madera-oscura">Encargo para llevar</p>
            <h2 id="encargo-titulo" className="mt-1 font-display text-4xl font-light leading-none">
              {hecho ? "¡Encargado!" : "Tu encargo"}
            </h2>
          </div>
          <button type="button" onClick={onCerrar} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-carbon/15 hover:bg-white">
            <Icon name="close" />
            <span className="sr-only">Cerrar</span>
          </button>
        </header>

        {hecho ? (
          <div className="overflow-y-auto px-6 py-8">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-oliva text-crema">
              <Icon name="check" className="h-7 w-7" />
            </span>
            <p className="mt-5 font-display text-3xl leading-tight">Encargo nº {hecho.numero} recibido</p>
            <p className="mt-3 text-lg leading-relaxed text-carbon-muted">
              {botellasTexto(hecho.botellas)} · {formatCentimos(hecho.total)}. Te esperamos <b className="font-semibold text-carbon">{hecho.cuando}</b>: lo tendremos
              preparado y lo pagas en La Ofi. Te avisamos cuando esté listo (por email, WhatsApp o teléfono).
            </p>
            {conCavaDeRegalo(hecho.total) ? <CavaDeRegalo total={hecho.total} className="mt-5" /> : null}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link href={href(locale, `/encargo/${hecho.id}`)} className="btn bg-carbon text-crema hover:bg-[#1f1c18]">
                Ver mi encargo
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
              <button type="button" onClick={onCerrar} className="btn border border-carbon/20 hover:bg-white">
                Seguir viendo vinos
              </button>
            </div>
          </div>
        ) : (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              void enviar();
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              {lineas.length === 0 ? (
                <p className="py-6 text-center text-carbon-muted">Aún no has elegido ningún vino.</p>
              ) : (
                <ul className="divide-y divide-tinta-line">
                  {lineas.map(({ vino, cantidad }) => (
                    <li key={vino.id} className="flex items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-[1.2rem] leading-tight">{vino.nombre}</p>
                        {vino.descripcion ? <p className="truncate font-display text-sm italic text-carbon-muted">{vino.descripcion}</p> : null}
                      </div>
                      <Botellas vino={vino} variante="panel" />
                      <span className="min-w-16 shrink-0 whitespace-nowrap text-right font-display text-lg tabular-nums">{formatCentimos(cantidad * (vino.precioCentimos ?? 0))}</span>
                    </li>
                  ))}
                  {conCavaDeRegalo(total) ? (
                    <li className="flex items-center gap-3 py-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E2B98A] text-carbon">
                        <Icon name="gift" className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-[1.2rem] leading-tight">Cava de regalo</p>
                        <p className="font-display text-sm italic text-carbon-muted">Por tu encargo de Navidad</p>
                      </div>
                      <span className="min-w-16 shrink-0 text-right text-sm font-semibold uppercase tracking-[0.12em] text-oliva">Regalo</span>
                    </li>
                  ) : null}
                </ul>
              )}
              {lineas.length > 0 && !conCavaDeRegalo(total) ? <CavaDeRegalo total={total} className="mt-3" /> : null}

              <dl className="mt-2 flex items-baseline justify-between border-t-2 border-carbon pt-4">
                <dt className="text-sm text-carbon-muted">{botellasTexto(botellas)} · se paga al recoger</dt>
                <dd className="font-display text-3xl tabular-nums">{formatCentimos(total)}</dd>
              </dl>

              <ul className="mt-5 grid gap-2 rounded-2xl bg-white/70 p-4 text-sm text-carbon-muted ring-1 ring-tinta-line">
                <li className="flex gap-3">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-oliva" />
                  Sin pago online: lo pagas en La Ofi al recogerlo.
                </li>
                <li className="flex gap-3">
                  <Icon name="whatsapp" className="mt-0.5 h-4 w-4 shrink-0 text-oliva" />
                  Lo tenemos preparado para el día y la hora que elijas, y te avisamos cuando esté listo.
                </li>
                <li className="flex gap-3">
                  <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-oliva" />
                  Recogida en {SITE.address.street}, {SITE.address.locality}.
                </li>
              </ul>

              <fieldset ref={recogidaRef} className="mt-6">
                <legend className="mb-3 text-sm font-semibold">¿Cuándo pasas a recogerlo?</legend>
                <SelectorFechaHora semana={semana} cierres={cierres} fecha={recogida.fecha} hora={recogida.hora} onCambio={setRecogida} />
              </fieldset>

              <fieldset className="mt-6 grid gap-4 sm:grid-cols-2">
                <legend className="mb-3 text-sm font-semibold">Tus datos</legend>
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">Nombre</span>
                  <input required autoComplete="name" value={f.nombre} onChange={(e) => set({ nombre: e.target.value.slice(0, 60) })} className={campo} />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="font-semibold">Teléfono</span>
                  <input
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    minLength={9}
                    value={f.telefono}
                    onChange={(e) => set({ telefono: e.target.value.replace(/[^0-9+ ]/g, "").slice(0, 16) })}
                    className={campo}
                  />
                </label>
                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="font-semibold">
                    Email <span className="font-normal text-carbon-muted">(opcional, te confirmamos el encargo y te avisamos cuando esté listo)</span>
                  </span>
                  <input type="email" autoComplete="email" value={f.email} onChange={(e) => set({ email: e.target.value.slice(0, 120) })} className={campo} />
                </label>
                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="font-semibold">
                    Comentarios <span className="font-normal text-carbon-muted">(para regalo, alguna petición…)</span>
                  </span>
                  <textarea value={f.notas} onChange={(e) => set({ notas: e.target.value.slice(0, 300) })} rows={2} className={`${campo} h-auto py-3`} />
                </label>
                <label className="flex items-start gap-3 text-sm sm:col-span-2">
                  <input type="checkbox" required checked={f.mayor_edad} onChange={(e) => set({ mayor_edad: e.target.checked })} className="mt-0.5 h-5 w-5 shrink-0 accent-[#2B2722]" />
                  <span>Soy mayor de 18 años. Al recoger el encargo podemos pedirte el DNI.</span>
                </label>
              </fieldset>
              {/* Campo trampa anti-bots: oculto a personas y lectores de pantalla. */}
              <div aria-hidden="true" className="absolute -left-[9999px]">
                <label>
                  Web
                  <input tabIndex={-1} autoComplete="off" value={f.web} onChange={(e) => set({ web: e.target.value })} />
                </label>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-carbon-muted">
                Usamos estos datos solo para preparar tu encargo y avisarte (art. 6.1.b RGPD).{" "}
                <Link href={privacidadHref} className="underline">
                  Política de privacidad
                </Link>
                .
              </p>
            </div>

            <div className="border-t border-tinta-line bg-[#F6F0E5] px-6 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4">
              {error ? (
                <p role="alert" className="mb-3 text-sm font-semibold text-terracota">
                  {error}
                </p>
              ) : null}
              <button type="submit" disabled={enviando || lineas.length === 0} className="btn w-full bg-carbon text-crema hover:bg-[#1f1c18] disabled:opacity-50">
                <Icon name="wine" className="h-4 w-4" />
                {enviando ? "Enviando…" : `Dejar encargado · ${formatCentimos(total)}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
