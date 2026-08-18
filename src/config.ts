import { ProxmoxConfigError } from "./errors.js";

export interface ProxmoxConfig {
  readonly baseUrl: string;
  readonly tokenId: string;
  readonly tokenSecret: string;
  readonly tlsVerify: boolean;
}

export function loadProxmoxConfig(
  env: NodeJS.ProcessEnv,
): Readonly<ProxmoxConfig> {
  const baseUrl = env.PROXMOX_BASE_URL;
  if (!baseUrl)
    throw new ProxmoxConfigError(
      "Missing required configuration: PROXMOX_BASE_URL",
    );
  const tokenId = env.PROXMOX_TOKEN_ID;
  if (!tokenId)
    throw new ProxmoxConfigError(
      "Missing required configuration: PROXMOX_TOKEN_ID",
    );
  const tokenSecret = env.PROXMOX_TOKEN_SECRET;
  if (!tokenSecret)
    throw new ProxmoxConfigError(
      "Missing required configuration: PROXMOX_TOKEN_SECRET",
    );
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new ProxmoxConfigError("Invalid PROXMOX_BASE_URL");
  }
  if (url.protocol !== "https:")
    throw new ProxmoxConfigError("PROXMOX_BASE_URL must use HTTPS");
  const tls = env.PROXMOX_TLS_VERIFY ?? "true";
  if (tls !== "true" && tls !== "false")
    throw new ProxmoxConfigError(
      "PROXMOX_TLS_VERIFY must be literal true or false",
    );
  return Object.freeze({
    baseUrl: url.toString().replace(/\/$/, ""),
    tokenId,
    tokenSecret,
    tlsVerify: tls === "true",
  });
}
