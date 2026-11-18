import { MODELS } from "@/lib/ai/models";

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set");
    return Response.json({ error: "API Key is not set" }, { status: 500 });
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
        instructions:
          "You are a friendly English conversation tutor. Keep replies to 2-3 sentences",
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
