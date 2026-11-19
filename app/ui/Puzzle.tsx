import type { ComponentChildren } from 'preact';
import { Button, IconButton } from './Button.tsx';
import { ChipChoice } from './Field.tsx';
import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';
import { StatusMarker, type ItemStatus } from './Status.tsx';

export interface ItemWorkspaceProps {
  id: string;
  subject: string;
  kindLabel: string;
  status: ItemStatus;
  statusLabel: string;
  theme?: string;
  goalTheme?: boolean;
  closeLabel: string;
  roleNote?: string;
  children?: ComponentChildren;
  footer?: ComponentChildren;
  onClose?: () => void;
}

/**
 * Frame of the item workspace: item header, the puzzle body and a footer for the submit or verdict controls.
 */
export function ItemWorkspace({ id, subject, kindLabel, status, statusLabel, theme, goalTheme, closeLabel, roleNote, children, footer, onClose }: ItemWorkspaceProps) {
  return (
    <section class="lg-ws" aria-labelledby="lg-ws-title">
      <header class="lg-ws__head">
        <div class="lg-ws__ident">
          <span class="lg-ws__id">{id}</span>
          <h3 id="lg-ws-title" class="lg-ws__subject" tabIndex={-1}>
            {subject}
          </h3>
        </div>
        <StatusMarker status={status} label={statusLabel} />
        <span class="lg-ws__kind">{kindLabel}</span>
        {theme ? <span class={cx('lg-item__theme', goalTheme && 'is-goal')}>{theme}</span> : null}
        <IconButton icon="x" label={closeLabel} onClick={onClose} />
      </header>
      {roleNote ? <p class="lg-ws__role">{roleNote}</p> : null}
      <div class="lg-ws__body">{children}</div>
      {footer ? <footer class="lg-ws__foot">{footer}</footer> : null}
    </section>
  );
}

export interface ConfigLine {
  key: string;
  value: string;
  marked?: boolean;
}

export interface ConfigListingProps {
  file: string;
  lines: ConfigLine[];
  markLabel: (key: string) => string;
  markedLabel: string;
  readOnly?: boolean;
  onToggle?: (key: string) => void;
}

/**
 * Configuration file as a numbered listing in which each line can be marked as differing from the other copy.
 */
export function ConfigListing({ file, lines, markLabel, markedLabel, readOnly = false, onToggle }: ConfigListingProps) {
  return (
    <figure class="lg-code">
      <figcaption class="lg-code__file">
        <Icon name="diff" size={14} />
        <span>{file}</span>
      </figcaption>
      <ol class="lg-code__lines">
        {lines.map((line, index) => (
          <li key={line.key} class={cx('lg-code__line', line.marked && 'is-marked')}>
            <span class="lg-code__no" aria-hidden="true">
              {index + 1}
            </span>
            <code class="lg-code__text">
              <span class="lg-code__key">{line.key}</span>
              <span class="lg-code__eq">=</span>
              <span class="lg-code__val">{line.value}</span>
            </code>
            {readOnly ? (
              line.marked ? (
                <span class="lg-code__flag">
                  <span aria-hidden="true">≠</span>
                  <span class="lg-sr">{markedLabel}</span>
                </span>
              ) : null
            ) : (
              <button
                type="button"
                class="lg-code__mark"
                aria-pressed={line.marked ? 'true' : 'false'}
                aria-label={markLabel(line.key)}
                onClick={() => onToggle?.(line.key)}
              >
                {line.marked ? <Icon name="check" size={14} /> : null}
                <span class="lg-code__mark-text" aria-hidden="true">
                  {line.marked ? markedLabel : '≠'}
                </span>
              </button>
            )}
          </li>
        ))}
      </ol>
    </figure>
  );
}

export interface OrderEntry {
  id: string;
  label: string;
  rule?: string;
}

