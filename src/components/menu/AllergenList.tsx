import { getAlergeno, normalizarAlergenos } from "@/lib/allergens";
import { AllergenIcon } from "@/components/menu/AllergenIcon";

/** Alérgenos de un plato: icono + nombre visibles, lista semántica para lectores de pantalla. */
export function AllergenList({ alergenos, compact = false }: { alergenos: readonly string[]; compact?: boolean }) {
  const claves = normalizarAlergenos(alergenos);
  if (claves.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Alérgenos">
      {claves.map((key) => (
        <li
          key={key}
          className="inline-flex items-center gap-1 rounded-full border border-terracota/25 bg-terracota-soft/60 px-2 py-0.5 text-xs font-medium text-terracota"
        >
          <AllergenIcon alergeno={key} className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          {getAlergeno(key).label}
        </li>
      ))}
    </ul>
  );
}
