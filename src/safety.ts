import { DestructiveOperationError } from "./errors.js";
export const protectedOperations = [
  "qemu-delete",
  "lxc-delete",
  "qemu-disk-delete",
  "force-stop",
] as const;
export type ProtectedOperation = (typeof protectedOperations)[number];
export async function requireDestructiveConfirmation<T>(
  input: {
    operation: ProtectedOperation;
    confirm?: boolean;
    node?: string;
    vmid?: number;
  },
  callback: () => Promise<T>,
): Promise<T> {
  if (
    input.confirm !== true ||
    !input.node ||
    !input.vmid ||
    input.node.includes("*") ||
    String(input.vmid).includes("*")
  )
    throw new DestructiveOperationError();
  return callback();
}
