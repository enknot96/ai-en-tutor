import { getRetryAfterSec, recordFailure, resetFailures } from "@/lib/auth/login-limit";
import { checkPassword } from "@/lib/auth/password";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const retryAfter = getRetryAfterSec();
  if (retryAfter > 0) {
    return Response.json(
      {
        error: "Too many attempts",
      },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string" || password.length === 0 || password.length > 256) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!checkPassword(password)) {
    recordFailure();
    return Response.json({ error: "Invalid password" }, { status: 401 });
  }
  resetFailures();

  const token = await createSessionToken();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());
  return Response.json({ ok: true });
}
