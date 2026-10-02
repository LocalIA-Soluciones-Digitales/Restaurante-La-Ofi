import { describe, expect, it } from "vitest";
import { repartirLinea } from "@/lib/pedidos/reparto";

describe("repartirLinea", () => {
  it("reparte al céntimo y la suma cuadra siempre con el total", () => {
    for (const [total, n] of [
      [650, 2],
      [1000, 3],
      [1, 4],
      [2349, 7],
    ] as const) {
      const r = repartirLinea(total, Array.from({ length: n }, (_, i) => `p${i}`));
      expect(r.reduce((a, x) => a + x.importe_centimos, 0)).toBe(total);
      expect(Math.max(...r.map((x) => x.importe_centimos)) - Math.min(...r.map((x) => x.importe_centimos))).toBeLessThanOrEqual(1);
    }
  });
});
