"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { anularEncargo, obtenerEncargo, type EncargoPublico } from "@/lib/encargos/actions";
import { recogidaEnFrase } from "@/lib/encargos/recogida";
import { formatCentimos } from "@/lib/format";
import { conCavaDeRegalo } from "@/lib/lanzamiento";
import { SITE } from "@/lib/site";

const PASOS: { label: string; icon: IconName }[] = [
  { label: "Recibido", icon: "check" },
  { label: "Confirmado", icon: "wine" },
  { label: "Listo", icon: "bag" },
];

const paso = (e: EncargoPublico["estado"]) => (e === "PENDIENTE" ? 0 : e === "CONFIRMADO" ? 1 : 2);

/**
 * Cómo va el encargo de vino: recibido, confirmado, listo para recoger (o entregado y
 * anulado). Mientras no está listo se consulta cada 30 s (anon no tiene Realtime).
 */
export function EncargoSeguimiento({ inicial, vinosHref }: { inicial: EncargoPublico; vinosHref: string }) {
  const [e, setE] = useState(inicial);
  const [anulando, setAnulando] = useState<"no" | "preguntar" | "enviando">("no");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (e.estado !== "PENDIENTE" && e.estado !== "CONFIRMADO") return;
    const t = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      const x = await obtenerEncargo(e.id);
      if (x.ok && x.data) setE(x.data);
    }, 30_000);
    return () => window.clearInterval(t);
  }, [e.id, e.estado]);

  const anular = async () => {
    setAnulando("enviando");
    setError(null);
    const x = await anularEncargo(e.id);
    setAnulando("no");
    if (!x.ok) return setError(x.error);
    setE(x.data);
  };

  const anulado = e.estado === "CANCELADO";
  const entregado = e.estado === "ENTREGADO";
  const actual = paso(e.estado);
  const mensaje = anulado
    ? "Este encargo está anulado. Si quieres otros vinos, vuelve a encargarlos o llámanos."
    : entregado
      ? "Entregado. ¡Que lo disfrutéis y felices fiestas!"
      : e.estado === "LISTO"
        ? e.recogida_en
          ? `Tu encargo está listo: te esperamos ${recogidaEnFrase(e.recogida_en)}. Lo pagas aquí, en La Ofi.`
          : "Tu encargo está listo: pasa a recogerlo cuando quieras mientras estemos abiertos. Lo pagas aquí, en La Ofi."
        : e.estado === "CONFIRMADO"
          ? "Confirmado: lo estamos preparando. Te avisamos cuando esté listo."
          : "Hemos recibido tu encargo. Lo revisamos y te avisamos cuando esté listo (esta página también se actualiza sola).";

  return (
    <article className="overflow-hidden rounded-[2rem] border border-carbon/10 bg-[#F6F0E5] text-carbon shadow-lift">
      <header className={`px-6 py-8 text-crema sm:px-8 ${anulado ? "bg-carbon-muted" : e.estado === "LISTO" || entregado ? "bg-oliva" : "bg-carbon"}`}>
        <p className="kicker text-[#E2B98A]">Encargo de vino nº {e.numero}</p>
        <h1 className="mt-2 font-display text-5xl font-light">Tu encargo</h1>
        <p aria-live="polite" className="mt-3 text-lg text-crema/85">
          {mensaje}
        </p>
        {e.recogida_en && !anulado && !entregado ? (
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-crema/10 px-4 py-2 text-sm font-semibold text-crema">
            <Icon name="clock" className="h-4 w-4 text-[#E2B98A]" />
            Recogida {recogidaEnFrase(e.recogida_en)}
          </p>
        ) : null}
      </header>

      {!anulado && !entregado ? (
        <ol className="grid grid-cols-3 gap-1 px-4 py-6 sm:px-8" aria-label="Estado del encargo">
          {PASOS.map((s, i) => {
            const hecho = i <= actual;
            const ahora = i === actual;
            return (
              <li key={s.label} aria-current={ahora ? "step" : undefined} className="flex flex-col items-center gap-2 text-center">
                <span
                  className={`grid h-11 w-11 place-items-center rounded-full transition-colors duration-500 ${hecho ? "bg-carbon text-crema" : "bg-arena text-carbon-muted"} ${
                    ahora && e.estado !== "LISTO" ? "ring-4 ring-[#E2B98A]/60 motion-safe:animate-pulse" : ""
                  }`}
                >
                  <Icon name={s.icon} className="h-5 w-5" />
                </span>
                <span className={`text-xs font-semibold ${hecho ? "text-carbon" : "text-carbon-muted"}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>
      ) : null}

      <ul className="divide-y divide-tinta-line border-t border-tinta-line px-6 sm:px-8">
        {e.lineas.map((l, i) => (
          <li key={i} className="flex items-baseline gap-3 py-3">
            <span className="w-8 shrink-0 font-semibold tabular-nums">{l.cantidad}×</span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl leading-tight">{l.nombre}</span>
              {l.detalle ? <span className="block font-display text-sm italic text-carbon-muted">{l.detalle}</span> : null}
            </span>
            <span className="shrink-0 font-display text-lg tabular-nums">{formatCentimos(l.cantidad * l.precio_centimos)}</span>
          </li>
        ))}
        {!anulado && conCavaDeRegalo(e.total_centimos) ? (
          <li className="flex items-center gap-4 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E2B98A] text-carbon">
              <Icon name="gift" className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl leading-tight">Cava de regalo</span>
              <span className="block font-display text-sm italic text-carbon-muted">Por tu encargo de Navidad de más de 50 €</span>
            </span>
            <span className="shrink-0 text-sm font-semibold uppercase tracking-[0.12em] text-oliva">Regalo</span>
          </li>
        ) : null}
      </ul>
      <dl className="mx-6 flex items-baseline justify-between border-t-2 border-carbon py-4 sm:mx-8">
        <dt className="text-sm text-carbon-muted">
          {e.botellas} {e.botellas === 1 ? "botella" : "botellas"} · {entregado ? "pagado en el local" : "se paga al recoger"}
        </dt>
        <dd className="font-display text-3xl tabular-nums">{formatCentimos(e.total_centimos)}</dd>
      </dl>

      <div className="flex flex-wrap gap-3 border-t border-tinta-line px-6 py-5 sm:px-8">
        {!anulado && !entregado ? (
          <a href={SITE.maps.directions} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-11 text-sm">
            <Icon name="pin" className="h-4 w-4" />
            Cómo llegar
          </a>
        ) : (
          <Link href={vinosHref} className="btn min-h-11 bg-carbon text-sm text-crema hover:bg-[#1f1c18]">
            <Icon name="wine" className="h-4 w-4" />
            Ver la carta de vinos
          </Link>
        )}
        <a href={SITE.phone.href} className="btn-secondary min-h-11 text-sm">
          <Icon name="phone" className="h-4 w-4" />
          {SITE.phone.display}
        </a>
      </div>

      {e.cancelable ? (
        <div className="border-t border-tinta-line px-6 py-5 sm:px-8">
          {anulando === "no" ? (
            <button type="button" onClick={() => setAnulando("preguntar")} className="text-sm font-semibold text-terracota underline underline-offset-4">
              Ya no lo necesito: anular el encargo
            </button>
          ) : (
            <div className="rounded-2xl bg-terracota-soft/60 p-4">
              <p className="text-sm">¿Seguro que quieres anularlo?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void anular()} disabled={anulando === "enviando"} className="btn-primary min-h-11 bg-terracota text-sm">
                  {anulando === "enviando" ? "Anulando…" : "Sí, anularlo"}
                </button>
                <button type="button" onClick={() => setAnulando("no")} className="btn-secondary min-h-11 text-sm">
                  No, lo mantengo
                </button>
              </div>
            </div>
          )}
          {error ? <p className="mt-3 text-sm text-terracota">{error}</p> : null}
        </div>
      ) : null}
    </article>
  );
}
