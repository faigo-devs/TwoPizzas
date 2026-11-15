import type { ClientAction, Framework, LeaderboardResponse, PlayerView } from '../../core/index.ts';
import { createT, isLanguage, pickLanguage, type Lang, type Translate } from '../i18n/index.ts';
import { createLocalTransport } from './local/transport.ts';
import { clearSeat, readSeat, readStored, writeStored, type Seat } from './session.ts';
import { store, type ThemeName } from './store.ts';
import { createRemoteTransport } from './transport/remote.ts';
import type { ConnectionStatus, FailureCode, Transport, TransportHandlers } from './types.ts';

const Codes: readonly string[] = ['room_not_found', 'room_full', 'already_started', 'not_allowed', 'bad_request', 'rate_limited'];

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
}

export function setLanguage(lang: Lang): void {
  writeStored('language', lang);
  applyLanguage(lang);
  store.set({ lang });
}

export function setTheme(theme: ThemeName): void {
  document.documentElement.setAttribute('data-theme', theme);
  writeStored('theme', theme);
  store.set({ theme });
}

function currentTheme(): ThemeName {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
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
  store.set({ mode: null, status: 'idle', view: null, clock: null, toast: null, connectionNote: null, scriptStep: 0, copied: false });
}

function connect(seat: Seat): void {
  if (transport !== null) transport.close();
  store.set({ mode: 'remote', status: 'connecting', view: null, clock: null, startError: null, toast: null, scriptStep: 0 });
  transport = createRemoteTransport(seat, handlers());
  transport.start();
}

function failureOf(raw: unknown): FailureCode {
  if (raw !== null && typeof raw === 'object') {
    const { code, error } = raw as Record<string, unknown>;
    for (const candidate of [code, error]) {
      if (typeof candidate === 'string' && Codes.includes(candidate)) return candidate as FailureCode;
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
    if (typeof code !== 'string' || !/^[A-Z]{5}$/.test(code)) {
      store.set({ busy: null, startError: 'bad_request' });
      return;
    }
    connect({ code, playerId: null, token: null });
  } catch {
    store.set({ busy: null, startError: 'network' });
  }
}

export function joinRoom(raw: string): void {
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{5}$/.test(code)) {
    store.set({ startError: 'codeShape' });
    return;
  }
  const kept = readSeat();
  store.set({ busy: 'join', startError: null });
  connect(kept !== null && kept.code === code ? kept : { code, playerId: null, token: null });
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

export function leave(): void {
  clearSeat();
  teardown();
  store.set({ startError: null, busy: null });
}

export function act(action: ClientAction): void {
  if (transport !== null) transport.send(action);
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
  try {
    const response = await fetch('/api/room/leaderboard');
    if (!response.ok) return;
    const body = (await response.json()) as LeaderboardResponse;
    if (body !== null && typeof body === 'object' && body.month !== undefined && body.allTime !== undefined) {
      store.set({ leaderboard: body });
    }
  } catch {
    return;
  }
}

/**
 * Reads the stored language and theme, resumes a kept seat or starts the local mode asked for in the address, and loads the lists.
 */
export function init(): void {
  const stored = readStored('language');
  const lang: Lang = isLanguage(stored) ? stored : pickLanguage(navigator.languages ?? [navigator.language]);
  applyLanguage(lang);
  store.set({ lang, theme: currentTheme() });
  window.addEventListener('storage', (event) => {
    if (event.key === 'lg-theme' && (event.newValue === 'dark' || event.newValue === 'light')) {
      document.documentElement.setAttribute('data-theme', event.newValue);
      store.set({ theme: event.newValue });
    }
    if (event.key === 'lg-lang' && isLanguage(event.newValue)) {
      applyLanguage(event.newValue);
      store.set({ lang: event.newValue });
    }
  });
  const params = new URLSearchParams(location.search);
  if (params.get('local') === '1') {
    startLocal(params.get('framework') === 'kanban' ? 'kanban' : 'scrum');
    return;
  }
  const seat = readSeat();
  if (seat !== null) {
    connect(seat);
    return;
  }
  void loadLeaderboard();
}

export function refreshLeaderboard(): void {
  void loadLeaderboard();
}
