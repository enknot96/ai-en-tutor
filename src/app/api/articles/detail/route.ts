import { GuardianSource } from "@/lib/articles/guardian";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id is required" }, { status: 400 });
  }

  try {
    const article = await new GuardianSource().getArticle(id);
    return Response.json({ article });
  } catch (e) {
    console.error("article failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Failed to load article" }, { status: 502 });
  }
}
