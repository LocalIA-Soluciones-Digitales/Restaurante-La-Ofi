/**
 * Logotipo de La Ofi: una taza con «la ofi» impreso, cuya «o» es un grano de café.
 * Letras trazadas desde Outfit 800 (vector puro, no depende de la fuente). Los iconos de
 * la pestaña y de la app (app/icon.svg, apple-icon.png, public/icons) usan el mismo dibujo.
 */
const LA = "M54.6 124V87.5H63.3V124ZM77.1 124.5Q73.7 124.5 71 122.8Q68.4 121.2 66.9 118.3Q65.4 115.5 65.4 111.8Q65.4 108.1 66.9 105.2Q68.4 102.3 71 100.7Q73.7 99 77.1 99Q79.4 99 81.3 99.9Q83.2 100.7 84.4 102.2Q85.6 103.7 85.9 105.6V117.9Q85.6 119.8 84.4 121.3Q83.2 122.8 81.3 123.7Q79.4 124.5 77.1 124.5ZM78.9 116.8Q81.1 116.8 82.4 115.3Q83.8 114 83.8 111.8Q83.8 110.3 83.2 109.2Q82.5 108.1 81.5 107.4Q80.4 106.8 79 106.8Q77.6 106.8 76.5 107.4Q75.4 108.1 74.8 109.2Q74.2 110.3 74.2 111.8Q74.2 113.2 74.8 114.3Q75.4 115.5 76.5 116.1Q77.6 116.8 78.9 116.8ZM83.4 124V117.5L84.6 111.5L83.4 105.5V99.5H91.9V124Z";
const FI = "M138.6 124V98Q138.6 94.9 139.9 92.4Q141.2 89.9 143.8 88.4Q146.3 86.9 149.8 86.9Q152.5 86.9 154.5 87.8Q156.5 88.7 157.9 90.2L152.5 95.6Q152.1 95.2 151.5 94.9Q150.9 94.7 150.2 94.7Q148.8 94.7 148.1 95.5Q147.2 96.3 147.2 97.7V124ZM133.3 106.8V99.5H154.2V106.8ZM156.6 124V99.5H165.3V124ZM160.9 96.7Q159 96.7 157.7 95.4Q156.4 94 156.4 92Q156.4 90.1 157.7 88.8Q159 87.4 160.9 87.4Q163 87.4 164.3 88.8Q165.5 90.1 165.5 92Q165.5 94 164.3 95.4Q163 96.7 160.9 96.7Z";

/** Colores sobre fondo claro y sobre foto u oscuro. */
const TONOS = {
  claro: { taza: "#2B2722", letras: "#FAF5EC", grano: "#D2AE78", vapor: "#9A4527" },
  oscuro: { taza: "#FAF5EC", letras: "#2B2722", grano: "#9A4527", vapor: "#D2AE78" },
};

export function Logo({
  light = false,
  className = "",
}: {
  /** Sobre la foto de portada o un fondo oscuro. */
  light?: boolean;
  className?: string;
  /** Se mantiene por compatibilidad: la taza ya va centrada en su caja. */
  center?: boolean;
}) {
  const c = TONOS[light ? "oscuro" : "claro"];
  return (
    <svg viewBox="12 14 220 166" role="img" aria-label="La Ofi" className={`h-12 w-auto lg:h-[3.4rem] ${className}`}>
      <path d="M100 44c-7-8 7-14 0-24M124 44c-7-8 7-14 0-24" fill="none" stroke={c.vapor} strokeWidth="8" strokeLinecap="round" />
      <path d="M190 74h10a22 22 0 0 1 0 44h-12" fill="none" stroke={c.taza} strokeWidth="12" />
      <path d="M30 56H192V108A58 58 0 0 1 134 166H88A58 58 0 0 1 30 108Z" fill={c.taza} />
      <path d={LA} fill={c.letras} />
      <path d={FI} fill={c.letras} />
      <g transform="translate(100 95) scale(1.2308) rotate(-38 13 13)">
        <ellipse cx="13" cy="13" rx="9.6" ry="12.6" fill={c.grano} />
        <path d="M13 1.8c-4.6 6 4.6 16.4 0 22.4" fill="none" stroke={c.taza} strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <rect x="16" y="171" width="190" height="7" rx="3.5" fill={c.taza} />
    </svg>
  );
}
