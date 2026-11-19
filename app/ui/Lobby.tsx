import { Avatar, type AvatarProps } from './Avatar.tsx';
import { Button, IconButton } from './Button.tsx';
import { cx } from './cx.ts';

export interface RoomCodeProps {
  code: string;
  label: string;
  copyLabel: string;
  copied?: boolean;
  copiedLabel?: string;
  onCopy?: () => void;
}

/**
 * Room code shown as five large mono tiles with a copy button.
 */
export function RoomCode({ code, label, copyLabel, copied = false, copiedLabel, onCopy }: RoomCodeProps) {
  return (
    <div class="lg-roomcode">
      <p class="lg-roomcode__label">{label}</p>
      <p class="lg-roomcode__code" aria-label={code.split('').join(' ')}>
        {code.split('').map((letter, index) => (
          <span key={index} class="lg-roomcode__tile" aria-hidden="true">
            {letter}
          </span>
        ))}
      </p>
      <Button variant="secondary" size="sm" icon={copied ? 'check' : 'copy'} onClick={onCopy}>
        {copied && copiedLabel ? copiedLabel : copyLabel}
      </Button>
    </div>
  );
}

export interface PlayerRemoval {
  label: string;
  confirmText: string;
  confirmLabel: string;
  cancelLabel: string;
  confirming: boolean;
  onAsk: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface PlayerRowProps {
  player: AvatarProps;
  status?: string;
  removal?: PlayerRemoval;
}

export interface PlayerListProps {
  title: string;
  rows: PlayerRowProps[];
  emptySeats: number;
  emptyLabel: string;
}

/**
 * Lobby list of the seated players with their roles, and the seats still empty.
 */
export function PlayerList({ title, rows, emptySeats, emptyLabel }: PlayerListProps) {
  return (
    <ul class="lg-players" aria-label={title}>
      {rows.map((row) => (
        <li key={row.player.name} class={cx('lg-players__row', row.player.disconnected && 'is-off')}>
          <Avatar {...row.player} size="md" showName />
          {row.status ? <span class="lg-players__status">{row.status}</span> : null}
          {row.removal === undefined ? null : row.removal.confirming ? (
            <span class="lg-players__remove" role="group" aria-label={row.removal.confirmText}>
              <span class="lg-players__ask">{row.removal.confirmText}</span>
              <Button variant="danger" size="sm" onClick={row.removal.onConfirm}>
                {row.removal.confirmLabel}
              </Button>
              <Button variant="quiet" size="sm" onClick={row.removal.onCancel}>
                {row.removal.cancelLabel}
              </Button>
            </span>
          ) : (
            <IconButton icon="x" label={row.removal.label} onClick={row.removal.onAsk} />
          )}
        </li>
      ))}
      {Array.from({ length: emptySeats }, (_, index) => (
        <li key={`e${index}`} class="lg-players__row is-empty">
          <Avatar name={emptyLabel} empty size="md" showName />
        </li>
      ))}
    </ul>
  );
}
