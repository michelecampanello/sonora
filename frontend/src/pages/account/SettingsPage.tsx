import { useState, type FormEvent } from "react";
import { AccountSection, FormError } from "@/components/account/AccountParts";
import { FormField } from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { setUser, useAuth } from "@/hooks/useAuth";
import { passwordPath, profilePath, sendJson } from "@/lib/api";
import type { AuthResponse } from "@/lib/types";

/** Stato di un modulo: errore da mostrare, conferma e invio in corso */
function useFormStatus() {
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    setSaved(false);
    try {
      await action();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto");
    } finally {
      setBusy(false);
    }
  };

  return { error, setError, saved, busy, submit };
}

const SavedNote = ({ text }: { text: string }) => (
  <p role="status" className="text-sm text-muted-foreground">
    {text}
  </p>
);

function ProfileForm() {
  const { user } = useAuth();
  const { error, saved, busy, submit } = useFormStatus();
  if (!user) return null;

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    void submit(async () => {
      const response = await sendJson<AuthResponse>("PATCH", profilePath, {
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        currentPassword: String(data.get("profilePassword") ?? ""),
      });
      setUser(response.user);
      form.reset();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <h2 className="text-display border-t pt-3 text-3xl">Dati personali</h2>
      {/* key: dopo il salvataggio i campi ripartono dai valori aggiornati */}
      <FormField key={`name-${user.name}`} label="Nome e cognome" name="name" autoComplete="name" minLength={2} maxLength={100} defaultValue={user.name} />
      <FormField key={`email-${user.email}`} label="Email" name="email" type="email" autoComplete="email" maxLength={255} defaultValue={user.email} />
      <FormField label="Password attuale (solo per cambiare email)" name="profilePassword" type="password" autoComplete="current-password" required={false} />
      <FormError message={error} />
      {saved && <SavedNote text="Dati aggiornati." />}
      <Button type="submit" className="self-start" disabled={busy}>
        Salva dati
      </Button>
    </form>
  );
}

function PasswordForm() {
  const { error, setError, saved, busy, submit } = useFormStatus();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword") ?? "");
    if (newPassword !== String(data.get("confirmPassword") ?? "")) {
      setError("Le due password non coincidono");
      return;
    }
    void submit(async () => {
      await sendJson<AuthResponse>("PUT", passwordPath, {
        currentPassword: String(data.get("currentPassword") ?? ""),
        newPassword,
      });
      form.reset();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <h2 className="text-display border-t pt-3 text-3xl">Password</h2>
      <FormField label="Password attuale" name="currentPassword" type="password" autoComplete="current-password" />
      <FormField label="Nuova password" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} title="Almeno 8 caratteri" />
      <FormField label="Ripeti la nuova password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} />
      <FormError message={error} />
      {saved && <SavedNote text="Password cambiata. Le altre sessioni aperte sono state chiuse." />}
      <Button type="submit" className="self-start" disabled={busy}>
        Cambia password
      </Button>
    </form>
  );
}

export function SettingsPage() {
  return (
    <AccountSection title="Impostazioni">
      <div className="flex flex-col gap-10">
        <ProfileForm />
        <PasswordForm />
      </div>
    </AccountSection>
  );
}
