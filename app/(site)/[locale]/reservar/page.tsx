import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { ReservaForm } from "@/components/reservas/ReservaForm";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { Icon } from "@/components/ui/Icon";
import { estadoAhora, horarioDeHoy, resolverHorario } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { IMAGES } from "@/lib/images";
import { getEventos, getHorario } from "@/lib/restaurant/queries";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { rpcPublica } from "@/lib/supabase/rpc";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ espacio?: string; para?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({ locale, path: "/reservar", title: "Reservar mesa", noindex: true });
}

/** Reserva online si el local la ha activado (/admin/configuracion); si no, teléfono. */
export default async function ReservarPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { espacio, para } = await searchParams;
  const [cfg, eventos, horarioBd] = await Promise.all([
    rpcPublica<{ online?: boolean; max_personas?: number }>("laofi_get_config_reservas"),
    getEventos(),
    getHorario(),
  ]);
  const online = Boolean(cfg?.data?.online);
  const reservables = (eventos ?? []).filter((e) => e.estado === "proximo");
  const horario = resolverHorario(horarioBd);
  const hoy = horarioDeHoy(horario.semana);

  return (
    <div className="bg-crema pb-20 pt-24 sm:pb-28 lg:pt-32">
      <div className="container-wide grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="kicker text-brasa">Reservas</p>
          <h1 id="reservar-title" className="t-display mt-4 text-carbon">
            Reserva tu mesa
          </h1>
          <p className="lead mt-5">
            {online
              ? "Comedor, terraza o El Despacho. Te confirmamos enseguida."
              : "Comedor, terraza o El Despacho. Llámanos y te confirmamos al momento."}
          </p>

          <div className="mt-8 border-y border-tinta-line py-6">
            <p className="text-sm text-carbon-muted">{online ? "¿Prefieres llamar?" : "Reservas por teléfono"}</p>
            <a href={SITE.phone.href} className="mt-1 inline-flex items-center gap-3 font-display text-4xl tabular-nums text-carbon hover:text-brasa">
              <Icon name="phone" className="h-6 w-6 text-brasa" />
              {SITE.phone.display}
            </a>
            <div className="mt-4">
              <EstadoAhora semana={horario.semana} inicial={estadoAhora(horario.semana)} className="text-carbon" />
              <p className="mt-1 text-sm text-carbon-muted">{hoy ? `Hoy: ${hoy}` : "Hoy: consulta el horario por teléfono"}</p>
            </div>
          </div>

          <ul className="mt-6 grid gap-3 text-[0.95rem] text-carbon">
            <li className="flex gap-3">
              <Icon name="users" className="mt-0.5 h-5 w-5 shrink-0 text-brasa" />
              Grupos, comidas de empresa y celebraciones: dinos cuántos sois y qué necesitáis.
            </li>
            <li className="flex gap-3">
              <Icon name="briefcase" className="mt-0.5 h-5 w-5 shrink-0 text-brasa" />
              El Despacho, comedor privado para reuniones, con reserva previa.
            </li>
            <li className="flex gap-3">
              <Icon name="car" className="mt-0.5 h-5 w-5 shrink-0 text-brasa" />
              Edificio 502 del Parque Tecnológico, con aparcamiento para 220 coches.
            </li>
          </ul>

          {SITE.whatsapp ? (
            <a href={SITE.whatsapp.href} target="_blank" rel="noopener noreferrer" className="btn-secondary mt-8">
              <Icon name="whatsapp" className="h-4 w-4" />
              WhatsApp
            </a>
          ) : null}
        </div>

        <div className="lg:col-span-7">
          {online ? (
            <ReservaForm
              maxPersonas={cfg?.data?.max_personas ?? 12}
              eventos={reservables.map((e) => ({ slug: e.slug, titulo: e.titulo, fecha: e.fecha }))}
              espacioInicial={espacio === "despacho" ? "despacho" : "mesa"}
              paraHoy={para === "hoy"}
            />
          ) : (
            <figure>
              <div className="relative aspect-[4/3] overflow-hidden bg-papel-3">
                <Photo img="comedorRatan" sizes="(min-width: 1024px) 55vw, 100vw" priority mobileBelow={0} />
              </div>
              <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-4 text-sm text-carbon-muted">
                <span>
                  El comedor de La Ofi{IMAGES.comedorRatan.kind === "tercero" ? ` · Foto: ${IMAGES.comedorRatan.credit}` : ""}
                </span>
                <span className="flex gap-6">
                  <Link href={href(locale, "/menu-del-dia")} className="link-arrow">
                    Menú de hoy
                  </Link>
                  <Link href={href(locale, "/carta")} className="link-arrow">
                    Carta
                  </Link>
                </span>
              </figcaption>
            </figure>
          )}
        </div>
      </div>
    </div>
  );
}
