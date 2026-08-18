import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
describe("directory metadata", () => {
  it("keeps listings manual, secret-free, and GitHub-Release-only", () => {
    const files = [
      "plugins/openclaw-proxmox-mcp/README.md",
      "registry/lobehub-submission.md",
      "registry/mcpserverhub-submission.md",
    ]
      .map((file) => readFileSync(resolve(root, file), "utf8"))
      .join("\n");
    expect(files).toMatch(/GitHub Release/i);
    expect(files).toMatch(/manual|not published/i);
    expect(files).not.toMatch(
      /npm install|npm publish|PROXMOX_TOKEN_SECRET\s*=\s*[^<$\s]/i,
    );
  });
});
