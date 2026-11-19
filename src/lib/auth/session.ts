import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 days

function getKey(): Uint8Array | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(): Promise<string> {
  // ex) key = Uint8Array(8) [227, 131, 154, 227, 131, 173, 227, 131]
  const key = getKey();
  if (!key) throw new Error("AUTH_SECRET is missing or too short");
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("owner")
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key);
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const key = getKey();
  if (!token || !key) return false;
  try {
    await jwtVerify(token, key, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}
