import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui/Wordmark";

// Propuestas de logotipo para elegir (página /logos, sin indexar). Todas en SVG con
// las tipografías y colores de la web; `tono` las pasa a claro sobre fondo oscuro.
type Tono = "claro" | "oscuro";

const DISPLAY = { fontFamily: "var(--font-display), Georgia, serif" };
const SANS = { fontFamily: "var(--font-sans), system-ui, sans-serif" };

function colores(tono: Tono) {
  return tono === "oscuro"
    ? {
        tinta: "#FAF5EC",
        suave: "rgb(250 245 236 / 0.65)",
        acento: "#D2AE78",
        brasa: "#E08A5F",
      }
    : {
        tinta: "#2B2722",
        suave: "#5E554B",
        acento: "#A9784A",
        brasa: "#9A4527",
      };
}

/** 1 · Monograma: la «O» como plato visto desde arriba y la brasa como punto de la i. */
export function LogoPlato({
  tono = "claro",
  simbolo = false,
}: {
  tono?: Tono;
  simbolo?: boolean;
}) {
  const c = colores(tono);
  const marca = (
    <g>
      <circle
        cx="24"
        cy="24"
        r="21"
        fill="none"
        stroke={c.tinta}
        strokeWidth="2.4"
      />
      <circle
        cx="24"
        cy="24"
        r="13.5"
        fill="none"
        stroke={c.tinta}
        strokeWidth="1.2"
        opacity="0.55"
      />
      <circle cx="35.5" cy="9.5" r="4.2" fill={c.brasa} />
    </g>
  );
  if (simbolo)
    return (
      <svg viewBox="0 0 48 48" className="h-full w-full">
        {marca}
      </svg>
    );
  return (
    <svg viewBox="0 0 230 48" className="h-full w-auto">
      {marca}
      <text
        x="60"
        y="34"
        fontSize="30"
        fontWeight="400"
        letterSpacing="-0.5"
        fill={c.tinta}
        style={DISPLAY}
      >
        la ofi
      </text>
      <text
        x="61"
        y="45.5"
        fontSize="6.4"
        fontWeight="600"
        letterSpacing="2.6"
        fill={c.suave}
        style={SANS}
      >
        RESTAURANTE · DERIO
      </text>
    </svg>
  );
}

/** 2 · Sello circular: nombre y lugar alrededor, «LO» en el centro. Para servilletas, bolsas y redes. */
export function LogoSello({
  tono = "claro",
}: {
  tono?: Tono;
  simbolo?: boolean;
}) {
  const c = colores(tono);
  const id = `arco-${tono}`;
  return (
    <svg viewBox="0 0 120 120" className="h-full w-auto">
      <defs>
        <path id={id} d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
      </defs>
      <circle
        cx="60"
        cy="60"
        r="57"
        fill="none"
        stroke={c.tinta}
        strokeWidth="1.6"
      />
      <circle
        cx="60"
        cy="60"
        r="33"
        fill="none"
        stroke={c.tinta}
        strokeWidth="1"
        opacity="0.5"
      />
      <text
        fontSize="9.2"
        fontWeight="600"
        letterSpacing="3.4"
        fill={c.tinta}
        style={SANS}
      >
        <textPath href={`#${id}`} startOffset="0">
          LA OFI · RESTAURANTE · DERIO · BIZKAIA ·
        </textPath>
      </text>
      <text
        x="60"
        y="70"
        textAnchor="middle"
        fontSize="30"
        fontStyle="italic"
        fill={c.tinta}
        style={DISPLAY}
      >
        lo
      </text>
      <circle cx="60" cy="82" r="2.2" fill={c.brasa} />
    </svg>
  );
}

