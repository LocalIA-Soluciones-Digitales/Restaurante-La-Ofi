import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { CAVA_DE_REGALO } from "@/lib/lanzamiento";

// La promoción de Navidad (CAVA_DE_REGALO): un cava de regalo con los encargos de vino de más
// de 50 €. Una botella dibujada (SVG, sin fotos) que se descorcha en bucle: tiembla, salta el
// corcho, sale la espuma y suben las burbujas (CSS en globals.css, quieta con
// prefers-reduced-motion). Va en la portada, en /vinos y en la tienda de encargos.

const euros = (c: number) => `${c / 100} €`;

const GOTAS = [
  [-34, -60, 4],
  [-18, -84, 3],
  [6, -96, 3.5],
  [28, -78, 3],
  [40, -50, 2.5],
  [-44, -30, 2.5],
  [16, -110, 2],
  [-6, -118, 2],
] as const;

const DESTELLOS = [
  [-40, -86],
  [34, -104],
  [46, -24],
] as const;

/** Destello de cuatro puntas centrado en (x, y). */
const destello = (x: number, y: number, r = 7) => {
  const k = r * 0.23;
  return `M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`;
};

/** La botella de cava, inclinada como en un bodegón; `className` fija el tamaño. */
export function BotellaCava({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="-20 -40 200 470"
      aria-hidden="true"
      className={`cava overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id="cava-vidrio" x1="0" x2="1">
          <stop offset="0" stopColor="#040a07" />
          <stop offset="0.22" stopColor="#1f4535" />
          <stop offset="0.38" stopColor="#2f6250" />
          <stop offset="0.55" stopColor="#163326" />
          <stop offset="1" stopColor="#030806" />
        </linearGradient>
        <linearGradient id="cava-oro" x1="0" x2="1">
          <stop offset="0" stopColor="#7a5329" />
          <stop offset="0.3" stopColor="#F6DDB4" />
          <stop offset="0.55" stopColor="#D9AE78" />
          <stop offset="0.8" stopColor="#F1D3A6" />
          <stop offset="1" stopColor="#6e4a24" />
        </linearGradient>
        <linearGradient id="cava-luz" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="cava-brillo">
          <stop offset="0" stopColor="#F1D3A6" stopOpacity="0.5" />
          <stop offset="1" stopColor="#F1D3A6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Halo dorado detrás. */}
      <ellipse
        cx="80"
        cy="230"
        rx="130"
        ry="200"
        fill="url(#cava-brillo)"
        className="cava-halo"
      />

      <g transform="rotate(-10 80 410)">
        <g className="cava-botella">
          <path
            d="M68 70 L68 150 C68 172 42 186 42 222 L42 398 Q42 410 54 410 L106 410 Q118 410 118 398 L118 222 C118 186 92 172 92 150 L92 70 Z"
            fill="url(#cava-vidrio)"
          />
          {/* Brillos del cristal. */}
          <rect
            x="49"
            y="214"
            width="12"
            height="184"
            rx="6"
            fill="url(#cava-luz)"
          />
          <rect
            x="53"
            y="220"
            width="2.2"
            height="170"
            rx="1.1"
            fill="#fff"
            opacity="0.5"
          />
          <rect
            x="106"
            y="230"
            width="3"
            height="160"
            rx="1.5"
            fill="#fff"
            opacity="0.12"
          />
          {/* Cápsula dorada del cuello, con estrías. */}
          <path
            d="M66 62 L94 62 L94 150 C94 160 99 168 102 174 L58 174 C61 168 66 160 66 150 Z"
            fill="url(#cava-oro)"
          />
          <path
            d="M70 66 V146 M75 66 V150 M85 66 V150 M90 66 V146"
            stroke="#6e4a24"
            strokeOpacity="0.25"
            strokeWidth="0.8"
          />
          <rect
            x="65"
            y="154"
            width="30"
            height="4"
            fill="#2B2722"
            opacity="0.25"
          />
          {/* Collarín y etiqueta: negro y oro. */}
          <ellipse
            cx="80"
            cy="196"
            rx="15"
            ry="9"
            fill="#14110d"
            stroke="#E2B98A"
            strokeWidth="1"
          />
          <text
            x="80"
            y="199"
            textAnchor="middle"
            fontFamily="var(--font-display), serif"
            fontStyle="italic"
            fontSize="7"
            fill="#E2B98A"
          >
            La Ofi
          </text>
          <rect x="48" y="252" width="64" height="104" rx="3" fill="#14110d" />
          <rect
            x="52"
            y="256"
            width="56"
            height="96"
            rx="2"
            fill="none"
            stroke="#E2B98A"
            strokeWidth="0.9"
          />
          <path d={destello(80, 276, 6)} fill="#E2B98A" />
          <text
            x="80"
            y="306"
            textAnchor="middle"
            fontFamily="var(--font-display), serif"
            fontSize="18"
            fill="#F6E3C2"
            letterSpacing="2.5"
          >
            CAVA
          </text>
          <text
            x="80"
            y="319"
            textAnchor="middle"
            fontFamily="var(--font-sans), sans-serif"
            fontSize="5.5"
            fill="#E2B98A"
            letterSpacing="1.8"
          >
            BRUT NATURE
          </text>
          <path
            d="M64 330 H96"
            stroke="#E2B98A"
            strokeOpacity="0.5"
            strokeWidth="0.6"
          />
          <text
            x="80"
            y="342"
            textAnchor="middle"
            fontFamily="var(--font-sans), sans-serif"
            fontSize="5"
            fill="#F6E3C2"
            fillOpacity="0.7"
            letterSpacing="1.2"
          >
            NAVIDAD
          </text>

          {/* El corcho con su bozal: es lo que salta. */}
          <g className="cava-corcho">
            <path
              d="M69 64 L69 44 Q69 30 80 30 Q91 30 91 44 L91 64 Z"
              fill="#C9A27A"
            />
            <path
              d="M72 42 Q80 35 88 42"
              stroke="#a37c52"
              strokeWidth="1.2"
              fill="none"
            />
            <path
              d="M69 56 H91 M74 33 V64 M86 33 V64"
              stroke="#e8e2d8"
              strokeWidth="1"
            />
            <circle cx="80" cy="31" r="3" fill="url(#cava-oro)" />
          </g>
        </g>

        {/* Chorro de espuma, gotas y destellos al descorchar. */}
        <g className="cava-espuma">
          <path
            d="M72 62 C60 30 48 4 58 -18 C66 -2 74 -12 80 -30 C86 -12 94 -2 102 -18 C112 4 100 30 88 62 Z"
            fill="#FFF6E6"
            opacity="0.92"
          />
          <path
            d="M76 60 C70 34 66 14 72 -2 C76 10 84 10 88 -2 C94 14 90 34 84 60 Z"
            fill="#F1D3A6"
            opacity="0.8"
          />
          {GOTAS.map(([x, y, r], i) => (
            <circle
              key={i}
              cx={80 + x}
              cy={40 + y}
              r={r}
              fill={i % 2 ? "#FFF6E6" : "#E2B98A"}
            />
          ))}
          {DESTELLOS.map(([x, y], i) => (
            <path key={i} d={destello(80 + x, 40 + y)} fill="#F6E3C2" />
          ))}
        </g>

        {/* Burbujas que suben. */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <circle
            key={i}
            className="cava-burbuja"
            style={{ animationDelay: `${2.6 + i * 0.21}s` }}
            cx={70 + ((i * 7) % 20)}
            cy={56}
            r={i % 2 ? 1.8 : 2.8}
            fill="#F1D3A6"
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * El anuncio del cava. «banda»: sección oscura a todo el ancho (portada y /vinos).
 * «tarjeta»: compacta, para la cabecera de la tienda de encargos.
 */
export function PromoCava({
  href,
  variante = "banda",
}: {
  href?: string;
  variante?: "banda" | "tarjeta";
}) {
  if (!CAVA_DE_REGALO) return null;
  const umbral = euros(CAVA_DE_REGALO.masDeCentimos);

  if (variante === "tarjeta") {
    return (
      <div className="relative isolate flex items-center gap-4 overflow-hidden rounded-3xl bg-[#14110d]/85 p-4 pr-5 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.8)] ring-1 ring-[#E2B98A]/40 backdrop-blur sm:gap-6 sm:p-6">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(70%_90%_at_15%_50%,rgb(226_185_138/0.18),transparent_70%)]"
        />
        <BotellaCava className="h-32 w-14 shrink-0 sm:h-44 sm:w-20" />
        <div className="min-w-0">
          <p className="kicker text-[0.65rem] text-[#E2B98A]">
            Regalo de Navidad
          </p>
          <p className="mt-1.5 font-display text-[1.6rem] font-light leading-[1.05] text-crema sm:text-[1.9rem]">
            Un cava <em className="text-[#E2B98A]">de regalo</em>
          </p>
          <p className="mt-1.5 text-sm leading-snug text-crema/75">
            Si tu encargo pasa de <b className="text-crema">{umbral}</b>, te lo
            llevas con tus vinos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <section
      aria-labelledby="promo-cava"
      className="relative isolate overflow-hidden bg-carbon text-crema"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_75%_50%,rgb(226_185_138/0.22),transparent_70%)]"
      />
      <div className="container-wide grid items-center gap-6 py-14 sm:py-16 md:grid-cols-12 md:gap-10 lg:py-20">
        <div className="flex justify-center pt-6 md:order-2 md:col-span-5 md:pt-0">
          <BotellaCava className="h-60 w-28 sm:h-80 sm:w-36 lg:h-[26rem] lg:w-48" />
        </div>
        <div className="md:order-1 md:col-span-7">
          <p className="kicker text-[#E2B98A]">
            Navidad · Encargos de vino para llevar
          </p>
          <h2
            id="promo-cava"
            className="mt-4 font-display text-[clamp(2.75rem,6vw,5rem)] font-light leading-[0.95] tracking-tight"
          >
            Un cava de regalo <em className="text-[#E2B98A]">para brindar</em>
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-crema/80">
            Encarga tus vinos para las comidas y cenas de Navidad: si tu encargo
            pasa de <b className="text-crema">{umbral}</b>, te regalamos una
            botella de cava. La recoges con el resto en La Ofi.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            {href ? (
              <Link
                href={href}
                className="btn bg-[#E2B98A] px-6 text-carbon hover:bg-crema"
              >
                <Icon name="gift" className="h-4 w-4" />
                Hacer mi encargo
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            ) : null}
            <p className="text-sm text-crema/60">
              Al precio de la carta · Sin pago online
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
