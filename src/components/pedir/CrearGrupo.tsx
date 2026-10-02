"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { crearGrupo } from "@/lib/pedidos/actions";
import type { ConfigPedidos } from "@/lib/pedidos/types";

const HORA = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

/** Crear un pedido de grupo para recoger y compartir el enlace con el equipo. */
export function CrearGrupo({ config }: { config: ConfigPedidos | null }) {
  const franjas = (config?.franjas ?? []).filter((f) => f.libres > 0);
  const [nombre, setNombre] = useState("");
  const [organizador, setOrganizador] = useState("");
  const [franja, setFranja] = useState(franjas[0]?.hora ?? "");
  const [enlace, setEnlace] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  if (!config || franjas.length === 0) {
    return (
      <section className="mx-auto my-10 max-w-xl rounded-[2rem] border border-carbon/10 bg-white p-8 shadow-card">
        <h1 className="text-3xl text-carbon">Pedido de grupo</h1>
        <p className="mt-3 text-carbon-muted">Hoy no hay franjas de recogida disponibles. Llámanos y lo organizamos por teléfono.</p>
      </section>
    );
  }

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const r = await crearGrupo(nombre, organizador, franja);
    setEnviando(false);
    if (!r.ok) return setError(r.error);
    setEnlace(`${window.location.origin}/es/pedir?grupo=${r.data.token}`);
  };

  const compartir = async () => {
    if (!enlace) return;
    const texto = `Pedido de grupo en La Ofi («${nombre}»), recogida a las ${HORA.format(new Date(franja))}. Añade lo tuyo aquí:`;
    if (navigator.share) {
      await navigator.share({ title: "Pedido de grupo · La Ofi", text: texto, url: enlace }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(`${texto} ${enlace}`);
      setCopiado(true);
    }
  };

  return (
    <section className="mx-auto my-10 max-w-xl rounded-[2rem] border border-carbon/10 bg-white p-6 shadow-lift sm:p-10">
      <p className="eyebrow text-terracota">Empresas del Parque</p>
      <h1 className="mt-2 text-4xl text-carbon">Pedido de grupo</h1>
      {enlace ? (
        <div className="mt-6 space-y-4">
          <p className="text-carbon-muted">
            ¡Listo! Comparte este enlace con tu equipo. Cada uno añade lo suyo hasta la hora de cierre y lo recogéis juntos a las{" "}
            <strong className="text-carbon">{HORA.format(new Date(franja))}</strong>.
          </p>
          <p className="break-all rounded-2xl bg-arena p-4 font-mono text-sm text-carbon">{enlace}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={() => void compartir()} className="btn-primary">
              <Icon name="share" className="h-4 w-4" />
              {copiado ? "Enlace copiado" : "Compartir enlace"}
            </button>
            <a href={enlace} className="btn-secondary">
              Añadir lo mío
              <Icon name="arrow" className="h-4 w-4" />
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => void crear(e)} className="mt-6 grid gap-4">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-carbon">Nombre del grupo o empresa</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value.slice(0, 60))}
              required
              placeholder="Equipo de I+D"
              className="h-12 rounded-2xl border border-carbon/15 bg-white px-4 text-base focus:border-marino focus:outline-none"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-carbon">Tu nombre</span>
            <input
              value={organizador}
              onChange={(e) => setOrganizador(e.target.value.slice(0, 40))}
              required
              autoComplete="given-name"
              className="h-12 rounded-2xl border border-carbon/15 bg-white px-4 text-base focus:border-marino focus:outline-none"
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-carbon">Hora de recogida</span>
            <select
              value={franja}
              onChange={(e) => setFranja(e.target.value)}
              className="h-12 rounded-2xl border border-carbon/15 bg-white px-4 text-base focus:border-marino focus:outline-none"
            >
              {franjas.map((f) => (
                <option key={f.hora} value={f.hora}>
                  {HORA.format(new Date(f.hora))}
                </option>
              ))}
            </select>
          </label>
          {error ? (
            <p role="alert" className="text-sm font-semibold text-terracota">
              {error}
            </p>
          ) : null}
          <button type="submit" disabled={enviando} className="btn-primary">
            <Icon name="users" className="h-4 w-4" />
            Crear pedido de grupo
          </button>
        </form>
      )}
    </section>
  );
}
