/**
 * The only error codes the protocol sends.
 */
export const ErrorCodes = [
  'room_not_found',
  'room_full',
  'already_started',
  'not_allowed',
  'bad_request',
  'rate_limited',
  'removed',
  'room_locked',
] as const;

export type ErrorCode = (typeof ErrorCodes)[number];

/**
 * Whether a value is one of the protocol's error codes.
 */
export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (ErrorCodes as readonly string[]).includes(value);
}

/**
 * The WebSocket close codes the room and the browser agree on.
 */
export const CloseCodes = {
  goingAway: 1001,
  policy: 1008,
  replaced: 4000,
  removed: 4001,
  silent: 4002,
  noHello: 4003,
} as const;
