import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const release = readFileSync(
  resolve(root, ".github/workflows/github-release.yml"),
  "utf8",
);
const promotion = readFileSync(
  resolve(root, ".github/workflows/release-promotion.yml"),
  "utf8",
);
if (
  !promotion.includes("release-promotion:") ||
  promotion.includes("require-dev:")
)
  throw new Error("release promotion must expose the release-promotion check");
if (
  !release.includes("npm run verify:release-archive") ||
  !release.includes("const version = pkg.version") ||
  !release.includes('TAG="v${VERSION}"') ||
  !release.includes('git tag -a "$TAG" "$GITHUB_SHA"') ||
  !release.includes("git ls-remote --tags origin") ||
  !release.includes("gh release view") ||
  !release.includes("tag_name: ${{ steps.version.outputs.tag }}") ||
  !release.includes("target_commitish: ${{ github.sha }}") ||
  /npm publish|NODE_AUTH_TOKEN|registry\.npmjs/i.test(release)
)
  throw new Error(
    "release workflow violates the archive-only release contract",
  );
