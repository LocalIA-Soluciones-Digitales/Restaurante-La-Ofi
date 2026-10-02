"use client";

import { useState, type ReactNode } from "react";
import { AvisoFlotante } from "@/components/admin/AvisoFlotante";
import { botonPrimario, card, input } from "@/components/admin/ui";
import { guardar } from "@/lib/admin/actions";

export interface Ajuste {
  clave: string;
  valor: Record<string, unknown>;
}

export interface DiaHorarioBd {
  dia: number;
  estado: "abierto" | "cerrado" | "consultar";
  desde: string | null;
  hasta: string | null;
}

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function Seccion({ titulo, texto, children }: { titulo: string; texto?: string; children: ReactNode }) {
  return (
    <section className={`${card} p-5`}>
      <h2 className="font-display text-2xl">{titulo}</h2>
      {texto ? <p className="mt-1 text-sm opacity-70">{texto}</p> : null}
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

/**
 * Configuración (portado de HorarioGestion + configuración de Palomita): horario
 * (sustituye al publicado en internet), recogida por franjas, pagos, reservas
 * online, datos fiscales y estado de TicketBAI. Todo lo nuevo viene APAGADO.
 */
export function ConfiguracionPanel({ ajustes, horario, ticketbai }: { ajustes: Ajuste[]; horario: DiaHorarioBd[]; ticketbai: { activo: boolean } }) {
  const val = (k: string) => (ajustes.find((a) => a.clave === k)?.valor ?? {}) as Record<string, unknown>;
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);

  const guardarAjuste = async (clave: string, valor: Record<string, unknown>, ok: string) => {
    const r = await guardar("ajustes", { clave, valor });
    setAviso(r.ok ? { tono: "ok", texto: ok } : { tono: "error", texto: r.error });
  };

  const rec = val("recogida");
  const [recogida, setRecogida] = useState({
    activa: Boolean(rec.activa),
    desde: (rec.desde as string) ?? "12:30",
    hasta: (rec.hasta as string) ?? "15:00",
    intervalo_min: Number(rec.intervalo_min ?? 15),
    capacidad: rec.capacidad == null ? "" : String(rec.capacidad),
    antelacion_min: Number(rec.antelacion_min ?? 20),
    dias: (rec.dias as number[]) ?? [1, 2, 3, 4, 5],
  });
  const pag = val("pagos");
  const [pagos, setPagos] = useState({ online: Boolean(pag.online), en_local: pag.en_local !== false });
  const res = val("reservas");
  const [reservas, setReservas] = useState({ online: Boolean(res.online), max_personas: Number(res.max_personas ?? 12), antelacion_dias: Number(res.antelacion_dias ?? 60) });
  const fis = val("fiscal");
  const [fiscal, setFiscal] = useState({ razon_social: (fis.razon_social as string) ?? "", nif: (fis.nif as string) ?? "" });
  const [dias, setDias] = useState<DiaHorarioBd[]>(() => DIAS.map((_, i) => horario.find((h) => h.dia === i + 1) ?? { dia: i + 1, estado: "consultar", desde: null, hasta: null }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <AvisoFlotante aviso={aviso} onCerrar={() => setAviso(null)} />

      <Seccion titulo="Horario" texto="Se publica en la web (cabecera, contacto, «Abierto ahora» y Google). Mientras no lo guardes, se usa el publicado en internet.">
        {dias.map((d, i) => (
          <div key={d.dia} className="grid grid-cols-[6rem_1fr] items-center gap-2 sm:grid-cols-[6rem_9rem_1fr_1fr]">
            <span className="text-sm font-semibold">{DIAS[i]}</span>
            <select value={d.estado} onChange={(e) => setDias((l) => l.map((x) => (x.dia === d.dia ? { ...x, estado: e.target.value as DiaHorarioBd["estado"] } : x)))} className={input} aria-label={`${DIAS[i]}: estado`}>
              <option value="abierto">Abierto</option>
              <option value="cerrado">Cerrado</option>
              <option value="consultar">Consultar</option>
            </select>
            {d.estado === "abierto" ? (
              <>
                <input type="time" value={d.desde ?? ""} onChange={(e) => setDias((l) => l.map((x) => (x.dia === d.dia ? { ...x, desde: e.target.value } : x)))} className={input} aria-label={`${DIAS[i]}: abre`} />
                <input type="time" value={d.hasta ?? ""} onChange={(e) => setDias((l) => l.map((x) => (x.dia === d.dia ? { ...x, hasta: e.target.value } : x)))} className={input} aria-label={`${DIAS[i]}: cierra (00:00 = medianoche)`} />
              </>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          className={botonPrimario}
          onClick={async () => {
            for (const d of dias) {
              const r = await guardar("horario", { dia: d.dia, estado: d.estado, desde: d.estado === "abierto" ? d.desde : null, hasta: d.estado === "abierto" ? d.hasta : null });
              if (!r.ok) return setAviso({ tono: "error", texto: `${DIAS[d.dia - 1]}: ${r.error}` });
            }
            setAviso({ tono: "ok", texto: "Horario guardado: ya se ve en la web." });
          }}
        >
          Guardar horario
        </button>
      </Seccion>

      <Seccion titulo="Pedidos para recoger" texto="Franjas de recogida del día y cuántos pedidos caben en cada una (un pedido de grupo cuenta como uno).">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={recogida.activa} onChange={(e) => setRecogida({ ...recogida, activa: e.target.checked })} className="h-5 w-5" />
          Aceptar pedidos para recoger
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <label className="grid gap-1 text-xs">
            Desde
            <input type="time" value={recogida.desde} onChange={(e) => setRecogida({ ...recogida, desde: e.target.value })} className={input} />
          </label>
          <label className="grid gap-1 text-xs">
            Hasta
            <input type="time" value={recogida.hasta} onChange={(e) => setRecogida({ ...recogida, hasta: e.target.value })} className={input} />
          </label>
          <label className="grid gap-1 text-xs">
            Cada (min)
            <select value={recogida.intervalo_min} onChange={(e) => setRecogida({ ...recogida, intervalo_min: Number(e.target.value) })} className={input}>
              {[10, 15, 20, 30].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs">
            Pedidos por franja
            <input value={recogida.capacidad} onChange={(e) => setRecogida({ ...recogida, capacidad: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className={input} />
          </label>
          <label className="grid gap-1 text-xs">
            Antelación mínima (min)
            <input value={recogida.antelacion_min} onChange={(e) => setRecogida({ ...recogida, antelacion_min: Number(e.target.value.replace(/\D/g, "")) })} inputMode="numeric" className={input} />
          </label>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Días con recogida">
          {DIAS.map((d, i) => (
            <button
              key={d}
              type="button"
              aria-pressed={recogida.dias.includes(i + 1)}
              onClick={() => setRecogida({ ...recogida, dias: recogida.dias.includes(i + 1) ? recogida.dias.filter((x) => x !== i + 1) : [...recogida.dias, i + 1].sort() })}
              className="min-h-10 rounded-xl border border-carbon/15 px-3 text-sm aria-pressed:border-oliva aria-pressed:bg-oliva aria-pressed:text-crema dark:border-crema/15"
            >
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={botonPrimario}
          disabled={recogida.activa && !recogida.capacidad}
          onClick={() => void guardarAjuste("recogida", { ...recogida, capacidad: recogida.capacidad ? Number(recogida.capacidad) : null }, "Recogida guardada.")}
        >
          Guardar recogida
        </button>
      </Seccion>

      <Seccion titulo="Pagos" texto="El pago online necesita además las claves de Stripe en Vercel (README).">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={pagos.online} onChange={(e) => setPagos({ ...pagos, online: e.target.checked })} className="h-5 w-5" />
          Pago online con tarjeta (Stripe)
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={pagos.en_local} onChange={(e) => setPagos({ ...pagos, en_local: e.target.checked })} className="h-5 w-5" />
          Pagar en el local (barra o al recoger)
        </label>
        <button type="button" className={botonPrimario} onClick={() => void guardarAjuste("pagos", pagos, "Pagos guardados.")}>
          Guardar pagos
        </button>
      </Seccion>

      <Seccion titulo="Reservas online" texto="Las reservas de la web entran como pendientes hasta que alguien las confirma.">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={reservas.online} onChange={(e) => setReservas({ ...reservas, online: e.target.checked })} className="h-5 w-5" />
          Aceptar reservas desde la web
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs">
            Máximo de personas
            <input value={reservas.max_personas} onChange={(e) => setReservas({ ...reservas, max_personas: Number(e.target.value.replace(/\D/g, "")) })} inputMode="numeric" className={input} />
          </label>
          <label className="grid gap-1 text-xs">
            Días de antelación
            <input value={reservas.antelacion_dias} onChange={(e) => setReservas({ ...reservas, antelacion_dias: Number(e.target.value.replace(/\D/g, "")) })} inputMode="numeric" className={input} />
          </label>
        </div>
        <button type="button" className={botonPrimario} onClick={() => void guardarAjuste("reservas", reservas, "Reservas guardadas.")}>
          Guardar reservas
        </button>
      </Seccion>

      <Seccion titulo="Datos fiscales" texto="Salen en la cuenta impresa (factura simplificada). Pendientes del propietario.">
        <input value={fiscal.razon_social} onChange={(e) => setFiscal({ ...fiscal, razon_social: e.target.value })} placeholder="Razón social" className={input} />
        <input value={fiscal.nif} onChange={(e) => setFiscal({ ...fiscal, nif: e.target.value.toUpperCase() })} placeholder="NIF" className={input} />
        <button type="button" className={botonPrimario} onClick={() => void guardarAjuste("fiscal", { razon_social: fiscal.razon_social.trim() || null, nif: fiscal.nif.trim() || null }, "Datos fiscales guardados.")}>
          Guardar datos fiscales
        </button>
      </Seccion>

      <Seccion titulo="TicketBAI" texto="Obligatorio en Bizkaia. Se activa en el servidor cuando haya certificado digital, firma probada y envío a Batuz (src/lib/ticketbai/README.md).">
        <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${ticketbai.activo ? "bg-oliva-soft text-oliva" : "bg-arena dark:bg-noche-3"}`}>
          {ticketbai.activo ? "Activo: las cuentas llevan identificativo y QR TicketBAI." : "No activo: las cuentas se imprimen sin TicketBAI."}
        </p>
        <p className="text-xs opacity-70">La impresión de comandas automática se configura en el print-bridge del PC de barra (print-bridge/README.md).</p>
      </Seccion>
    </div>
  );
}
