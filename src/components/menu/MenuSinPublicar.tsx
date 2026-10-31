"use client";

import { useEffect, useState, type ReactNode } from "react";
import { MENU_DESDE as DESDE, MENU_HASTA as HASTA, ahoraEnMadrid, momentoMenu as momento, type Momento } from "@/lib/menu-franja";
import { SITE } from "@/lib/site";

/** «08:00» → «8:00». */
const sinCeros = (h: string) => h.replace(/^0/, "");

/**
 * Hoja del menú cuando hoy no hay menú publicado. El mensaje depende de la hora
 * (en el navegador: la página va en caché): antes de la franja o dentro de ella,
 * «todavía no está publicado»; pasada la franja, que el de hoy ya ha terminado y
 * cuándo vuelve; el fin de semana, que es de lunes a viernes.
 */
export function MenuSinPublicar({ hoja, headingLevel: Heading, filete }: { hoja: string; headingLevel: "h2" | "h3"; filete: ReactNode }) {
  const [m, setM] = useState<Momento>("franja");

  useEffect(() => {
    setM(momento());
    const t = window.setInterval(() => setM(momento()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const viernes = ahoraEnMadrid().dia === 5;
  const textos: Record<Momento, { titulo: string; texto: string }> = {
    antes: {
      titulo: "Hoy todavía no está publicado",
      texto: `Sale aquí a partir de las ${sinCeros(DESDE)}, y entonces puedes reservar con menú o pedirlo para recoger. Mientras tanto, llámanos:`,
    },
    franja: {
      titulo: "Hoy todavía no está publicado",
      texto: `Sale aquí cada día de ${sinCeros(DESDE)} a ${sinCeros(HASTA)}, y entonces puedes reservar con menú o pedirlo para recoger. Mientras tanto, llámanos:`,
    },
    despues: {
      titulo: "El menú de hoy ya ha terminado",
      texto: `El menú del día se sirve de ${sinCeros(DESDE)} a ${sinCeros(HASTA)}. ${
        viernes ? "Vuelve el lunes" : "Mañana sale aquí otra vez"
      } desde las ${sinCeros(DESDE)}. Ahora tienes la carta; para reservar o preguntar, llámanos:`,
    },
    finde: {
      titulo: "El fin de semana no hay menú del día",
      texto: `El menú del día es de lunes a viernes y vuelve el lunes desde las ${sinCeros(DESDE)}. Hoy tienes la carta; para reservar, llámanos:`,
    },
  };
  const t = textos[m];

  return (
    <article className={hoja}>
      <p className="kicker text-brasa">Menú del día</p>
      <Heading className="mt-3 font-display text-2xl text-carbon sm:text-3xl">{t.titulo}</Heading>
      {filete}
      <p className="mx-auto max-w-sm text-carbon-muted">{t.texto}</p>
      <a href={SITE.phone.href} className="btn-secondary mt-6">
        {SITE.phone.display}
      </a>
    </article>
  );
}
