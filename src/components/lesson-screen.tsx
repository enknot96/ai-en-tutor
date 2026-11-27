import { ReactNode } from "react";

export default function LessonScreen({
  onEnd,
  diagnostics,
}: {
  onEnd: () => void;
  diagnostics: ReactNode;
}) {
  return (
    <>
      <p>Connecting...</p>
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
