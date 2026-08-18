import { transformWithEsbuild } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { target: "node22" },
  oxc: false,
  plugins: [
    {
      name: "transform-standard-decorators-for-vitest",
      enforce: "pre",
      transform(code, id) {
        if (id.endsWith("/src/proxmox-server.ts")) {
          // Vite's Oxc transform currently emits syntax Vitest cannot load for
          // this standard-decorator module (see mcp-tools.test.ts). Keep this
          // explicit compatibility transform until that path supports it.
          return transformWithEsbuild(code, id, { target: "node22" });
        }
      },
    },
  ],
  test: { include: ["test/**/*.test.ts"] },
});
