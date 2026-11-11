import { defineConfig } from "vitest/config";
import { testDatabaseUrl } from "./tests/testDatabaseUrl.js";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/globalSetup.ts"],
    setupFiles: ["tests/setup.ts"],
    // I file condividono lo stesso database: eseguirli uno alla volta rende i risultati prevedibili
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl(),
      JWT_SECRET: "segreto-usato-solo-nei-test-lungo-almeno-32-caratteri",
      FRONTEND_ORIGIN: "http://localhost:5173",
      RESEND_API_KEY: "", // le email non partono mai: i test che le controllano usano un finto Resend
      MAIL_FROM: "",
    },
  },
});
