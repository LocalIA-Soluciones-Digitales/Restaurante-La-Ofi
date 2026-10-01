// GSAP + ScrollTrigger cargados bajo demanda. Nunca se importan de forma
// estática desde un componente: así no entran en el JS inicial de ninguna
// página y solo se descargan cuando una sección los necesita (patrón de Amway
// `lib/gsap.ts`, pero con import dinámico para no penalizar el LCP en móvil).

type Gsap = typeof import("gsap").gsap;
type ScrollTriggerT = typeof import("gsap/ScrollTrigger").ScrollTrigger;

export interface GsapBundle {
  gsap: Gsap;
  ScrollTrigger: ScrollTriggerT;
}

let loading: Promise<GsapBundle> | null = null;

export function loadGsap(): Promise<GsapBundle> {
  if (!loading) {
    loading = Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([g, st]) => {
      g.gsap.registerPlugin(st.ScrollTrigger);
      return { gsap: g.gsap, ScrollTrigger: st.ScrollTrigger };
    });
  }
  return loading;
}
