import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "@theorvane/type-mcp";
import { describe, expect, it } from "vitest";
import { ProxmoxMcpServer } from "../src/proxmox-server.js";

const root = resolve(import.meta.dirname, "..");
const manifestPath = resolve(root, "lhm.plugin.json");

describe("LobeHub Market manifest", () => {
  it("uses only supported marketplace metadata and declares the complete MCP tool surface", () => {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const supportedFields = new Set([
      "identifier",
      "name",
      "version",
      "author",
      "authorUrl",
      "category",
      "description",
      "homepage",
      "icon",
      "tags",
      "tools",
      "prompts",
      "resources",
    ]);

    expect(Object.keys(manifest).every((key) => supportedFields.has(key))).toBe(
      true,
    );
    expect(manifest).toMatchObject({
      identifier: "theorvane-proxmox-mcp",
      name: "Proxmox MCP",
      version: "0.1.1",
      author: "Theorvane",
      authorUrl: "https://github.com/Theorvane",
      category: "tools",
      homepage: "https://github.com/Theorvane/proxmox-mcp",
      tags: expect.arrayContaining(["mcp", "proxmox", "self-hosted"]),
    });
    expect(manifest.icon).toMatch(/^https:\/\//);
    expect(manifest.icon).not.toMatch(
      /githubusercontent\.com\/.*\/(main|dev)\//,
    );
    expect(manifest).not.toHaveProperty("mcpServers");
    expect(manifest.tools.length).toBeGreaterThan(0);
    for (const tool of manifest.tools) {
      expect(tool.description).toEqual(expect.any(String));
      expect(tool.inputSchema).toMatchObject({ type: "object" });
      expect(tool.inputSchema).toHaveProperty(
        "$schema",
        "http://json-schema.org/draft-07/schema#",
      );
    }
  });

  it("keeps its declared names, descriptions, and input schemas aligned with the MCP server", async () => {
    const instance = new ProxmoxMcpServer();
    instance.client = {} as never;
    const server = await createMcpServer(ProxmoxMcpServer, {
      resolve: () => instance,
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "manifest-contract", version: "1.0.0" });
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    const runtimeTools = (await client.listTools()).tools;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(manifest.tools).toHaveLength(runtimeTools.length);
    expect(manifest.tools.map((tool: { name: string }) => tool.name)).toEqual(
      runtimeTools.map((tool) => tool.name),
    );
    for (const listedTool of runtimeTools) {
      const manifestTool = manifest.tools.find(
        (tool: { name: string }) => tool.name === listedTool.name,
      );
      expect(manifestTool.description).toBe(listedTool.description);
      expect(manifestTool.inputSchema).toEqual(listedTool.inputSchema);
    }
    for (const name of [
      "qemu_delete",
      "lxc_delete",
      "qemu_delete_disk",
      "qemu_force_stop",
    ]) {
      expect(
        manifest.tools.find((tool: { name: string }) => tool.name === name)
          .inputSchema.required,
      ).toContain("confirm");
      expect(
        manifest.tools.find((tool: { name: string }) => tool.name === name)
          .inputSchema.properties.confirm,
      ).toEqual({ const: true, type: "boolean" });
    }
    await client.close();
    await server.close();
  });
});
