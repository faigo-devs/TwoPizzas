import { isErrorCode, isRoomCode } from '../../core/index.ts';
import type { ClientAction, Framework, LeaderboardResponse, PlayerView } from '../../core/index.ts';
import { createT, isLanguage, pickLanguage, type Lang, type Translate } from '../i18n/index.ts';
import { createLocalTransport } from './local/transport.ts';
import { stepsFor } from './tour/steps.ts';
import { createTourTransport } from './tour/transport.ts';
import { clearSeat, clearStaleTheme, readSeat, readStored, writeStored, type Seat } from './session.ts';
import { store } from './store.ts';
import { createRemoteTransport } from './transport/remote.ts';
import type { ConnectionStatus, FailureCode, Transport, TransportHandlers } from './types.ts';

let transport: Transport | null = null;
let toastId = 0;
let backTimer: ReturnType<typeof setTimeout> | null = null;
const translators = new Map<Lang, Translate>();

export function translator(lang: Lang): Translate {
  let found = translators.get(lang);
  if (found === undefined) {
    found = createT(lang);
    translators.set(lang, found);
  }
  return found;
}

function applyLanguage(lang: Lang): void {
  document.documentElement.lang = lang;
  const skip = document.querySelector('.lg-skip');
  if (skip !== null) skip.textContent = translator(lang)('a11y.skip');
}

export function setLanguage(lang: Lang): void {
  writeStored('language', lang);
  applyLanguage(lang);
  store.set({ lang });
}

function handlers(): TransportHandlers {
  return {
    onStatus: (status: ConnectionStatus) => {
      const previous = store.get().status;
      const patch: Partial<ReturnType<typeof store.get>> = { status };
      if (status === 'open') patch.busy = null;
      if (status === 'reconnecting') patch.connectionNote = 'lost';
      if (status === 'open' && previous === 'reconnecting') {
        patch.connectionNote = 'back';
        if (backTimer !== null) clearTimeout(backTimer);
        backTimer = setTimeout(() => store.set({ connectionNote: null }), 4000);
      }
      store.set(patch);
    },
    onView: (view: PlayerView) => {
      store.set({ view, clock: { server: view.now, at: performance.now() }, busy: null });
    },
    onError: (code: FailureCode, fatal: boolean) => {
      if (fatal) {
        teardown();
        store.set({ startError: code, busy: null });
        return;
      }
      toastId += 1;
      store.set({ toast: { code, id: toastId } });
    },
  };
}

function teardown(): void {
  if (transport !== null) transport.close();
  transport = null;
  store.set({ mode: null, status: 'idle', view: null, clock: null, toast: null, connectionNote: null, scriptStep: 0, copied: false, tourStep: 0, tourSays: null, tourBaseline: null, learn: {}, said: null });
}

function connect(seat: Seat): void {
  if (transport !== null) transport.close();
  store.set({ mode: 'remote', status: 'connecting', view: null, clock: null, startError: null, toast: null, scriptStep: 0 });
  transport = createRemoteTransport(seat, handlers());
  transport.start();
}

/**
 * The error code a failed response body carries, or bad_request when it carries none.
 */
export function failureOf(raw: unknown): FailureCode {
  if (raw !== null && typeof raw === 'object') {
    const { code, error } = raw as Record<string, unknown>;
    for (const candidate of [code, error]) {
      if (isErrorCode(candidate)) return candidate;
    }
  }
  return 'bad_request';
}

export async function createRoom(framework: Framework): Promise<void> {
  store.set({ busy: 'create', startError: null });
  try {
    const response = await fetch('/api/room', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ framework }),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      store.set({ busy: null, startError: failureOf(body) });
      return;
    }
    const code = body !== null && typeof body === 'object' ? (body as Record<string, unknown>).code : undefined;
    if (!isRoomCode(code)) {
      store.set({ busy: null, startError: 'bad_request' });
      return;
    }
    connect({ code, playerId: null, token: null });
  } catch {
    store.set({ busy: null, startError: 'network' });
  }
}

/**
 * A typed room code in its canonical form, or null when it has not the shape of a code.
 */
export function normalCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return isRoomCode(code) ? code : null;
}

export function joinRoom(raw: string): void {
  const code = normalCode(raw);
  if (code === null) {
    store.set({ startError: 'codeShape' });
    return;
  }
  const kept = readSeat();
  store.set({ busy: 'join', startError: null });
  connect(kept !== null && kept.code === code ? kept : { code, playerId: null, token: null });
}

export function takeSeatHere(): void {
  const seat = readSeat();
  if (seat === null) {
    leave();
    return;
  }
  connect(seat);
}

