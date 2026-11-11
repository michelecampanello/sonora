import { vi } from "vitest";

export interface MockResponse {
  status?: number;
  body?: unknown;
}

type Handler = MockResponse | ((url: URL, init: RequestInit | undefined) => MockResponse);

/**
 * Sostituisce fetch con un finto server. Le chiavi sono "METODO /percorso" (es. "GET /api/products"),
 * senza query string; le richieste senza una risposta prevista ricevono un 401.
 * Restituisce il mock, per controllare quali richieste sono state fatte.
 */
export function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), "http://localhost");
    const handler = routes[`${init?.method ?? "GET"} ${url.pathname}`];
    const { status = 200, body = {} } =
      typeof handler === "function" ? handler(url, init) : (handler ?? { status: 401, body: { error: "Accesso richiesto" } });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Il body JSON inviato con la richiesta n-esima a un percorso */
export function sentBody(fetchMock: ReturnType<typeof mockApi>, path: string, n = 0): unknown {
  const call = fetchMock.mock.calls.filter(([input]) => String(input).startsWith(path))[n];
  return call?.[1]?.body ? JSON.parse(String(call[1].body)) : undefined;
}
