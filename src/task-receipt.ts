export interface TaskReceipt {
  upid: string | null;
  targetKind: "qemu" | "lxc";
  node: string;
  vmid: number;
}
export function taskReceipt(
  upid: unknown,
  targetKind: TaskReceipt["targetKind"],
  node: string,
  vmid: number,
): TaskReceipt {
  return {
    upid: typeof upid === "string" ? upid : null,
    targetKind,
    node,
    vmid,
  };
}
