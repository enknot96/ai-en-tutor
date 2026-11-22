"use client";

import { useState, type SubmitEvent } from "react";

export default function LoginPage() {
  const [error, setError] = useState("");

  async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const password = new FormData(e.currentTarget).get("password");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      // Full reload so the new cookie is sent and proxy runs again（simpler than router.push）
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
      return;
    }

    if (res.status === 429) {
      setError("Too many attempts. Try again later");
    } else if (res.status === 401) {
      setError("Invalid password");
    } else {
      setError("Login failed");
    }
  }

  return (
    <main className="px-4 py-4">
      <form onSubmit={onSubmit}>
        <input
          type="password"
          name="password"
          className="border"
          autoComplete="current-password"
        />
        <button type="submit">Login</button>
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </main>
  );
}
