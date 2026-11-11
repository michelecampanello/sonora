import { describe, expect, it } from "vitest";
import { api, createUser } from "../helpers.js";

// In un file a parte: ogni file di test carica l'app da zero, quindi il contatore parte da 0
describe("limite ai tentativi di accesso", () => {
  it("conta solo gli accessi falliti e dopo 10 blocca le richieste con 429", async () => {
    const user = await createUser();
    const login = (password: string) => api().post("/api/auth/login").send({ email: user.email, password });

    // Gli accessi riusciti non consumano il limite
    for (let i = 0; i < 12; i++) await login(user.password).expect(200);

    for (let i = 0; i < 10; i++) await login("sbagliata").expect(401);
    const blocked = await login("sbagliata").expect(429);
    expect(blocked.body.error).toBe("Troppi tentativi, riprova più tardi");

    // Una volta bloccati, nemmeno la password giusta passa: chi indovina non lo scopre
    await login(user.password).expect(429);
  });
});
