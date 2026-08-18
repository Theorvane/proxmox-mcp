# LobeHub marketplace submission

Not published. `lhm.plugin.json` is official-schema-only marketplace metadata: it declares this server's 26 tool names, descriptions, and input schemas so LobeHub can derive capability badges. It deliberately does not declare a local stdio command; the schema does not support that distribution claim.

Before a manual submission, validate the manifest against the current official LobeHub schema and review every tool declaration against `src/proxmox-server.ts`. The listing may link to the canonical GitHub Releases page and must say that users install only a versioned, checksum-verified release archive. Do not state that LobeHub installs or launches the local server.

The listing must disclose that deletion, unused-disk deletion, and force-stop require `confirm: true`; credentials remain in the user's local MCP-client environment. Do not include credential values, npm commands, or a mutable branch URL.
