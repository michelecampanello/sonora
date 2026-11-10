import { useSyncExternalStore } from "react";
import { currentUserPath, fetchJson, loginPath, logoutPath, postJson, registerPath } from "@/lib/api";
import type { AuthResponse, User } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean; // true finché non sappiamo se c'è una sessione
}

// Come il carrello, è uno "store" esterno a React. Il token sta in un cookie che JavaScript
// non può leggere: l'unico modo per sapere se c'è una sessione è chiederlo al server.
let state: AuthState = { user: null, loading: true };
const listeners = new Set<() => void>();

function setUser(user: User | null) {
  state = { user, loading: false };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

fetchJson<AuthResponse>(currentUserPath).then(
  ({ user }) => setUser(user),
  () => setUser(null),
);

export async function login(email: string, password: string) {
  const { user } = await postJson<AuthResponse>(loginPath, { email, password });
  setUser(user);
}

export async function register(name: string, email: string, password: string) {
  const { user } = await postJson<AuthResponse>(registerPath, { name, email, password });
  setUser(user);
}

export async function logout() {
  await postJson(logoutPath, {});
  setUser(null);
}

export function useAuth() {
  return useSyncExternalStore(subscribe, () => state);
}
