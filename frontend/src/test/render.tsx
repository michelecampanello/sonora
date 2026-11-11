import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

/** Mostra il percorso attuale, per controllare dove porta un link o un redirect */
function CurrentPath() {
  const location = useLocation();
  // Uno span e non un <output>: <output> ha il ruolo "status" e verrebbe scambiato per un avviso della pagina
  return <span data-testid="current-path">{location.pathname}</span>;
}

/**
 * Mostra una pagina dentro un router in memoria, all'indirizzo indicato.
 * Restituisce anche "user", per simulare clic e digitazione come farebbe una persona.
 */
export function renderPage(page: ReactElement, { path = "/", url = path, state }: { path?: string; url?: string; state?: unknown } = {}) {
  return {
    user: userEvent.setup(),
    ...render(
      <MemoryRouter initialEntries={[{ pathname: url, state }]}>
        <Routes>
          <Route path={path} element={page} />
          <Route path="*" element={null} />
        </Routes>
        <CurrentPath />
      </MemoryRouter>,
    ),
  };
}
