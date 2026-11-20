export type IdFactory = () => string;
export type Clock = () => Date;

let counter = 0;

/** Default id factory: uses crypto.randomUUID when available. */
export const defaultIdFactory: IdFactory = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const systemClock: Clock = () => new Date();

/** Deterministic id factory for tests. */
export function sequentialIds(prefix = 'id'): IdFactory {
  let n = 0;
  return () => `${prefix}-${++n}`;
}
