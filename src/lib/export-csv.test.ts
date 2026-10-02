import { describe, expect, it } from "vitest";
import { aCsv } from "@/lib/export-csv";

describe("aCsv", () => {
  it("usa ; y coma decimal, y escapa comillas y separadores", () => {
    expect(aCsv([{ producto: 'Tostada "Clásica"', euros: 2.1 }, { producto: "Pulpo; brasa", euros: null }])).toBe(
      'producto;euros\r\n"Tostada ""Clásica""";2,1\r\n"Pulpo; brasa";',
    );
  });
});
