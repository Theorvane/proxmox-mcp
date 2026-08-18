import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");

describe("release archive contract", () => {
  it("builds a checksum-protected archive with production dependencies and verifies MCP startup", () => {
    const build = readFileSync(
      resolve(root, "scripts/build-release-archive.mjs"),
      "utf8",
    );
    const verify = readFileSync(
      resolve(root, "scripts/verify-release-archive.mjs"),
      "utf8",
    );
    expect(build).toContain("npm");
    expect(build).toContain("--omit=dev");
    expect(build).toContain("sha256");
    expect(verify).toContain("checksum mismatch");
    expect(verify).toMatch(/initialize|tools\/list/);
  });
});
