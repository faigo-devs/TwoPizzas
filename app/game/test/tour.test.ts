import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { machine } from '../../../core/index.ts';
import type { Agreement, ClientAction, Framework, PlayerView, RoomState } from '../../../core/index.ts';
import { createTourTransport } from '../tour/transport.ts';
import { rightResponse, wrongResponse } from '../local/bots.ts';
import { TourYou, buildScene } from '../tour/script.ts';
import { TourClosing, buildQuestion } from '../learn.ts';
import { dictionaries, createT } from '../../i18n/index.ts';
import { stepsFor } from '../tour/steps.ts';
import type { TourStep } from '../tour/steps.ts';

const note = (key: string): string => key;
const Agreements: Agreement[] = [
  { type: 'wip_limit', max: 3 },
  { type: 'review_wait', maxMs: 60_000 },
  { type: 'no_new_while_blocked' },
  { type: 'pair_first' },
  { type: 'wip_limits_set' },
  { type: 'free', text: 'agreed' },
];

function candidates(state: RoomState, at: number): ClientAction[] {
  const view = machine.viewFor(state, TourYou, at);
  const list: ClientAction[] = [{ type: 'daily.end' }, { type: 'inspect.reveal' }, { type: 'phase.advance' }, { type: 'item.close' }];
  for (const item of state.items) {
    list.push({ type: 'item.take', itemId: item.id }, { type: 'item.take_review', itemId: item.id }, { type: 'help.promise', itemId: item.id });
    list.push({ type: 'item.open', itemId: item.id, mode: 'work' }, { type: 'item.open', itemId: item.id, mode: 'review' });
    list.push({ type: 'item.verdict', itemId: item.id, verdict: 'lgtm' }, { type: 'item.verdict', itemId: item.id, verdict: 'changes' });
    if (item.puzzle !== null) {
      list.push({ type: 'item.submit', itemId: item.id, response: rightResponse(item.puzzle) });
      list.push({ type: 'item.submit', itemId: item.id, response: wrongResponse(item.puzzle) });
    }
  }
  for (const own of view.retro?.notes ?? []) list.push({ type: 'retro.vote', noteId: own.id });
  list.push({ type: 'retro.note_add', column: 'try', text: 'something to try' });
  for (const agreement of Agreements) list.push({ type: 'retro.choose_action', agreement });
  return list;
}

function apply(state: RoomState, action: ClientAction, at: number): RoomState | null {
  const result = machine.reduce(state, { ...action, playerId: TourYou, now: at } as Parameters<typeof machine.reduce>[1]);
  return result.ok ? result.state : null;
}

function solves(step: TourStep, state: RoomState, at: number, baseline: string | null): ClientAction[] | null {
  const done = (next: RoomState): boolean => step.done(machine.viewFor(next, TourYou, at), baseline);
  const firsts = candidates(state, at).flatMap((action) => {
    const next = apply(state, action, at);
    return next === null ? [] : [{ action, next }];
  });
  for (const first of firsts) if (done(first.next)) return [first.action];
  for (const first of firsts) {
    for (const action of candidates(first.next, at)) {
      const next = apply(first.next, action, at);
      if (next !== null && done(next)) return [first.action, action];
    }
  }
  return null;
}

describe('the tour script', () => {
  for (const framework of ['scrum', 'kanban'] as const satisfies readonly Framework[]) {
    describe(framework, () => {
      const steps = stepsFor(framework);

      it('lists unique steps in order, with the limit step only in Kanban', () => {
        const ids = steps.map((step) => step.id);
        assert.equal(new Set(ids).size, ids.length);
        assert.equal(ids[0], 'idea');
        assert.equal(ids.at(-1), 'action');
        assert.equal(ids.includes('limit'), framework === 'kanban');
      });

      for (const step of steps) {
        it(`step ${step.id} is built on a state where its task can be done`, () => {
          const scene = buildScene(framework, step.scene, note);
          const view = machine.viewFor(scene.state, TourYou, scene.at);
          assert.equal(view.selfId, TourYou);
          const baseline = step.baseline(view);
          assert.equal(step.done(view, baseline), false, 'already done when shown');
          if (!step.task) return;
          const found = solves(step, scene.state, scene.at, baseline);
          assert.ok(found !== null, `no action of the player completes ${step.id}`);
        });

        it(`step ${step.id} is rebuilt the same way twice`, () => {
          const first = buildScene(framework, step.scene, note);
          const second = buildScene(framework, step.scene, note);
          assert.equal(first.state.phase.kind, second.state.phase.kind);
          assert.deepEqual(first.says, second.says);
        });
      }

      it('runs through the transport from the first step to the last', () => {
        let latest: PlayerView | null = null;
        const errors: string[] = [];
        const transport = createTourTransport(
          framework,
          {
            onStatus: () => undefined,
            onView: (view) => {
              latest = view;
            },
            onError: (code) => errors.push(code),
          },
          () => note,
        );
        transport.start();
        try {
          for (const step of steps) {
            transport.show?.(step.scene);
            const shown = latest as PlayerView | null;
            assert.ok(shown !== null);
            const baseline = step.baseline(shown);
            assert.equal(step.done(shown, baseline), false);
            if (!step.task) continue;
            const scene = buildScene(framework, step.scene, note);
            const found = solves(step, scene.state, scene.at, step.baseline(machine.viewFor(scene.state, TourYou, scene.at)));
            assert.ok(found !== null);
            for (const action of found) transport.send(action);
            assert.deepEqual(errors, []);
            assert.equal(step.done(latest as unknown as PlayerView, baseline), true, `${step.id} not done after the action`);
          }
        } finally {
          transport.close();
        }
      });

      it('gives the pair scene a partner line', () => {
        const scene = buildScene(framework, 'pair', note);
        assert.ok(scene.says !== null && scene.says.clues.length > 0);
      });

      it('carries the learner own retro note into the vote scene', () => {
        const scene = buildScene(framework, 'vote', note, { column: 'went_well', text: 'my own note' });
        const view = machine.viewFor(scene.state, TourYou, scene.at);
        const mine = view.retro?.notes.filter((entry) => entry.mine) ?? [];
        assert.deepEqual(mine.map((entry) => [entry.column, entry.text]), [['went_well', 'my own note']]);
      });
    });
  }
});

