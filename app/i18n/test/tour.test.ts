import assert from 'node:assert/strict';
import { test } from 'node:test';
import { machine } from '../../../core/index.ts';
import { boardOf } from '../../game/framework.ts';
import { buildScene } from '../../game/tour/script.ts';
import { stepsFor } from '../../game/tour/steps.ts';
import { dictionaries } from '../index.ts';

const frameworks = ['scrum', 'kanban'] as const;

test('every tour step has a title, a text and, for a task, a line, in both languages', () => {
  for (const framework of frameworks) {
    for (const step of stepsFor(framework)) {
      for (const lang of ['en', 'ro'] as const) {
        const dictionary: Record<string, string> = dictionaries[lang];
        assert.ok(`tour.${step.id}.title` in dictionary, `${lang} title of ${step.id}`);
        assert.ok(`tour.${step.id}.text` in dictionary, `${lang} text of ${step.id}`);
        if (step.task) assert.ok(`tour.${step.id}.do` in dictionary, `${lang} task of ${step.id}`);
      }
    }
  }
});

test('the Romanian tour and start copy never says dumneavoastra', () => {
  const ro: Record<string, string> = dictionaries.ro;
  for (const key of Object.keys(ro)) {
    if (!key.startsWith('tour.') && !key.startsWith('start.tour') && !key.startsWith('start.team')) continue;
    assert.ok(!/dumneavoastr/i.test(ro[key] as string), key);
  }
});

test('every scene of the tour builds without a refused move and offers what its step asks for', () => {
  const echo = (key: string): string => key;
  for (const framework of frameworks) {
    for (const step of stepsFor(framework)) {
      const scene = buildScene(framework, step.scene, echo as never);
      const view = machine.viewFor(scene.state, 'you', scene.at);
      assert.equal(view.selfId, 'you');
      assert.equal(step.done(view, step.baseline(view)), false, `${framework} ${step.id} starts undone`);
      if (step.scene === 'pair') assert.ok(scene.says !== null && scene.says.clues.length > 0);
      if (step.scene === 'limit') assert.equal(boardOf(view)?.startBlockedByLimit, true);
      if (step.scene === 'review') assert.ok(view.controls.includes('reveal_verdict'));
      if (step.scene === 'solo' || step.scene === 'pair') assert.ok(view.workspace?.part?.kind === 'order');
    }
  }
});
