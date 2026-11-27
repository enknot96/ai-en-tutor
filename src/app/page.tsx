"use client";

import Diagnostics from "@/components/diagnostics";
import LessonScreen from "@/components/lesson-screen";
import PrepareScreen from "@/components/prepare-screen";
import ThemeToggle from "@/components/theme-toggle";
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
  const [view, setView] = useState<"prepare" | "lesson">("prepare");

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

  const canStart = selected !== null && questions.length > 0 && !preparing;
  async function startLesson() {
    if (!selected || questions.length === 0) return;
    setView("lesson");
    const ok = await start({ articleId: selected.id, questions });
    if (!ok) {
      stop();
      setView("prepare");
    }
  }

  function endLesson() {
    stop();
    setView("prepare");
  }

  const diagnostics = (
    <Diagnostics
      status={status}
      lastEvent={lastEvent}
      track={track}
      events={events}
      errorText={errorText}
    />
  );

  return (
    <main>
      <ThemeToggle />
      {view === "prepare" ? (
        <PrepareScreen
          selected={selected}
          questions={questions}
          preparing={preparing}
          prepareError={prepareError}
          canStart={canStart}
          onSelect={selectArticle}
          onStart={startLesson}
          onLogout={logout}
          diagnostics={diagnostics}
        />
      ) : (
        <LessonScreen
          onEnd={endLesson}
          diagnostics={diagnostics}
        />
      )}
      <audio
        ref={audioRef}
        autoPlay
      ></audio>
    </main>
  );
}
