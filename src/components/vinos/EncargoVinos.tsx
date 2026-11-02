"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { encargarVinos } from "@/lib/encargos/actions";
import { formatCentimos } from "@/lib/format";
import { href, type Locale } from "@/lib/i18n";
import type { CartaItem, CartaSeccion } from "@/lib/restaurant/types";
import { SITE } from "@/lib/site";

// El encargo de vinos para llevar: se eligen botellas en la propia carta de /vinos, una
// barra abajo lleva la cuenta y el panel recoge los datos. Sin fecha ni pago online: se
// recoge y se paga en el local. El borrador se guarda en este navegador.

const CLAVE = "laofi:encargo-vinos";
const MAX_BOTELLAS = 48;

interface EncargoCtx {
  cantidad: (id: string) => number;
  cambiar: (id: string, n: number) => void;
}

const Ctx = createContext<EncargoCtx | null>(null);

/** null fuera de /vinos (la carta de vinos al final de /carta es solo de consulta). */
export const useEncargoVinos = () => useContext(Ctx);

const leerBorrador = (): Record<string, number> => {
  try {
    const v = JSON.parse(window.localStorage.getItem(CLAVE) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
};

export function EncargoVinos({ secciones, locale, privacidadHref, children }: { secciones: CartaSeccion[]; locale: Locale; privacidadHref: string; children: ReactNode }) {
  const vinos = useMemo(() => new Map(secciones.flatMap((s) => s.items).filter((v) => v.precioCentimos !== null).map((v) => [v.id, v])), [secciones]);
  const [encargo, setEncargo] = useState<Record<string, number>>({});
  const [hidratado, setHidratado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  // Solo los vinos que siguen en la carta.
  useEffect(() => {
    const b = leerBorrador();
    setEncargo(Object.fromEntries(Object.entries(b).filter(([id, n]) => vinos.has(id) && Number.isInteger(n) && n > 0)));
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
  const ctx = useMemo<EncargoCtx>(() => ({ cantidad: (id) => encargo[id] ?? 0, cambiar }), [encargo, cambiar]);

  const lineas = Object.entries(encargo).flatMap(([id, n]) => {
    const v = vinos.get(id);
    return v ? [{ vino: v, cantidad: n }] : [];
  });
  const botellas = lineas.reduce((a, l) => a + l.cantidad, 0);
  const total = lineas.reduce((a, l) => a + l.cantidad * (l.vino.precioCentimos ?? 0), 0);

  return (
    <Ctx.Provider value={ctx}>
      {children}
      {hidratado && botellas > 0 && !abierto ? <BarraEncargo botellas={botellas} total={total} onAbrir={() => setAbierto(true)} /> : null}
      {abierto ? (
        <PanelEncargo
          lineas={lineas}
          botellas={botellas}
          total={total}
          locale={locale}
          privacidadHref={privacidadHref}
          onVaciar={() => setEncargo({})}
          onCerrar={() => setAbierto(false)}
        />
      ) : null}
    </Ctx.Provider>
  );
}

/** − 2 + : en la carta y en el panel. Sin botellas, solo el «+». */
export function Botellas({ vino, claro = false }: { vino: CartaItem; claro?: boolean }) {
  const e = useEncargoVinos();
  if (!e || vino.precioCentimos === null) return null;
  const n = e.cantidad(vino.id);
  const redondo = "grid h-9 w-9 place-items-center rounded-full transition-[background-color,transform] duration-150 active:scale-90";
  if (n === 0) {
    return (
      <button
        type="button"
        onClick={() => e.cambiar(vino.id, 1)}
        aria-label={`Encargar ${vino.nombre}`}
        className={`${redondo} shrink-0 border border-carbon/20 text-carbon hover:border-carbon hover:bg-carbon hover:text-crema`}
      >
        <Icon name="plus" className="h-4 w-4" />
      </button>
    );
  }
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full ${claro ? "bg-white ring-1 ring-carbon/15" : "bg-carbon text-crema"} motion-safe:animate-bump`}>
      <button type="button" onClick={() => e.cambiar(vino.id, n - 1)} aria-label={`Una botella menos de ${vino.nombre}`} className={`${redondo} ${claro ? "hover:bg-arena" : "hover:bg-white/10"}`}>
        <Icon name={n === 1 ? "close" : "minus"} className="h-3.5 w-3.5" />
      </button>
      <span aria-live="polite" className="min-w-6 text-center text-sm font-semibold tabular-nums">
        {n}
        <span className="sr-only"> {n === 1 ? "botella" : "botellas"}</span>
      </span>
      <button
        type="button"
        onClick={() => e.cambiar(vino.id, n + 1)}
        disabled={n >= MAX_BOTELLAS}
        aria-label={`Una botella más de ${vino.nombre}`}
        className={`${redondo} disabled:opacity-40 ${claro ? "hover:bg-arena" : "hover:bg-white/10"}`}
      >
        <Icon name="plus" className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

const botellasTexto = (n: number) => `${n} ${n === 1 ? "botella" : "botellas"}`;

function BarraEncargo({ botellas, total, onAbrir }: { botellas: number; total: number; onAbrir: () => void }) {
  const [latido, setLatido] = useState(0);
  const prev = useRef(botellas);
  useEffect(() => {
    if (botellas > prev.current) setLatido((n) => n + 1);
    prev.current = botellas;
  }, [botellas]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6 sm:pb-6">
      <button
        type="button"
        onClick={onAbrir}
        className="pointer-events-auto mx-auto flex w-full max-w-xl items-center gap-3 rounded-full bg-carbon py-2 pl-2 pr-5 text-crema shadow-[0_24px_50px_-16px_rgb(43_39_34/0.75)] ring-1 ring-white/10 animate-sheet-up hover:bg-[#1f1c18]"
      >
        <span key={latido} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#E2B98A] text-carbon motion-safe:animate-bump">
          <Icon name="wine" className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1 text-left leading-tight">
          <span className="block text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#E2B98A]">Tu encargo</span>
          <span className="block truncate font-semibold">{botellasTexto(botellas)}</span>
        </span>
        <span className="font-display text-xl tabular-nums">{formatCentimos(total)}</span>
        <Icon name="chevronUp" className="h-5 w-5 shrink-0" />
      </button>
    </div>
  );
}

const campo =
  "h-12 w-full rounded-xl border border-carbon/15 bg-white px-4 text-base text-carbon placeholder:text-carbon-muted/70 focus:border-carbon focus:outline-none";

function PanelEncargo({
  lineas,
  botellas,
  total,
  locale,
  privacidadHref,
  onVaciar,
  onCerrar,
}: {
  lineas: { vino: CartaItem; cantidad: number }[];
  botellas: number;
  total: number;
  locale: Locale;
  privacidadHref: string;
  onVaciar: () => void;
  onCerrar: () => void;
}) {
  const ref = useDialogA11y<HTMLDivElement>(onCerrar);
  const [f, setF] = useState({ nombre: "", telefono: "", email: "", notas: "", mayor_edad: false, web: "" });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<{ id: string; numero: number; botellas: number; total: number } | null>(null);

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    const r = await encargarVinos({ ...f, lineas: lineas.map((l) => ({ id: l.vino.id, cantidad: l.cantidad })) });
    setEnviando(false);
    if (!r.ok) return setError(r.error);
    setHecho({ ...r.data, botellas, total });
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
              {botellasTexto(hecho.botellas)} · {formatCentimos(hecho.total)}. Lo preparamos y te avisamos por WhatsApp o por teléfono cuando esté listo. Lo pagas al
              recogerlo en La Ofi.
            </p>
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
                      <Botellas vino={vino} claro />
                      <span className="min-w-16 shrink-0 whitespace-nowrap text-right font-display text-lg tabular-nums">{formatCentimos(cantidad * (vino.precioCentimos ?? 0))}</span>
                    </li>
                  ))}
                </ul>
              )}

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
                  Te avisamos cuando esté preparado para pasar a por él.
                </li>
                <li className="flex gap-3">
                  <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-oliva" />
                  Recogida en {SITE.address.street}, {SITE.address.locality}.
                </li>
              </ul>

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
                    Email <span className="font-normal text-carbon-muted">(opcional)</span>
                  </span>
                  <input type="email" autoComplete="email" value={f.email} onChange={(e) => set({ email: e.target.value.slice(0, 120) })} className={campo} />
                </label>
                <label className="grid gap-1 text-sm sm:col-span-2">
                  <span className="font-semibold">
                    Comentarios <span className="font-normal text-carbon-muted">(para regalo, cuándo te viene bien pasar…)</span>
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
