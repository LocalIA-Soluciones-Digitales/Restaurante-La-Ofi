import Image from "next/image";
import { Photo } from "@/components/media/Photo";
import { imageKeyBySrc } from "@/lib/images";
import type { ImagenRef } from "@/lib/restaurant/types";

/**
 * Foto de un plato de la carta. Si es una foto propia del sitio, usa su recorte
 * móvil y su punto focal; si viene de Supabase Storage (subida desde /admin),
 * next/image normal centrada.
 */
export function DishPhoto({
  imagen,
  sizes,
  priority = false,
  decorative = false,
  mobileBelow = 0,
  className = "",
}: {
  imagen: ImagenRef;
  sizes: string;
  priority?: boolean;
  decorative?: boolean;
  mobileBelow?: number;
  className?: string;
}) {
  const key = imageKeyBySrc(imagen.src);
  if (key) return <Photo img={key} sizes={sizes} priority={priority} decorative={decorative} mobileBelow={mobileBelow} className={className} />;
  return (
    <Image src={imagen.src} alt={decorative ? "" : imagen.alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />
  );
}
