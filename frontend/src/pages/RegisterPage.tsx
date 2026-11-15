import { AuthForm } from "@/components/auth/AuthForm";
import { FormField } from "@/components/FormField";
import { register } from "@/hooks/useAuth";

export function RegisterPage() {
  return (
    <AuthForm
      title="Registrati"
      submitLabel="Crea account"
      switchText="Hai già un account?"
      switchLabel="Accedi"
      switchTo="/accedi"
      onSubmit={(data) =>
        register(
          { first_name: String(data.get("first_name") ?? ""), last_name: String(data.get("last_name") ?? "") },
          String(data.get("email") ?? ""),
          String(data.get("password") ?? ""),
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nome" name="first_name" autoComplete="given-name" maxLength={50} />
        <FormField label="Cognome" name="last_name" autoComplete="family-name" maxLength={50} />
      </div>
      <FormField label="Email" name="email" type="email" autoComplete="email" maxLength={255} />
      <FormField label="Password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} title="Almeno 8 caratteri" />
    </AuthForm>
  );
}
