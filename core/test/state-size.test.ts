import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Framework } from '../types.ts';
import { defaultStyle, kanbanStyle, playInspect, playPlanning, playRetro, playWork, startedRoom } from './machine-support.ts';

const StorageValueLimitBytes = 131_072;

function bytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function measure(framework: Framework, seed: number): { peak: number; finished: number } {
  const room = startedRoom(6, seed, false, framework);
  const style = framework === 'kanban' ? kanbanStyle : defaultStyle;
  let peak = bytes(room.state);
  const sample = (): void => {
    peak = Math.max(peak, bytes(room.state));
  };
  for (let round = 0; round < 2; round += 1) {
    playPlanning(room, style);
    sample();
    playWork(room, style);
    sample();
    playInspect(room);
    sample();
    playRetro(room, style);
    sample();
  }
  assert.equal(room.state.phase.kind, 'summary');
  return { peak, finished: bytes(room.state) };
}

for (const framework of ['scrum', 'kanban'] as const) {
  test(`D-091: the stored state of a finished six-player ${framework} game stays under 128 KiB`, (t) => {
    const sizes = [1100011, 2020202, 3003003].map((seed) => measure(framework, seed));
    t.diagnostic(`${framework}: finished ${sizes.map((own) => own.finished).join(', ')} bytes; peak ${sizes.map((own) => own.peak).join(', ')} bytes`);
    for (const size of sizes) {
      assert.ok(size.finished < StorageValueLimitBytes, `finished state is ${size.finished} bytes`);
      assert.ok(size.peak < StorageValueLimitBytes, `peak state is ${size.peak} bytes`);
    }
  });
}
