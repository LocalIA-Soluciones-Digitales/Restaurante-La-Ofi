"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { iniciarSesionMesa, obtenerSesion, unirseSesion } from "@/lib/pedidos/actions";
import type { MesaPublica, ModoSesion, Participante, SesionPublica } from "@/lib/pedidos/types";

// Sesión de mesa compartida (portada de table-session-context de Palomita-Bar,
// §16.3/§16.5): todos los móviles de la mesa ven la misma sesión. Se consulta
// cada 5 s mientras la pestaña está visible (anon no puede usar Realtime sobre
// laofi, igual que en Palomita). El comensal se identifica por dispositivo.

interface SesionValue {
  mesa: MesaPublica;
  token: string;
  sesion: SesionPublica | null;
  /** Hay sesión activa (aunque aún no se haya cargado su detalle). */
  haySesion: boolean;
  modo: ModoSesion | null;
  participante: Participante | null;
  deviceId: string;
  cargando: boolean;
  error: string | null;
  iniciar: (modo: ModoSesion) => Promise<void>;
  unirse: (nombre: string) => Promise<void>;
  refrescar: () => Promise<void>;
}

const Ctx = createContext<SesionValue | null>(null);

function deviceIdLocal(): string {
  try {
    let id = window.localStorage.getItem("laofi:device");
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem("laofi:device", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function TableSessionProvider({ mesa, token, children }: { mesa: MesaPublica; token: string; children: ReactNode }) {
  const [sesionId, setSesionId] = useState<string | null>(mesa.sesion_id);
  const [sesion, setSesion] = useState<SesionPublica | null>(null);
  const [participante, setParticipante] = useState<Participante | null>(null);
  const [deviceId, setDeviceId] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<number>(0);

  useEffect(() => setDeviceId(deviceIdLocal()), []);

  // Comensal recordado en este dispositivo para esta sesión.
  useEffect(() => {
    if (!sesionId) return;
    try {
      const raw = window.localStorage.getItem(`laofi:participante:${sesionId}`);
      if (raw) setParticipante(JSON.parse(raw) as Participante);
    } catch {
      /* sin almacenamiento */
    }
  }, [sesionId]);

  const refrescar = useCallback(async () => {
    if (!sesionId) return;
    const r = await obtenerSesion(sesionId);
    if (r.ok && r.data) {
      setSesion(r.data);
      // Sesión cerrada desde el salón (mesa liberada): se empieza de cero.
      if (r.data.estado === "CERRADA") {
        setSesionId(null);
        setParticipante(null);
      }
    }
  }, [sesionId]);

  useEffect(() => {
    if (!sesionId) return;
    void refrescar();
    const tick = () => {
      if (document.visibilityState === "visible") void refrescar();
    };
    timer.current = window.setInterval(tick, 5000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer.current);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [sesionId, refrescar]);

  const iniciar = useCallback(
    async (modo: ModoSesion) => {
      setCargando(true);
      setError(null);
      const r = await iniciarSesionMesa(token, modo);
      setCargando(false);
      if (!r.ok) return setError(r.error);
      setSesionId(r.data.id);
    },
    [token],
  );

  const unirse = useCallback(
    async (nombre: string) => {
      if (!sesionId) return;
      setCargando(true);
      setError(null);
      const r = await unirseSesion(sesionId, nombre, deviceId);
      setCargando(false);
      if (!r.ok) return setError(r.error);
      setParticipante(r.data);
      try {
        window.localStorage.setItem(`laofi:participante:${sesionId}`, JSON.stringify(r.data));
      } catch {
        /* sin almacenamiento */
      }
      void refrescar();
    },
    [sesionId, deviceId, refrescar],
  );

  const value = useMemo<SesionValue>(
    () => ({
      mesa,
      token,
      sesion: sesionId ? sesion : null,
      haySesion: Boolean(sesionId),
      modo: sesion?.modo ?? (sesionId === mesa.sesion_id ? mesa.modo : null),
      participante,
      deviceId,
      cargando,
      error,
      iniciar,
      unirse,
      refrescar,
    }),
    [mesa, token, sesion, sesionId, participante, deviceId, cargando, error, iniciar, unirse, refrescar],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTableSession(): SesionValue | null {
  return useContext(Ctx);
}
