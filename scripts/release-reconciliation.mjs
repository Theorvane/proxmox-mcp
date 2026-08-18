import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const classifyReleaseState = ({ tagCommit, releaseCommit }) => {
  if (tagCommit === null && releaseCommit === null) return "new";
  if (
    typeof tagCommit === "string" &&
    typeof releaseCommit === "string" &&
    tagCommit === releaseCommit
  )
    return "existing";
  throw new Error(
    "Existing release and tag must both resolve to the same immutable commit.",
  );
};

const runGit = (args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

const resolveTagCommit = (tag) => {
  const remoteTag = runGit([
    "ls-remote",
    "--tags",
    "--refs",
    "origin",
    `refs/tags/${tag}`,
  ]);
  if (!remoteTag) return null;
  runGit(["fetch", "--no-tags", "origin", `refs/tags/${tag}:refs/tags/${tag}`]);
  return runGit(["rev-parse", "--verify", `${tag}^{commit}`]);
};

const isMissingRelease = (error) =>
  `${error.stdout ?? ""}\n${error.stderr ?? ""}`.includes("HTTP 404");

const resolveReleaseCommit = (tag, repository) => {
  try {
    const releaseTarget = execFileSync(
      "gh",
      [
        "api",
        `repos/${repository}/releases/tags/${tag}`,
        "--jq",
        ".target_commitish",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
    if (!/^[0-9a-f]{40}$/i.test(releaseTarget))
      throw new Error("Release target is not an immutable commit SHA.");
    runGit(["fetch", "--no-tags", "origin", releaseTarget]);
    return runGit(["rev-parse", "--verify", `${releaseTarget}^{commit}`]);
  } catch (error) {
    if (isMissingRelease(error)) return null;
    throw error;
  }
};

const writeOutput = (state) => {
  const output = `state=${state}\n`;
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, output);
  process.stdout.write(output);
};

const run = (tag) => {
  if (!process.env.GITHUB_REPOSITORY)
    throw new Error("GITHUB_REPOSITORY is required to resolve a release.");
  const state = classifyReleaseState({
    tagCommit: resolveTagCommit(tag),
    releaseCommit: resolveReleaseCommit(tag, process.env.GITHUB_REPOSITORY),
  });
  writeOutput(state);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [tag] = process.argv.slice(2);
  if (!tag) throw new Error("Usage: release-reconciliation.mjs <tag>");
  run(tag);
}
