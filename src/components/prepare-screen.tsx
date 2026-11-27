import ArticlePicker from "@/components/article-picker";
import { type Article } from "@/lib/articles/types";
import { type ReactNode } from "react";

export default function PrepareScreen({
  selected,
  questions,
  preparing,
  prepareError,
  canStart,
  onSelect,
  onStart,
  onLogout,
  diagnostics,
}: {
  selected: Article | null;
  questions: string[];
  preparing: boolean;
  prepareError: string;
  canStart: boolean;
  onSelect: (article: Article) => void;
  onStart: () => void;
  onLogout: () => void;
  diagnostics: ReactNode;
}) {
  return (
    <>
      <ArticlePicker
        onSelect={onSelect}
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
      <button
        onClick={onStart}
        disabled={!canStart}
        className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      >
        Start
      </button>
      {!selected && <p className="text-xs">Select an article to start</p>}
      <button
        onClick={onLogout}
        className="cursor-pointer"
      >
        Logout
      </button>
      {diagnostics}
    </>
  );
}
