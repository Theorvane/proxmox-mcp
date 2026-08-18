import { describe, expect, it, vi } from "vitest";
import { DestructiveOperationError } from "../src/errors.js";
import {
  protectedOperations,
  requireDestructiveConfirmation,
} from "../src/safety.js";

describe("destructive-operation safety gate", () => {
  it.each(protectedOperations)(
    "fails closed for %s without an exact confirmed target",
    async (operation) => {
      const callback = vi.fn(async () => "called");
      await expect(
        requireDestructiveConfirmation(
          { operation, confirm: false, node: "pve", vmid: 100 },
          callback,
        ),
      ).rejects.toBeInstanceOf(DestructiveOperationError);
      await expect(
        requireDestructiveConfirmation(
          { operation, confirm: true, node: "*", vmid: 100 },
          callback,
        ),
      ).rejects.toBeInstanceOf(DestructiveOperationError);
      expect(callback).not.toHaveBeenCalled();
    },
  );

  it("allows one confirmed exact operation", async () => {
    const callback = vi.fn(async () => "called");
    await expect(
      requireDestructiveConfirmation(
        { operation: "qemu-delete", confirm: true, node: "pve", vmid: 100 },
        callback,
      ),
    ).resolves.toBe("called");
    expect(callback).toHaveBeenCalledOnce();
  });
});
