import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isReleaseInput } from "./release-archive-inputs.mjs";

export const isInitialPush = (before) => /^0+$/.test(before);

export const hasReleaseIntent = (before, changedPaths) =>
  isInitialPush(before) || changedPaths.some(isReleaseInput);

const writeOutput = (release) => {
  const output = `release=${release}\n`;
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, output);
  process.stdout.write(output);
};

const run = (before, sha) => {
  if (isInitialPush(before)) return writeOutput(true);

  try {
    const changedPaths = execFileSync(
      "git",
      ["diff", "--name-only", before, sha],
      { encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    writeOutput(hasReleaseIntent(before, changedPaths));
  } catch (error) {
    console.error(
      "Could not determine release inputs; reconciling release fail closed.",
    );
    console.error(error);
    writeOutput(true);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [before, sha] = process.argv.slice(2);
  if (!before || !sha)
    throw new Error("Usage: release-intent.mjs <before-sha> <sha>");
  run(before, sha);
}
