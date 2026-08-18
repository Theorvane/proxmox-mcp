#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createMcpServer, startStdioServer } from "@theorvane/type-mcp";
import { loadProxmoxConfig } from "./config.js";
import { ProxmoxClient } from "./proxmox-client.js";
import { ProxmoxMcpServer } from "./proxmox-server.js";

export async function start(): Promise<void> {
  const config = loadProxmoxConfig(process.env);
  if (!config.tlsVerify)
    process.stderr.write(
      "Warning: PROXMOX_TLS_VERIFY=false disables TLS certificate verification.\n",
    );
  const client = new ProxmoxClient(config);
  const server = await createMcpServer(ProxmoxMcpServer, {
    resolve: () => Object.assign(new ProxmoxMcpServer(), { client }),
  });
  await startStdioServer(server);
}

if (
  process.argv[1] &&
  realpathSync(resolve(process.argv[1])) ===
    realpathSync(fileURLToPath(import.meta.url))
)
  void start().catch(() => {
    process.stderr.write("Unable to start Proxmox MCP server.\n");
    process.exitCode = 1;
  });
