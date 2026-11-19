const SeatKey = 'lg-seat';
const LanguageKey = 'lg-lang';
const StaleThemeKey = 'lg-theme';

export interface Seat {
  code: string;
  playerId: string | null;
  token: string | null;
}

function parseSeat(raw: string | null): Seat | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (value === null || typeof value !== 'object') return null;
    const { code, playerId, token } = value as Record<string, unknown>;
    if (typeof code !== 'string' || !/^[A-Z]{5}$/.test(code)) return null;
    return {
      code,
      playerId: typeof playerId === 'string' ? playerId : null,
      token: typeof token === 'string' ? token : null,
    };
  } catch {
    return null;
  }
}

/**
 * The seat kept in this tab, or null when there is none.
 */
export function readSeat(): Seat | null {
  try {
    return parseSeat(sessionStorage.getItem(SeatKey));
  } catch {
    return null;
  }
}

export function writeSeat(seat: Seat): void {
  try {
    sessionStorage.setItem(SeatKey, JSON.stringify(seat));
  } catch {
    return;
  }
}

export function clearSeat(): void {
  try {
    sessionStorage.removeItem(SeatKey);
  } catch {
    return;
  }
}

export function readStored(key: 'language'): string | null {
  try {
    return localStorage.getItem(LanguageKey);
  } catch {
    return null;
  }
}

export function writeStored(key: 'language', value: string): void {
  try {
    localStorage.setItem(LanguageKey, value);
  } catch {
    return;
  }
}

/**
 * Removes the theme entry that earlier versions of the page left in local storage.
 */
export function clearStaleTheme(): void {
  try {
    localStorage.removeItem(StaleThemeKey);
  } catch {
    return;
  }
}
