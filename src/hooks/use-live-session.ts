import { startSpeakingDetector } from "@/lib/lesson/speaking-detector";
import { TutorState } from "@/lib/lesson/tutor-state";
import { useRef, useState } from "react";

// Wait until all ICE candidates are inside the offer (the server gets it only once)
function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 10000): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") {
      resolve();
      return;
    }
    const done = () => {
      pc.removeEventListener("icegatheringstatechange", onChange);
      clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (pc.iceGatheringState === "complete") done();
    };
    const timer = setTimeout(done, timeoutMs);
    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

export function useLiveSession() {
  // Speaker: plays the tutor's voice (<audio> tag in page.tsx)
  const audioRef = useRef<HTMLAudioElement>(null);
  // Phone line: the connection to OpenAI (voice goes both ways)
  const pcRef = useRef<RTCPeerConnection | null>(null);
  // Text side channel on the same line: JSON events only, no audio
  const dcRef = useRef<RTCDataChannel | null>(null);
  // Microphone: the learner's voice, sent through the line
  const streamRef = useRef<MediaStream | null>(null);
  // Audio context for measuring the tutor's voice level
  const ctxRef = useRef<AudioContext | null>(null);
  // Stops the voice level measurement
  const stopDetectorRef = useRef<(() => void) | null>(null);

  const [status, setStatus] = useState("idle");
  const [lastEvent, setLastEvent] = useState("-");
  const [events, setEvents] = useState<string[]>([]);
  const [errorText, setErrorText] = useState("");
  const [track, setTrack] = useState("none");
  const [tutorState, setTutorState] = useState<TutorState>("connecting");

  async function start(lesson: { articleId: string; questions: string[] }) {
    // Must be created right after the tap: iPhone blocks audio otherwise
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    ctx.resume();

    setErrorText("");
    setLastEvent("");
    setEvents([]);
    setTrack("none");
    setTutorState("connecting");

    try {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      pc.onconnectionstatechange = () => {
        console.log("state:", pc.connectionState);
        setStatus(pc.connectionState);
      };
      pc.ontrack = (e) => {
        console.log("remote track received");
        setTrack("received");
        if (audioRef.current) {
          audioRef.current.srcObject = e.streams[0];
          audioRef.current.play().catch((err) => setErrorText(`play failed: ${err.name}`));
        }
        stopDetectorRef.current = startSpeakingDetector(ctx, e.streams[0], (speaking) =>
          setTutorState(speaking ? "speaking" : "listening"),
        );
      };

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;
      dc.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type.endsWith(".delta")) return;
        setLastEvent(msg.type);
        setEvents((prev) => [...prev, msg.type].slice(-8));
        console.log(msg.type);
        if (msg.type === "session.started") setTutorState("listening");
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await waitForIceGathering(pc);
      const res = await fetch("/api/live/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...lesson, sdp: pc.localDescription?.sdp }),
      });
      if (!res.ok) {
        console.error("live session failed", res.status);
        setErrorText(`session failed: ${res.status}`);
        return false;
      }
      const data = await res.json();
      await pc.setRemoteDescription({ type: "answer", sdp: data.sdp });

      return true;
    } catch (err) {
      console.error(err);
      setErrorText(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
      return false;
    }
  }

  function stop() {
    // Tell OpenAI we are done, then release the microphone and the connection
    if (dcRef.current?.readyState === "open") {
      dcRef.current.send(JSON.stringify({ type: "session.close" }));
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    stopDetectorRef.current?.();
    stopDetectorRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    dcRef.current = null;
    pcRef.current = null;
    streamRef.current = null;
    setStatus("stopped");
    console.log("stopped");
  }

  return { audioRef, status, lastEvent, events, errorText, track, tutorState, start, stop };
}
