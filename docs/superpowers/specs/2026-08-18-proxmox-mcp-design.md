# Proxmox MCP Design

**Status:** Proposed for implementation review  
**Repository:** `Theorvane/proxmox-mcp`  
**Target branch:** `dev`

## Goal

Deliver a local, stdio-based TypeScript MCP server that wraps the Proxmox VE REST API. It must support inventory, lifecycle control, and selected VM/LXC configuration operations while requiring explicit confirmation for destructive actions.

## Scope

### Runtime and authentication

- Run locally over stdio, compatible with MCP clients such as Claude Desktop, Codex, and Hermes.
- Use `@theorvane/type-mcp` for decorator-driven tool definitions and the official MCP SDK runtime.
- Distribute immutable versioned release artifacts exclusively through GitHub Releases. npm publication is explicitly out of scope.
- Read credentials only from environment variables:
  - `PROXMOX_BASE_URL` — HTTPS origin of the Proxmox VE API.
  - `PROXMOX_TOKEN_ID` — token identifier in `user@realm!token-name` form.
  - `PROXMOX_TOKEN_SECRET` — token secret.
- Never emit token values, authorization headers, or raw server exception payloads in logs or MCP results.

### First-release tools

The first release exposes a compact, resource-oriented surface rather than every Proxmox endpoint.

| Area | Operations |
| --- | --- |
| Inventory | cluster version/resources, nodes, node status, storage, QEMU VMs, LXC containers, tasks |
| Lifecycle | QEMU/LXC start, graceful shutdown, stop, reboot |
| Provisioning | create QEMU VM, create LXC container |
| Configuration | update QEMU/LXC configuration, resize QEMU disk |
| Deletion | delete QEMU VM, delete LXC container, delete an unused QEMU disk |
| Task tracking | query a Proxmox task by node and UPID |

Every state-changing operation returns a normalized task receipt containing the Proxmox UPID (when the upstream endpoint returns one), target kind, node, and VMID. Callers use the task-query tool to observe asynchronous completion.

### Explicit confirmation gate

The client-side gate is a safety control, not an authorization replacement. Proxmox RBAC/API-token permissions remain the final access-control boundary.

The following operations require all of `confirm: true`, `node`, and `vmid` before an HTTP request is issued:

- QEMU or LXC deletion;
- QEMU disk deletion;
- forced stop;
- destructive reinstall actions, if added later.

Missing confirmation returns a stable MCP error that names the required fields and makes no upstream API request. Normal create, update, and graceful lifecycle operations do not require `confirm` in the first release.

### Error and input contract

- Zod schemas validate every tool parameter before a handler runs.
- Invalid calls do not issue HTTP requests.
- Upstream non-success responses become generic, actionable MCP errors with the HTTP status and operation category, but no credentials or server-provided detail that may contain secrets.
- Network, TLS, JSON-decoding, and unexpected handler failures are normalized in the same manner.
- TLS certificate verification is always enabled by Node's built-in fetch. `PROXMOX_TLS_VERIFY=false` is rejected with instructions to trust the server CA instead.

## Distribution and directory listing contract

- A release workflow may run only after a reviewed `dev` → `main` promotion. It builds a self-contained, versioned release archive containing production dependencies, `dist/`, executable launch scripts, a checksum manifest, the installation guide, and the canonical server metadata.
- The workflow attaches the archive and its SHA-256 checksum to an immutable GitHub Release that targets the exact `main` commit. A clean temporary directory must download the release asset, verify its checksum, configure required environment variables, and perform an MCP stdio initialization/tool-list check before the release is considered verified.
- The source repository remains the canonical release record. Do not run `npm publish`, add npm publication workflows, or claim an npm package exists.
- ClawHub receives a skill (not a plugin) that downloads a user-selected, checksum-verified GitHub Release artifact and registers its local stdio command. The helper never embeds a token and never substitutes an unpinned branch checkout for a release asset.
- LobeHub and MCP Server Hub directory entries must use only the verified GitHub Release installation command, canonical repository URL, exact release version, screenshots/icons, capability list, and safety disclosures. Their current submission schemas and automation support must be checked at submission time; no unsupported manifest or automatic publisher is assumed in advance.
- Official MCP Registry publication is deferred unless a supported package descriptor is available without npm. It is not a release prerequisite for the three requested directories.

## Architecture

```text
MCP client
  │ stdio
  ▼
TypeMCP decorators + official SDK server
  │ validated arguments
  ▼
Proxmox service methods
  │ confirmation gate + result normalization
  ▼
Proxmox HTTP client
  │ API-token Authorization header
  ▼
Proxmox VE REST API (/api2/json)
```

- `src/config.ts` parses environment configuration once at startup.
- `src/proxmox-client.ts` owns URL construction, Authorization headers, fetch, error normalization, and JSON envelope handling.
- `src/safety.ts` owns the reusable destructive-operation confirmation guard.
- `src/proxmox-server.ts` contains a TypeMCP-decorated server class whose methods map MCP tools to small service calls.
- `src/index.ts` provides the executable stdio entrypoint.
- Tool methods use explicit `node` and `vmid`; the server never infers a target from an unqualified identifier.

## Alternatives considered

1. **Direct official SDK implementation** — lower dependency count, but duplicates the declarative API/runtime work TypeMCP exists to provide.
2. **Generic endpoint passthrough tool** — broad coverage quickly, but makes schemas, least surprise, auditing, and safety gates weaker.
3. **Selected TypeMCP tools (chosen)** — provides typed intent-level operations, validates inputs at the MCP boundary, and keeps the first release reviewable.

## Testing and acceptance criteria

Tests use the official MCP SDK client with in-memory transport where protocol behavior is relevant, plus mocked `fetch` only at the HTTP boundary.

Required proof:

1. Configuration rejects a missing URL/token component and defaults TLS verification to enabled.
2. An inventory tool produces the expected request path and normalized result.
3. Invalid schema input does not invoke the handler or fetch.
4. A safe lifecycle tool returns a normalized task receipt.
5. Each destructive tool rejects missing `confirm: true` without invoking fetch.
6. Confirmed destructive calls include an exact node and VMID in their API route.
7. Authorization values and raw upstream failure bodies never appear in tool errors.
8. The stdio entrypoint compiles; a release archive includes the complete runnable distribution, checksum, and installation metadata.
9. `biome check .`, type checking, tests, build, release-archive verification, and production dependency audit pass.

## Explicit exclusions

- Remote Streamable HTTP hosting and tenant/client authentication.
- npm Registry publication, npm-package installation instructions, and npm publication automation.
- Official MCP Registry registration unless a non-npm supported package descriptor is separately approved.
- User/password ticket authentication and Proxmox realm management.
- Backup/restore, firewall, HA, Ceph, SDN, pools, and bulk operation orchestration.
- A generic arbitrary-method/path execution tool.
- Automatic retries of state-changing calls.

These can be introduced through separate, independently reviewed issues once the initial server and safety contract are stable.
