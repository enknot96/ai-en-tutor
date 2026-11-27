import { MODELS } from "@/lib/ai/models";
import { GuardianSource } from "@/lib/articles/guardian";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { buildTutorInstructions } from "@/lib/lesson/instructions";
import { QUESTION_COUNT } from "@/lib/lesson/questions";
import { cookies } from "next/headers";

const MAX_SDP_LENGTH = 50_000;

// GPT-Live has no response.create, so the tutor is told to speak first here
const GREETING_PROMPT =
  "Start the lesson now with the warm-up: one short greeting and one light small-talk question.";

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
  const { articleId, questions, sdp } = body ?? {};
  const validQuestions =
    Array.isArray(questions) &&
    questions.length === QUESTION_COUNT &&
    questions.every((q) => typeof q === "string");
  const validSdp = typeof sdp === "string" && sdp.length > 0 && sdp.length <= MAX_SDP_LENGTH;
  if (typeof articleId !== "string" || !validQuestions || !validSdp) {
    return Response.json({ error: "Invalid lesson" }, { status: 400 });
  }

  let instructions: string;
  try {
    const article = await new GuardianSource().getArticle(articleId);
    instructions = buildTutorInstructions(article, questions);
  } catch (e) {
    console.error("article fetch failed:", e instanceof Error ? e.message : "unknown");
    return Response.json({ error: "Failed to load article" }, { status: 502 });
  }

  // The browser's SDP offer goes through this server because the project API key must stay here
  const res = await fetch("https://api.openai.com/v1/live/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        model: MODELS.live,
        instructions,
        audio: { output: { voice: "marin" } },
        input: [
          {
            type: "message",
            role: "developer",
            content: [{ type: "input_text", text: GREETING_PROMPT }],
          },
        ],
      },
      transport: { type: "webrtc", sdp },
    }),
  });

  if (!res.ok) {
    console.error("live session request failed", res.status, await res.text());
    return Response.json({ error: "Failed to create live session" }, { status: 502 });
  }

  const data = await res.json();
  const answer = data?.transport?.sdp;
  if (typeof answer !== "string") {
    console.error("live session response has no sdp answer");
    return Response.json({ error: "Failed to create live session" }, { status: 502 });
  }
  return Response.json({ sdp: answer });
}
