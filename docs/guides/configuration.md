# Configuration

Set `PROXMOX_BASE_URL` to an HTTPS origin, `PROXMOX_TOKEN_ID`, and `PROXMOX_TOKEN_SECRET` in the local MCP client environment. Node's built-in fetch always verifies TLS certificates. Do not set `PROXMOX_TLS_VERIFY=false`: it is rejected at startup. Install the Proxmox server CA in the host trust store instead.
