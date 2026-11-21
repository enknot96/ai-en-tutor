import { SESSION_COOKIE } from "@/lib/auth/session";
import { cookies } from "next/headers";

export async function POST() {
  // Read request cookies / attach Set-Cookie to the response
  const cookieSotre = await cookies();
  cookieSotre.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
