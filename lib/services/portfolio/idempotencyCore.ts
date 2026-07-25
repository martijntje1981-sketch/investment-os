import { createHash } from "node:crypto";

export function hashPayload(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 32);
}

export function approxEqual(
  left: number,
  right: number,
  epsilon = 0.0000001,
): boolean {
  return Math.abs(left - right) <= epsilon;
}
