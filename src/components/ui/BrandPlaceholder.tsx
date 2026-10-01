import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Hueco de foto con textura de marca (baldosa hexagonal del local) para las fotos
 * que aún no tenemos. Nunca se sustituye por fotos de stock: se marca como pendiente.
 */
export function BrandPlaceholder({
  label,
  icon = "utensils",
  iconOnly = false,
  className = "",
}: {
  label: string;
  icon?: IconName;
  /** Solo el icono (cuando el título ya aparece encima, p. ej. en tarjetas). */
  iconOnly?: boolean;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={`${label} (foto pendiente)`}
      className={`hex-pattern relative flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-arena to-arena-2 text-marino ${className}`}
    >
      <span className="grid h-14 w-14 place-items-center rounded-full bg-crema/90 shadow-card">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      {iconOnly ? null : <span className="font-display text-xl">{label}</span>}
      <span className="rounded-full bg-crema/80 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-carbon-muted">
        Foto pendiente
      </span>
    </div>
  );
}
