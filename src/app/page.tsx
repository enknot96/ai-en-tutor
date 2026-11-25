"use client";

import ArticlePicker from "@/components/article-picker";
import { type Article } from "@/lib/articles/types";
import { useRef, useState } from "react";

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Shared with stop()
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState("idle");
  const [lastEvent, setLastEvent] = useState("-");
  const [events, setEvents] = useState<string[]>([]);
  const [errorText, setErrorText] = useState("");
  const [track, setTrack] = useState("none");
  const [selected, setSelected] = useState<Article | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState("");

  async function start() {
    setErrorText("");
    setLastEvent("-");
    setEvents([]);
    setTrack("none");

    try {
      const lesson = selected && questions.length > 0 ? { articleId: selected.id, questions } : {};
      const res = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lesson),
      });
      if (!res.ok) {
        setErrorText(`session failed: ${res.status}`);
        return;
      }
      const data = await res.json();
      const value = data.value;
      console.log(value.slice(0, 3));

      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      pc.onconnectionstatechange = () => {
        console.log("state:", pc.connectionState);
        setStatus(pc.connectionState);
      };
      console.log(pc.connectionState);
      pc.ontrack = (e) => {
        console.log("remote track received");
        setTrack("received");
        if (audioRef.current) {
          audioRef.current.srcObject = e.streams[0];
          audioRef.current.play().catch((err) => setErrorText(`play failed: ${err.name}`));
        }
      };
      console.log(audioRef.current?.tagName);

      const dc = pc.createDataChannel("oai-events");
      dc.onopen = () => {
        console.log("data channel open");
        dc.send(
          JSON.stringify({
            type: "response.create",
            response: {
              instructions:
                "Start the lesson now with the warm-up: one short greeting and one light small-talk question.",
            },
          }),
        );
      };
      dc.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        setLastEvent(msg.type);
        setEvents((prev) => [...prev, msg.type].slice(-8));
        console.log(msg.type);
        if (msg.type === "conversation.item.input_audio_transcription.completed") {
          console.log("you:", msg.transcript);
        }
        if (msg.type === "response.output_audio_transcript.done") {
          console.log("ai:", msg.transcript);
        }
        if (msg.type === "response.done") {
          console.log("usage:", msg.response?.usage);
        }
      };
      console.log(dc.readyState);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      console.log(stream.getAudioTracks().length);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log(pc.signalingState);

      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${value}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!sdpRes.ok) {
        console.error("realtime call failed", sdpRes.status, await sdpRes.text());
        setErrorText(`realtime call failed: ${sdpRes.status}`);
        return;
      }
      const answer = { type: "answer" as const, sdp: await sdpRes.text() };
      await pc.setRemoteDescription(answer);
      console.log(pc.signalingState);
    } catch (err) {
      console.error(err);
      setErrorText(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    }
  }

  function stop() {
    // Stop mic
    streamRef.current?.getTracks().forEach((t) => t.stop());
    // Close connection
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current = null;
    setStatus("stopped");
    setErrorText("");
    console.log("stopped");
  }

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
        onClick={start}
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
