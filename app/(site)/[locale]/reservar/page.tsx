import type { Metadata } from "next";
import Link from "next/link";
import { Photo } from "@/components/media/Photo";
import { ReservaForm } from "@/components/reservas/ReservaForm";
import { EstadoAhora } from "@/components/ui/EstadoAhora";
import { HorarioHoy } from "@/components/ui/HorarioHoy";
import { Icon } from "@/components/ui/Icon";
import { formatearFechaLarga, hoyEnMadrid } from "@/lib/format";
import { estadoAhora, horarioDeHoy, resolverHorario } from "@/lib/horario";
import { href, type Locale } from "@/lib/i18n";
import { Proximamente } from "@/components/ui/Proximamente";
import { normalizarNombre } from "@/lib/carta-fotos";
import { creditoFoto, IMAGES } from "@/lib/images";
import { PROXIMAMENTE } from "@/lib/lanzamiento";
import { getCartaContent } from "@/lib/restaurant/content";
import { getCierres, getEventos, getHorario, getMenuDia } from "@/lib/restaurant/queries";
import { pageMetadata } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { rpcPublica } from "@/lib/supabase/rpc";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: Locale }>; searchParams: Promise<{ espacio?: string; para?: string; evento?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/reservar",
    title: "Reservar mesa",
    description: "Reserva mesa en La Ofi (Derio, Parque Tecnológico de Bizkaia): comedor, terraza cubierta o El Despacho para comidas de trabajo. Te confirmamos por teléfono.",
  });
}

/**
 * Reserva online si el local la ha activado (/admin/configuracion); si no, teléfono.
 * Mientras reservar mesa es «Próximamente» (src/lib/lanzamiento.ts), aquí solo se
 * apunta uno a los eventos; lo demás, por teléfono.
 */
