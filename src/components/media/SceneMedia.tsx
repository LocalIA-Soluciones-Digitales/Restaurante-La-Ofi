import { AmbientVideo } from "@/components/media/AmbientVideo";
import { Photo } from "@/components/media/Photo";
import type { ImageKey } from "@/lib/images";
import type { VideoAsset } from "@/lib/media";

/**
 * Escena de sección: foto nítida de base y, si hay vídeo, el vídeo encima con un
 * fundido cuando empieza a reproducirse (solo al entrar en pantalla). Con "reducir
 * movimiento" o ahorro de datos se queda la foto. Ocupa el contenedor.
 */
export function SceneMedia({
  img,
  video,
  sizes,
  mobileBelow,
  decorative = false,
}: {
  img: ImageKey;
  video?: VideoAsset | null;
  sizes: string;
  mobileBelow?: number;
  decorative?: boolean;
}) {
  return (
    <>
      <Photo img={img} sizes={sizes} mobileBelow={mobileBelow} decorative={decorative} />
      {video ? (
        <div className="absolute inset-0">
          <AmbientVideo video={video} showPoster={false} threshold={0.25} revealOnPlay />
        </div>
      ) : null}
    </>
  );
}
