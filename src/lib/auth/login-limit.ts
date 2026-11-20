const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes / 900 seconds

let failureTimes: number[] = [];

function prune(now: number) {
  failureTimes = failureTimes.filter((t) => now - t < WINDOW_MS);
}

export function getRetryAfterSec(now = Date.now()): number {
  prune(now);
  if (failureTimes.length < MAX_FAILURES) return 0;
  return Math.ceil((failureTimes[0] + WINDOW_MS - now) / 1000);
}

export function recordFailure(now = Date.now()) {
  prune(now);
  failureTimes.push(now);
}

export function resetFailures() {
  failureTimes = [];
}