/** 3 · Neón depurado: el rótulo del local (el logo actual) con la subtitulación más fina. */
export function LogoNeon({
  tono = "claro",
  simbolo = false,
}: {
  tono?: Tono;
  simbolo?: boolean;
}) {
  const c = colores(tono);
  const color = tono === "oscuro" ? "#f4f0ff" : "#1E3557";
  const brillo =
    tono === "oscuro"
      ? "[filter:drop-shadow(0_0_2px_rgb(201_187_255/0.9))_drop-shadow(0_0_8px_rgb(142_124_240/0.6))]"
      : "";
  if (simbolo)
    return (
      <span
        className="grid h-full w-full place-items-center rounded-[22%]"
        style={{ background: tono === "oscuro" ? "#111E33" : "#1E3557" }}
      >
        <Wordmark title="la ofi" className="h-[38%] w-auto text-[#f4f0ff]" />
      </span>
    );
  return (
    <span className="inline-flex h-full flex-col items-center justify-center">
      <span style={{ color }} className={`h-[62%] ${brillo}`}>
        <Wordmark title="la ofi" className="h-full w-auto" />
      </span>
      <span
        className="mt-1.5 text-[0.5rem] font-semibold uppercase tracking-[0.34em]"
        style={{ color: c.suave }}
      >
        Restaurante · Derio
      </span>
    </span>
  );
}

/** 4 · Editorial: «La Ofi» en Fraunces con cursiva y punto final de brasa, como una cabecera de revista. */
export function LogoEditorial({
  tono = "claro",
  simbolo = false,
}: {
  tono?: Tono;
  simbolo?: boolean;
}) {
  const c = colores(tono);
  if (simbolo)
    return (
      <svg viewBox="0 0 48 48" className="h-full w-full">
        <text x="4" y="37" fontSize="34" fill={c.tinta} style={DISPLAY}>
          L
          <tspan fontStyle="italic" fill={c.acento}>
            o
          </tspan>
          <tspan fill={c.brasa}>.</tspan>
        </text>
      </svg>
    );
  return (
    <svg viewBox="0 0 200 52" className="h-full w-auto">
      <text
        x="0"
        y="34"
        fontSize="36"
        letterSpacing="-1"
        fill={c.tinta}
        style={DISPLAY}
      >
        La{" "}
        <tspan fontStyle="italic" fill={c.acento}>
          Ofi
        </tspan>
        <tspan fill={c.brasa}>.</tspan>
      </text>
      <line
        x1="1"
        y1="42"
        x2="112"
        y2="42"
        stroke={c.tinta}
        strokeWidth="0.8"
        opacity="0.35"
      />
      <text
        x="1"
        y="51"
        fontSize="6.2"
        fontWeight="600"
        letterSpacing="2.8"
        fill={c.suave}
        style={SANS}
      >
        RESTAURANTE · DERIO
      </text>
    </svg>
  );
}

/** 5 · Edificio 502: el nombre dentro de un marco como una ventana de oficina, con el número del edificio. */
export function LogoEdificio({
  tono = "claro",
  simbolo = false,
}: {
  tono?: Tono;
  simbolo?: boolean;
}) {
  const c = colores(tono);
  if (simbolo)
    return (
      <svg viewBox="0 0 48 48" className="h-full w-full">
        <rect
          x="4"
          y="4"
          width="40"
          height="40"
          fill="none"
          stroke={c.tinta}
          strokeWidth="2.6"
        />
        <line
          x1="4"
          y1="33"
          x2="44"
          y2="33"
          stroke={c.tinta}
          strokeWidth="1.4"
        />
        <text
          x="24"
          y="26"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          letterSpacing="-0.5"
          fill={c.tinta}
          style={SANS}
        >
          ofi
        </text>
        <text
          x="24"
          y="41"
          textAnchor="middle"
          fontSize="6"
          fontWeight="600"
          letterSpacing="1.2"
          fill={c.brasa}
          style={SANS}
        >
          502
        </text>
      </svg>
    );
  return (
    <svg viewBox="0 0 176 52" className="h-full w-auto">
      <rect
        x="1.5"
        y="1.5"
        width="173"
        height="49"
        fill="none"
        stroke={c.tinta}
        strokeWidth="2.4"
      />
      <line
        x1="128"
        y1="1.5"
        x2="128"
        y2="50.5"
        stroke={c.tinta}
        strokeWidth="1.2"
      />
      <text
        x="14"
        y="35"
        fontSize="27"
        fontWeight="700"
        letterSpacing="-1"
        fill={c.tinta}
        style={SANS}
      >
        la ofi
      </text>
      <text
        x="151"
        y="24"
        textAnchor="middle"
        fontSize="6"
        fontWeight="600"
        letterSpacing="1.6"
        fill={c.suave}
        style={SANS}
      >
        EDIF.
      </text>
      <text
        x="151"
        y="38"
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill={c.brasa}
        style={SANS}
      >
        502
      </text>
    </svg>
  );
}

