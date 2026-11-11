import { Link, useLocation, useNavigate } from "react-router";
import { AuthForm } from "@/components/auth/AuthForm";
import { FormField } from "@/components/FormField";
import { setUser } from "@/hooks/useAuth";
import { postJson, resetPasswordPath } from "@/lib/api";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.slice(1)).get("token");

  if (!token) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <title>Link non valido — Sonora</title>
        <h1 className="text-display text-6xl md:text-8xl">Link non valido</h1>
        <p className="border-t pt-6">Questo link di reset è incompleto. Apri quello ricevuto per email oppure richiedine uno nuovo.</p>
        <Link to="/password-dimenticata" className="text-sm underline underline-offset-4 hover:text-primary">
          Richiedi un nuovo link
        </Link>
      </div>
    );
  }

  return (
    <AuthForm
      title="Nuova password"
      submitLabel="Salva la password"
      switchText="Il link è scaduto?"
      switchLabel="Richiedine uno nuovo"
      switchTo="/password-dimenticata"
      allowSignedIn
      onSubmit={async (data) => {
        const newPassword = String(data.get("newPassword") ?? "");
        if (newPassword !== String(data.get("confirmPassword") ?? "")) {
          throw new Error("Le due password non coincidono");
        }
        await postJson(resetPasswordPath, { token, newPassword });
        setUser(null); // il server ha chiuso tutte le sessioni, compresa questa
        navigate("/accedi", { replace: true, state: { notice: "Password aggiornata. Accedi con la nuova password." } });
      }}
    >
      <FormField label="Nuova password" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} title="Almeno 8 caratteri" />
      <FormField label="Ripeti la nuova password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} />
    </AuthForm>
  );
}
