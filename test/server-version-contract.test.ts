import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "@theorvane/type-mcp";
import { describe, expect, it } from "vitest";
import { ProxmoxMcpServer } from "../src/proxmox-server.js";

const root = resolve(import.meta.dirname, "..");

describe("stdio server version", () => {
  it("reports the package and LobeHub manifest release version at MCP initialization", async () => {
    const packageVersion = JSON.parse(
      readFileSync(resolve(root, "package.json"), "utf8"),
    ).version;
    const manifestVersion = JSON.parse(
      readFileSync(resolve(root, "lhm.plugin.json"), "utf8"),
    ).version;
    const instance = new ProxmoxMcpServer();
    instance.client = {} as never;
    const server = await createMcpServer(ProxmoxMcpServer, {
      resolve: () => instance,
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "version-contract", version: "1.0.0" });

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    expect(client.getServerVersion()?.version).toBe(packageVersion);
    expect(client.getServerVersion()?.version).toBe(manifestVersion);

    await client.close();
    await server.close();
  });
});
