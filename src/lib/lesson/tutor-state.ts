export type TutorState = "connecting" | "listening" | "thinking" | "speaking";

// Map one Realtime event type to a tutor state, null means "no change"
export function tutorStateFromEvent(type: string): TutorState | null {
  switch (type) {
    case "session.created":
    case "input_audio_buffer.speech_started":
    case "output_audio_buffer.stopped":
    case "output_audio_buffer.cleared":
      return "listening";
    case "output_audio_buffer.started":
      return "speaking";
    default:
      return null;
  }
}
