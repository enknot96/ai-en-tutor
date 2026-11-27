import { type TutorState } from "@/lib/lesson/tutor-state";

export default function TutorOrb({ state }: { state: TutorState }) {
  return (
    <div className={state === "speaking" ? "orb-speaking-outer" : ""}>
      <div
        className={`orb-${state} h-56 w-56 rounded-full bg-linear-to-br from-blue-500 via-white to-indigo-300`}
      />
    </div>
  );
}
