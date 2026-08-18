# proxmox-mcp

A safety-gated local stdio MCP server for the Proxmox VE API.

## Installation

Install only from a verified [GitHub Releases](https://github.com/Theorvane/proxmox-mcp/releases) archive. See the release installation guide included with each archive.

## OpenClaw / ClawHub status

The OpenClaw skill is prepared locally at `skills/proxmox-mcp-openclaw/` and is not yet published to ClawHub. A ClawHub installation command will be added only after an actual publication; until then, use the skill's local `SKILL.md` instructions.

TLS certificate verification is always enabled. Configure the host trust store with the Proxmox server CA; `PROXMOX_TLS_VERIFY=false` is rejected.
