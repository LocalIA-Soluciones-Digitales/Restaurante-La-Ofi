import type { Metadata } from "next";
import { PROPUESTAS } from "@/components/logos/Propuestas";
import type { Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

type Params = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/logos",
    title: "Propuestas de logotipo",
    noindex: true,
  });
}

/**
 * Página de trabajo (sin enlazar ni indexar) para elegir logotipo: cada propuesta
 * sobre papel, sobre oscuro, como icono pequeño y montada en una cabecera.
 */
export default function LogosPage() {
  return (
    <div className="bg-papel-2 pb-24 pt-28 lg:pt-36">
      <div className="container-wide">
        <p className="kicker text-brasa">Para elegir</p>
        <h1 className="t-display mt-4 text-carbon">
          Propuestas de <em className="text-madera">logotipo</em>
        </h1>
        <p className="lead mt-4 max-w-2xl">
          Seis direcciones con los colores y tipografías de la web. Cada una se
          ve sobre papel, sobre oscuro, en pequeño (como icono de pestaña o de
          Instagram) y dentro de la cabecera. Dime el número que más te guste, o
          mezclas.
        </p>

        <ol className="mt-14 grid gap-10">
          {PROPUESTAS.map(({ n, nombre, idea, pros, Logo }) => {
            // El sello es redondo: necesita más alto para leerse.
            const alto = n === 2 ? "h-32" : "h-16";
            return (
              <li key={n} className="border-t-[3px] border-carbon pt-6">
                <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
                  <h2 className="font-display text-3xl text-carbon">
                    <span className="mr-3 text-brasa">
                      {String(n).padStart(2, "0")}
                    </span>
                    {nombre}
                  </h2>
                  <p className="max-w-xl text-sm text-carbon-muted">{pros}</p>
                </div>
                <p className="mt-2 max-w-3xl text-[0.95rem] text-carbon-muted">
                  {idea}
                </p>

                <div className="mt-6 grid gap-3 md:grid-cols-[1.4fr_1.4fr_0.8fr]">
                  <div className="grid h-52 place-items-center bg-crema ring-1 ring-tinta-line">
                    <div className={alto}>
                      <Logo />
                    </div>
                  </div>
                  <div className="grid h-52 place-items-center bg-noche">
                    <div className={alto}>
                      <Logo tono="oscuro" />
                    </div>
                  </div>
                  <div className="flex h-52 items-center justify-center gap-5 bg-arena ring-1 ring-tinta-line">
                    {[56, 32, 16].map((t) => (
                      <div
                        key={t}
                        className="grid place-items-center"
                        style={{ height: t, width: t }}
                      >
                        <Logo simbolo />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Montado en una cabecera como la de la web. */}
                <div className="mt-3 grid h-[72px] grid-cols-[1fr_auto_1fr] items-center border border-tinta-line bg-crema px-5 text-carbon">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em]">
                    Menú
                  </span>
                  <div className={n === 2 ? "h-14" : "h-11"}>
                    <Logo />
                  </div>
                  <span className="text-right text-[0.7rem] font-semibold uppercase tracking-[0.2em]">
                    Reservar
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
