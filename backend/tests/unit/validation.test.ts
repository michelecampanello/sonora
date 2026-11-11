import { describe, expect, it } from "vitest";
import { isEmail } from "../../src/email.js";
import { isSlug, parseSlugList } from "../../src/slug.js";
import { isUuid, parseUuidList } from "../../src/uuid.js";
import { isProductSort } from "../../src/services/products.service.js";
import { isPersonName, locationError, parseLocation, passwordError, text } from "../../src/validation.js";

describe("text", () => {
  it("toglie gli spazi ai lati delle stringhe", () => {
    expect(text("  Mario  ")).toBe("Mario");
  });

  it("trasforma in stringa vuota tutto ciò che non è una stringa", () => {
    expect(text(42)).toBe("");
    expect(text(null)).toBe("");
    expect(text(["a"])).toBe("");
  });
});

describe("isPersonName", () => {
  it("accetta nomi tra 2 e 100 caratteri", () => {
    expect(isPersonName("Al")).toBe(true);
    expect(isPersonName("a".repeat(100))).toBe(true);
  });

  it("rifiuta nomi troppo corti o troppo lunghi", () => {
    expect(isPersonName("A")).toBe(false);
    expect(isPersonName("a".repeat(101))).toBe(false);
  });
});

describe("passwordError", () => {
  it("accetta una password di almeno 8 caratteri", () => {
    expect(passwordError("12345678")).toBeNull();
  });

  it("rifiuta una password troppo corta", () => {
    expect(passwordError("1234567")).toMatch(/almeno 8/);
  });

  it("misura il limite di bcrypt in byte, non in caratteri", () => {
    // "è" occupa 2 byte: 37 caratteri sono 74 byte, oltre il limite di 72
    expect(passwordError("è".repeat(36))).toBeNull();
    expect(passwordError("è".repeat(37))).toMatch(/troppo lunga/);
  });
});

describe("parseLocation e locationError", () => {
  const valid = { address: "Via Roma 1", city: "Milano", postal_code: "20100", province: "mi" };

  it("pulisce i campi e scrive la provincia in maiuscolo", () => {
    expect(parseLocation({ ...valid, city: "  Milano " })).toEqual({ ...valid, province: "MI" });
  });

  it("accetta un indirizzo valido", () => {
    expect(locationError(parseLocation(valid))).toBeNull();
  });

  it.each([
    ["address", "Vi", "Indirizzo non valido"],
    ["city", "M", "Città non valida"],
    ["postal_code", "2010", "Il CAP deve avere 5 cifre"],
    ["postal_code", "2010A", "Il CAP deve avere 5 cifre"],
    ["province", "MIL", "La provincia deve avere 2 lettere"],
  ])("con %s = %j risponde %j", (field, value, message) => {
    expect(locationError(parseLocation({ ...valid, [field]: value }))).toBe(message);
  });
});

describe("isEmail", () => {
  it.each(["mario@example.com", "a.b+c@sub.example.it"])("accetta %s", (email) => {
    expect(isEmail(email)).toBe(true);
  });

  it.each(["", "mario", "mario@", "mario@example", "ma rio@example.com"])("rifiuta %j", (email) => {
    expect(isEmail(email)).toBe(false);
  });

  it("rifiuta email più lunghe di 255 caratteri", () => {
    expect(isEmail(`${"a".repeat(250)}@example.com`)).toBe(false);
  });
});

describe("slug e UUID", () => {
  it("riconosce gli slug validi", () => {
    expect(isSlug("chitarre-elettriche")).toBe(true);
    expect(isSlug("Chitarre")).toBe(false);
    expect(isSlug("doppio--trattino")).toBe(false);
    expect(isSlug("-iniziale")).toBe(false);
  });

  it("da una lista tiene solo gli slug validi", () => {
    expect(parseSlugList("nordwood, pulse-audio,NON VALIDO,,")).toEqual(["nordwood", "pulse-audio"]);
  });

  it("riconosce gli UUID, maiuscoli o minuscoli", () => {
    expect(isUuid("0b4f9c1e-7a8d-4b5e-9f3a-2c1d0e9f8a7b")).toBe(true);
    expect(isUuid("0B4F9C1E-7A8D-4B5E-9F3A-2C1D0E9F8A7B")).toBe(true);
    expect(isUuid("non-un-uuid")).toBe(false);
  });

  it("da una lista tiene solo gli UUID validi", () => {
    const id = "0b4f9c1e-7a8d-4b5e-9f3a-2c1d0e9f8a7b";
    expect(parseUuidList(`${id},abc, ${id}`)).toEqual([id, id]);
  });
});

describe("isProductSort", () => {
  it("accetta solo gli ordinamenti previsti", () => {
    expect(isProductSort("price_asc")).toBe(true);
    expect(isProductSort("price; DROP TABLE products")).toBe(false);
  });

  it("non si fa ingannare dalle proprietà ereditate degli oggetti", () => {
    expect(isProductSort("toString")).toBe(false);
    expect(isProductSort("__proto__")).toBe(false);
  });
});
