import { answerCheckQuestion, kanbanReplenishment, retroEvent, reviewEvent, scrumPlanning, beginPhase } from './events.mjs';
import { lockAndUnlock, openAndJoin, startGame } from './lobby.mjs';
import { summaryEvent } from './summary.mjs';
import { playTour } from './tour.mjs';
import { newWorkState, playDaily, playWorkHalf } from './work.mjs';

function stopHere(run, name) {
  if (run.options.stopAfter === name) {
    run.log(`stopping after ${name} as asked`);
    return true;
  }
  return false;
}

async function sprint(run, state, iteration) {
  await run.waitScreen(`work:${iteration}:1:card`);
  if (iteration === 1) await answerCheckQuestion(run, run.players[0], 'plan');
  await beginPhase(run);
  await run.waitScreen(`work:${iteration}:1:running`);
  await playWorkHalf(run, state, { iteration, half: 1 });
  await run.waitScreen(`daily:${iteration}:0:card`);
  await beginPhase(run);
  await playDaily(run, state, { iteration });
  await run.waitScreen(`work:${iteration}:2:running`);
  await playWorkHalf(run, state, { iteration, half: 2 });
  await run.waitScreen(`inspect:${iteration}:0:card`);
}

function scrumChoice(suggestions) {
  return suggestions.find((type) => type !== 'free' && type !== 'wip_limit') ?? suggestions[0];
}

function kanbanChoice(iteration) {
  return (suggestions) => {
    if (iteration === 1) return suggestions.includes('wip_limits_set') ? 'wip_limits_set' : suggestions[0];
    return suggestions.find((type) => type !== 'free') ?? suggestions[0];
  };
}

/**
 * Plays one whole game of the chosen framework on three pages and asserts along the way.
 */
export async function playGame(run, options) {
  if (run.framework === 'tour') {
    await playTour(run);
    return;
  }
  const state = newWorkState({ thinkMs: options.thinkMs, reviewThinkMs: options.reviewThinkMs });
  await openAndJoin(run);
  if (stopHere(run, 'join')) return;
  await lockAndUnlock(run);
  await startGame(run);
  if (stopHere(run, 'lobby')) return;

  for (const iteration of [1, 2]) {
    if (run.framework === 'scrum') await scrumPlanning(run, iteration, { estimateCount: iteration === 1 ? 6 : 3, pullCount: 6 });
    else await kanbanReplenishment(run, iteration, { limits: { inProgress: 2, review: 2 } });
    if (stopHere(run, `plan${iteration}`)) return;
    await sprint(run, state, iteration);
    if (stopHere(run, `work${iteration}`)) return;
    await reviewEvent(run, state, iteration);
    if (stopHere(run, `review${iteration}`)) return;
    await retroEvent(run, state, iteration, { agreementChoice: run.framework === 'scrum' ? scrumChoice : kanbanChoice(iteration) });
  }
  if (run.framework === 'kanban') {
    run.check(state.limitHit, 'a WIP limit was hit and refused in round 2', { expected: 'limit refusal observed', found: 'never hit' });
  }
  run.check(state.pairSolved.length >= 1 && state.pairSolved.every((entry) => entry.partsDiffer), 'a pair item was solved from two different parts', { expected: 'at least one pair item', found: JSON.stringify(state.pairSolved) });
  run.check(state.dependencySolved.length >= 1, 'an item was solved with a piece handed over by its holder', { expected: 'at least one dependency item', found: JSON.stringify(state.dependencySolved) });
  run.check(state.helpPromised.length >= 1, 'a promise of help was made', { expected: 'at least one promise', found: '0' });
  run.check(state.reloaded && state.duplicated, 'the reload and the second-tab checks ran', { expected: 'both done', found: JSON.stringify({ reloaded: state.reloaded, duplicated: state.duplicated }) });
  await summaryEvent(run, state, {});
}
