import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "@theorvane/type-mcp";
import { describe, expect, it, vi } from "vitest";
import { ProxmoxMcpServer } from "../src/proxmox-server.js";

function server() {
  const instance = new ProxmoxMcpServer();
  instance.client = {
    get: vi.fn(async () => []),
    post: vi.fn(async () => "UPID:1"),
    put: vi.fn(async () => "UPID:2"),
    delete: vi.fn(async () => "UPID:3"),
  } as never;
  return instance;
}

describe("MCP tool behavior", () => {
  it("compiles tools into the official MCP transport and rejects invalid input before a request", async () => {
    const instance = server();
    const compiled = await createMcpServer(ProxmoxMcpServer, {
      resolve: () => instance,
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "1.0.0" });
    await Promise.all([
      compiled.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    await expect(client.listTools()).resolves.toMatchObject({
      tools: expect.arrayContaining([
        expect.objectContaining({ name: "list_qemu" }),
      ]),
    });
    await expect(
      client.callTool({ name: "list_qemu", arguments: { node: "*" } }),
    ).resolves.toMatchObject({ isError: true });
    expect(instance.client.get).not.toHaveBeenCalled();
    await client.close();
    await compiled.close();
  });

  it("routes inventory calls through the client", async () => {
    const instance = server();
    await expect(instance.listQemu({ node: "pve" })).resolves.toBe("[]");
    expect(instance.client.get).toHaveBeenCalledWith("nodes/pve/qemu");
  });

  it("returns normalized receipts for mutations", async () => {
    const instance = server();
    await expect(
      instance.qemuStart({ node: "pve", vmid: 100 }),
    ).resolves.toEqual({
      upid: "UPID:1",
      targetKind: "qemu",
      node: "pve",
      vmid: 100,
    });
    expect(instance.client.post).toHaveBeenCalledWith(
      "nodes/pve/qemu/100/status/start",
    );
  });

  it("does not invoke a destructive client call without confirmation", async () => {
    const instance = server();
    await expect(
      instance.qemuDelete({ node: "pve", vmid: 100, confirm: false } as never),
    ).rejects.toThrow("confirm: true");
    expect(instance.client.delete).not.toHaveBeenCalled();
  });
});
