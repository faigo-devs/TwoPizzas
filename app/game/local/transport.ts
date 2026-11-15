import { machine } from '../../../core/index.ts';
import type { ClientAction, Framework, RoomState } from '../../../core/index.ts';
import type { Key } from '../../i18n/index.ts';
import type { Transport, TransportHandlers } from '../types.ts';
import {
  HumanId,
  applyAction,
  applyServer,
  createLocalClock,
  createTeammates,
  newLocalRoom,
  skipEvent,
  viewOf,
} from './room.ts';

const TickMs = 400;

/**
 * Runs the core's machine in the browser with scripted teammates and a clock of its own; nothing leaves the page.
 */
export function createLocalTransport(framework: Framework, handlers: TransportHandlers, note: () => (key: Key) => string): Transport {
  const clock = createLocalClock();
  const teammates = createTeammates();
  let state: RoomState | null = null;
  let ticker: ReturnType<typeof setInterval> | null = null;
  let deadline: ReturnType<typeof setTimeout> | null = null;

  function publish(): void {
    if (state !== null) handlers.onView(viewOf(state, clock));
  }

  function arm(): void {
    if (deadline !== null) clearTimeout(deadline);
    deadline = null;
    if (state === null) return;
    const due = machine.nextDeadline(state);
    if (due === null) return;
    deadline = setTimeout(
      () => {
        deadline = null;
        if (state === null) return;
        const result = applyServer(state, { type: 'server.deadline', now: clock.now() });
        if (result.ok) state = result.state;
        publish();
        arm();
      },
      Math.max(0, due - clock.now()) + 20,
    );
  }

  function tick(): void {
    if (state === null) return;
    const move = teammates.next(state, clock.now(), note(), clock);
    if (move === null) return;
    const result = applyAction(state, move.id, move.action, clock.now());
    if (!result.ok) return;
    state = result.state;
    publish();
    arm();
  }

  return {
    kind: 'local',
    start() {
      state = newLocalRoom(framework, clock);
      handlers.onStatus('open');
      publish();
      ticker = setInterval(tick, TickMs);
    },
    send(action: ClientAction) {
      if (state === null) return;
      const result = applyAction(state, HumanId, action, clock.now());
      if (!result.ok) {
        handlers.onError(result.code, false);
        return;
      }
      state = result.state;
      publish();
      arm();
    },
    skip() {
      if (state === null) return;
      state = skipEvent(state, clock, note());
      publish();
      arm();
    },
    close() {
      if (ticker !== null) clearInterval(ticker);
      if (deadline !== null) clearTimeout(deadline);
      ticker = null;
      deadline = null;
      state = null;
    },
  };
}
