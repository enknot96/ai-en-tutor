"use client";

import { type Article, type ArticleSummary } from "@/lib/articles/types";
import { useState } from "react";

export default function ArticlePicker() {
  const [candidates, setCandidates] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [article, setArticle] = useState<Article | null>(null);
  const [opening, setOpening] = useState(false);
  const [cache, setCache] = useState<Record<string, Article>>({});

  async function loadCandidates() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/articles/candidates");
      if (!res.ok) {
        setError(`Failed to load candidates: ${res.status}`);
        return;
      }
      const data = await res.json();
      setCandidates(data.candidates);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function openArticle(id: string) {
    const cached = cache[id];
    if (cached) {
      setArticle(cached);
      return;
    }

    setOpening(true);
    setError("");
    try {
      const res = await fetch(`/api/articles/detail?id=${encodeURIComponent(id)}`);
      if (!res.ok) {
        setError(`Failed to load articles: ${res.status}`);
        return;
      }
      const data = await res.json();
      setArticle(data.article);
      setCache((prev) => ({ ...prev, [id]: data.article }));
    } catch {
      setError("Network error");
    } finally {
      setOpening(false);
    }
  }

  if (article) {
    return (
      <section>
        <button
          onClick={() => setArticle(null)}
          className="cursor-pointer"
        >
          Back
        </button>
        <h2>{article.title}</h2>
        <p className="text-xs">{article.byline}</p>
        {article.bodyText.split("\n\n").map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </section>
    );
  }

  return (
    <section>
      <button
        onClick={loadCandidates}
        disabled={loading}
        className="cursor-pointer"
      >
        {loading ? "Loading..." : "Get candidates"}
      </button>
      {error && <p className="text-red-600">{error}</p>}
      <ul>
        {candidates.map((c) => (
          <li key={c.id}>
            <button
              onClick={() => openArticle(c.id)}
              disabled={opening}
              className="cursor-pointer"
            >
              {c.title}
            </button>
            <p className="text-xs">
              {c.section}・{c.wordCount} words
            </p>
            <p className="text-sm">{c.trailText}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
