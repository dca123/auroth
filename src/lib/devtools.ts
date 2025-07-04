/**
 * Pauses execution for a specified amount of time
 * Does nothing in production environments
 */
export const sleep = (time: number) => {
  if (import.meta.env.PROD) return;
  return new Promise((res) => setTimeout(res, time));
};
