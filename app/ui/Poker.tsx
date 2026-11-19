import { cx } from './cx.ts';

export interface PokerCardProps {
  value?: number | string;
  faceDown?: boolean;
  chosen?: boolean;
  revealing?: boolean;
  owner?: string;
  ownerNumber?: number;
  label: string;
  selectable?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

/**
 * Planning-poker card that turns over at the reveal; as a selectable hand card it is a real button.
 */
export function PokerCard({ value, faceDown = false, chosen = false, revealing = false, owner, ownerNumber, label, selectable = false, disabled = false, onSelect }: PokerCardProps) {
  const face = (
    <span class="lg-poker__inner">
      <span class="lg-poker__face lg-poker__front">
        <span class="lg-poker__corner">{value}</span>
        <span class="lg-poker__value">{value}</span>
        <span class="lg-poker__corner lg-poker__corner--end">{value}</span>
      </span>
      <span class="lg-poker__face lg-poker__back" aria-hidden="true">
        <span class="lg-poker__mark">2P</span>
      </span>
    </span>
  );
  const classes = cx('lg-poker', faceDown && 'is-down', chosen && 'is-chosen', revealing && 'is-revealing');
  return (
    <span class="lg-poker-seat">
      {selectable ? (
        <button type="button" class={classes} aria-pressed={chosen ? 'true' : 'false'} aria-label={label} disabled={disabled} onClick={onSelect}>
          {face}
        </button>
      ) : (
        <span class={classes} role="img" aria-label={label}>
          {face}
        </span>
      )}
      {owner ? (
        <span class="lg-poker-seat__owner">
          {ownerNumber !== undefined ? <span class="lg-poker-seat__n">{ownerNumber}</span> : null}
          {owner}
        </span>
      ) : null}
    </span>
  );
}

export interface GoalOptionProps {
  name: string;
  value: string;
  title: string;
  description: string;
  bonus: string;
  checked: boolean;
  onChange?: (value: string) => void;
}

/**
 * Selectable Sprint Goal offer: a radio input wrapped in a card with the goal, its rule and its bonus.
 */
export function GoalOption({ name, value, title, description, bonus, checked, onChange }: GoalOptionProps) {
  return (
    <label class={cx('lg-goal', checked && 'is-checked')}>
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange?.(value)} />
      <span class="lg-goal__body">
        <span class="lg-goal__title">{title}</span>
        <span class="lg-goal__desc">{description}</span>
      </span>
      <span class="lg-goal__bonus">{bonus}</span>
    </label>
  );
}
