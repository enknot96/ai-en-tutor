// Return a shuffled copy: draw one random item at a time from the remaining ones
export function shuffle(items: string[]): string[] {
  const rest = [...items];
  const result: string[] = [];
  while (rest.length > 0) {
    const i = Math.floor(Math.random() * rest.length);
    result.push(rest.splice(i, 1)[0]);
  }
  return result;
}
