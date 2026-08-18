import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const manifestPath = resolve(root, "lhm.plugin.json");
const packagePath = resolve(root, "package.json");

describe("LobeHub Market manifest", () => {
  it("truthfully declares the local stdio GitHub-Release distribution", () => {
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    expect(manifest.identifier).toBe("theorvane-proxmox-mcp");
    expect(manifest.name).toBe("Proxmox MCP");
    expect(manifest.version).toBe(packageJson.version);
    expect(manifest.author).toBe("Theorvane");
    expect(manifest.mcpServers).toEqual({
      "proxmox-mcp": {
        command: "node",
        args: ["dist/index.js"],
      },
    });

    const serialized = JSON.stringify(manifest);
    expect(serialized).toMatch(/GitHub Release/i);
    expect(serialized).not.toMatch(/npm install|npm publish|https?:\/\//i);
  });
});
