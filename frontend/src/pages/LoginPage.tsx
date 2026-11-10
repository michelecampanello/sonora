import { Link } from "react-router";
import { AuthForm } from "@/components/auth/AuthForm";
import { FormField } from "@/components/FormField";
import { login } from "@/hooks/useAuth";

export function LoginPage() {
  return (
    <AuthForm
      title="Accedi"
      submitLabel="Accedi"
      switchText="Non hai un account?"
      switchLabel="Registrati"
      switchTo="/registrati"
      onSubmit={(data) => login(String(data.get("email") ?? ""), String(data.get("password") ?? ""))}
    >
      <FormField label="Email" name="email" type="email" autoComplete="email" maxLength={255} />
      <FormField label="Password" name="password" type="password" autoComplete="current-password" />
      <Link to="/password-dimenticata" className="self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-primary">
        Password dimenticata?
      </Link>
    </AuthForm>
  );
}
