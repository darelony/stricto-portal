import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const fromRoot = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  // tsconfig uses "jsx": "preserve" for Next.js; tests need JSX compiled.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // Allow importing server modules in unit tests.
      "server-only": fromRoot("./tests/unit/empty.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: { TZ: "UTC" },
  },
})
