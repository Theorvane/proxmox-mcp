export class ProxmoxConfigError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ProxmoxConfigError";
  }
}

export class ProxmoxOperationError extends Error {
  public constructor(
    public readonly category: string,
    status?: number,
  ) {
    super(
      status
        ? `Proxmox ${category} operation failed (HTTP ${status})`
        : `Proxmox ${category} operation failed`,
    );
    this.name = "ProxmoxOperationError";
  }
}

export class DestructiveOperationError extends Error {
  public constructor() {
    super("Destructive operation requires confirm: true, node, and vmid");
    this.name = "DestructiveOperationError";
  }
}
