import { useState } from "react";
import { Link } from "react-router";
import { AuthForm } from "@/components/auth/AuthForm";
import { FormField } from "@/components/FormField";
import { forgotPasswordPath, postJson } from "@/lib/api";

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string>();

  if (sentTo) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <title>Controlla la posta — Sonora</title>
        <h1 className="text-display text-6xl md:text-8xl">Controlla la posta</h1>
        <p role="status" className="border-t pt-6">
          Se esiste un account con <span className="font-medium break-all">{sentTo}</span>, riceverai a breve un link per
          scegliere una nuova password. Il link vale un'ora.
        </p>
        <Link to="/accedi" className="text-sm underline underline-offset-4 hover:text-primary">
          Torna all'accesso
        </Link>
      </div>
    );
  }

  return (
    <AuthForm
      title="Password dimenticata"
      submitLabel="Invia il link"
      switchText="Ricordi la password?"
      switchLabel="Accedi"
      switchTo="/accedi"
      allowSignedIn
      onSubmit={async (data) => {
        const email = String(data.get("email") ?? "").trim();
        await postJson(forgotPasswordPath, { email });
        setSentTo(email);
      }}
    >
      <FormField label="Email" name="email" type="email" autoComplete="email" maxLength={255} />
    </AuthForm>
  );
}
