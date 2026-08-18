import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("project contract", () => {
  it("defines a private Node 22 ESM CLI with local quality scripts", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf8"),
    );
    expect(packageJson.name).toBe("proxmox-mcp");
    expect(packageJson.private).toBe(true);
    expect(packageJson.type).toBe("module");
    expect(packageJson.engines.node).toBe(">=22");
    expect(packageJson.bin).toEqual({ "proxmox-mcp": "dist/index.js" });
    for (const script of [
      "build",
      "lint",
      "typecheck",
      "test",
      "release:archive",
    ]) {
      expect(packageJson.scripts[script]).toBeTruthy();
    }
    expect(JSON.stringify(packageJson)).not.toMatch(
      /publishConfig|npm publish/,
    );
    expect(existsSync(resolve(root, "src/index.ts"))).toBe(true);
  });

  it("uses strict TypeScript and documents GitHub Release installation", () => {
    const tsconfig = JSON.parse(
      readFileSync(resolve(root, "tsconfig.json"), "utf8"),
    );
    expect(tsconfig.compilerOptions.strict).toBe(true);
    expect(readFileSync(resolve(root, "README.md"), "utf8")).toContain(
      "GitHub Releases",
    );
  });
});
