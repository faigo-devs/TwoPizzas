import { mixSeed, createRng } from './rng.ts';

export const Adjectives: readonly string[] = [
  'brave', 'calm', 'clever', 'cosy', 'eager', 'gentle', 'happy', 'jolly', 'kind', 'lively',
  'lucky', 'merry', 'mighty', 'noble', 'patient', 'plucky', 'proud', 'quick', 'quiet', 'rapid',
  'sunny', 'swift', 'tidy', 'warm', 'witty', 'zesty', 'bright', 'cheerful', 'daring', 'friendly',
  'graceful', 'humble', 'keen', 'loyal', 'nimble', 'polite', 'radiant', 'steady', 'sturdy', 'wise',
  'bold', 'breezy', 'snappy', 'curious', 'amber', 'golden', 'silver', 'rosy',
];

export const Animals: readonly string[] = [
  'otter', 'panda', 'koala', 'puffin', 'robin', 'finch', 'badger', 'beaver', 'bunny', 'kitten',
  'puppy', 'lamb', 'duckling', 'hedgehog', 'squirrel', 'rabbit', 'penguin', 'turtle', 'gecko', 'llama',
  'alpaca', 'goat', 'sparrow', 'wren', 'swallow', 'heron', 'crane', 'stork', 'owl', 'hamster',
  'ferret', 'lemur', 'sloth', 'whale', 'seal', 'walrus', 'moose', 'bison', 'zebra', 'giraffe',
  'camel', 'parrot', 'tortoise', 'swan', 'pony', 'fawn', 'marmot', 'quokka',
];

/**
 * A friendly team name, adjective and animal in kebab-case; the same seed and attempt always give the same name.
 */
export function generateTeamName(seed: number, attempt: number): string {
  const rng = createRng(mixSeed(seed, `name:${attempt}`));
  return `${rng.pick(Adjectives)}-${rng.pick(Animals)}`;
}
