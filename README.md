# proxmox-mcp

`proxmox-mcp` is a safety-gated, local **stdio** [Model Context Protocol](https://modelcontextprotocol.io/) server for the Proxmox VE API. It is launched as a process by an MCP host; it is not an HTTP service and does not expose an HTTP endpoint.

> **Status — current release: [v0.1.1](https://github.com/Theorvane/proxmox-mcp/releases/tag/v0.1.1).** The canonical distribution is the GitHub Release archive and its SHA-256 checksum. No npm package is provided or published.

## Install the released Proxmox MCP

For a local stdio installation, use the checksum-verified GitHub Release archive:

- [GitHub Release v0.1.1](https://github.com/Theorvane/proxmox-mcp/releases/tag/v0.1.1)
- [Archive asset](https://github.com/Theorvane/proxmox-mcp/releases/download/v0.1.1/proxmox-mcp-0.1.1.tar.gz)
- [Checksum asset](https://github.com/Theorvane/proxmox-mcp/releases/download/v0.1.1/proxmox-mcp-0.1.1.tar.gz.sha256)

There is no npm package. The [LobeHub Marketplace listing](https://lobehub.com/mcp/theorvane-proxmox-mcp) describes capabilities; it is not the local installation source. ClawHub is not currently published because a publicly installable OpenClaw wrapper/listing is not available.

## Quick install

Download the v0.1.1 archive and checksum from GitHub Releases, verify them, and extract the archive. Do this on the machine where the MCP host will run.

```sh
curl -fLO https://github.com/Theorvane/proxmox-mcp/releases/download/v0.1.1/proxmox-mcp-0.1.1.tar.gz
curl -fLO https://github.com/Theorvane/proxmox-mcp/releases/download/v0.1.1/proxmox-mcp-0.1.1.tar.gz.sha256
shasum -a 256 -c proxmox-mcp-0.1.1.tar.gz.sha256
tar -xzf proxmox-mcp-0.1.1.tar.gz
cd proxmox-mcp-0.1.1
```

The archive requires Node.js **>=22**. Supply credentials through the environment; the values below are placeholders, not working credentials.

```sh
export PROXMOX_BASE_URL='https://proxmox.example:8006'
export PROXMOX_TOKEN_ID='user@realm!token-name'
: "${PROXMOX_TOKEN_SECRET:?set PROXMOX_TOKEN_SECRET in the environment}"
./proxmox-mcp
```

`./proxmox-mcp` is a stdio process. Register or configure that command, its working directory, and the three environment variables in your MCP host; starting it in a terminal alone does not make it available to a client. For the archive layout and installation details, see the [GitHub Release installation guide](docs/guides/github-release-installation.md).

## Configuration

Only these environment variables are used:

| Variable | Required | Meaning |
| --- | --- | --- |
| `PROXMOX_BASE_URL` | Yes | HTTPS origin for the Proxmox VE API, for example `https://proxmox.example:8006`. |
| `PROXMOX_TOKEN_ID` | Yes | Proxmox API token identifier. |
| `PROXMOX_TOKEN_SECRET` | Yes | Proxmox API token secret; provide it only through the local process environment. |

TLS certificate verification is always enabled. `PROXMOX_TLS_VERIFY=false` is rejected at startup; do not use it. If the Proxmox endpoint uses a private CA, trust that CA in the host trust store. See [configuration](docs/guides/configuration.md) for the full policy.

## Capabilities

The server provides a focused set of Proxmox VE operations. MCP hosts discover the exact schemas and tool descriptions at connection time.

| Area | Implemented capabilities |
| --- | --- |
| Inventory | Cluster version and resources; node status; node storage; QEMU and LXC inventory; task inventory and task status. |
| QEMU and LXC lifecycle | Start, graceful shutdown, stop, and reboot QEMU VMs and LXC containers. |
| Creation and configuration | Create and configure QEMU VMs and LXC containers. |
| Storage | Resize a QEMU disk. |
| Protected actions | Delete a QEMU VM or LXC container, delete an unused QEMU disk, and force-stop a QEMU VM. |

Tool names, inputs, outputs, and node-name validation rules are documented in the [tool contract](docs/api/tool-contract.md).

## Safety model

| Control | Behavior |
| --- | --- |
| Destructive-action gate | `qemu_delete`, `lxc_delete`, `qemu_delete_disk`, and `qemu_force_stop` require an exact `node`, exact `vmid`, and `confirm: true` before any Proxmox request is made. |
| Target validation | Node names are constrained to a supported Proxmox hostname label, and dynamic API path segments are encoded. |
| Authorization | Proxmox RBAC remains authoritative. This server does not grant permissions beyond the API token. |
| TLS | HTTPS is required and certificate verification cannot be disabled. |

Deletion, unused-disk removal, and force-stop can be non-recoverable. Review targets carefully and give the token only the Proxmox permissions it needs. See the complete [safety guidance](docs/guides/safety.md).

## OpenClaw local skill

The merged `dev` codebase contains an OpenClaw skill at [`skills/proxmox-mcp-openclaw/`](skills/proxmox-mcp-openclaw/). It is a local skill, not a generic OpenClaw plugin. Use its local [`SKILL.md`](skills/proxmox-mcp-openclaw/SKILL.md) instructions.

Choose a **new absolute target directory**—the target must not already exist. First inspect the credential-free plan:

```sh
node skills/proxmox-mcp-openclaw/scripts/install.mjs --dry-run /absolute/path/to/proxmox-mcp
```

With the three configuration variables exported in the shell, install and register it:

```sh
node skills/proxmox-mcp-openclaw/scripts/install.mjs /absolute/path/to/proxmox-mcp
```

The installer verifies the immutable v0.1.1 release and its checksum, then invokes the supported `openclaw mcp add` command only after preflight succeeds. It does not log or store credentials.

## Operational boundaries

- This is a local stdio MCP integration, not a hosted service or a replacement for Proxmox access controls.
- The server does not make a Proxmox request until an MCP client calls a tool. Installation and documentation examples do not call a real Proxmox API.
- Keep credentials out of repositories, shell history where practical, and shared configuration files. Use a least-privilege Proxmox API token.
- Obtain releases only from [Theorvane/proxmox-mcp GitHub Releases](https://github.com/Theorvane/proxmox-mcp/releases) and verify the published SHA-256 checksum before running the archive.

## Documentation

- [Configuration](docs/guides/configuration.md)
- [Safety](docs/guides/safety.md)
- [API and tool contract](docs/api/tool-contract.md)
- [GitHub Release installation](docs/guides/github-release-installation.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## Verification and contributing

Contributors work from an issue-numbered branch based on `dev`, open pull requests to `dev`, and promote only reviewed `dev` to `main`. GitHub Release archives are the only distribution channel. See [CONTRIBUTING.md](CONTRIBUTING.md).

Maintainers can run the same local verification commands used by the project:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run release:archive
npm run verify:release-archive
npm run validate:docs
npm run validate:governance
npm run validate:release
npm audit --omit=dev --audit-level=high
git diff --check
```

## License

This project is licensed under the terms in [LICENSE](LICENSE).
