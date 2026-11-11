import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendPasswordResetEmail } from "../../src/services/mail.service.js";
import { api, createUser } from "../helpers.js";

// In un file a parte da auth.test.ts: ogni file riparte con il limite di 5 richieste di reset all'ora
vi.mock("../../src/services/mail.service.js", () => ({ sendPasswordResetEmail: vi.fn() }));
const sendMail = vi.mocked(sendPasswordResetEmail);

beforeEach(() => sendMail.mockReset());

const requestReset = (email: string) => api().post("/api/auth/forgot-password").send({ email }).expect(200);

describe("invio del link di reset", () => {
  it("se l'email non parte, si può chiedere subito un altro link, e quello funziona", async () => {
    const user = await createUser();
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    sendMail.mockRejectedValueOnce(new Error("Resend non raggiungibile"));

    await requestReset(user.email);
    await vi.waitFor(() => expect(logError).toHaveBeenCalledWith(expect.objectContaining({ message: "Resend non raggiungibile" })));

    // Senza cancellare il link fallito, l'attesa di 2 minuti bloccherebbe questa seconda richiesta
    await requestReset(user.email);
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledTimes(2));
    const token = new URL(sendMail.mock.calls[1]![1]).hash.replace("#token=", "");
    await api().post("/api/auth/reset-password").send({ token, newPassword: "nuova-password" }).expect(200);
    logError.mockRestore();
  });

  it("chiedendo due link di fila, il secondo non viene inviato", async () => {
    const user = await createUser();
    await requestReset(user.email);
    await vi.waitFor(() => expect(sendMail).toHaveBeenCalledOnce());

    await requestReset(user.email);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(sendMail).toHaveBeenCalledOnce();
  });
});
