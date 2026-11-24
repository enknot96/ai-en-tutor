import { z } from "zod";

export const QUESTION_COUNT = 5;

// Shape the model must return
export const questionSchema = z.object({
  questions: z.array(z.string()).length(QUESTION_COUNT),
});

// Words that start a question answerable with yes or no
const YES_NO_STARTERS = [
  "do",
  "does",
  "did",
  "is",
  "are",
  "was",
  "were",
  "can",
  "could",
  "will",
  "would",
  "should",
  "shall",
  "may",
  "might",
  "must",
  "have",
  "has",
  "had",
];

// True when the question does not start with a yes/no auxiliary verb
export function isOpenQuestion(question: string): boolean {
  const firstWord = (question.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return !YES_NO_STARTERS.includes(firstWord);
}
