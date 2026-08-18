# Tool contract

Inventory: `cluster_version`, `cluster_resources`, `list_nodes`, `node_status`, `list_storage`, `list_qemu`, `list_lxc`, `list_tasks`, and `task_status`.

Lifecycle and configuration tools return `{ upid, targetKind, node, vmid }`. Destructive tools are `qemu_delete`, `lxc_delete`, `qemu_delete_disk`, and `qemu_force_stop`; they require explicit confirmation.

Every node-targeted tool accepts only one Proxmox hostname label: alphanumeric characters and interior hyphens, with no leading or trailing hyphen (maximum 63 characters). Dots, path separators, percent encoding, whitespace, query/hash characters, and wildcard values are rejected before any request. Dynamic API path segments are percent-encoded.