export default async function ReservarPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { espacio, para, evento } = await searchParams;
  const [cfg, eventos, horarioBd, cierres, menu, carta] = await Promise.all([
    rpcPublica<{ online?: boolean; max_personas?: number; aforo_despacho?: number; menu_desde?: string; menu_hasta?: string }>("laofi_get_config_reservas"),
    getEventos(),
    getHorario(),
    getCierres(),
    // Solo devuelve el de hoy y dentro de su franja (8:00–16:00).
    getMenuDia(hoyEnMadrid()),
    getCartaContent(),
  ]);
  const online = Boolean(cfg?.data?.online);
  const reservables = (eventos ?? []).filter((e) => e.estado === "proximo");
  const horario = resolverHorario(horarioBd, cierres);
  const ahora = new Date();
  // Llegando desde un evento (aviso, agenda): no es reservar mesa, es apuntarse.
  const aEvento = espacio === "evento" && reservables.length > 0;
  const pronto = PROXIMAMENTE.reservas && !aEvento;
  // Cada plato con su ficha completa, la misma de /carta (fotos, ingredientes,
  // alérgenos, nutrición): al tocarlo se abre igual que allí. Solo la carta real:
  // los platos de ejemplo no existen en la base y no se podrían reservar. El del
  // menú del día lleva la foto del mismo plato de la carta.
  const cartaReserva = (carta.status === "real" ? carta.data : [])
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      productos: c.items
        .filter((p) => p.precioCentimos !== null)
        .map((p) => ({ id: p.id, nombre: p.nombre, descripcion: p.descripcion, precio_centimos: p.precioCentimos!, foto: p.imagen?.src ?? null, ficha: p })),
    }))
    .filter((c) => c.productos.length > 0);
  const fotoPorNombre = new Map(cartaReserva.flatMap((c) => c.productos.filter((p) => p.foto).map((p) => [normalizarNombre(p.nombre), p.foto] as const)));

  return (
    <div className="bg-crema pb-20 pt-24 sm:pb-28 lg:pt-32">
      <div className="container-wide grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
          <p className="kicker text-brasa">{aEvento ? "Eventos" : "Reservas"}</p>
          <h1 id="reservar-title" className="t-display mt-4 text-carbon">
            {aEvento ? "Apúntate al evento" : "Reserva tu mesa"}
          </h1>
          <p className="lead mt-5">
            {aEvento && online
              ? "Dinos cuántos vais a venir y lo preparamos para que estéis a gusto."
              : pronto
              ? "Comedor, terraza o El Despacho. Muy pronto, desde aquí; mientras tanto, llámanos y te la guardamos."
              : online
              ? "Comedor (menú del día o carta) o El Despacho. Te confirmamos por teléfono."
              : "Comedor, terraza o El Despacho. Llámanos y te confirmamos al momento."}
          </p>

          <div className="mt-8 border-y border-tinta-line py-6">
            <p className="text-sm text-carbon-muted">{online && !pronto ? "¿Prefieres llamar?" : "Reservas por teléfono"}</p>
            <a href={SITE.phone.href} className="mt-1 inline-flex items-center gap-3 font-display text-4xl tabular-nums text-carbon hover:text-brasa">
              <Icon name="phone" className="h-6 w-6 text-brasa" />
              {SITE.phone.display}
            </a>
            <div className="mt-4">
              <EstadoAhora semana={horario.semana} cierres={horario.cierres} inicial={estadoAhora(horario.semana, ahora, horario.cierres)} className="text-carbon" />
              <p className="mt-1 text-sm text-carbon-muted">
                <HorarioHoy
                  semana={horario.semana}
                  cierres={horario.cierres}
                  inicial={horarioDeHoy(horario.semana, ahora, horario.cierres)}
                  prefijo="Hoy: "
                  sinDato="Hoy: consulta el horario por teléfono"
                />
              </p>
            </div>
          </div>

          <ul className="mt-6 grid gap-3 text-[0.95rem] text-carbon">
            <li className="flex gap-3">
              <Icon name="users" className="mt-0.5 h-5 w-5 shrink-0 text-brasa" />
              Grupos, comidas de empresa y celebraciones: dinos cuántos sois y qué necesitáis.
            </li>
            <li className="flex gap-3">
              <Icon name="briefcase" className="mt-0.5 h-5 w-5 shrink-0 text-brasa" />
              El Despacho, comedor privado de hasta 30 personas: se reserva por personas y se come de carta.
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

        <div className="min-w-0 lg:col-span-8">
          {pronto ? (
            <Proximamente
              titulo="Reserva tu mesa desde el móvil"
              texto="Estamos terminando la reserva online del comedor y de El Despacho. Hasta entonces, te la guardamos por teléfono."
              foto={espacio === "despacho" ? "despacho" : "comedorRatan"}
              primero={espacio === "despacho" ? "El Despacho" : "Reservar mesa"}
            >
              <div className="flex flex-wrap items-center gap-3">
                <a href={SITE.phone.href} className="btn-primary px-6">
                  <Icon name="phone" className="h-4 w-4" />
                  Llamar al {SITE.phone.display}
                </a>
                <Link href={href(locale, "/menu-del-dia")} className="btn-secondary px-6">
                  Ver el menú de hoy
                </Link>
              </div>
              {reservables.length ? (
                <div className="mt-8">
                  <p className="kicker text-carbon-muted">Ya puedes apuntarte</p>
                  <ul className="mt-3 grid gap-2">
                    {reservables.slice(0, 3).map((e) => (
                      <li key={e.slug}>
                        <Link
                          href={href(locale, `/reservar?espacio=evento&evento=${e.slug}`)}
                          className="group flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 ring-1 ring-carbon/10 hover:ring-carbon/30"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-display text-lg text-carbon">{e.titulo}</span>
                            <span className="block text-sm text-carbon-muted first-letter:uppercase">
                              {formatearFechaLarga(e.fecha)}
                              {e.hora ? ` · ${e.hora.slice(0, 5)}` : ""}
                            </span>
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brasa">
                            Apuntarme
                            <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Proximamente>
          ) : online ? (
            <ReservaForm
              soloEventos={PROXIMAMENTE.reservas}
              maxPersonas={cfg?.data?.max_personas ?? 12}
              aforoDespacho={cfg?.data?.aforo_despacho ?? 30}
              menuFranja={{ desde: cfg?.data?.menu_desde ?? "08:00", hasta: cfg?.data?.menu_hasta ?? "16:00" }}
              menuHoy={
                menu && menu.disponible && menu.platos.length
                  ? { precio_centimos: menu.precio_centimos, platos: menu.platos.map((p) => ({ ...p, foto: fotoPorNombre.get(normalizarNombre(p.nombre)) ?? null })) }
                  : null
              }
              carta={cartaReserva}
              eventos={reservables.map((e) => ({ slug: e.slug, titulo: e.titulo, fecha: e.fecha, hora: e.hora, imagen: e.imagen_url ?? e.media?.find((m) => m.tipo === "imagen")?.url ?? null }))}
              espacioInicial={espacio === "despacho" || (espacio === "evento" && reservables.length) ? (espacio as "despacho" | "evento") : "mesa"}
              eventoInicial={evento}
              paraHoy={para === "hoy"}
              semana={horario.semana}
              cierres={horario.cierres}
              ahora={ahora.toISOString()}
              privacidadHref={href(locale, "/privacidad")}
            />
          ) : (
            <figure>
              <div className="relative aspect-[4/3] overflow-hidden bg-papel-3">
                <Photo img="comedorRatan" sizes="(min-width: 1024px) 55vw, 100vw" priority mobileBelow={0} />
              </div>
              <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-4 text-sm text-carbon-muted">
                <span>
                  {["El comedor de La Ofi", creditoFoto(IMAGES.comedorRatan)].filter(Boolean).join(" · ")}
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
