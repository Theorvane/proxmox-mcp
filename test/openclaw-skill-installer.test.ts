import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createInstallPlan,
  defaultDownload,
  install,
  RELEASE_ARCHIVE_URL,
  RELEASE_CHECKSUM_URL,
} from "../skills/proxmox-mcp-openclaw/scripts/installer.mjs";

const credentials = {
  PROXMOX_BASE_URL: "https://proxmox.example.test:8006",
  PROXMOX_TOKEN_ID: "root@pam!openclaw",
  PROXMOX_TOKEN_SECRET: "never-log-this-secret",
};

const installerCli = resolve("skills/proxmox-mcp-openclaw/scripts/install.mjs");

function runInstallerCli(args: string[], environment: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [installerCli, ...args], {
    encoding: "utf8",
    env: environment,
  });
}

function fixtureDependencies(
  archiveEntries = ["proxmox-mcp-0.1.1/proxmox-mcp"],
) {
  const archive = Buffer.from("fixture release archive");
  const checksum = createHash("sha256").update(archive).digest("hex");
  const calls: Array<{
    command: string;
    args: string[];
    env?: Record<string, string>;
  }> = [];
  return {
    calls,
    download: async (url) => {
      if (url === RELEASE_ARCHIVE_URL) return archive;
      if (url === RELEASE_CHECKSUM_URL)
        return Buffer.from(`${checksum}  proxmox-mcp-0.1.1.tar.gz\n`);
      throw new Error(`unexpected download: ${url}`);
    },
    listArchiveEntries: async () => archiveEntries,
    extractArchive: async (_archive, destination) => {
      await writeFile(join(destination, "proxmox-mcp"), "#!/bin/sh\n");
    },
    run: async (command, args, options = {}) => {
      calls.push({ command, args, env: options.env });
      if (args[0] === "mcp" && args[1] === "list")
        return { exitCode: 0, stdout: "[]", stderr: "" };
      return { exitCode: 0, stdout: "", stderr: "" };
    },
  };
}

