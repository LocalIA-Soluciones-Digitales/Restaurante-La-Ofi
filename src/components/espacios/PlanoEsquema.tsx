/**
 * Esquema ORIENTATIVO de las cuatro zonas del local (no a escala). Sirve para
 * situarse mientras no haya plano real: cuando el encargado dibuje el salón en
 * /admin/salon, la página /espacios muestra ese plano (PlanoPublico).
 */
export function PlanoEsquema() {
  const zona = "fill-crema stroke-marino/30";
  return (
    <figure className="rounded-[2rem] border border-carbon/10 bg-arena/60 p-4 sm:p-6">
      <svg viewBox="0 0 400 260" role="img" aria-labelledby="plano-esquema-title" className="h-auto w-full">
        <title id="plano-esquema-title">
          Esquema orientativo de La Ofi: barra y comedor en el interior, El Despacho como sala privada y la terraza cubierta
          en el exterior.
        </title>
        <rect x="10" y="10" width="380" height="150" rx="14" className="fill-crema/60 stroke-marino/20" strokeWidth="2" />
        <rect x="22" y="22" width="88" height="126" rx="10" className={zona} strokeWidth="2" />
        <rect x="34" y="34" width="22" height="102" rx="6" className="fill-marino" />
        <text x="66" y="92" className="fill-marino text-[12px] font-semibold" textAnchor="middle" transform="rotate(-90 66 92)">
          Barra
        </text>
        <rect x="118" y="22" width="260" height="82" rx="10" className={zona} strokeWidth="2" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((c) =>
          [0, 1].map((r) => <circle key={`${c}-${r}`} cx={142 + c * 30} cy={46 + r * 30} r="8" className="fill-ratan" />),
        )}
        <text x="248" y="100" className="fill-marino text-[11px] font-semibold" textAnchor="middle">
          Comedor
        </text>
        <rect x="118" y="112" width="260" height="36" rx="10" className="fill-terracota-soft stroke-terracota/40" strokeWidth="2" />
        <text x="248" y="134" className="fill-terracota text-[11px] font-semibold" textAnchor="middle">
          El Despacho
        </text>
        <rect x="10" y="172" width="380" height="78" rx="14" className="fill-oliva-soft stroke-oliva/40" strokeWidth="2" strokeDasharray="6 5" />
        {Array.from({ length: 9 }).map((_, c) => (
          <rect key={c} x={30 + c * 40} y="196" width="22" height="22" rx="5" className="fill-oliva/50" />
        ))}
        <text x="200" y="240" className="fill-oliva text-[11px] font-semibold" textAnchor="middle">
          Terraza cubierta
        </text>
      </svg>
      <figcaption className="mt-3 text-xs text-carbon-muted">
        Esquema orientativo, no a escala. La distribución real de mesas se publicará cuando esté dibujado el plano del
        salón.
      </figcaption>
    </figure>
  );
}