/** 6 · De la taza a la brasa: el vapor del café de las 7:30 termina en llama. Pictograma + nombre en sans. */
export function LogoTaza({
  tono = "claro",
  simbolo = false,
}: {
  tono?: Tono;
  simbolo?: boolean;
}) {
  const c = colores(tono);
  const marca = (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M8 24h24v6a10 10 0 0 1-10 10h-4A10 10 0 0 1 8 30v-6Z"
        stroke={c.tinta}
        strokeWidth="2.4"
      />
      <path
        d="M32 27h2.5a4 4 0 0 1 0 8H31"
        stroke={c.tinta}
        strokeWidth="2.4"
      />
      <path
        d="M20 20c-3-3-1-6 1-8s3-5 0-8c5 2 7 6 5 10s-3 4-6 6Z"
        fill={c.brasa}
        stroke="none"
      />
    </g>
  );
  if (simbolo)
    return (
      <svg viewBox="0 0 44 44" className="h-full w-full">
        {marca}
      </svg>
    );
  return (
    <svg viewBox="0 0 170 44" className="h-full w-auto">
      {marca}
      <text
        x="50"
        y="33"
        fontSize="27"
        fontWeight="700"
        letterSpacing="-1.2"
        fill={c.tinta}
        style={SANS}
      >
        la ofi
        <tspan
          dx="8"
          fontSize="8"
          fontWeight="600"
          letterSpacing="1.4"
          fill={c.suave}
        >
          DERIO
        </tspan>
      </text>
    </svg>
  );
}

export interface Propuesta {
  n: number;
  nombre: string;
  idea: string;
  pros: string;
  Logo: (p: { tono?: Tono; simbolo?: boolean }) => ReactNode;
}

export const PROPUESTAS: Propuesta[] = [
  {
    n: 1,
    nombre: "El plato",
    idea: "La «O» de Ofi como un plato visto desde arriba; la brasa es el punto. Nombre en minúsculas con la tipografía de los titulares.",
    pros: "Muy reconocible en pequeño (icono, redes) y cálido sin ser rústico.",
    Logo: LogoPlato,
  },
  {
    n: 2,
    nombre: "Sello",
    idea: "Sello circular con «La Ofi · Restaurante · Derio · Bizkaia» alrededor y «lo» en el centro.",
    pros: "Queda muy bien impreso: servilletas, bolsas para llevar, tazas, Instagram.",
    Logo: LogoSello,
  },
  {
    n: 3,
    nombre: "Neón depurado",
    idea: "El rótulo de neón del local (el logo actual), con el subtítulo más fino y un icono cuadrado azul.",
    pros: "Continuidad: es lo que la gente ya ve en la barra.",
    Logo: LogoNeon,
  },
  {
    n: 4,
    nombre: "Editorial",
    idea: "«La Ofi» con «Ofi» en cursiva madera y un punto final de brasa, sobre un filete fino.",
    pros: "El más elegante; encaja con el estilo de revista de la web.",
    Logo: LogoEditorial,
  },
  {
    n: 5,
    nombre: "Edificio 502",
    idea: "El nombre dentro de un marco como la ventana de una oficina, con el número del edificio a un lado.",
    pros: "Cuenta dónde está y a quién se dirige (el Parque Tecnológico).",
    Logo: LogoEdificio,
  },
  {
    n: 6,
    nombre: "De la taza a la brasa",
    idea: "Una taza cuyo vapor termina en llama: del café de las 7:30 a la brasa del mediodía.",
    pros: "Explica el local en un dibujo; muy actual en sans gruesa.",
    Logo: LogoTaza,
  },
];
