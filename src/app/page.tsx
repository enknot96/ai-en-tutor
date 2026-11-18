"use client";

import { useRef } from "react";

export default function Home() {
  const audioRef = useRef<HTMLAudioElement>(null);

  async function start() {
    const res = await fetch("/api/realtime/session", { method: "POST" });
    const data = await res.json();
    const value = data.value;
    console.log(value.slice(0, 3));

    const pc = new RTCPeerConnection();
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
    dc.onmessage = (e) => console.log(JSON.parse(e.data));
    console.log(dc.readyState);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

  return (
    <main>
      <audio
        ref={audioRef}
        autoPlay
      ></audio>
      <button onClick={start}>Start</button>
    </main>
  );
}
