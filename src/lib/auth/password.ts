import { createHash, timingSafeEqual } from "crypto";

function sha256(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function checkPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(sha256(input), sha256(expected));
}
