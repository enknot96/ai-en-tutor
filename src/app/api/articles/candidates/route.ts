import { GuardianSource } from "@/lib/articles/guardian";

export async function GET() {
  try {
    const candidates = await new GuardianSource().listCandidates();
    return Response.json({ candidates });
  } catch (e) {
    console.error("candidates failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Failed to load articles" }, { status: 502 });
  }
}
