const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const isSlug = (value: unknown): value is string =>
  typeof value === "string" && SLUG.test(value);

/** Da una lista separata da virgole tiene solo gli slug validi. */
export const parseSlugList = (value: string): string[] =>
  value.split(",").map((part) => part.trim()).filter(isSlug);
