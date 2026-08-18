import { z } from "zod";

/** A single DNS hostname label, as supported by Proxmox node names. */
export const nodeSchema = z
  .string()
  .regex(
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/,
    "node must be a Proxmox hostname label",
  );

export function apiPath(...segments: readonly (string | number)[]): string {
  return segments
    .map((segment) => encodeURIComponent(String(segment)))
    .join("/");
}
