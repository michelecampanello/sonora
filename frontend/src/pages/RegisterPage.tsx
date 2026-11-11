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
        register(String(data.get("name") ?? ""), String(data.get("email") ?? ""), String(data.get("password") ?? ""))
      }
    >
      <FormField label="Nome e cognome" name="name" autoComplete="name" minLength={2} maxLength={100} />
      <FormField label="Email" name="email" type="email" autoComplete="email" maxLength={255} />
      <FormField label="Password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72} title="Almeno 8 caratteri" />
    </AuthForm>
  );
}
