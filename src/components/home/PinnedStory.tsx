"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Capitulo } from "@/components/home/ScrollStory";
import { AmbientVideo } from "@/components/media/AmbientVideo";
import { scrollToTarget } from "@/components/motion/SmoothScroll";
import { BrandPlaceholder } from "@/components/ui/BrandPlaceholder";
import { Icon } from "@/components/ui/Icon";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { loadGsap } from "@/lib/motion/gsap";

/** Versión fijada de escritorio (lg+). Ver ScrollStory. */
export function PinnedStory({ capitulos }: { capitulos: Capitulo[] }) {
  const N = capitulos.length;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const platoRefs = useRef<(HTMLDivElement | null)[]>([]);
  const headlineRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [near, setNear] = useState(false);

  // Progreso continuo: posición del scroll dentro del bloque fijado.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const reduce = prefersReducedMotion();
    let frame = 0;

    const apply = () => {
      frame = 0;
      const rect = wrapper.getBoundingClientRect();
      const range = wrapper.offsetHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, range)));
      const continuo = progress * (N - 1);

      platoRefs.current.forEach((el, i) => {
        if (!el) return;
        const delta = i - continuo;
        const abs = Math.min(Math.abs(delta), 1.4);
        el.style.opacity = Math.max(0, 1 - abs * 1.1).toFixed(3);
        el.style.transform = reduce
          ? "none"
          : `translate3d(${delta * 24}vw, ${Math.abs(delta) * 6}vh, 0) rotate(${delta * 9}deg) scale(${1 - Math.min(abs, 1) * 0.25})`;
      });

      const idx = Math.min(N - 1, Math.max(0, Math.round(continuo)));
      if (idx !== activeRef.current) {
        activeRef.current = idx;
        setActive(idx);
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setNear(true), { rootMargin: "100% 0px" });
    io.observe(wrapper);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
      io.disconnect();
    };
  }, [N]);

  // Titular del capítulo activo: revelado por palabras con GSAP (diferido).
  useEffect(() => {
    if (!near || prefersReducedMotion()) return;
    let cancelled = false;
    void loadGsap().then(({ gsap }) => {
      if (cancelled || !headlineRef.current) return;
      gsap.fromTo(
        headlineRef.current.querySelectorAll(".story-word"),
        { yPercent: 110, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.05, ease: "expo.out" },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [active, near]);

  const goTo = (i: number) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const range = wrapper.offsetHeight - window.innerHeight;
    scrollToTarget(wrapper, (i / (N - 1)) * range + 2);
  };

  const cap = capitulos[active]!;

  return (
    <div ref={wrapperRef} className="relative hidden lg:block" style={{ height: `${N * 100}vh` }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {capitulos.map((c, i) => (
          <div
            key={c.id}
            aria-hidden="true"
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${i === active ? "opacity-100" : "opacity-0"}`}
          >
            {c.video ? (
              near ? <AmbientVideo video={c.video} threshold={0.01} /> : null
            ) : (
              <>
                <Image src={c.fondo.src} alt="" fill sizes="100vw" className="scale-110 object-cover" />
                {c.ambiente && near ? (
                  <div className={`absolute inset-0 ${c.noche ? "opacity-50 mix-blend-screen" : "opacity-60 mix-blend-screen"}`}>
                    <AmbientVideo video={c.ambiente} threshold={0.01} showPoster={false} />
                  </div>
                ) : null}
              </>
            )}
          </div>
        ))}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-noche via-noche/75 to-noche/45" />
        <div aria-hidden="true" className="hex-pattern-night absolute inset-0 opacity-60" />

        <div className="pointer-events-none absolute left-8 top-28 font-mono text-xs tracking-[0.3em] text-crema/50">
          {String(active + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}
        </div>

        {/* Platos protagonistas: entran y salen con el scroll. */}
        {capitulos.map((c, i) => (
          <div
            key={c.id}
            ref={(el) => {
              platoRefs.current[i] = el;
            }}
            aria-hidden="true"
            className="pointer-events-none absolute right-[8vw] top-1/2 z-10 -mt-[24vh] h-[48vh] w-[48vh] will-change-transform"
            style={{ opacity: i === 0 ? 1 : 0 }}
          >
            <div className="relative h-full w-full overflow-hidden rounded-full border-[6px] border-crema/90 shadow-[0_40px_80px_-20px_rgb(0_0_0/0.7)]">
              {c.plato ? (
                <Image src={c.plato.src} alt="" fill sizes="48vh" className="object-cover" />
              ) : (
                <BrandPlaceholder label={c.titulo} icon={c.icon} iconOnly />
              )}
            </div>
          </div>
        ))}

        <div className="container-page relative z-20 flex h-full flex-col justify-center">
          <div ref={headlineRef} key={cap.id} className="max-w-xl" aria-live="polite">
            <p className="eyebrow flex items-center gap-2 text-neon">
              <Icon name={cap.icon} className="h-4 w-4" />
              {cap.hora}
            </p>
            <h3 className="display-lg mt-4 overflow-hidden">
              {cap.titulo.split(" ").map((w, wi) => (
                <span key={wi} className="inline-block overflow-hidden pb-[0.06em] align-top">
                  <span className={`story-word inline-block ${cap.noche ? "neon-text" : ""}`}>{w}</span>
                  &nbsp;
                </span>
              ))}
            </h3>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-crema/80">{cap.texto}</p>
            <Link href={cap.cta.href} className="btn-neon pointer-events-auto mt-8">
              {cap.cta.label}
              <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <nav aria-label="Capítulos del día" className="absolute bottom-10 left-1/2 z-30 -translate-x-1/2">
          <ol className="flex items-center gap-1">
            {capitulos.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === active ? "step" : undefined}
                  className="group flex h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold uppercase tracking-wider text-crema/50 transition-colors hover:text-crema aria-[current=step]:text-crema"
                >
                  <span
                    aria-hidden="true"
                    className={`h-1.5 rounded-full transition-all duration-500 ${i === active ? "w-8 bg-neon" : "w-1.5 bg-crema/40"}`}
                  />
                  <span className={i === active ? "" : "sr-only"}>{c.hora}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  );
}
