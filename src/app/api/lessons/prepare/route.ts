import { GuardianSource } from "@/lib/articles/guardian";
import { generateQuestions } from "@/lib/lesson/generate-questions";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const id = body?.articleId;
  if (typeof id !== "string" || id === "") {
    return Response.json({ error: "articleId is required" }, { status: 400 });
  }

  try {
    const article = await new GuardianSource().getArticle(id);
    const questions = await generateQuestions(article);
    return Response.json({ questions });
  } catch (e) {
    console.error("prepare failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Failed to prepare lesson" }, { status: 502 });
  }
}

// media/2026/nov/24/bbc-preschool-shows-cbeebies-hub-netflix
