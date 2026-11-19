import { machine } from '../../../core/index.ts';
import type { ClientAction, Framework, RoomState } from '../../../core/index.ts';
import type { Key } from '../../i18n/index.ts';
import type { Transport, TransportHandlers } from '../types.ts';
import { TourYou, buildScene, type OwnNote, type SceneId, type TourSays } from './script.ts';

/**
 * Runs the tour's prepared situations on the engine in the browser: one situation at a time, no teammate moves of its own, nothing sent anywhere.
 */
export function createTourTransport(framework: Framework, handlers: TransportHandlers, note: () => (key: Key) => string): Transport {
  let state: RoomState | null = null;
  let offset = 0;
  let wake: ReturnType<typeof setTimeout> | null = null;

  const now = (): number => Date.now() + offset;

  function publish(): void {
    if (state !== null) handlers.onView(machine.viewFor(state, TourYou, now()));
  }

  function arm(): void {
    if (wake !== null) clearTimeout(wake);
    wake = null;
    if (state === null) return;
    const due = state.players.flatMap((player) => (player.open !== null && player.open.readyAt > now() ? [player.open.readyAt] : []));
    if (due.length === 0) return;
    wake = setTimeout(
      () => {
        wake = null;
        publish();
        arm();
      },
      Math.max(0, Math.min(...due) - now()) + 20,
    );
  }

  let ownNote: OwnNote | null = null;

  return {
    kind: 'tour',
    start() {
      handlers.onStatus('open');
    },
    show(scene: SceneId): TourSays | null {
      const built = buildScene(framework, scene, note(), ownNote);
      state = built.state;
      offset = built.at - Date.now();
      publish();
      arm();
      return built.says;
    },
    send(action: ClientAction) {
      if (state === null) return;
      if (action.type === 'retro.note_add') ownNote = { column: action.column, text: action.text };
      const result = machine.reduce(state, { ...action, playerId: TourYou, now: now() });
      if (!result.ok) {
        handlers.onError(result.code, false);
        return;
      }
      state = result.state;
      publish();
      arm();
    },
    close() {
      if (wake !== null) clearTimeout(wake);
      wake = null;
      state = null;
    },
  };
}
