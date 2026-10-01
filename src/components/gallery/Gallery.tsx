"use client";

import Image, { type StaticImageData } from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useDialogA11y } from "@/hooks/useDialogA11y";

export interface GalleryImage {
  src: StaticImageData;
  alt: string;
  credit: string;
}

/** Galería editorial en columnas + lightbox accesible (teclado, foco, Escape, flechas). */
export function Gallery({ images, sizes = "(min-width: 1024px) 33vw, 50vw" }: { images: GalleryImage[]; sizes?: string }) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <>
      <ul className="columns-2 gap-3 sm:gap-5 lg:columns-3">
        {images.map((img, i) => (
          <li key={img.src.src} className="reveal mb-3 break-inside-avoid sm:mb-5">
            <button
              type="button"
              onClick={() => setActive(i)}
              className="group relative block w-full overflow-hidden rounded-[1.25rem] bg-arena shadow-card"
            >
              <Image
                src={img.src}
                alt={img.alt}
                sizes={sizes}
                placeholder="blur"
                className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <span className="sr-only">Ampliar foto</span>
            </button>
          </li>
        ))}
      </ul>
      {active !== null ? (
        <Lightbox images={images} index={active} onChange={setActive} onClose={() => setActive(null)} />
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
        <Image src={img.src} alt={img.alt} sizes="100vw" className="h-auto max-h-full w-auto max-w-full rounded-xl object-contain" />
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
