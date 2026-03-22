export const logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (...args: any[]) => console.log(`[INFO] ${new Date().toISOString()}`, ...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (...args: any[]) => console.warn(`[WARN] ${new Date().toISOString()}`, ...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (...args: any[]) => console.error(`[ERROR] ${new Date().toISOString()}`, ...args),
};
