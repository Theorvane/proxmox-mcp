# GitHub Release installation

Download the versioned archive and its `.sha256` companion from the canonical GitHub Release. Verify `shasum -a 256 -c proxmox-mcp-<version>.tar.gz.sha256`, unpack it, set the required environment variables, and configure the local stdio command `./proxmox-mcp`. No npm package is provided.
