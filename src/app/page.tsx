"use client";

import { useRef } from "react";

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);
  // Shared with stop()
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    const res = await fetch("/api/realtime/session", { method: "POST" });
    const data = await res.json();
    const value = data.value;
    console.log(value.slice(0, 3));

    const pc = new RTCPeerConnection();
    pcRef.current = pc;
    pc.onconnectionstatechange = () => console.log("state:", pc.connectionState);
    console.log(pc.connectionState);
    pc.ontrack = (e) => {
      console.log("remote track received");
      if (audioRef.current) {
        audioRef.current.srcObject = e.streams[0];
      }
    };
    console.log(audioRef.current?.tagName);

    const dc = pc.createDataChannel("oai-events");
    dc.onopen = () => console.log("data channel open");
    dc.onmessage = (e) => {
      const msg = JSON.parse(e.data);
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
      return;
    }
    const answer = { type: "answer" as const, sdp: await sdpRes.text() };
    await pc.setRemoteDescription(answer);
    console.log(pc.signalingState);
  }

  function stop() {
    // Stop mic
    streamRef.current?.getTracks().forEach((t) => t.stop());
    // Close connection
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current = null;
    console.log("stopped");
  }

  return (
    <main>
      <audio
        ref={audioRef}
        autoPlay
      ></audio>
      <button onClick={start}>Start</button>
      <button onClick={stop}>Stop</button>
    </main>
  );
}