function sceneState(framework: Framework, id: Parameters<typeof buildScene>[1]): RoomState {
  return buildScene(framework, id, note).state;
}

function openItem(state: RoomState): string | null {
  return state.players.find((own) => own.id === TourYou)?.open?.itemId ?? null;
}

function heldBy(state: RoomState, who: string): string[] {
  return state.items.filter((item) => item.workers.includes(who)).map((item) => item.id);
}

describe('the tour scenes agree with what the player just did', () => {
  for (const framework of ['scrum', 'kanban'] as const satisfies readonly Framework[]) {
    describe(framework, () => {
      const solved = openItem(sceneState(framework, 'solo'));
      const paired = heldBy(sceneState(framework, 'pair'), TourYou);

      it('gives the player an item in the solo step and none of the review items', () => {
        assert.ok(solved !== null);
        assert.equal(paired.length, 1);
        for (const id of ['right', 'wrong'] as const) {
          const state = sceneState(framework, id);
          const item = state.items.find((own) => own.reviewer === TourYou);
          assert.ok(item !== undefined, `${id}: the player reviews an item`);
          assert.notEqual(item.id, solved);
          assert.ok(!paired.includes(item.id));
          assert.ok(item.submittedBy !== null && item.submittedBy !== TourYou && item.submittedBy.startsWith('mate-'));
          assert.ok(!item.workers.includes(TourYou));
        }
      });

      it('asks to verify two different items, one right and one wrong', () => {
        const right = sceneState(framework, 'right').items.find((own) => own.reviewer === TourYou);
        const wrong = sceneState(framework, 'wrong').items.find((own) => own.reviewer === TourYou);
        assert.ok(right !== undefined && wrong !== undefined);
        assert.notEqual(right.id, wrong.id);
        assert.ok(right.puzzle !== null && right.submission !== null);
        assert.ok(wrong.puzzle !== null && wrong.submission !== null);
      });

      it('puts the player on two items at the switch, one open and the one from the solo step', () => {
        const state = sceneState(framework, 'switch');
        const mine = heldBy(state, TourYou);
        assert.equal(mine.length, 2);
        assert.equal(openItem(state), solved);
        const view = machine.viewFor(state, TourYou, buildScene(framework, 'switch', note).at);
        assert.ok(view.workspace !== null && view.workspace.itemId === solved);
      });

      it('shows the help promised in the held step at the Daily', () => {
        const held = sceneState(framework, 'held');
        const blocked = held.items.find((own) => own.dependency && own.status === 'doing' && own.dependencyHolder === TourYou);
        assert.ok(blocked !== undefined);
        const scene = buildScene(framework, 'daily', note);
        const view = machine.viewFor(scene.state, TourYou, scene.at);
        const same = view.items.find((own) => own.id === blocked.id);
        assert.ok(same !== undefined);
        assert.equal(same.helpPromisedBy, TourYou);
        assert.ok(view.items.every((own) => !(own.blocked && own.status === 'doing' && own.helpPromisedBy === null)));
      });

      it('reveals a wrong item that a teammate worked and the player’s own right one', () => {
        const state = sceneState(framework, 'review');
        const verdicts = state.iterations[state.iterations.length - 1]?.verdicts ?? [];
        const wrongItem = sceneState(framework, 'wrong').items.find((own) => own.reviewer === TourYou);
        const wrong = verdicts.filter((own) => own.outcome === 'escaped_defect');
        const right = verdicts.filter((own) => own.outcome === 'accepted');
        assert.equal(wrong.length, 1);
        assert.equal(right.length, 1);
        assert.equal(wrong[0]?.itemId, wrongItem?.id);
        assert.equal(right[0]?.itemId, solved);
        const worked = state.items.find((own) => own.id === wrong[0]?.itemId);
        assert.ok(worked !== undefined && worked.submittedBy !== null && worked.submittedBy.startsWith('mate-'));
        assert.equal(state.items.find((own) => own.id === right[0]?.itemId)?.submittedBy, TourYou);
      });

      it('shows no sample note twice on the vote screen, with or without the player’s own', () => {
        for (const own of [null, { column: 'slowed_us' as const, text: 'mine' }]) {
          const scene = buildScene(framework, 'vote', note, own);
          const texts = machine.viewFor(scene.state, TourYou, scene.at).retro?.notes.map((entry) => entry.text) ?? [];
          assert.ok(texts.length >= 7);
          assert.equal(new Set(texts).size, texts.length);
        }
      });

      it('closes with a question about what the tour showed, never a timebox', () => {
        const t = createT('en');
        const question = buildQuestion('TOUR', framework, TourClosing.slot, t, TourClosing.variant);
        assert.ok(question !== null);
        assert.equal(question.question, dictionaries.en[`learn.${framework}.retro.1.q` as keyof typeof dictionaries.en]);
        assert.ok(!/hour|minute|day|week|month/iu.test(question.choices.join(' ')));
        const action = dictionaries.en['tour.action.text'] + dictionaries.en['tour.action.text.kanban'];
        assert.match(action, /improve|change to try/u);
      });
    });
  }
});
