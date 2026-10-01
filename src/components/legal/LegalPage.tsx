import type { ReactNode } from "react";

export function LegalPage({ id, title, updated, children }: { id: string; title: string; updated: string; children: ReactNode }) {
  return (
    <article aria-labelledby={id} className="pb-20 pt-32 sm:pt-40">
      <div className="container-page max-w-3xl">
        <h1 id={id} className="text-5xl text-carbon">
          {title}
        </h1>
        <p className="mt-3 text-sm text-carbon-muted">Última actualización: {updated}</p>
        <div className="mt-10 space-y-8 leading-relaxed text-carbon [&_h2]:text-2xl [&_h2]:text-carbon [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:space-y-1">
          {children}
        </div>
      </div>
    </article>
  );
}

/** Dato del titular aún no facilitado: visible y fácil de localizar antes de producción. */
export function Pendiente({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded bg-terracota-soft px-1.5 py-0.5 font-semibold text-terracota">[Pendiente: {children}]</mark>
  );
}
