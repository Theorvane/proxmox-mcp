import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
for (const file of [
  "README.md",
  "docs/guides/configuration.md",
  "docs/guides/safety.md",
  "docs/guides/github-release-installation.md",
]) {
  const contents = readFileSync(resolve(root, file), "utf8");
  if (/PROXMOX_TOKEN_SECRET\s*=\s*[^<$\s]/.test(contents))
    throw new Error(`${file} contains a token secret value`);
  if (/npm publish|npm install proxmox-mcp/i.test(contents))
    throw new Error(
      `${file} violates the GitHub-Release-only distribution policy`,
    );
}
