import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { systemPrefersDark } from "@/test/matchMedia";
import { mockApi } from "@/test/mockApi";

// Nessun test parla con il backend vero: ogni richiesta passa dal finto fetch di mockApi.
// Di base nessuno ha fatto l'accesso, così useAuth (che chiede /api/auth/me appena caricato) parte da "ospite".
mockApi({});

beforeEach(() => {
  localStorage.clear();
  // Di base il sistema operativo è in modalità chiara e la pagina parte senza tema applicato
  systemPrefersDark(false);
  document.documentElement.classList.remove("light", "dark");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mockApi({});
});
