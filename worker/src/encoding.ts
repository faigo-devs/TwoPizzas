import type { Random } from './ports.ts';

/**
 * Encodes bytes as URL-safe base64 without padding.
 */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/**
 * Encodes bytes as lower-case hexadecimal.
 */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Reads four random bytes as an unsigned 32-bit number.
 */
export function randomUint32(random: Random): number {
  const bytes = random(4);
  return ((bytes[0] ?? 0) * 2 ** 24 + (bytes[1] ?? 0) * 2 ** 16 + (bytes[2] ?? 0) * 2 ** 8 + (bytes[3] ?? 0)) >>> 0;
}

/**
 * Compares two strings in time that depends only on their length.
 */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
}
