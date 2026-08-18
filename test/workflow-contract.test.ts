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

  it("publishes a new archive release without npm publication", () => {
    const release = workflow("github-release.yml");
    expect(release).toContain("branches: [main]");
    expect(release).toContain("name: Determine release intent");
    expect(release).toContain(
      'node scripts/release-intent.mjs "$EVENT_BEFORE" "$GITHUB_SHA"',
    );
    expect(release).toContain(
      "No release inputs changed; skipping immutable release reconciliation.",
    );
    expect(release).toContain("steps.release-intent.outputs.release == 'true'");
    expect(release).toContain("node scripts/release-reconciliation.mjs");
    expect(release).toContain("steps.reconciliation.outputs.state == 'new'");
    expect(release).toContain(
      "steps.reconciliation.outputs.state == 'existing'",
    );
    expect(release.indexOf("Resolve immutable release state")).toBeLessThan(
      release.indexOf("Build and verify release archive"),
    );
    expect(release.indexOf("Build and verify release archive")).toBeLessThan(
      release.indexOf("Create immutable release tag"),
    );
    expect(release).toContain("npm run verify:release-archive");
    expect(release).toContain("GITHUB_SHA");
    expect(release).toContain("const version = pkg.version");
    expect(release).toContain("const semver = /^(0|[1-9]\\d*)");
    expect(release).toContain('TAG="v${VERSION}"');
    expect(release).toContain('git tag -a "$TAG" "$GITHUB_SHA"');
    expect(release).toContain('git config user.name "github-actions[bot]"');
    expect(release).toContain(
      'git config user.email "41898282+github-actions[bot]@users.noreply.github.com"',
    );
    expect(release).toContain("GH_TOKEN: ${{ github.token }}");
    expect(release).toContain("tag_name: ${{ steps.version.outputs.tag }}");
    expect(release).toContain("target_commitish: ${{ github.sha }}");
    expect(release).toContain(
      "softprops/action-gh-release@3bb12739c298aeb8a4eeaf626c5b8d85266b0e65",
    );
    expect(release).not.toMatch(/npm publish|NODE_AUTH_TOKEN|registry\.npmjs/i);
  });
});
