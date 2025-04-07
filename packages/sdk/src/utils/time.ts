export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function now() {
  return Date.now();
}

export function toUnix(ms: number) {
  return Math.round(ms / 1000);
}
