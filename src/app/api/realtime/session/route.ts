import { MODELS } from "@/lib/ai/models";
import { GuardianSource } from "@/lib/articles/guardian";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { buildTutorInstructions } from "@/lib/lesson/instructions";
import { QUESTION_COUNT } from "@/lib/lesson/questions";
import { cookies } from "next/headers";

const DEFAULT_INSTRUCTIONS =
  "You are a friendly English conversation tutor. Keep replies to 2-3 sentences";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value; // undefined if not logged in, so use "?."
  if (!(await verifySessionToken(token))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set");
    return Response.json({ error: "API Key is not set" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  let instructions = DEFAULT_INSTRUCTIONS;
  if (body?.articleId !== undefined) {
    const { articleId, questions } = body;
    const validQuestions =
      Array.isArray(questions) &&
      questions.length === QUESTION_COUNT &&
      questions.every((q) => typeof q === "string");
    if (typeof articleId !== "string" || !validQuestions) {
      return Response.json({ error: "Invalid lesson" }, { status: 400 });
    }
    try {
      const article = await new GuardianSource().getArticle(articleId);
      instructions = buildTutorInstructions(article, questions);
    } catch (e) {
      console.error("article fetch failed:", e instanceof Error ? e.message : "unknown");
      return Response.json({ error: "Failed to load article" }, { status: 502 });
    }
  }

  const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: MODELS.realtime,
        instructions,
        audio: {
          input: {
            transcription: { model: MODELS.inputTranscription, language: "en" },
            turn_detection: { type: "semantic_vad", eagerness: "low" },
            noise_reduction: { type: "near_field" },
          },
          output: {
            voice: "marin",
          },
        },
      },
    }),
  });

  if (!res.ok) {
    console.error("client_secrets request failed", res.status, await res.text());
    return Response.json({ error: "Failed to create realtime session" }, { status: 502 });
  }

  const data = await res.json();
  return Response.json({ value: data.value, expires_at: data.expires_at });
}
