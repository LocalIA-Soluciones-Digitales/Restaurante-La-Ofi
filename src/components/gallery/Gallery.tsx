"use client";

import Image, { type StaticImageData } from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { Icon } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { CategoriaGaleria } from "@/lib/gallery";
import { videoSources, type VideoAsset } from "@/lib/media";

export interface GalleryImage {
  src: StaticImageData;
  alt: string;
  credit: string;
  /** Clip corto REAL del local (se reproduce en bucle en la rejilla y con controles en el visor). */
  video?: VideoAsset | null;
  categoria?: CategoriaGaleria;
}

/**
 * Galería editorial en columnas (cada foto con su proporción, sin recortes),
 * filtro opcional por categoría y lightbox accesible (teclado, foco, Escape, flechas).
 */
export function Gallery({
  images,
  sizes = "(min-width: 1024px) 33vw, 50vw",
  categorias,
}: {
  images: GalleryImage[];
  sizes?: string;
  categorias?: { key: CategoriaGaleria; label: string }[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<CategoriaGaleria | null>(null);
  const visibles = filtro ? images.filter((i) => i.categoria === filtro) : images;

  return (
    <>
      {categorias ? (
        <div role="group" aria-label="Filtrar fotos" className="mb-8 flex flex-wrap gap-6 border-b border-tinta-line">
          {[{ key: null, label: "Todas" } as const, ...categorias].map((c) => (
            <button
              key={c.label}
              type="button"
              aria-pressed={filtro === c.key}
              onClick={() => setFiltro(c.key)}
              className="relative min-h-11 text-sm font-medium text-carbon-muted transition-colors hover:text-carbon aria-pressed:text-carbon after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:scale-x-0 after:bg-brasa after:transition-transform aria-pressed:after:scale-x-100"
            >
              {c.label}
            </button>
          ))}
        </div>
      ) : null}
      <ul className="columns-2 gap-3 sm:gap-6 lg:columns-3">
        {visibles.map((img, i) => (
          <li key={img.src.src} className="mb-3 break-inside-avoid sm:mb-6">
            <button
              type="button"
              onClick={() => setActive(i)}
              className="photo-hover group relative block w-full overflow-hidden bg-papel-3"
            >
              <Image
                src={img.src}
                alt={img.alt}
                sizes={sizes}
                placeholder="blur"
                className="h-auto w-full"
              />
              {img.video ? (
                <span className="absolute inset-0">
                  <AmbientVideo video={img.video} />
                  <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-carbon/60 text-crema backdrop-blur">
                    <Icon name="play" className="h-4 w-4" />
                  </span>
                </span>
              ) : null}
              <span className="sr-only">{img.video ? "Ver vídeo" : "Ampliar foto"}</span>
            </button>
          </li>
        ))}
      </ul>
      {active !== null ? (
        <Lightbox images={visibles} index={active} onChange={setActive} onClose={() => setActive(null)} />
      ) : null}
    </>
  );
}

function Lightbox({
  images,
  index,
  onChange,
  onClose,
}: {
  images: GalleryImage[];
  index: number;
  onChange: (i: number) => void;
  onClose: () => void;
}) {
  const ref = useDialogA11y<HTMLDivElement>(onClose);
  const img = images[index]!;
  const go = useCallback((delta: number) => onChange((index + delta + images.length) % images.length), [index, images.length, onChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go]);

  const navBtn = "grid h-12 w-12 place-items-center rounded-full bg-crema/10 text-crema transition-colors hover:bg-crema/20";

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} de ${images.length}`}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex flex-col bg-carbon/95 p-4 backdrop-blur-sm sm:p-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex items-center justify-between text-sm text-crema/80">
        <span aria-live="polite">
          {index + 1} / {images.length}
        </span>
        <button type="button" onClick={onClose} className={navBtn}>
          <Icon name="close" />
          <span className="sr-only">Cerrar</span>
        </button>
      </div>
      <figure className="relative my-4 flex min-h-0 flex-1 items-center justify-center">
        {img.video ? (
          <video
            key={img.video.base}
            controls
            autoPlay
            muted
            playsInline
            poster={videoSources(img.video).poster}
            aria-label={img.video.label || img.alt}
            className="max-h-full max-w-full rounded-xl"
          >
            {videoSources(img.video).sources.map((src) => (
              <source key={src.src} src={src.src} type={src.type} media={src.media} />
            ))}
          </video>
        ) : (
          <Image src={img.src} alt={img.alt} sizes="100vw" className="h-auto max-h-full w-auto max-w-full object-contain" />
        )}
      </figure>
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={() => go(-1)} className={navBtn}>
          <Icon name="chevronLeft" />
          <span className="sr-only">Foto anterior</span>
        </button>
        <p className="text-center text-sm text-crema/85">
          {img.alt}
          <span className="block text-xs text-crema/60">Foto: {img.credit}</span>
        </p>
        <button type="button" onClick={() => go(1)} className={navBtn}>
          <Icon name="chevronRight" />
          <span className="sr-only">Foto siguiente</span>
        </button>
      </div>
    </div>
  );
}
