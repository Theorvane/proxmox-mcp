# Safety

QEMU/LXC deletion, unused QEMU disk deletion, and QEMU force-stop require exact `node`, `vmid`, and `confirm: true`. These actions can be non-recoverable. Proxmox RBAC remains authoritative.

Node names must be a single supported Proxmox hostname label; path-like, encoded, whitespace, query/hash, wildcard, and dot values are rejected before a client request. All dynamic API path segments are encoded.
