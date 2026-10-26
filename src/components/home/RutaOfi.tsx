import Image from "next/image";
import { IMAGES } from "@/lib/images";
import { SITE } from "@/lib/site";

// Recorrido sobre el mapa real de OpenStreetMap del local (1200 × 760): desde el
// cruce de la BI-3784, por Laga bidea hasta la rotonda de la BI-3783 y luego por
// Ibaizabal bidea hasta el pin de La Ofi (la punta del pin está en 600, 378).
const RUTA = "M 298 492 L 352 458 Q 392 432 416 418 L 470 418 Q 532 409 578 392 L 598 380";

/**
 * «Del Parque a La Ofi» (como la ruta de White Desert), sobre el mapa real en
 * tono noche: la sección se ancla y, con el scroll, la línea se dibuja por las
 * calles, un punto la recorre, el mapa se acerca al pin y el destino se enciende.
 * Sin soporte de scroll-driven, la ruta aparece ya dibujada y sin zoom.
 */
export function RutaOfi() {
  return (
    <section aria-labelledby="ruta-title" className="route bg-noche text-crema">
      <div className="route-sticky relative h-[100svh] overflow-hidden">
        {/* Mapa + ruta en la misma capa: se acercan juntos al pin. */}
        <div className="route-zoom absolute inset-0 origin-[50%_49.7%]">
          <Image
            src={IMAGES.mapa.src}
            alt=""
            fill
            sizes="100vw"
            className="object-cover [filter:invert(0.92)_hue-rotate(180deg)_saturate(0.35)_brightness(0.85)_contrast(1.05)]"
          />
          <svg aria-hidden="true" viewBox="0 0 1200 760" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
            {/* Trazado completo, tenue */}
            <path d={RUTA} fill="none" stroke="rgb(250 245 236 / 0.35)" strokeWidth="2" strokeDasharray="3 6" />
            {/* Trazado que se dibuja con el scroll */}
            <path className="route-line" d={RUTA} pathLength={1} fill="none" stroke="#D2AE78" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Punto que recorre la ruta */}
            <path className="route-dot" d={RUTA} pathLength={1} fill="none" stroke="#F4F0FF" strokeWidth="13" strokeLinecap="round" />
            {/* Origen */}
            <circle cx="298" cy="492" r="7" fill="#D2AE78" />
            {/* Destino: anillos sobre el pin del mapa */}
            <g className="route-end">
              <circle cx="600" cy="352" r="34" fill="none" stroke="#C9542F" strokeOpacity="0.5" strokeWidth="2" />
              <circle cx="600" cy="352" r="56" fill="none" stroke="#C9542F" strokeOpacity="0.25" strokeWidth="2" />
            </g>
          </svg>
        </div>
        <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgb(11_20_36/0.75)_100%)]" />

        {/* Etiqueta del destino junto al pin */}
        <p className="route-end absolute left-1/2 top-1/2 ml-12 -translate-y-[140%] text-left">
          <span className="block font-display text-lg italic text-crema/75">Destino</span>
          <span className="kicker mt-1 block text-ratan">La Ofi · Edificio 502</span>
        </p>

        {/* Niebla hacia «Cómo llegar», abajo */}
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-noche/0 to-papel-2" />

        {/* Tarjeta de datos (a la derecha en escritorio: la ruta va por la izquierda) */}
        <div className="absolute inset-x-4 bottom-20 rounded-2xl border border-crema/10 bg-noche-2/85 p-5 backdrop-blur-md sm:inset-x-auto sm:right-8 sm:w-[24rem] sm:p-6 lg:bottom-auto lg:right-[5vw] lg:top-1/2 lg:w-[25rem] lg:-translate-y-1/2 lg:p-8">
          <p className="font-display text-base italic text-crema/60">Punto de partida: tu oficina</p>
          <h2 id="ruta-title" className="mt-1 font-display text-[clamp(1.6rem,1.2rem+1.4vw,2.4rem)] font-light leading-tight">
            Del Parque <em className="text-ratan">a La Ofi</em>
          </h2>
          <dl className="mt-5 hidden divide-y divide-dashed divide-crema/15 sm:block">
            {[
              ["Dónde", "Edificio 502, Derio"],
              ["Aparcamiento", "220 plazas"],
              ["Abrimos", "7:30, de lunes a viernes"],
            ].map(([k, v]) => (
              <div key={k} className="py-3.5">
                <dt className="font-display text-base italic text-crema/60">{k}</dt>
                <dd className="mt-1 text-[clamp(1.15rem,1rem+0.6vw,1.5rem)] tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <a href={SITE.maps.directions} target="_blank" rel="noopener noreferrer" className="btn-line mt-5 text-crema">
            <span>Cómo llegar</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
