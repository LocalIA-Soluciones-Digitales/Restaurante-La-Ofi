import Image from "next/image";
import Link from "next/link";
import { HoverVideo } from "@/components/media/HoverVideo";
import { BrandPlaceholder } from "@/components/ui/BrandPlaceholder";
import { Icon } from "@/components/ui/Icon";
import type { Especialidad } from "@/lib/home-content";

/**
 * Tarjeta de especialidad (componente de servidor). Si el plato tiene clip real,
 * HoverVideo lo reproduce al pasar el ratón (escritorio) o al entrar en pantalla
 * (táctil). Sin clip: foto real o hueco de marca "Foto pendiente".
 */
export function EspecialidadCard({ especialidad: e, href }: { especialidad: Especialidad; href: string }) {
  return (
    <Link
      href={href}
      draggable={false}
      className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[2rem] bg-carbon text-crema shadow-lift"
    >
      <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105">
        {e.imagen ? (
          <Image src={e.imagen.src} alt={e.imagen.alt} fill sizes="(min-width: 1024px) 30vw, (min-width: 640px) 44vw, 78vw" className="object-cover" draggable={false} />
        ) : (
          <BrandPlaceholder label={e.nombre} icon={e.icon} iconOnly className="pb-28" />
        )}
        {e.video ? <HoverVideo video={e.video} /> : null}
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-carbon/90 via-carbon/30 to-transparent" />
      <div className="relative p-6">
        <p className="eyebrow flex items-center gap-2 text-ratan">
          <Icon name={e.icon} className="h-4 w-4" />
          Especialidad
        </p>
        <h3 className="mt-2 text-2xl leading-tight text-crema sm:text-3xl">{e.nombre}</h3>
        <p className="mt-2 text-sm leading-relaxed text-crema/80">{e.texto}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
          En la carta
          <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </div>
      {e.imagen?.kind === "tercero" ? <span className="absolute right-4 top-4 text-[0.65rem] text-crema/70">Foto: {e.imagen.credit}</span> : null}
    </Link>
  );
}