describe("OpenClaw skill installer", () => {
  it("plans a safe dry run without exposing credentials or mutating the target", async () => {
    const parent = await mkdtemp(join(tmpdir(), "proxmox-mcp-dry-run-"));
    const directory = join(parent, "proxmox-mcp");
    const result = runInstallerCli(["--dry-run", directory], {
      ...process.env,
      ...credentials,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("v0.1.1");
    expect(result.stdout).toContain(RELEASE_ARCHIVE_URL);
    expect(result.stdout).toContain(RELEASE_CHECKSUM_URL);
    expect(result.stdout).toContain(join(resolve(directory), "proxmox-mcp"));
    expect(result.stdout).toContain(resolve(directory));
    expect(result.stdout).not.toContain(credentials.PROXMOX_BASE_URL);
    expect(result.stdout).not.toContain(credentials.PROXMOX_TOKEN_ID);
    expect(result.stdout).not.toContain(credentials.PROXMOX_TOKEN_SECRET);
    await expect(access(directory)).rejects.toThrow();

    const missingCredentials = runInstallerCli(["--dry-run", directory], {
      ...process.env,
      PROXMOX_BASE_URL: credentials.PROXMOX_BASE_URL,
      PROXMOX_TOKEN_ID: credentials.PROXMOX_TOKEN_ID,
      PROXMOX_TOKEN_SECRET: "",
    });
    expect(missingCredentials.status).toBe(1);
    expect(missingCredentials.stderr).toContain("PROXMOX_TOKEN_SECRET");
    expect(missingCredentials.stderr).not.toContain(
      credentials.PROXMOX_BASE_URL,
    );
    expect(missingCredentials.stderr).not.toContain(
      credentials.PROXMOX_TOKEN_ID,
    );
    await expect(access(directory)).rejects.toThrow();

    const invalidTarget = runInstallerCli(["--dry-run", "relative-target"], {
      ...process.env,
      ...credentials,
    });
    expect(invalidTarget.status).toBe(1);
    expect(invalidTarget.stderr).toContain("absolute path");
    expect(invalidTarget.stderr).not.toContain(credentials.PROXMOX_BASE_URL);
    expect(invalidTarget.stderr).not.toContain(credentials.PROXMOX_TOKEN_ID);
    expect(invalidTarget.stderr).not.toContain(
      credentials.PROXMOX_TOKEN_SECRET,
    );
    await expect(access(join(parent, "relative-target"))).rejects.toThrow();
  });

  it("builds a complete absolute-path install plan without credentials", async () => {
    const directory = await mkdtemp(join(tmpdir(), "proxmox-mcp-plan-"));
    const plan = createInstallPlan(directory, credentials);

    expect(plan.releaseVersion).toBe("v0.1.1");
    expect(plan.archiveUrl).toBe(RELEASE_ARCHIVE_URL);
    expect(plan.checksumUrl).toBe(RELEASE_CHECKSUM_URL);
    expect(plan.installDirectory).toBe(resolve(directory));
    expect(plan.command).toBe(join(resolve(directory), "proxmox-mcp"));
    expect(plan.cwd).toBe(resolve(directory));
    expect(JSON.stringify(plan)).not.toContain(
      credentials.PROXMOX_TOKEN_SECRET,
    );
    expect(JSON.stringify(plan)).not.toContain(credentials.PROXMOX_TOKEN_ID);
  });

  it("fails for missing credentials before download or CLI work", async () => {
    const deps = fixtureDependencies();
    await expect(
      install(
        "/tmp/proxmox-mcp-missing",
        { ...credentials, PROXMOX_TOKEN_SECRET: "" },
        deps,
      ),
    ).rejects.toThrow("PROXMOX_TOKEN_SECRET");
    expect(deps.calls).toEqual([]);
  });

  it("rejects an existing installation directory before download or CLI work", async () => {
    const directory = await mkdtemp(join(tmpdir(), "proxmox-mcp-existing-"));
    await writeFile(join(directory, "keep"), "keep");
    const deps = fixtureDependencies();

    await expect(install(directory, credentials, deps)).rejects.toThrow(
      "must not already exist",
    );
    expect(deps.calls).toEqual([]);
  });

  it("follows HTTPS release redirects without exposing the redirected URL", async () => {
    const redirectedUrl =
      "https://objects.githubusercontent.com/immutable-release";
    const fetchCalls: Array<{ url: string; options: RequestInit }> = [];
    const fetchImpl = async (url: string, options: RequestInit) => {
      fetchCalls.push({ url, options });
      return {
        ok: true,
        status: 200,
        url: redirectedUrl,
        arrayBuffer: async () =>
          new Uint8Array([114, 101, 108, 101, 97, 115, 101]).buffer,
      };
    };

    await expect(
      defaultDownload(RELEASE_ARCHIVE_URL, fetchImpl),
    ).resolves.toEqual(Buffer.from("release"));
    expect(fetchCalls).toEqual([
      { url: RELEASE_ARCHIVE_URL, options: { redirect: "follow" } },
    ]);
  });

  it("rejects a redirect whose final URL is not HTTPS without exposing it", async () => {
    const redirectedUrl = "http://unsafe.example.test/release";
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      url: redirectedUrl,
      arrayBuffer: async () =>
        new Uint8Array([114, 101, 108, 101, 97, 115, 101]).buffer,
    });

    await expect(
      defaultDownload(RELEASE_ARCHIVE_URL, fetchImpl),
    ).rejects.toThrow("secure HTTPS destination");
    await expect(
      defaultDownload(RELEASE_ARCHIVE_URL, fetchImpl),
    ).rejects.not.toThrow(redirectedUrl);
  });

  it("does not expose a redirected URL when the downloader transport fails", async () => {
    const redirectedUrl =
      "https://objects.githubusercontent.com/private-release";
    const fetchImpl = async () => {
      throw new Error(`request failed after redirecting to ${redirectedUrl}`);
    };

    await expect(
      defaultDownload(RELEASE_ARCHIVE_URL, fetchImpl),
    ).rejects.toThrow("Unable to download the pinned release artifact");
    await expect(
      defaultDownload(RELEASE_ARCHIVE_URL, fetchImpl),
    ).rejects.not.toThrow(redirectedUrl);
  });

  it("rejects unsafe installation directories", async () => {
    const deps = fixtureDependencies();
    await expect(install("/", credentials, deps)).rejects.toThrow(
      "unsafe installation directory",
    );
    expect(deps.calls).toEqual([]);
  });

  it("validates the checksum before archive inspection or extraction", async () => {
    const parent = await mkdtemp(join(tmpdir(), "proxmox-mcp-checksum-"));
    const directory = join(parent, "proxmox-mcp");
    const deps = fixtureDependencies();
    let inspected = false;
    let extracted = false;
    deps.listArchiveEntries = async () => {
      inspected = true;
      return [];
    };
    deps.extractArchive = async () => {
      extracted = true;
    };
    deps.download = async (url) =>
      Buffer.from(
        url === RELEASE_CHECKSUM_URL
          ? `${"0".repeat(64)}  proxmox-mcp-0.1.1.tar.gz\n`
          : "fixture release archive",
      );

    await expect(install(directory, credentials, deps)).rejects.toThrow(
      "checksum",
    );
    expect(inspected).toBe(false);
    expect(extracted).toBe(false);
    expect(deps.calls).toEqual([]);
  });

  it("rejects traversal-containing archives and never registers them", async () => {
    const parent = await mkdtemp(join(tmpdir(), "proxmox-mcp-traversal-"));
    const directory = join(parent, "proxmox-mcp");
    const deps = fixtureDependencies(["proxmox-mcp-0.1.1/../escape"]);

    await expect(install(directory, credentials, deps)).rejects.toThrow(
      "unsafe archive entry",
    );
    expect(deps.calls).toEqual([]);
  });

  it("refuses a conflicting registration without an explicit replacement policy", async () => {
    const parent = await mkdtemp(join(tmpdir(), "proxmox-mcp-conflict-"));
    const directory = join(parent, "proxmox-mcp");
    const deps = fixtureDependencies();
    deps.run = async (command, args) => {
      deps.calls.push({ command, args });
      return { exitCode: 0, stdout: '[{"name":"proxmox-mcp"}]', stderr: "" };
    };

    await expect(install(directory, credentials, deps)).rejects.toThrow(
      "already registered",
    );
    expect(deps.calls).toEqual([
      { command: "openclaw", args: ["mcp", "list", "--json"] },
    ]);
  });

  it("installs the verified fixture and forwards credentials only to openclaw", async () => {
    const parent = await mkdtemp(join(tmpdir(), "proxmox-mcp-happy-"));
    const directory = join(parent, "proxmox-mcp");
    const deps = fixtureDependencies();

    await install(directory, credentials, deps);

    expect(await readdir(directory)).toEqual(["proxmox-mcp"]);
    expect(deps.calls).toHaveLength(2);
    expect(deps.calls[0]).toMatchObject({
      command: "openclaw",
      args: ["mcp", "list", "--json"],
    });
    expect(deps.calls[1]).toMatchObject({
      command: "openclaw",
      args: [
        "mcp",
        "add",
        "proxmox-mcp",
        "--command",
        join(resolve(directory), "proxmox-mcp"),
        "--cwd",
        resolve(directory),
        "--env",
        `PROXMOX_BASE_URL=${credentials.PROXMOX_BASE_URL}`,
        "--env",
        `PROXMOX_TOKEN_ID=${credentials.PROXMOX_TOKEN_ID}`,
        "--env",
        `PROXMOX_TOKEN_SECRET=${credentials.PROXMOX_TOKEN_SECRET}`,
      ],
    });
    expect(deps.calls[1]?.env).toBeUndefined();
    expect(JSON.stringify(deps.calls[0])).not.toContain(
      credentials.PROXMOX_TOKEN_SECRET,
    );
  });

  it("stages completely before registration preflight and atomically promotes only after it passes", async () => {
    const parent = await mkdtemp(join(tmpdir(), "proxmox-mcp-stage-"));
    const directory = join(parent, "proxmox-mcp");
    const deps = fixtureDependencies();
    let stagedDestination = "";
    deps.extractArchive = async (_archive, destination) => {
      stagedDestination = destination;
      await writeFile(join(destination, "proxmox-mcp"), "#!/bin/sh\n");
    };
    deps.run = async (command, args) => {
      deps.calls.push({ command, args });
      if (args[1] === "list") {
        expect(stagedDestination).not.toBe(directory);
        await expect(
          access(join(stagedDestination, "proxmox-mcp")),
        ).resolves.toBeUndefined();
        await expect(access(directory)).rejects.toThrow();
        return { exitCode: 0, stdout: "[]", stderr: "" };
      }
      return { exitCode: 0, stdout: "", stderr: "" };
    };

    await install(directory, credentials, deps);
    expect(await readdir(directory)).toEqual(["proxmox-mcp"]);
  });

  it("compensates only installer-created files when registration fails after promotion", async () => {
    const parent = await mkdtemp(join(tmpdir(), "proxmox-mcp-compensate-"));
    const directory = join(parent, "proxmox-mcp");
    const deps = fixtureDependencies();
    deps.run = async (command, args) => {
      deps.calls.push({ command, args });
      if (args[1] === "list") return { exitCode: 0, stdout: "[]", stderr: "" };
      await writeFile(
        join(directory, "user-created-during-registration"),
        "keep",
      );
      return { exitCode: 1, stdout: "", stderr: "failed" };
    };

    await expect(install(directory, credentials, deps)).rejects.toThrow(
      "registration failed",
    );
    expect(await readdir(directory)).toEqual([
      "user-created-during-registration",
    ]);
  });
});
