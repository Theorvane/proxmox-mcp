import { ProxmoxConfigError } from "./errors.js";

export interface ProxmoxConfig {
  readonly baseUrl: string;
  readonly tokenId: string;
  readonly tokenSecret: string;
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
  if (env.PROXMOX_TLS_VERIFY === "false")
    throw new ProxmoxConfigError(
      "PROXMOX_TLS_VERIFY=false is unsupported: Node fetch always verifies TLS certificates; remove this setting and trust the server CA",
    );
  return Object.freeze({
    baseUrl: url.toString().replace(/\/$/, ""),
    tokenId,
    tokenSecret,
  });
}
