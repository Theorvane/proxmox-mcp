import { describe, expect, it } from "vitest";
import { classifyReleaseState } from "../scripts/release-reconciliation.mjs";

describe("immutable release reconciliation", () => {
  const priorCommit = "a".repeat(40);
  const currentCommit = "b".repeat(40);

  it("creates a release only when both the tag and release are absent", () => {
    expect(classifyReleaseState({ tagCommit: null, releaseCommit: null })).toBe(
      "new",
    );
  });

  it("skips a package version with a consistent existing immutable release", () => {
    expect(
      classifyReleaseState({
        tagCommit: priorCommit,
        releaseCommit: priorCommit,
      }),
    ).toBe("existing");
  });

  it.each([
    { tagCommit: priorCommit, releaseCommit: null },
    { tagCommit: null, releaseCommit: priorCommit },
    { tagCommit: priorCommit, releaseCommit: currentCommit },
  ])("fails closed for incomplete or disagreeing release metadata", (state) => {
    expect(() => classifyReleaseState(state)).toThrow(/same immutable commit/);
  });
});
