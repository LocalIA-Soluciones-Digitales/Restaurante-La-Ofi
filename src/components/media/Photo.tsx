import { getImageProps } from "next/image";
import { FOCUS, IMAGES, MOBILE_CROPS, type ImageKey } from "@/lib/images";

interface Props {
  img: ImageKey;
  /** `sizes` del recorte de escritorio/tablet. En móvil se usa el recorte 4:5. */
  sizes: string;
  className?: string;
  /** Clases del <img> (por defecto rellena el contenedor). */
  imgClassName?: string;
  priority?: boolean;
  /** Decorativa: alt vacío (cuando el texto de al lado ya la describe). */
  decorative?: boolean;
  /** Usa el recorte vertical por debajo de este ancho (px). 0 = nunca. */
  mobileBelow?: number;
  quality?: number;
}

/**
 * Foto real con dirección de arte: por debajo de `mobileBelow` sirve el recorte
 * vertical (plato centrado) en lugar de encoger la horizontal, y siempre respeta
 * el punto focal al recortar con object-cover. Ocupa el contenedor (posición
 * relativa + tamaño los pone quien la usa).
 */
export function Photo({
  img,
  sizes,
  className = "",
  imgClassName = "",
  priority = false,
  decorative = false,
  mobileBelow = 768,
  quality = 75,
}: Props) {
  const data = IMAGES[img];
  const alt = decorative ? "" : data.alt;
  const mobile = mobileBelow ? MOBILE_CROPS[img] : undefined;
  const common = { alt, quality, priority, fill: true as const };
  const {
    props: { srcSet: desktopSet, ...rest },
  } = getImageProps({ ...common, src: data.src, sizes });
  const mobileSet = mobile ? getImageProps({ ...common, src: mobile, sizes: "100vw" }).props.srcSet : undefined;

  return (
    <picture className={`absolute inset-0 block ${className}`}>
      {mobileSet ? <source media={`(max-width: ${mobileBelow - 1}px)`} srcSet={mobileSet} sizes="100vw" /> : null}
      <source srcSet={desktopSet} sizes={sizes} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- alt viene en rest */}
      <img
        {...rest}
        style={{ ...rest.style, objectPosition: FOCUS[img] ?? "50% 50%" }}
        className={`h-full w-full object-cover ${imgClassName}`}
      />
    </picture>
  );
}
