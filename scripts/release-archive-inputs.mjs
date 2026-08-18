export const releaseInstallationGuide =
  "docs/guides/github-release-installation.md";

/** Files copied directly into the GitHub Release archive. */
export const releaseArchiveFiles = [
  "dist",
  "LICENSE",
  "package.json",
  "package-lock.json",
  releaseInstallationGuide,
];

/**
 * Repository paths whose changes can alter the release archive or its verification.
 * `src/` produces the archived `dist/` directory.
 */
export const releaseInputFiles = [
  ...releaseArchiveFiles.filter((file) => file !== "dist"),
  "scripts/build-release-archive.mjs",
  "scripts/release-archive-inputs.mjs",
  "scripts/verify-release-archive.mjs",
  "tsup.config.ts",
];

export const isReleaseInput = (file) =>
  file.startsWith("src/") || releaseInputFiles.includes(file);
