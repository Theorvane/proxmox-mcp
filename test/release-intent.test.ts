import { describe, expect, it } from "vitest";
import { hasReleaseIntent } from "../scripts/release-intent.mjs";

describe("release intent", () => {
  it("skips reconciliation for docs-only changes", () => {
    expect(
      hasReleaseIntent("1234567890abcdef", ["README.md", "docs/README.md"]),
    ).toBe(false);
  });

  it.each([
    "package.json",
    "package-lock.json",
    "src/proxmox-server.ts",
    "scripts/build-release-archive.mjs",
    "scripts/release-archive-inputs.mjs",
    "scripts/verify-release-archive.mjs",
    "tsup.config.ts",
    "LICENSE",
    "docs/guides/github-release-installation.md",
  ])("releases when an archive input changes: %s", (changedPath) => {
    expect(hasReleaseIntent("1234567890abcdef", [changedPath])).toBe(true);
  });

  it("fails closed for an initial repository push", () => {
    expect(hasReleaseIntent("0".repeat(40), ["README.md"])).toBe(true);
  });
});
