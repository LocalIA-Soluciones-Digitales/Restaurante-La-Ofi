import { Icon, type IconName } from "@/components/ui/Icon";

// Datos de transporte público del Parque (parke.eus y Bizkaibus, 2023-2026):
// conviene revisarlos si cambian las líneas.
const MODOS: { icon: IconName; titulo: string; texto: string; nota: string }[] = [
  {
    icon: "car",
    titulo: "En coche",
    texto: "Por el corredor del Txorierri hasta el Parque Tecnológico. Aparcamiento propio junto al edificio.",
    nota: "220 plazas",
  },
  {
    icon: "bus",
    titulo: "En autobús",
    texto: "Bizkaibus A3224 y A3250 desde Bilbao (plaza Moyúa), con paradas dentro del Parque.",
    nota: "Lunes a viernes",
  },
  {
    icon: "train",
    titulo: "En tren",
    texto: "Euskotren, línea del Txorierri hasta Zamudio, y el autobús lanzadera de la estación al Parque.",
    nota: "Laborables",
  },
];

/** Según cómo vengas: tres columnas bajo el mapa, como el "getting here" de los hoteles. */
export function ComoLlegarModos() {
  return (
    <div className="container-wide pb-20 pt-12 sm:pb-24 sm:pt-16">
      <p className="kicker text-brasa">Según cómo vengas</p>
      <ul className="mt-6 grid border-t border-carbon sm:grid-cols-3">
        {MODOS.map((m, i) => (
          <li key={m.titulo} className={`border-b border-tinta-line py-7 sm:border-b-0 sm:py-8 ${i ? "sm:border-l sm:pl-8" : "sm:pr-8"} ${i === 1 ? "sm:pr-8" : ""}`}>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-arena text-brasa">
                  <Icon name={m.icon} className="h-5 w-5" />
                </span>
                <span className="font-display text-2xl text-carbon">{m.titulo}</span>
              </span>
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-carbon-muted">{m.nota}</span>
            </div>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-carbon-muted">{m.texto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
