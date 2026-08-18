import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { once } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const version = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
).version;
const archive =
  process.env.RELEASE_ARCHIVE ??
  join(root, "release", `proxmox-mcp-${version}.tar.gz`);
const expected = readFileSync(`${archive}.sha256`, "utf8")
  .trim()
  .split(/\s+/)[0];
const actual = createHash("sha256").update(readFileSync(archive)).digest("hex");
if (actual !== expected) throw new Error("Release archive checksum mismatch");

const temporary = mkdtempSync(join(tmpdir(), "proxmox-mcp-release-"));
try {
  execFileSync("tar", ["-C", temporary, "-xzf", archive]);
  const folder = execFileSync(
    "find",
    [temporary, "-mindepth", "1", "-maxdepth", "1", "-type", "d"],
    { encoding: "utf8" },
  ).trim();
  const child = spawn(join(folder, "proxmox-mcp"), [], {
    env: {
      ...process.env,
      PROXMOX_BASE_URL: "https://example.invalid",
      PROXMOX_TOKEN_ID: "test@pam!token",
      PROXMOX_TOKEN_SECRET: "safe-test-value",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const messages = [];
  let buffer = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    for (const line of buffer.split("\n").slice(0, -1))
      messages.push(JSON.parse(line));
    buffer = buffer.includes("\n")
      ? buffer.slice(buffer.lastIndexOf("\n") + 1)
      : buffer;
  });
  await once(child, "spawn");
  const waitFor = (id) =>
    new Promise((resolveResponse, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timed out waiting for MCP response ${id}`)),
        5_000,
      );
      const poll = () => {
        const message = messages.find((item) => item.id === id);
        if (message) {
          clearTimeout(timer);
          resolveResponse(message);
        } else setTimeout(poll, 10);
      };
      poll();
    });
  child.stdin.write(
    `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "archive-verifier", version: "1.0.0" } } })}\n`,
  );
  const initialized = await waitFor(1);
  if (!initialized.result?.serverInfo)
    throw new Error("MCP initialize did not return server information");
  child.stdin.write(
    `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`,
  );
  const listed = await waitFor(2);
  if (!Array.isArray(listed.result?.tools) || !listed.result.tools.length)
    throw new Error("MCP tools/list did not return tools");
  child.kill();
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
