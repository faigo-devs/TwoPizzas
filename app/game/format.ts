import type { ItemView, Phase, PlayerView, PublicPlayer } from '../../core/index.ts';
import type { Key, Translate } from '../i18n/index.ts';
import type { AvatarProps } from '../ui/Avatar.tsx';
import type { ItemStatus } from '../ui/Status.tsx';

export function key(value: string): Key {
  return value as Key;
}

/**
 * Minutes and seconds as mm:ss, rounded up so that the last second still shows 00:01.
 */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function playerName(player: PublicPlayer, t: Translate): string {
  return player.name ?? t('common.player', { n: player.seat });
}

export function facilitatorRole(view: PlayerView, t: Translate): string {
  return t(key(`role.facilitator.${view.framework}`));
}

export function avatarOf(player: PublicPlayer, view: PlayerView, t: Translate): AvatarProps {
  return {
    name: playerName(player, t),
    number: player.seat,
    colour: player.seat - 1,
    you: player.id === view.selfId,
    facilitator: player.id === view.facilitatorId,
    disconnected: !player.connected,
    roleLabels: { facilitator: facilitatorRole(view, t), you: t('common.you'), disconnected: t('role.disconnected') },
  };
}

export function phaseName(view: PlayerView, t: Translate): string {
  const phase = view.phase;
  if (phase.kind === 'lobby') return t('lobby.title');
  if (phase.kind === 'summary') return t('summary.title');
  return t(key(`phase.${view.framework}.${phase.kind}.name`));
}

export function screenKey(phase: Phase): string {
  if (phase.kind === 'lobby' || phase.kind === 'summary') return phase.kind;
  const half = phase.kind === 'work' ? phase.half : 0;
  return `${phase.kind}:${phase.iteration}:${half}:${phase.step}`;
}

export function itemLabels(t: Translate) {
  return {
    value: t('item.label.value'),
    estimate: t('item.label.estimate'),
    workers: t('item.label.workers'),
    reviewer: t('item.label.reviewer'),
    noEstimate: t('item.label.noEstimate'),
  };
}

export function markerOf(item: ItemView): ItemStatus {
  if (item.status === 'backlog' || item.status === 'todo') return 'todo';
  if (item.status === 'doing') return item.blocked ? 'blocked' : item.waitingForPair ? 'waiting' : 'doing';
  if (item.status === 'review') return 'review';
  return 'done';
}

export function statusText(item: ItemView, t: Translate): string {
  if (item.status === 'backlog') return t('item.status.backlog');
  return t(key(`item.status.${markerOf(item)}`));
}

export function minutes(ms: number, t: Translate): string {
  return t('common.minutes', { count: Math.round(ms / 60_000) });
}
