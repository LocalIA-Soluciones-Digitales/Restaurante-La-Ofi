import { describe, expect, it, vi } from "vitest";

// server-only y el SDK de Stripe no hacen falta para probar la lógica pura.
vi.mock("server-only", () => ({}));
vi.mock("stripe", () => ({ default: class {} }));

describe("ids en la metadata de Stripe", () => {
  it("los reparte en claves de 500 caracteres como mucho y los recompone en orden", async () => {
    const { idsEnMetadata, idsDesdeMetadata } = await import("@/lib/stripe/server");
    const ids = Array.from({ length: 40 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    const md = idsEnMetadata("r", ids);
    expect(Object.values(md).every((v) => v.length <= 500)).toBe(true);
    expect(Object.keys(md).length).toBeGreaterThan(1);
    expect(idsDesdeMetadata("r", { ...md, participante_id: "x" })).toEqual(ids);
  });
});
