import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  releaseArchiveFiles,
  releaseInstallationGuide,
} from "./release-archive-inputs.mjs";

const root = resolve(import.meta.dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const name = `proxmox-mcp-${pkg.version}`;
const output = join(root, "release");
const stage = join(output, name);

if (!existsSync(join(root, "dist")))
  throw new Error("Build dist before creating the release archive");
rmSync(output, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
for (const file of releaseArchiveFiles.filter(
  (file) => file !== releaseInstallationGuide,
))
  cpSync(join(root, file), join(stage, file), { recursive: true });
cpSync(join(root, releaseInstallationGuide), join(stage, "INSTALLATION.md"));
const productionPackages = execFileSync(
  "npm",
  ["ls", "--omit=dev", "--parseable", "--all"],
  { cwd: root, encoding: "utf8" },
)
  .trim()
  .split("\n")
  .slice(1);
const sourceModules = join(root, "node_modules");
const stagedModules = join(stage, "node_modules");
for (const packagePath of productionPackages)
  cpSync(
    packagePath,
    join(stagedModules, relative(sourceModules, packagePath)),
    { recursive: true },
  );
writeFileSync(
  join(stage, "proxmox-mcp"),
  '#!/usr/bin/env sh\nexec node "$(dirname "$0")/dist/index.js" "$@"\n',
  { mode: 0o755 },
);
const archive = join(output, `${name}.tar.gz`);
const reproducibleTarOptions =
  process.platform === "darwin"
    ? []
    : [
        "--sort=name",
        "--mtime=@0",
        "--owner=0",
        "--group=0",
        "--numeric-owner",
      ];
execFileSync("tar", [
  "-C",
  output,
  ...reproducibleTarOptions,
  "-czf",
  archive,
  name,
]);
const checksum = createHash("sha256")
  .update(readFileSync(archive))
  .digest("hex");
writeFileSync(`${archive}.sha256`, `${checksum}  ${name}.tar.gz\n`);
