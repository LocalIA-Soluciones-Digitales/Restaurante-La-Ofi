"use client";

import { useState } from "react";
import { useTableSession } from "@/components/pedir/table-session-context";
import { Icon } from "@/components/ui/Icon";

/**
 * Entrada por QR de mesa (portada de TableEntry de Palomita-Bar): el primero en
 * escanear elige cómo pide la mesa; en "cada uno lo suyo" cada comensal pone su
 * nombre (queda ligado a su móvil). Devuelve null cuando ya se puede pedir.
 */
export function TableEntry() {
  const s = useTableSession();
  const [nombre, setNombre] = useState("");
  if (!s) return null;

  const etiqueta = s.mesa.nombre ?? `Mesa ${s.mesa.numero}`;

  if (!s.haySesion) {
    return (
      <Pantalla titulo={`Bienvenidos a ${etiqueta}`} subtitulo={s.mesa.zona ?? undefined}>
        <p className="text-carbon-muted">¿Cómo vais a pedir?</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Opcion
            icon="users"
            titulo="Todos juntos"
            texto="Una cuenta para la mesa. Cualquiera puede añadir platos."
            onClick={() => void s.iniciar("JUNTOS")}
            disabled={s.cargando}
          />
          <Opcion
            icon="receipt"
            titulo="Cada uno lo suyo"
            texto="Cada comensal pide y paga lo suyo, y podéis compartir platos."
            onClick={() => void s.iniciar("SEPARADO")}
            disabled={s.cargando}
          />
        </div>
        {s.error ? <p role="alert" className="mt-4 text-sm font-semibold text-terracota">{s.error}</p> : null}
      </Pantalla>
    );
  }

  if (s.modo === "SEPARADO" && !s.participante) {
    const presentes = s.sesion?.participantes ?? [];
    return (
      <Pantalla titulo="¿Quién eres?" subtitulo={`${etiqueta} · cada uno lo suyo`}>
        {presentes.length > 0 ? (
          <p className="text-sm text-carbon-muted">
            Ya están en la mesa: <span className="font-semibold text-carbon">{presentes.map((p) => p.nombre).join(", ")}</span>.
          </p>
        ) : null}
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (nombre.trim()) void s.unirse(nombre);
          }}
        >
          <label className="flex-1">
            <span className="sr-only">Tu nombre</span>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value.slice(0, 40))}
              autoComplete="given-name"
              placeholder="Tu nombre"
              className="h-12 w-full rounded-full border border-carbon/15 bg-white px-5 text-base focus:border-marino focus:outline-none"
            />
          </label>
          <button type="submit" disabled={!nombre.trim() || s.cargando} className="btn-primary disabled:opacity-50">
            Entrar
          </button>
        </form>
        {s.error ? <p role="alert" className="mt-4 text-sm font-semibold text-terracota">{s.error}</p> : null}
      </Pantalla>
    );
  }

  return null;
}

function Pantalla({ titulo, subtitulo, children }: { titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-2xl rounded-[2rem] border border-carbon/10 bg-white p-6 shadow-lift sm:p-10">
      {subtitulo ? <p className="eyebrow text-terracota">{subtitulo}</p> : null}
      <h1 className="mt-2 text-4xl text-carbon">{titulo}</h1>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Opcion({
  icon,
  titulo,
  texto,
  onClick,
  disabled,
}: {
  icon: "users" | "receipt";
  titulo: string;
  texto: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex flex-col items-start gap-3 rounded-[1.5rem] border border-carbon/10 bg-arena/50 p-5 text-left transition-colors hover:border-marino hover:bg-white disabled:opacity-60"
    >
      <span className="grid h-12 w-12 place-items-center rounded-full bg-marino text-crema">
        <Icon name={icon} />
      </span>
      <span className="font-display text-2xl text-carbon">{titulo}</span>
      <span className="text-sm text-carbon-muted">{texto}</span>
    </button>
  );
}