export function startLocal(framework: Framework = 'scrum'): void {
  if (transport !== null) transport.close();
  store.set({ mode: 'local', status: 'connecting', view: null, clock: null, startError: null, toast: null, scriptStep: 0, busy: null });
  transport = createLocalTransport(framework, handlers(), () => {
    const t = translator(store.get().lang);
    return (key) => t(key);
  });
  transport.start();
}

let tourFramework: Framework = 'scrum';

export function startTour(framework: Framework = 'scrum'): void {
  if (transport !== null) transport.close();
  tourFramework = framework;
  store.set({ mode: 'tour', status: 'connecting', view: null, clock: null, startError: null, toast: null, scriptStep: 0, busy: null, tourStep: 0, tourSays: null });
  transport = createTourTransport(framework, handlers(), () => {
    const t = translator(store.get().lang);
    return (key) => t(key);
  });
  transport.start();
  tourShow();
}

function tourShow(): void {
  const step = stepsFor(tourFramework)[store.get().tourStep];
  if (transport === null || transport.show === undefined || step === undefined) return;
  const says = transport.show(step.scene);
  const view = store.get().view;
  store.set({ tourSays: says, tourBaseline: view === null ? null : step.baseline(view) });
}

export function tourGo(step: number): void {
  store.set({ tourStep: Math.max(0, Math.min(stepsFor(tourFramework).length, step)), toast: null });
  tourShow();
}

export function tourRefresh(): void {
  tourShow();
}

export function tourFinish(): void {
  leave();
  store.set({ startFocus: true });
}

export function leave(): void {
  clearSeat();
  teardown();
  store.set({ startError: null, busy: null });
}

export function answerCheck(id: string, pick: number): void {
  store.set({ learn: { ...store.get().learn, [id]: pick } });
}

let saidId = 0;

export function act(action: ClientAction): void {
  if (transport === null) return;
  transport.send(action);
  if (action.type === 'item.submit') {
    saidId += 1;
    const own = saidId;
    store.set({ said: own });
    setTimeout(() => {
      if (store.get().said === own) store.set({ said: null });
    }, 6000);
  }
}

export function skipAhead(): void {
  if (transport !== null && transport.skip !== undefined) transport.skip();
}

export function dismissToast(): void {
  store.set({ toast: null });
}

export function setScriptStep(step: number): void {
  store.set({ scriptStep: step });
}

export async function copyCode(code: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(code);
    store.set({ copied: true });
    setTimeout(() => store.set({ copied: false }), 2500);
  } catch {
    store.set({ copied: false });
  }
}

async function loadLeaderboard(): Promise<void> {
  store.set({ leaderboardStatus: 'loading' });
  try {
    const response = await fetch('/api/room/leaderboard');
    if (!response.ok) {
      store.set({ leaderboardStatus: 'error' });
      return;
    }
    const body = (await response.json()) as LeaderboardResponse;
    if (body !== null && typeof body === 'object' && body.month !== undefined && body.allTime !== undefined) {
      store.set({ leaderboard: body, leaderboardStatus: 'ready' });
      return;
    }
    store.set({ leaderboardStatus: 'error' });
  } catch {
    store.set({ leaderboardStatus: 'error' });
  }
}

export type Entry = { kind: 'local'; framework: Framework } | { kind: 'resume'; seat: Seat } | { kind: 'start' };

/**
 * How the page begins: the local mode the address asks for, the kept seat, or the start screen.
 */
export function entryFor(search: string, seat: Seat | null): Entry {
  const params = new URLSearchParams(search);
  if (params.get('local') === '1') return { kind: 'local', framework: params.get('framework') === 'kanban' ? 'kanban' : 'scrum' };
  if (seat !== null) return { kind: 'resume', seat };
  return { kind: 'start' };
}

let initialised = false;

/**
 * Reads the stored language, drops a stale theme entry, resumes a kept seat or starts the local mode asked for in the address, and loads the lists.
 */
export function init(): void {
  if (initialised) return;
  initialised = true;
  const stored = readStored('language');
  const lang: Lang = isLanguage(stored) ? stored : pickLanguage(navigator.languages ?? [navigator.language]);
  clearStaleTheme();
  applyLanguage(lang);
  store.set({ lang });
  window.addEventListener('storage', (event) => {
    if (event.key === 'lg-lang' && isLanguage(event.newValue)) {
      applyLanguage(event.newValue);
      store.set({ lang: event.newValue });
    }
  });
  const entry = entryFor(location.search, readSeat());
  if (entry.kind === 'local') startLocal(entry.framework);
  else if (entry.kind === 'resume') connect(entry.seat);
  else void loadLeaderboard();
}

export function refreshLeaderboard(): void {
  void loadLeaderboard();
}
