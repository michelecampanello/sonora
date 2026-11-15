import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setUser } from "@/hooks/useAuth";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import type { User } from "@/lib/types";
import { SettingsPage } from "@/pages/account/SettingsPage";
import { systemPrefersDark } from "@/test/matchMedia";
import { renderPage } from "@/test/render";

const giulia: User = { id: "00000000-0000-4000-8000-000000000001", name: "Giulia Bianchi", email: "giulia@example.com", role: "customer" };

const renderSettings = () => renderPage(<SettingsPage />);

const root = document.documentElement;

beforeEach(() => setUser(giulia));
afterEach(() => setUser(null));

describe("tema nelle impostazioni", () => {
  it("di base segue il dispositivo", () => {
    systemPrefersDark(true);
    renderSettings();

    expect(screen.getByRole("radio", { name: /Come il dispositivo/ })).toBeChecked();
    expect(root).toHaveClass("dark");
  });

  it("la modalità scura si applica subito e resta salvata", async () => {
    const { user } = renderSettings();
    expect(root).toHaveClass("light");

    await user.click(screen.getByRole("radio", { name: /Scuro/ }));

    expect(screen.getByRole("radio", { name: /Scuro/ })).toBeChecked();
    expect(root).toHaveClass("dark");
    expect(root).not.toHaveClass("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("riparte dal tema salvato", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    renderSettings();

    expect(screen.getByRole("radio", { name: /Scuro/ })).toBeChecked();
    expect(root).toHaveClass("dark");
  });
});
