import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";

/** Mostra il percorso attuale, per controllare dove porta un link o un redirect */
function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
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
