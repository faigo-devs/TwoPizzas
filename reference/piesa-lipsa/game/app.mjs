import { MissionCount, PenaltyMs, buildMission, generateCode, isCorrect, parseCode } from './engine.mjs';
import { texts } from './texts.mjs';
import { endView, formatTime, keep, missionView, seatView, setupView } from './views.mjs';

const StorageKey = 'piesa-lipsa';
const Screens = ['setup', 'seat', 'mission', 'end'];

const isIndex = (value, bound) => Number.isInteger(value) && value >= 0 && value < bound;
const isCount = (value) => Number.isFinite(value) && value >= 0;

function isValidState(saved) {
  if (!saved || !Screens.includes(saved.screen)) return false;
  if (saved.screen === 'setup') return true;
  const parsed = parseCode(saved.code);
  if (!parsed || parsed.code !== saved.code || parsed.players !== saved.players) return false;
  if (saved.screen === 'seat') return saved.seat === null || isIndex(saved.seat, saved.players);
  return (
    isIndex(saved.seat, saved.players) &&
    isIndex(saved.mission, MissionCount) &&
    isCount(saved.startedAt) &&
    isCount(saved.penaltyMs) &&
    isCount(saved.mistakes) &&
    typeof saved.solved === 'boolean' &&
    (saved.endedAt === null || isCount(saved.endedAt))
  );
}

function restore() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(StorageKey) ?? 'null');
    if (isValidState(saved)) return saved;
  } catch {
    return { screen: 'setup' };
  }
  return { screen: 'setup' };
}

/**
 * Starts the game inside `root`, which already holds the first screen.
 */
export function startGame(root) {
  let state = restore();
  let quitArmed = false;

  const save = () => {
    try {
      if (state.screen === 'setup') sessionStorage.removeItem(StorageKey);
      else sessionStorage.setItem(StorageKey, JSON.stringify(state));
    } catch {
      return;
    }
  };

  const elapsed = () => (state.endedAt ?? Date.now()) - state.startedAt + state.penaltyMs;
  const mission = () => buildMission(state.code, state.mission, state.players);

  const html = () => {
    if (state.screen === 'seat') return seatView(state);
    if (state.screen === 'mission') return missionView(state, mission(), elapsed());
    if (state.screen === 'end') return endView(state, elapsed());
    return setupView();
  };

  const tick = () => {
    const timer = root.querySelector('[data-timer]');
    if (timer && state.screen === 'mission') timer.textContent = formatTime(elapsed());
  };

  const refreshOrder = () => {
    const items = [...root.querySelectorAll('[data-item]')];
    items.forEach((item, index) => {
      item.querySelector('[data-action="up"]').disabled = state.solved || index === 0;
      item.querySelector('[data-action="down"]').disabled = state.solved || index === items.length - 1;
    });
  };

  const render = (focus) => {
    quitArmed = false;
    root.innerHTML = html();
    refreshOrder();
    save();
    if (focus) root.querySelector('[data-focus]')?.focus();
  };

  const say = (text, mark) => {
    const feedback = root.querySelector('[data-feedback]');
    if (feedback) feedback.innerHTML = `<span class="mark ${mark}" aria-hidden="true"></span><span>${keep(text)}</span>`;
  };

  const readResponse = (kind) => {
    if (kind === 'review') return [...root.querySelectorAll('input[name="line"]:checked')].map((input) => input.value);
    if (kind === 'order') return [...root.querySelectorAll('[data-item]')].map((item) => item.dataset.item);
    if (kind === 'incident') return root.querySelector('input[name="action"]:checked')?.value ?? null;
    const values = [...root.querySelectorAll('input[name="final"]')].map((input) => input.value.trim());
    return values.every((value) => /^\d+$/.test(value)) ? values.map(Number) : null;
  };

  const check = () => {
    const current = mission();
    const response = readResponse(current.kind);
    if (response === null) {
      say(current.kind === 'incident' ? texts.incident.choose : texts.merge.fill, 'idle');
      return;
    }
    if (isCorrect(current, response)) {
      state.solved = true;
      if (state.mission === MissionCount - 1) state.endedAt = Date.now();
      render(true);
      return;
    }
    state.penaltyMs += PenaltyMs;
    state.mistakes += 1;
    save();
    tick();
    say(texts.play.wrong, 'warn');
  };

  const move = (button, step) => {
    const item = button.closest('[data-item]');
    const other = step < 0 ? item.previousElementSibling : item.nextElementSibling;
    if (!other) return;
    if (step < 0) other.before(item);
    else other.after(item);
    refreshOrder();
    const again = item.querySelector(`[data-action="${step < 0 ? 'up' : 'down'}"]`);
    (again.disabled ? item.querySelector(`[data-action="${step < 0 ? 'down' : 'up'}"]`) : again).focus();
  };

  const actions = {
    new: (button) => {
      const players = Number(button.dataset.players);
      state = { screen: 'seat', code: generateCode(players), players, seat: null };
      render(true);
    },
    seat: (button) => {
      state.seat = Number(button.dataset.seat);
      root.querySelectorAll('[data-action="seat"]').forEach((other) => {
        other.setAttribute('aria-pressed', String(other === button));
      });
      root.querySelector('[data-action="start"]').disabled = false;
      save();
    },
    start: () => {
      if (state.seat === null) return;
      state = { ...state, screen: 'mission', mission: 0, startedAt: Date.now(), penaltyMs: 0, mistakes: 0, solved: false, endedAt: null };
      render(true);
    },
    check,
    next: () => {
      if (state.mission === MissionCount - 1) state.screen = 'end';
      else state = { ...state, mission: state.mission + 1, solved: false };
      render(true);
    },
    quit: (button) => {
      if (!quitArmed) {
        quitArmed = true;
        button.innerHTML = keep(texts.play.quitConfirm);
        return;
      }
      state = { screen: 'setup' };
      render(true);
    },
    reset: () => {
      state = { screen: 'setup' };
      render(true);
    },
    up: (button) => move(button, -1),
    down: (button) => move(button, 1),
  };

  root.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button || button.disabled || !root.contains(button)) return;
    actions[button.dataset.action]?.(button);
  });

  root.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = root.querySelector('#g-code');
    const parsed = parseCode(input.value);
    if (!parsed) {
      input.setAttribute('aria-invalid', 'true');
      root.querySelector('#g-code-hint').hidden = false;
      input.focus();
      return;
    }
    state = { screen: 'seat', code: parsed.code, players: parsed.players, seat: null };
    render(true);
  });

  root.addEventListener('input', (event) => {
    if (event.target.id !== 'g-code') return;
    event.target.value = event.target.value.toUpperCase();
    event.target.removeAttribute('aria-invalid');
    root.querySelector('#g-code-hint').hidden = true;
  });

  setInterval(tick, 500);

  if (state.screen !== 'setup') render(false);
}
