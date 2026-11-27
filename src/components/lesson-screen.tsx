import { type TutorState } from "@/lib/lesson/tutor-state";
import { ReactNode } from "react";
import TutorOrb from "./tutor-orb";

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
      <div className="flex justify-center py-8">
        <TutorOrb state={tutorState} />
      </div>
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
