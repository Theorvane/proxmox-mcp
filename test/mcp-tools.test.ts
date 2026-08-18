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

  it("rejects unsafe node names at every node-targeted tool before a client request", async () => {
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
    const calls = [
      ["node_status", {}],
      ["list_storage", {}],
      ["list_qemu", {}],
      ["list_lxc", {}],
      ["list_tasks", {}],
      ["task_status", { upid: "UPID:1" }],
      ["qemu_start", { vmid: 100 }],
      ["qemu_shutdown", { vmid: 100 }],
      ["qemu_stop", { vmid: 100 }],
      ["qemu_reboot", { vmid: 100 }],
      ["lxc_start", { vmid: 100 }],
      ["lxc_shutdown", { vmid: 100 }],
      ["lxc_stop", { vmid: 100 }],
      ["lxc_reboot", { vmid: 100 }],
      ["qemu_create", { vmid: 100 }],
      [
        "lxc_create",
        { vmid: 100, ostemplate: "local:vztmpl/x", hostname: "guest" },
      ],
      ["qemu_update", { vmid: 100 }],
      ["lxc_update", { vmid: 100 }],
      ["qemu_resize_disk", { vmid: 100, disk: "scsi0", size: "+1G" }],
      ["qemu_delete", { vmid: 100, confirm: true }],
      ["lxc_delete", { vmid: 100, confirm: true }],
      ["qemu_delete_disk", { vmid: 100, confirm: true, disk: "unused0" }],
      ["qemu_force_stop", { vmid: 100, confirm: true }],
    ] as const;
    for (const unsafe of [
      ".",
      "..",
      "pve/../../version",
      "pve%2f",
      "pve node",
      "pve?x=1",
      "pve#x",
      "*",
    ]) {
      for (const [name, arguments_] of calls) {
        await expect(
          client.callTool({ name, arguments: { ...arguments_, node: unsafe } }),
        ).resolves.toMatchObject({ isError: true });
      }
    }
    expect(instance.client.get).not.toHaveBeenCalled();
    expect(instance.client.post).not.toHaveBeenCalled();
    expect(instance.client.put).not.toHaveBeenCalled();
    expect(instance.client.delete).not.toHaveBeenCalled();
    await client.close();
    await compiled.close();
  });

  it("routes inventory calls through the client", async () => {
    const instance = server();
    await expect(instance.listQemu({ node: "pve" })).resolves.toBe("[]");
    expect(instance.client.get).toHaveBeenCalledWith("nodes/pve/qemu");
  });

  it("encodes every dynamic path segment in valid node routes", async () => {
    const instance = server();
    await expect(
      instance.taskStatus({ node: "pve-01", upid: "UPID:pve-01:0001" }),
    ).resolves.toBe("[]");
    expect(instance.client.get).toHaveBeenCalledWith(
      "nodes/pve-01/tasks/UPID%3Apve-01%3A0001/status",
    );
    await expect(
      instance.qemuResize({
        node: "pve-01",
        vmid: 100,
        disk: "scsi0",
        size: "+1G",
      }),
    ).resolves.toEqual(expect.objectContaining({ vmid: 100 }));
    expect(instance.client.put).toHaveBeenCalledWith(
      "nodes/pve-01/qemu/100/resize",
      { disk: "scsi0", size: "+1G" },
    );
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
