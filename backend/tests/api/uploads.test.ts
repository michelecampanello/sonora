import { afterEach, describe, expect, it, vi } from "vitest";
import { signParams } from "../../src/services/cloudinary.service.js";
import { api, signedInAgent } from "../helpers.js";

const PATH = "/api/admin/uploads/signature";

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/admin/uploads/signature", () => {
  it("è riservata agli admin", async () => {
    vi.stubEnv("CLOUDINARY_URL", "cloudinary://123456:segreto-xyz@sonora-demo");
    await api().post(PATH).expect(401);
    const { agent } = await signedInAgent();
    await agent.post(PATH).expect(403);
  });

  it("senza CLOUDINARY_URL risponde 503 con la spiegazione", async () => {
    vi.stubEnv("CLOUDINARY_URL", "");
    const { agent } = await signedInAgent("admin");
    const res = await agent.post(PATH).expect(503);
    expect(res.body.error).toMatch(/CLOUDINARY_URL/);
  });

  it("restituisce campi firmati e validi per un'ora, senza il segreto", async () => {
    vi.stubEnv("CLOUDINARY_URL", "cloudinary://123456:segreto-xyz@sonora-demo");
    const { agent } = await signedInAgent("admin");
    const before = Math.floor(Date.now() / 1000);

    const res = await agent.post(PATH).expect(200);

    const { uploadUrl, fields } = res.body;
    expect(uploadUrl).toBe("https://api.cloudinary.com/v1_1/sonora-demo/image/upload");
    expect(Number(fields.timestamp)).toBeGreaterThanOrEqual(before);
    const { api_key, signature, ...signed } = fields;
    expect(api_key).toBe("123456");
    expect(signature).toBe(signParams(signed, "segreto-xyz"));
    expect(JSON.stringify(res.body)).not.toContain("segreto-xyz");
  });
});
