// Esqueleto que aparece al instante al cambiar de sección mientras el servidor
// prepara los datos: el toque responde ya, sin quedarse la pantalla anterior congelada.
export default function CargandoPanel() {
  const bloque = "rounded-[1.25rem] bg-carbon/[0.06] dark:bg-crema/[0.06] motion-safe:animate-pulse";
  return (
    <div role="status" aria-label="Cargando" className="grid gap-4">
      <div className="flex gap-2">
        <div className={`${bloque} h-10 w-40`} />
        <div className={`${bloque} h-10 w-28`} />
        <div className={`${bloque} ml-auto h-10 w-24`} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`${bloque} h-24`} />
        ))}
      </div>
      <div className={`${bloque} h-[50vh]`} />
    </div>
  );
}
