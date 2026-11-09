const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID.test(value);

/** Da una lista separata da virgole tiene solo gli UUID validi. */
export const parseUuidList = (value: string): string[] =>
  value.split(",").map((part) => part.trim()).filter(isUuid);
