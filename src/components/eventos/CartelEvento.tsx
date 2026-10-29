import Image from "next/image";

/**
 * Cartel o foto de un evento entero, sin recortar: los carteles suelen ser
 * verticales (formato historia de Instagram) y con `object-cover` se perdían el
 * titular y la fecha. Detrás, la misma imagen ampliada y difuminada rellena el
 * hueco, así un cartel vertical en una caja apaisada no deja bandas vacías.
 */
export function CartelEvento({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  // Solo se optimizan las de /public y las del bucket de Supabase (remotePatterns de next.config).
  const unoptimized = !(src.startsWith("/") || src.includes(".supabase.co/storage/v1/object/public/"));
  return (
    <div className={`relative isolate overflow-hidden bg-noche ${className}`}>
      <Image src={src} alt="" aria-hidden="true" fill sizes="96px" unoptimized={unoptimized} className="-z-10 scale-125 object-cover opacity-60 blur-2xl saturate-150" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-b from-noche/10 via-transparent to-noche/40" />
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={unoptimized} className="object-contain drop-shadow-[0_18px_40px_rgb(0_0_0/0.45)]" />
    </div>
  );
}
