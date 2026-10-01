import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

export function EmptyState({
  icon = "clock",
  title,
  children,
  dark = false,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      className={`hex-pattern flex flex-col items-center rounded-4xl border border-dashed px-6 py-12 text-center ${
        dark ? "border-crema/20 bg-marino-700/60 text-crema" : "border-carbon/15 bg-arena/60 text-carbon"
      }`}
    >
      <span className={`grid h-12 w-12 place-items-center rounded-full ${dark ? "bg-crema/10 text-neon" : "bg-crema text-terracota"}`}>
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <p className="mt-4 font-display text-2xl">{title}</p>
      {children ? <div className={`mt-2 max-w-md text-sm leading-relaxed ${dark ? "text-crema/75" : "text-carbon-muted"}`}>{children}</div> : null}
    </div>
  );
}
