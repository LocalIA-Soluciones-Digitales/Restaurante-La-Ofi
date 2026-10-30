import Image from "next/image";
import { Icon, type IconName } from "@/components/ui/Icon";
import { clasePlato, type ClasePlato } from "@/lib/carta-fotos";

// Sin foto, una pieza ilustrada con el tipo de plato en los colores del local:
// nunca la foto de otro plato.
const ESTILO: Record<ClasePlato, { icono: IconName; fondo: string; tinta: string }> = {
  pescado: { icono: "fish", fondo: "bg-[#E2E8EF]", tinta: "text-marino" },
  carne: { icono: "steak", fondo: "bg-terracota-soft", tinta: "text-brasa" },
  cuchara: { icono: "bowl", fondo: "bg-arena-2", tinta: "text-madera-oscura" },
  verdura: { icono: "leaf", fondo: "bg-oliva-soft", tinta: "text-oliva" },
  huevo: { icono: "egg", fondo: "bg-[#F6EBCB]", tinta: "text-madera-oscura" },
  pan: { icono: "bread", fondo: "bg-arena", tinta: "text-madera-oscura" },
  postre: { icono: "cake", fondo: "bg-[#F4E1DE]", tinta: "text-[#8C3B4A]" },
  vino: { icono: "wine", fondo: "bg-[#EBDDE3]", tinta: "text-[#6E2A3F]" },
  cafe: { icono: "coffee", fondo: "bg-arena-2", tinta: "text-carbon" },
  otro: { icono: "utensils", fondo: "bg-papel-2", tinta: "text-carbon-muted" },
};

/** Imagen pequeña de un plato: su foto si la tiene; si no, su tipo ilustrado. */
export function MiniaturaPlato({ nombre, foto, seccion, className = "h-14 w-14" }: { nombre: string; foto?: string | null; seccion?: string; className?: string }) {
  if (foto) {
    return (
      <span className={`relative block shrink-0 overflow-hidden rounded-xl bg-papel-3 ${className}`}>
        <Image src={foto} alt="" fill sizes="64px" className="object-cover" />
      </span>
    );
  }
  const e = ESTILO[clasePlato(nombre, seccion)];
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-xl ${e.fondo} ${e.tinta} ${className}`}>
      <Icon name={e.icono} className="h-1/2 w-1/2" />
    </span>
  );
}
