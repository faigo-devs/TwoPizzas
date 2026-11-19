import { useEffect, useState } from 'preact/hooks';
import type { LeaderboardResponse, PlayerView } from '../../core/index.ts';
import type { Lang } from '../i18n/index.ts';
import type { TourSays } from './tour/script.ts';
import type { ConnectionStatus, FailureCode, TransportKind } from './types.ts';

export type StartFailure = FailureCode | 'codeShape';

export interface AppState {
  lang: Lang;
  mode: TransportKind | null;
  status: ConnectionStatus;
  view: PlayerView | null;
  clock: { server: number; at: number } | null;
  toast: { code: FailureCode; id: number } | null;
  startError: StartFailure | null;
  busy: 'create' | 'join' | null;
  connectionNote: 'lost' | 'back' | null;
  scriptStep: number;
  tourStep: number;
  tourSays: TourSays | null;
  tourBaseline: string | null;
  startFocus: boolean;
  leaderboard: LeaderboardResponse | null;
  leaderboardStatus: 'idle' | 'loading' | 'ready' | 'error';
  copied: boolean;
  learn: Record<string, number>;
  said: number | null;
}

const initial: AppState = {
  lang: 'ro',
  mode: null,
  status: 'idle',
  view: null,
  clock: null,
  toast: null,
  startError: null,
  busy: null,
  connectionNote: null,
  scriptStep: 0,
  tourStep: 0,
  tourSays: null,
  tourBaseline: null,
  startFocus: false,
  leaderboard: null,
  leaderboardStatus: 'idle',
  copied: false,
  learn: {},
  said: null,
};

let state: AppState = initial;
const listeners = new Set<() => void>();

export const store = {
  get(): AppState {
    return state;
  },
  set(patch: Partial<AppState>): void {
    state = { ...state, ...patch };
    for (const listener of [...listeners]) listener();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/**
 * Subscribes a component to the whole application state.
 */
export function useAppState(): AppState {
  const [snapshot, setSnapshot] = useState(store.get());
  useEffect(() => {
    setSnapshot(store.get());
    return store.subscribe(() => setSnapshot(store.get()));
  }, []);
  return snapshot;
}

/**
 * The server's time now: the last view's time plus what has elapsed here since, never the device clock alone.
 */
export function serverNow(clock: AppState['clock']): number {
  if (clock === null) return Date.now();
  return clock.server + (performance.now() - clock.at);
}

/**
 * Re-renders the caller on an interval and returns the server's time estimate.
 */
export function useServerNow(intervalMs: number): number {
  const [now, setNow] = useState(() => serverNow(store.get().clock));
  useEffect(() => {
    setNow(serverNow(store.get().clock));
    const id = setInterval(() => setNow(serverNow(store.get().clock)), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
