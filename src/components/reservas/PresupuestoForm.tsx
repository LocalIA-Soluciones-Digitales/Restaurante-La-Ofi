"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatearFechaLarga, hoyEnMadrid } from "@/lib/format";
import { solicitarReserva } from "@/lib/reservas/actions";
import { SITE } from "@/lib/site";

const campo = "h-12 w-full rounded-2xl border border-carbon/15 bg-white px-4 text-base text-carbon focus:border-marino focus:outline-none";

const TIPOS = ["Comida de empresa", "Reunión en El Despacho", "Desayuno para una reunión", "Celebración", "Otro"];
const MOMENTOS = [
  { hora: "09:00", label: "Desayuno" },
  { hora: "14:00", label: "Comida" },
  { hora: "18:00", label: "Tarde" },
  { hora: "21:00", label: "Cena" },
];

/**
 * Solicitud de presupuesto para grupos y empresas (antes solo había teléfono).
 * Se guarda como reserva PENDIENTE con espacio «presupuesto» y el encargado la
 * ve en /admin/reservas con lo pedido en las notas. Sin límite de 12 personas
 * ni de horario: una celebración puede ser en un día que no abrimos.
 */
export function PresupuestoForm({ privacidadHref }: { privacidadHref: string }) {
  const [f, setF] = useState({
    empresa: "",
    tipo: TIPOS[0]!,
    fecha: "",
    hora: "14:00",
    personas: 15,
    porPersona: "",
    factura: false,
    nombre: "",
    telefono: "",
    email: "",
    notas: "",
    consiente_salud: false,
    web: "",
  });
  // El mínimo del calendario se pone en el navegador: la página se genera una vez al día.
  const [minFecha, setMinFecha] = useState<string | undefined>(undefined);
  useEffect(() => setMinFecha(hoyEnMadrid()), []);
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  if (estado === "ok") {
    return (
      <div role="status" className="bg-[#FFFDF8] p-8 text-carbon ring-1 ring-tinta-line">
        <Icon name="check" className="h-8 w-8 text-ok" />
        <p className="mt-3 font-display text-3xl">¡Solicitud enviada!</p>
        <p className="mt-2">
          {f.tipo} para {f.personas} el <span className="first-letter:uppercase">{formatearFechaLarga(f.fecha)}</span>. Te llamamos para preparar el
          menú y el presupuesto. Si corre prisa: <a href={SITE.phone.href} className="font-semibold underline">{SITE.phone.display}</a>.
        </p>
      </div>
    );
  }

  return (
    <>
      <noscript>
        <style>{"#form-presupuesto{display:none}"}</style>
      </noscript>
      <form
        id="form-presupuesto"
        className="grid gap-4 bg-[#FFFDF8] p-6 text-carbon ring-1 ring-tinta-line sm:grid-cols-2 sm:p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setEstado("enviando");
          setError(null);
          const r = await solicitarReserva({
            espacio: "presupuesto",
            nombre: f.nombre,
            telefono: f.telefono,
            email: f.email,
            fecha: f.fecha,
            hora: f.hora,
            personas: f.personas,
            notas: f.notas,
            consiente_salud: f.consiente_salud,
            presupuesto: { empresa: f.empresa, tipo: f.tipo, porPersona: f.porPersona, factura: f.factura },
            web: f.web,
          });
          if (!r.ok) {
            setEstado("idle");
            return setError(r.error);
          }
          setEstado("ok");
        }}
      >
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Qué necesitáis</span>
          <select value={f.tipo} onChange={(e) => set({ tipo: e.target.value })} className={campo}>
            {TIPOS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">
            Empresa o grupo <span className="font-normal text-carbon-muted">(opcional)</span>
          </span>
          <input autoComplete="organization" value={f.empresa} onChange={(e) => set({ empresa: e.target.value.slice(0, 80) })} className={campo} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Día</span>
          <input type="date" required min={minFecha} value={f.fecha} onChange={(e) => set({ fecha: e.target.value })} className={campo} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Momento</span>
            <select value={f.hora} onChange={(e) => set({ hora: e.target.value })} className={campo}>
              {MOMENTOS.map((m) => (
                <option key={m.hora} value={m.hora}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="font-semibold">Personas</span>
            <input type="number" required min={1} max={220} value={f.personas} onChange={(e) => set({ personas: Number(e.target.value) })} className={campo} />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">
            Presupuesto por persona <span className="font-normal text-carbon-muted">(opcional)</span>
          </span>
          <input inputMode="decimal" placeholder="p. ej. 25 €" value={f.porPersona} onChange={(e) => set({ porPersona: e.target.value.slice(0, 20) })} className={campo} />
        </label>
        <label className="flex min-h-12 items-center gap-3 self-end text-sm">
          <input type="checkbox" checked={f.factura} onChange={(e) => set({ factura: e.target.checked })} className="h-5 w-5 shrink-0 accent-[theme(colors.marino.DEFAULT)]" />
          <span>Necesitamos factura a nombre de la empresa</span>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Persona de contacto</span>
          <input required autoComplete="name" value={f.nombre} onChange={(e) => set({ nombre: e.target.value.slice(0, 60) })} className={campo} />
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-semibold">Teléfono</span>
          <input
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            minLength={9}
            value={f.telefono}
            onChange={(e) => set({ telefono: e.target.value.replace(/[^0-9+ ]/g, "").slice(0, 16) })}
            className={campo}
          />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-semibold">
            Email <span className="font-normal text-carbon-muted">(opcional, para enviaros el presupuesto)</span>
          </span>
          <input type="email" autoComplete="email" value={f.email} onChange={(e) => set({ email: e.target.value.slice(0, 120) })} className={campo} />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-semibold">
            Comentarios <span className="font-normal text-carbon-muted">(menú, alergias, horario…)</span>
          </span>
          <textarea value={f.notas} onChange={(e) => set({ notas: e.target.value.slice(0, 300) })} rows={3} className={`${campo} h-auto py-3`} />
        </label>
        {f.notas.trim() ? (
          <label className="flex items-start gap-3 text-sm sm:col-span-2">
            <input type="checkbox" required checked={f.consiente_salud} onChange={(e) => set({ consiente_salud: e.target.checked })} className="mt-1 h-4 w-4 shrink-0 accent-[theme(colors.marino.DEFAULT)]" />
            <span>Consiento que se usen las alergias o datos de salud que indico en los comentarios solo para preparar el menú. Se borran después del servicio.</span>
          </label>
        ) : null}
        {/* Campo trampa anti-bots: oculto a personas y lectores de pantalla. */}
        <div aria-hidden="true" className="absolute -left-[9999px]">
          <label>
            Web
            <input tabIndex={-1} autoComplete="off" value={f.web} onChange={(e) => set({ web: e.target.value })} />
          </label>
        </div>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-terracota sm:col-span-2">
            {error}
          </p>
        ) : null}
        <p className="text-xs leading-relaxed text-carbon-muted sm:col-span-2">
          Usamos estos datos solo para preparar y enviaros el presupuesto (art. 6.1.b RGPD).{" "}
          <Link href={privacidadHref} className="underline">
            Política de privacidad
          </Link>
          .
        </p>
        <button type="submit" disabled={estado === "enviando"} className="btn-primary sm:col-span-2">
          <Icon name="users" className="h-4 w-4" />
          {estado === "enviando" ? "Enviando…" : "Pedir presupuesto"}
        </button>
      </form>
    </>
  );
}
