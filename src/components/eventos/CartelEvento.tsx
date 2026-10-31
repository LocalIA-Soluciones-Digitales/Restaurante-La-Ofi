import Image from "next/image";
import { CartelImagen } from "@/components/eventos/CartelImagen";

/**
 * Cartel o foto de un evento entero, sin recortar: los carteles suelen ser
 * verticales (formato historia de Instagram) y con `object-cover` se perdían el
 * titular y la fecha. Detrás, la misma imagen ampliada y difuminada rellena el
 * hueco, y los bordes del cartel se funden con él en vez de cortar en seco.
 */
export function CartelEvento({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
  onProporcion,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Ancho/alto real del cartel, al cargar (para que el marco tome su forma). */
  onProporcion?: (r: number) => void;
}) {
  // Solo se optimizan las de /public y las del bucket de Supabase (remotePatterns de next.config).
  const unoptimized = !(src.startsWith("/") || src.includes(".supabase.co/storage/v1/object/public/"));
  return (
    <div className={`relative isolate overflow-hidden bg-noche ${className}`}>
      <Image src={src} alt="" aria-hidden="true" fill sizes="96px" unoptimized={unoptimized} className="-z-10 scale-125 object-cover opacity-60 blur-2xl saturate-150" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-noche/10 via-transparent to-noche/40" />
      <CartelImagen src={src} alt={alt} sizes={sizes} priority={priority} unoptimized={unoptimized} onProporcion={onProporcion} />
    </div>
  );
}

/** Portada, fotos de la galería y carteles del programa, en ese orden y sin repetir. */
export function cartelesDe(e: {
  titulo: string;
  imagen: { src: string; alt: string } | null;
  media?: { tipo: string; url: string }[];
  programa?: { titulo: string; imagen: string | null }[];
}): { src: string; alt: string }[] {
  const lista: { src: string; alt: string }[] = [];
  const anadir = (src: string | null | undefined, alt: string) => {
    if (src && !lista.some((x) => x.src === src)) lista.push({ src, alt });
  };
  anadir(e.imagen?.src, e.imagen?.alt ?? e.titulo);
  for (const p of e.programa ?? []) anadir(p.imagen, `Cartel: ${p.titulo}`);
  for (const m of e.media ?? []) if (m.tipo === "imagen") anadir(m.url, e.titulo);
  return lista;
}
