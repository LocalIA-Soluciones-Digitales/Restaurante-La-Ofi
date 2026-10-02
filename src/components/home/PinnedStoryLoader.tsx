"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { Capitulo } from "@/components/home/ScrollStory";

const PinnedStory = dynamic(() => import("@/components/home/PinnedStory").then((m) => m.PinnedStory), { ssr: false });

/**
 * La historia fijada solo existe en escritorio (lg+): en móvil ni se descarga su
 * JS ni se hidrata (allí se usa la versión apilada, de servidor). Reserva la
 * altura desde el primer render para no provocar saltos de maquetación.
 */
export function PinnedStoryLoader({ capitulos }: { capitulos: Capitulo[] }) {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <div className="hidden lg:block" style={{ minHeight: `${capitulos.length * 100}vh` }}>
      {desktop ? <PinnedStory capitulos={capitulos} /> : null}
    </div>
  );
}
