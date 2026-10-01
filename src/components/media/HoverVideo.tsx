"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayWhenVisible } from "@/hooks/usePlayWhenVisible";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { videoSources, type VideoAsset } from "@/lib/media";

/**
 * Clip corto sobre una tarjeta: en escritorio se reproduce al pasar el ratón o al
 * enfocar la tarjeta (el elemento padre con clase `group`); en táctil, al entrar
 * en pantalla. preload="none": nada se descarga hasta que hace falta.
 */
export function HoverVideo({ video }: { video: VideoAsset }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [tactil, setTactil] = useState(false);
  const [activo, setActivo] = useState(false);
  usePlayWhenVisible(ref, 0.6, tactil);

  useEffect(() => {
    const t = window.matchMedia("(hover: none)").matches;
    setTactil(t);
    const card = ref.current?.closest<HTMLElement>(".group");
    if (!card || t) return;
    const on = () => {
      setActivo(true);
      if (!prefersReducedMotion()) ref.current?.play().catch(() => undefined);
    };
    const off = () => {
      setActivo(false);
      ref.current?.pause();
    };
    card.addEventListener("mouseenter", on);
    card.addEventListener("mouseleave", off);
    card.addEventListener("focusin", on);
    card.addEventListener("focusout", off);
    return () => {
      card.removeEventListener("mouseenter", on);
      card.removeEventListener("mouseleave", off);
      card.removeEventListener("focusin", on);
      card.removeEventListener("focusout", off);
    };
  }, []);

  const { sources } = videoSources(video);
  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${activo || tactil ? "opacity-100" : "opacity-0"}`}
    >
      {sources.map((s) => (
        <source key={s.src} src={s.src} type={s.type} media={s.media} />
      ))}
    </video>
  );
}
