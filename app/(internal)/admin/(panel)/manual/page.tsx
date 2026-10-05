import type { Metadata } from "next";
import { Cabecera, card } from "@/components/admin/ui";
import { MANUAL, QUIEN } from "@/lib/admin/manual";

export const metadata: Metadata = { title: "Manual" };

/** Manual del equipo: un pedido en mesa de principio a fin, con capturas reales del sistema. */
export default function ManualPage() {
  return (
    <>
      <Cabecera
        titulo="Cómo funciona un pedido"
        texto="Del QR de la mesa al cierre de caja: qué hace el cliente, cocina y barra, sala y encargado en cada momento. Las capturas son del sistema real."
      />

      <nav aria-label="Pasos" className="mb-6 flex flex-wrap gap-2">
        {MANUAL.map((p) => (
          <a key={p.id} href={`#${p.id}`} className="rounded-full border border-carbon/15 px-3 py-1.5 text-xs font-semibold hover:bg-arena dark:border-crema/15 dark:hover:bg-noche-3">
            {p.titulo}
          </a>
        ))}
      </nav>

      <ol className="grid gap-5">
        {MANUAL.map((p) => (
          <li key={p.id} id={p.id} className={`${card} scroll-mt-20 p-5 sm:p-6`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${QUIEN[p.quien].clase}`}>{QUIEN[p.quien].label}</span>
              <span className="text-xs text-carbon-muted dark:text-crema/60">{p.donde}</span>
            </div>
            <h2 className="mt-2 font-display text-2xl">{p.titulo}</h2>
            <ul className="mt-3 grid max-w-3xl list-disc gap-1.5 pl-5 text-sm leading-relaxed">
              {p.pasos.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            {p.consejo ? <p className="mt-3 max-w-3xl rounded-xl bg-arena px-4 py-2.5 text-sm dark:bg-noche-3">💡 {p.consejo}</p> : null}
            <div className="mt-4 flex flex-wrap items-start gap-4">
              {p.capturas.map((c) => (
                <figure key={c.src} className={c.movil ? "w-[min(100%,15rem)]" : "w-[min(100%,34rem)]"}>
                  <a href={c.src} target="_blank" rel="noreferrer" title="Ver a tamaño completo">
                    {/* eslint-disable-next-line @next/next/no-img-element -- capturas estáticas, sin optimizador */}
                    <img src={c.src} alt={c.alt} loading="lazy" className="w-full rounded-2xl border border-carbon/10 shadow-card dark:border-crema/10" />
                  </a>
                  <figcaption className="mt-1.5 text-xs text-carbon-muted dark:text-crema/60">{c.alt}</figcaption>
                </figure>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
