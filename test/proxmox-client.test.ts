import { describe, expect, it, vi } from "vitest";
import { ProxmoxClient } from "../src/proxmox-client.js";

const config = {
  baseUrl: "https://pve.example",
  tokenId: "user@pam!token",
  tokenSecret: "secret",
};

describe("ProxmoxClient", () => {
  it("prefixes API paths once, preserves defined query values, and unwraps data", async () => {
    const request = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: [{ id: 1 }] }), { status: 200 }),
    );
    const client = new ProxmoxClient(config, request as typeof fetch);
    await expect(
      client.get("/api2/json/nodes", { full: true, omit: undefined }),
    ).resolves.toEqual([{ id: 1 }]);
    const [url, init] = request.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe(
      "https://pve.example/api2/json/nodes?full=true",
    );
    expect(init.headers).toEqual({
      Authorization: "PVEAPIToken=user@pam!token=secret",
    });
  });

  it("encodes bodies and never exposes response bodies or credentials in failures", async () => {
    const client = new ProxmoxClient(
      config,
      vi.fn(
        async () => new Response("raw upstream secret", { status: 500 }),
      ) as typeof fetch,
    );
    await expect(
      client.post("nodes/x/qemu", { vmid: 100, skip: undefined }),
    ).rejects.toThrow("Proxmox post operation failed (HTTP 500)");
    await expect(client.post("nodes/x/qemu")).rejects.not.toThrow(
      /secret|Authorization|raw upstream/i,
    );
  });
});
