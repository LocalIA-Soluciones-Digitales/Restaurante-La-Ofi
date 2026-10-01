import type { Fuente } from "@/lib/restaurant/types";

const LABELS: Record<Exclude<Fuente, "supabase">, { text: string; title: string }> = {
  ejemplo: { text: "Ejemplo", title: "Contenido ilustrativo de la demo: no es información real del restaurante" },
  instagram: { text: "Según Instagram", title: "Publicado por La Ofi en Instagram (@laofiparke). Confirmar en el local" },
  prensa: { text: "Según prensa", title: "Citado por Deia (13/09/2025). Disponibilidad y precio a confirmar" },
  opiniones: { text: "Según clientes", title: "Información publicada por clientes en internet. Confirmar en el local" },
  carta: { text: "Según carta", title: "Platos de una foto de la carta publicada por un cliente (2025). Precio en el local" },
};

/** Marca visual obligatoria para todo contenido que no viene de los datos reales del tenant. */
export function SourceBadge({ fuente, className = "" }: { fuente: Fuente; className?: string }) {
  if (fuente === "supabase") return null;
  const { text, title } = LABELS[fuente];
  const tone = fuente === "ejemplo" ? "bg-terracota text-crema" : "bg-oliva text-crema";
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wider ${tone} ${className}`}
    >
      {text}
      <span className="sr-only">: {title}</span>
    </span>
  );
}
