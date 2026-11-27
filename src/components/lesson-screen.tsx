import { type TutorState } from "@/lib/lesson/tutor-state";
import { ReactNode } from "react";

export default function LessonScreen({
  tutorState,
  onEnd,
  diagnostics,
}: {
  tutorState: TutorState;
  onEnd: () => void;
  diagnostics: ReactNode;
}) {
  return (
    <>
      <p>{tutorState}</p>
      <button
        onClick={onEnd}
        className="cursor-pointer"
      >
        End
      </button>
      {diagnostics}
    </>
  );
}
