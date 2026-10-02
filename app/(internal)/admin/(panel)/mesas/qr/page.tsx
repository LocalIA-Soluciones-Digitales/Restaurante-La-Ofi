import type { Metadata } from "next";
import { BotonImprimir } from "@/components/admin/BotonImprimir";
import { Aviso } from "@/components/admin/ui";
import { listar } from "@/lib/admin/actions";
import { qrSvg, urlMesa } from "@/lib/admin/qr";
import type { MesaSalon, Zona } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Imprimir QR" };
export const dynamic = "force-dynamic";

const PLANTILLAS = {
  // Tarjeta A6 vertical para metacrilato de mesa: 4 por A4.
  metacrilato: { ancho: "105mm", alto: "148mm", cols: 2, qr: "62mm", titulo: "text-[30pt]" },
  // Pegatina cuadrada de 7 cm: 12 por A4.
  pegatina: { ancho: "70mm", alto: "70mm", cols: 3, qr: "40mm", titulo: "text-[16pt]" },
} as const;

/** Hoja A4 de QR de mesas con la marca (neón "la ofi"), lista para imprimir en lote. */
export default async function QrPage({ searchParams }: { searchParams: Promise<{ plantilla?: string }> }) {
  const { plantilla } = await searchParams;
  const p = PLANTILLAS[plantilla === "pegatina" ? "pegatina" : "metacrilato"];
  const [mesas, zonas] = await Promise.all([listar<MesaSalon>("mesas", { activa: true }), listar<Zona>("zonas")]);
  if (!mesas.ok) return <Aviso>{mesas.error}</Aviso>;
  const zona = (id: string | null) => (zonas.ok ? zonas.data.find((z) => z.id === id)?.nombre : null);
  const qrs = await Promise.all(mesas.data.map((m) => qrSvg(urlMesa(m.token))));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <p className="text-sm opacity-70">
          {mesas.data.length} mesas · plantilla {plantilla === "pegatina" ? "pegatina 7 × 7 cm" : "metacrilato A6"}. Imprime a escala 100 %, sin márgenes del navegador.
        </p>
        <BotonImprimir />
      </div>
      <style>{`@page { size: A4; margin: 0; } @media print { body { background: #fff !important; } }`}</style>
      <div className="mx-auto grid w-[210mm] justify-center gap-0 bg-white print:w-[210mm]" style={{ gridTemplateColumns: `repeat(${p.cols}, ${p.ancho})` }}>
        {mesas.data.map((m, i) => (
          <article
            key={m.id}
            className="flex break-inside-avoid flex-col items-center justify-between border border-dashed border-carbon/20 p-[6mm] text-center text-noche print:border-carbon/10"
            style={{ width: p.ancho, height: p.alto, background: "#FAF5EC" }}
          >
            <p className="font-display text-[22pt] font-semibold lowercase leading-none" style={{ color: "#1E3557" }}>
              la ofi
            </p>
            <div style={{ width: p.qr, height: p.qr }} dangerouslySetInnerHTML={{ __html: qrs[i]! }} />
            <div>
              <p className={`font-display font-semibold leading-none ${p.titulo}`}>{m.nombre ?? `Mesa ${m.numero}`}</p>
              {plantilla !== "pegatina" ? (
                <>
                  {zona(m.zona_id) ? <p className="mt-1 text-[9pt] uppercase tracking-[0.2em] opacity-60">{zona(m.zona_id)}</p> : null}
                  <p className="mt-3 text-[10pt] leading-snug">Escanea y pide desde tu móvil.<br />Juntos o cada uno lo suyo.</p>
                </>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
