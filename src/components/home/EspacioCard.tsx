import Image from "next/image";
import Link from "next/link";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { BrandPlaceholder } from "@/components/ui/BrandPlaceholder";
import { Icon } from "@/components/ui/Icon";
import { SourceBadge } from "@/components/ui/SourceBadge";
import type { Espacio } from "@/lib/home-content";
import { href, type Locale } from "@/lib/i18n";

const CTA: Record<Espacio["cta"], { label: string; path: string; icon: "calendar" | "briefcase" | "bag" }> = {
  reservar: { label: "Reservar", path: "/reservar", icon: "calendar" },
  presupuesto: { label: "Pedir presupuesto", path: "/empresas#contacto", icon: "briefcase" },
  pedir: { label: "Pedir para recoger", path: "/pedir", icon: "bag" },
};

export function EspacioCard({ espacio: e, locale, tall = false }: { espacio: Espacio; locale: Locale; tall?: boolean }) {
  const cta = CTA[e.cta];
  return (
    <article className={`group relative flex flex-col justify-end overflow-hidden rounded-[2rem] bg-carbon text-crema shadow-lift ${tall ? "min-h-[30rem]" : "min-h-[24rem]"}`}>
      <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
        {e.video ? (
          <AmbientVideo video={e.video} />
        ) : e.imagen ? (
          <Image src={e.imagen.src} alt={e.imagen.alt} fill sizes="(min-width: 1024px) 55vw, (min-width: 768px) 50vw, 100vw" className="object-cover" />
        ) : (
          <BrandPlaceholder label={e.nombre} icon={e.icon} iconOnly className="pb-40" />
        )}
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-carbon/90 via-carbon/35 to-transparent" />
      <div className="relative p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <p className="eyebrow flex items-center gap-2 text-ratan">
            <Icon name={e.icon} className="h-4 w-4" />
            Espacio
          </p>
          {e.aforo ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-crema/15 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">
              <Icon name="users" className="h-3.5 w-3.5" />
              {e.aforo}
            </span>
          ) : null}
          {e.aforo ? <SourceBadge fuente={e.fuente} /> : null}
        </div>
        <h3 className="mt-3 text-3xl leading-tight text-crema">{e.nombre}</h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-crema/80">{e.texto}</p>
        <Link href={href(locale, cta.path)} className="btn-light mt-5 min-h-11 px-5 text-sm">
          <Icon name={cta.icon} className="h-4 w-4" />
          {cta.label}
          <span className="sr-only"> · {e.nombre}</span>
        </Link>
      </div>
      {e.imagen?.kind === "tercero" ? <span className="absolute right-4 top-4 text-[0.65rem] text-crema/70">Foto: {e.imagen.credit}</span> : null}
    </article>
  );
}
