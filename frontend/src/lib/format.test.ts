import { describe, expect, it } from "vitest";
import { formatPrice, orderCode } from "@/lib/format";

describe("formatPrice", () => {
  it.each([
    ["349.00", "349,00 €"],
    ["1290.00", "1.290,00 €"],
    ["1234567.5", "1.234.567,50 €"],
    [0, "0,00 €"],
    [0.1 + 0.2, "0,30 €"],
  ])("%j → %j", (price, expected) => {
    expect(formatPrice(price)).toBe(expected);
  });
});

describe("orderCode", () => {
  it("usa i primi 8 caratteri dell'id, in maiuscolo", () => {
    expect(orderCode("3f2a9c1e-7a8d-4b5e-9f3a-2c1d0e9f8a7b")).toBe("3F2A9C1E");
  });
});
