import { describe, expect, it } from "vitest";
import { loadProxmoxConfig } from "../src/config.js";

describe("configuration", () => {
  it("validates required HTTPS configuration without exposing secrets", () => {
    expect(() =>
      loadProxmoxConfig({ PROXMOX_TOKEN_SECRET: "secret-value" }),
    ).toThrow("PROXMOX_BASE_URL");
    expect(() =>
      loadProxmoxConfig({
        PROXMOX_BASE_URL: "http://host",
        PROXMOX_TOKEN_ID: "id",
        PROXMOX_TOKEN_SECRET: "secret-value",
      }),
    ).toThrow("HTTPS");
    expect(
      loadProxmoxConfig({
        PROXMOX_BASE_URL: "https://host/",
        PROXMOX_TOKEN_ID: "id",
        PROXMOX_TOKEN_SECRET: "secret-value",
      }).tlsVerify,
    ).toBe(true);
  });
});
