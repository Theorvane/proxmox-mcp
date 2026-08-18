import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const contributing = readFileSync(
  resolve(import.meta.dirname, "../CONTRIBUTING.md"),
  "utf8",
);
for (const required of [
  "Issue",
  "issue-numbered branch",
  "dev",
  "PR to `dev`",
  "review",
  "main",
]) {
  if (!contributing.includes(required))
    throw new Error(`CONTRIBUTING.md must document ${required}`);
}
