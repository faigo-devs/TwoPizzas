import { sleep } from './session-run.mjs';

export const PlayerSpecs = [
  { number: 1, lang: 'en', width: 1280, height: 900, name: 'Păstăi' },
  { number: 2, lang: 'en', width: 390, height: 844, name: 'Zeamă' },
  { number: 3, lang: 'en', width: 1100, height: 850, name: 'Fulg' },
];

/**
 * Opens the three sessions, switches the language on the page that differ, and puts everyone in one lobby.
 */
export async function openAndJoin(run) {
  const players = PlayerSpecs.map((spec) => run.createPlayer(spec));
  await Promise.all(players.map((player) => player.open(run.pageUrl)));
  await run.probeAll();
  const [first, second, third] = players;

  await run.until('start screens drawn', () => players.every((player) => player.hasText(player.t('start.create'))), { timeoutMs: 20_000 });
  run.counters.bump('start screen shows the create button', 3);

  await first.exec(`await chooseValue('ro'); return true;`);
  first.setLanguage('ro');
  await run.probeAll();
  run.check(first.dom.lang === 'ro' && first.hasText(first.t('start.create')), 'page 1 switched to Romanian', {
    player: first,
    expected: 'lang ro and the Romanian create button',
    found: `lang ${first.dom.lang}`,
  });
  run.check(second.dom.innerWidth === 390, 'page 2 runs at 390 px', { player: second, expected: '390', found: String(second.dom.innerWidth) });

  if (run.framework === 'kanban') await first.exec(`await chooseValue('kanban'); return true;`);
  await first.clickKey('start.create');
  await run.until('page 1 in the lobby', () => first.screenKey() === 'lobby', { timeoutMs: 30_000, players: [first] });
  const code = first.view.code;
  run.log(`room ${code} created (${run.framework})`);
  run.check(/^[A-Z]{5}$/.test(code), 'room code has five letters', { player: first, expected: '5 capital letters', found: code });
  run.check(first.view.framework === run.framework, 'room has the chosen framework', { player: first, expected: run.framework, found: first.view.framework });

  for (const player of [second, third]) {
    await player.exec(`return await fillLabeled(A.label, A.code);`, { label: player.t('start.codeLabel'), code });
    await player.clickKey('start.join');
  }
  await run.until('everyone in the lobby', () => players.every((player) => player.screenKey() === 'lobby' && player.view.players.length === 3), { timeoutMs: 30_000 });
  run.check(
    players.every((player) => player.view.code === code),
    'all three pages are in the same room',
    { expected: code, found: players.map((p) => p.view.code).join(',') },
  );
  const selfIds = new Set(players.map((player) => player.selfId));
  run.check(selfIds.size === 3, 'three distinct seats', { expected: '3 ids', found: String(selfIds.size) });

  for (const player of players) {
    await player.exec(`return await fillLabeled(A.label, A.name);`, { label: player.t('lobby.yourName'), name: player.name });
  }
  await run.until(
    'names reach every page',
    () => players.every((viewer) => players.every((owner) => viewer.view.players.some((seat) => seat.id === owner.selfId && seat.name === owner.name))),
    { timeoutMs: 20_000 },
  );
  for (const viewer of players) {
    for (const owner of players) {
      run.check(viewer.hasText(owner.name), `name of ${owner.label} shown on a page`, { player: viewer, expected: owner.name, found: viewer.dom.text.slice(0, 200) });
    }
  }
  run.check(
    players.some((viewer) => viewer.dom.text.includes('ă')),
    'the Romanian name keeps its diacritics',
    { expected: 'ă in the page text', found: 'missing' },
  );
  return players;
}

/**
 * The host locks the room, everyone sees it, the host unlocks it again, and nobody is removed.
 */
export async function lockAndUnlock(run) {
  const host = run.host();
  run.check(host.view.controls.includes('lock_room'), 'host may lock the room', { player: host, expected: 'lock_room control', found: host.view.controls.join(',') });
  const others = run.players.filter((player) => player !== host);
  run.check(
    others.every((player) => !player.view.controls.includes('start_game') && !player.view.controls.includes('lock_room')),
    'only the host has lobby controls',
    { expected: 'no start_game or lock_room for others', found: others.map((p) => p.view.controls.join(',')).join(' | ') },
  );
  await host.clickKey('lobby.lock');
  await run.until('room locked on every page', () => run.players.every((player) => player.view.locked === true), { timeoutMs: 15_000 });
  for (const player of run.players) {
    run.check(player.hasText(player.t('lobby.lockedNote')), 'locked note is shown', { player, expected: player.t('lobby.lockedNote'), found: 'missing' });
  }
  await host.clickKey('lobby.unlock');
  await run.until('room unlocked on every page', () => run.players.every((player) => player.view.locked === false), { timeoutMs: 15_000 });
  run.check(
    run.players.every((player) => player.view.players.length === 3 && player.view.players.every((seat) => seat.connected)),
    'nobody was removed by the lock',
    { expected: '3 connected players', found: run.players.map((p) => p.view.players.length).join(',') },
  );
  await sleep(100);
}

/**
 * The host starts the game and everyone lands on the card of the first planning.
 */
export async function startGame(run) {
  const host = run.host();
  run.check(host.view.controls.includes('start_game'), 'host may start the game', { player: host, expected: 'start_game control', found: host.view.controls.join(',') });
  await host.clickKey('lobby.start');
  await run.waitScreen('plan:1:0:card');
}
