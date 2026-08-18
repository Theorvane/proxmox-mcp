import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const workflow = (name: string) =>
  readFileSync(resolve(root, ".github/workflows", name), "utf8");

describe("release workflow contracts", () => {
  it("uses the protected release-promotion context for dev-to-main PRs", () => {
    const promotion = workflow("release-promotion.yml");
    expect(promotion).toContain("release-promotion:");
    expect(promotion).not.toContain("require-dev:");
    expect(promotion).toContain('head.ref }}" = dev');
  });

  it("verifies a GitHub Release archive without npm publication", () => {
    const release = workflow("github-release.yml");
    expect(release).toContain("branches: [main]");
    expect(release).toContain("npm run verify:release-archive");
    expect(release).toContain("GITHUB_SHA");
    expect(release).not.toMatch(/npm publish|NODE_AUTH_TOKEN|registry\.npmjs/i);
  });
});
