"use client";

import ArticlePicker from "@/components/article-picker";
import { useRealtimeSession } from "@/hooks/use-realtime-session";
import { type Article } from "@/lib/articles/types";
import { useState } from "react";

export default function Home() {
  const { audioRef, status, lastEvent, events, errorText, track, start, stop } =
    useRealtimeSession();

  const [selected, setSelected] = useState<Article | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState("");

  async function logout() {
    stop();
    await fetch("/api/auth/logout", { method: "POST" });
    // Full reload clears client state on logout (Next.js "Preserving UI state" guide)
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/login";
  }

  async function selectArticle(article: Article) {
    setSelected(article);
    setQuestions([]);
    setPrepareError("");
    setPreparing(true);

    try {
      const res = await fetch("/api/lessons/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: article.id }),
      });
      if (!res.ok) {
        setPrepareError(`prepare failed: ${res.status}`);
        return;
      }
      const data = await res.json();
      setQuestions(data.questions);
    } catch {
      setPrepareError("Network error");
    } finally {
      setPreparing(false);
    }
  }

  return (
    <main>
      <ArticlePicker
        onSelect={selectArticle}
        disabled={preparing}
      />
      {selected && <p>Selected: {selected.title}</p>}
      {preparing && <p>Preparing questions...</p>}
      {prepareError && <p className="text-red-600">{prepareError}</p>}
      <ol>
        {questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
      <audio
        ref={audioRef}
        autoPlay
      ></audio>
      <button
        onClick={() =>
          start(selected && questions.length > 0 ? { articleId: selected.id, questions } : null)
        }
        className="cursor-pointer"
      >
        Start
      </button>
      <button
        onClick={stop}
        className="cursor-pointer"
      >
        Stop
      </button>
      <button
        onClick={logout}
        className="cursor-pointer"
      >
        Logout
      </button>
      <p>status: {status}</p>
      <p>last event: {lastEvent}</p>
      <p>remote track: {track}</p>
      <p className="text-xs break-all">events: {events.join(" > ")}</p>
      {errorText && <p className="text-red-600">error: {errorText}</p>}
    </main>
  );
}