export interface OrderListProps {
  legend: string;
  items: OrderEntry[];
  moveUpLabel: (label: string) => string;
  moveDownLabel: (label: string) => string;
  onMove?: (index: number, delta: -1 | 1) => void;
}

/**
 * Ordering list with move-up and move-down buttons on every row; dragging is never required.
 */
export function OrderList({ legend, items, moveUpLabel, moveDownLabel, onMove }: OrderListProps) {
  return (
    <div class="lg-order">
      <p class="lg-order__legend">{legend}</p>
      <ol class="lg-order__list">
        {items.map((item, index) => (
          <li key={item.id} class="lg-order__row">
            <span class="lg-order__pos">{index + 1}</span>
            <code class="lg-order__name">{item.label}</code>
            <span class="lg-order__moves">
              <IconButton icon="up" label={moveUpLabel(item.label)} variant="secondary" disabled={index === 0} onClick={() => onMove?.(index, -1)} />
              <IconButton
                icon="down"
                label={moveDownLabel(item.label)}
                variant="secondary"
                disabled={index === items.length - 1}
                onClick={() => onMove?.(index, 1)}
              />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export interface ReadingsProps {
  title: string;
  readings: { key: string; value: string }[];
  rulesTitle: string;
  rules: { n: number; when: string; hint?: string }[];
  actionLegend: string;
  actions: string[];
  chosen?: string;
  name: string;
  actionLabel?: (value: string) => string;
  readOnly?: boolean;
  onChoose?: (value: string) => void;
}

/**
 * Incident panel: the readings, the numbered rules, and one choice of action out of the list.
 */
export function ReadingsRules({ title, readings, rulesTitle, rules, actionLegend, actions, chosen, name, actionLabel, readOnly, onChoose }: ReadingsProps) {
  return (
    <div class="lg-rules">
      <div class="lg-rules__col">
        <h4 class="lg-rules__title">{title}</h4>
        <dl class="lg-rules__readings">
          {readings.map((reading) => (
            <div key={reading.key}>
              <dt>{reading.key}</dt>
              <dd>{reading.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div class="lg-rules__col">
        <h4 class="lg-rules__title">{rulesTitle}</h4>
        <ol class="lg-rules__list">
          {rules.map((rule) => (
            <li key={rule.n}>
              <span class="lg-rules__n">{rule.n}</span>
              <code>{rule.when}</code>
              {rule.hint ? <span class="lg-rules__then">{rule.hint}</span> : null}
            </li>
          ))}
        </ol>
      </div>
      <div class="lg-rules__act">
        <ChipChoice
          legend={actionLegend}
          name={name}
          options={actions.map((a) => ({ value: a, label: actionLabel ? actionLabel(a) : a }))}
          value={chosen}
          disabled={readOnly}
          onChange={onChoose}
        />
      </div>
    </div>
  );
}

export interface MergeRow {
  n: number;
  base: string;
  ours?: string;
  theirs?: string;
  value: string;
}

export interface MergeTableProps {
  caption: string;
  columns: { line: string; base: string; ours: string; theirs: string; result: string };
  rows: MergeRow[];
  resultLabel: (n: number) => string;
  hidden?: 'ours' | 'theirs';
  hiddenLabel?: string;
  sameLabel?: string;
  readOnly?: boolean;
  onInput?: (n: number, value: string) => void;
}

/**
 * Merge table: the base file, each side's change and one value field per line.
 */
export function MergeTable({ caption, columns, rows, resultLabel, hidden, hiddenLabel, sameLabel, readOnly, onInput }: MergeTableProps) {
  return (
    <div class="lg-merge">
      <table class="lg-merge__table">
        <caption class="lg-sr">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{columns.line}</th>
            <th scope="col">{columns.base}</th>
            <th scope="col">{columns.ours}</th>
            <th scope="col">{columns.theirs}</th>
            <th scope="col">{columns.result}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.n}>
              <th scope="row" class="lg-merge__n">
                {row.n}
              </th>
              <td data-label={columns.base}>
                <code>{row.base}</code>
              </td>
              <td data-label={columns.ours} class={cx(row.ours && 'is-changed')}>
                {hidden === 'ours' ? <span class="lg-merge__hidden">{hiddenLabel ?? '?'}</span> : row.ours ? <code>{row.ours}</code> : <span class="lg-merge__same" role="img" aria-label={sameLabel ?? 'unchanged'}>·</span>}
              </td>
              <td data-label={columns.theirs} class={cx(row.theirs && 'is-changed')}>
                {hidden === 'theirs' ? <span class="lg-merge__hidden">{hiddenLabel ?? '?'}</span> : row.theirs ? <code>{row.theirs}</code> : <span class="lg-merge__same" role="img" aria-label={sameLabel ?? 'unchanged'}>·</span>}
              </td>
              <td data-label={columns.result}>
                <input
                  class="lg-input lg-input--mono lg-input--cell"
                  type="text"
                  value={row.value}
                  aria-label={resultLabel(row.n)}
                  autocomplete="off"
                  inputMode="numeric"
                  readOnly={readOnly}
                  onInput={(event) => onInput?.(row.n, (event.currentTarget as HTMLInputElement).value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface SwitchingProps {
  label: string;
  detail: string;
  remaining: string;
  fraction: number;
}

/**
 * Shown while a context switch is running: nothing of the item is visible until the bar is full.
 */
export function SwitchingContext({ label, detail, remaining, fraction }: SwitchingProps) {
  return (
    <div class="lg-switching" role="status">
      <Icon name="switch" size={28} class="lg-switching__icon" />
      <p class="lg-switching__label">{label}</p>
      <p class="lg-switching__detail">{detail}</p>
      <div class="lg-switching__bar" aria-hidden="true">
        <span style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }} />
      </div>
      <p class="lg-switching__time" aria-hidden="true">
        {remaining}
      </p>
    </div>
  );
}

export interface VerdictBarProps {
  prompt: string;
  lgtmLabel: string;
  changesLabel: string;
  note?: string;
  disabled?: boolean;
  onLgtm?: () => void;
  onChanges?: () => void;
}

/**
 * Reviewer's verdict bar with the two answers a review can end in: LGTM and Request changes.
 */
export function VerdictBar({ prompt, lgtmLabel, changesLabel, note, disabled, onLgtm, onChanges }: VerdictBarProps) {
  return (
    <div class="lg-verdict">
      <div class="lg-verdict__text">
        <p class="lg-verdict__prompt">{prompt}</p>
        {note ? <p class="lg-verdict__note">{note}</p> : null}
      </div>
      <div class="lg-verdict__btns">
        <Button variant="approve" size="lg" icon="check" disabled={disabled} onClick={onLgtm}>
          {lgtmLabel}
        </Button>
        <Button variant="danger" size="lg" icon="x" disabled={disabled} onClick={onChanges}>
          {changesLabel}
        </Button>
      </div>
    </div>
  );
}

export interface InfoHeldProps {
  title: string;
  hint: string;
  items: { itemId: string; subject: string; text: ComponentChildren }[];
  itemLabel: string;
}

/**
 * The "info you hold" list: one piece of information per item, labelled with the item id, for a player outside the item.
 */
export function InfoHeld({ title, hint, items, itemLabel }: InfoHeldProps) {
  return (
    <aside class="lg-info" aria-label={title}>
      <header class="lg-info__head">
        <Icon name="lock" size={16} />
        <h3 class="lg-info__title">{title}</h3>
      </header>
      <p class="lg-info__hint">{hint}</p>
      <ul class="lg-info__list">
        {items.map((item) => (
          <li key={item.itemId} class="lg-info__item">
            <p class="lg-info__for">
              <span class="lg-sr">{itemLabel} </span>
              <span class="lg-info__id">{item.itemId}</span>
              <span class="lg-info__subject">{item.subject}</span>
            </p>
            <div class="lg-info__text">{item.text}</div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
