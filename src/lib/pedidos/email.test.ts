import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/reservas/email", () => ({ emailActivo: () => true, escapar: (s: string) => s, smtp: () => ({}) }));

const { avisoDePedido } = await import("@/lib/pedidos/email");

const ahora = new Date("2026-11-05T10:00:00Z");
const base = {
  id: "x",
  numero_dia: 2,
  tipo: "RECOGIDA" as const,
  nombre_cliente: "Ane",
  email: "ane@example.com",
  created_at: "2026-11-05T09:00:00Z",
  total_centimos: 3800,
  payment_status: "PENDING" as const,
  items: [],
};
const manana = "2026-11-06T13:00:00Z";
const hoy = "2026-11-05T13:00:00Z";

describe("avisoDePedido", () => {
  it("confirma por email un encargo de otro día al aceptarlo", () => {
    expect(avisoDePedido({ ...base, estado: "ACCEPTED", recogida_en: manana }, "RECEIVED", ahora)).toBe("confirmado");
  });

  it("no manda «confirmado» al aceptar un pedido de hoy", () => {
    expect(avisoDePedido({ ...base, estado: "ACCEPTED", recogida_en: hoy }, "RECEIVED", ahora)).toBeNull();
  });

  it("avisa de «listo» el día de la recogida, una sola vez", () => {
    expect(avisoDePedido({ ...base, estado: "READY", recogida_en: hoy }, "ACCEPTED", ahora)).toBe("listo");
    expect(avisoDePedido({ ...base, estado: "READY", recogida_en: hoy }, "READY", ahora)).toBeNull();
  });

  it("no avisa sin email, sin estado anterior o si no es para recoger", () => {
    expect(avisoDePedido({ ...base, email: null, estado: "READY", recogida_en: hoy }, "ACCEPTED", ahora)).toBeNull();
    expect(avisoDePedido({ ...base, estado: "READY", recogida_en: hoy }, undefined, ahora)).toBeNull();
    expect(avisoDePedido({ ...base, tipo: "MESA", estado: "READY", recogida_en: hoy }, "ACCEPTED", ahora)).toBeNull();
  });
});
