import type { ComponentChildren } from 'preact';
import { cx } from './cx.ts';
import { Icon, type IconName } from './Icon.tsx';

export interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  maxLength?: number;
  counterLabel?: (used: number, max: number) => string;
  hint?: string;
  error?: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  mono?: boolean;
  uppercase?: boolean;
  inputMode?: 'text' | 'numeric' | 'decimal';
  disabled?: boolean;
  class?: string;
  onInput?: (value: string) => void;
}

/**
 * Labelled text input or textarea with an optional character counter, hint and error.
 */
export function TextField({
  id,
  label,
  value,
  maxLength,
  counterLabel,
  hint,
  error,
  placeholder,
  multiline = false,
  rows = 3,
  mono = false,
  uppercase = false,
  inputMode,
  disabled,
  class: className,
  onInput,
}: TextFieldProps) {
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : '', maxLength ? `${id}-count` : ''].filter(Boolean).join(' ');
  const common = {
    id,
    value,
    placeholder,
    disabled,
    maxLength,
    inputMode,
    'aria-invalid': error ? ('true' as const) : undefined,
    'aria-describedby': describedBy || undefined,
    class: cx('lg-input', mono && 'lg-input--mono', uppercase && 'lg-input--upper'),
    onInput: (event: Event) => onInput?.((event.currentTarget as HTMLInputElement).value),
  };
  const used = value.length;
  const nearLimit = maxLength !== undefined && used >= maxLength * 0.9;
  return (
    <div class={cx('lg-field', error && 'has-error', className)}>
      <div class="lg-field__top">
        <label class="lg-field__label" for={id}>
          {label}
        </label>
        {maxLength ? (
          <span id={`${id}-count`} class={cx('lg-field__count', nearLimit && 'is-near')}>
            {counterLabel ? counterLabel(used, maxLength) : `${used}/${maxLength}`}
          </span>
        ) : null}
      </div>
      {multiline ? <textarea {...common} rows={rows} /> : <input {...common} type="text" autocomplete="off" />}
      {hint ? (
        <p id={`${id}-hint`} class="lg-field__hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} class="lg-field__error">
          <Icon name="warning" size={16} />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

export interface SegmentOption {
  value: string;
  label: string;
  icon?: IconName;
  hideLabel?: boolean;
}

export interface SegmentedProps {
  legend: string;
  name: string;
  options: SegmentOption[];
  value: string;
  compact?: boolean;
  onChange?: (value: string) => void;
}

/**
 * Two-to-three way toggle built from real radio inputs, used for language, theme and framework.
 */
export function Segmented({ legend, name, options, value, compact = false, onChange }: SegmentedProps) {
  return (
    <fieldset class={cx('lg-seg', compact && 'lg-seg--compact')}>
      <legend class="lg-sr">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} class="lg-seg__opt">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange?.(option.value)}
          />
          <span class="lg-seg__face">
            {option.icon ? <Icon name={option.icon} size={16} /> : null}
            <span class={option.hideLabel ? 'lg-sr' : undefined}>{option.label}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export interface ChipChoiceProps {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  value?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}

/**
 * Wrapping group of radio chips, for choosing one action out of several.
 */
export function ChipChoice({ legend, name, options, value, disabled, onChange }: ChipChoiceProps) {
  return (
    <fieldset class="lg-chips">
      <legend class="lg-chips__legend">{legend}</legend>
      <div class="lg-chips__row">
        {options.map((option) => (
          <label key={option.value} class="lg-chip">
            <input type="radio" name={name} value={option.value} checked={option.value === value} disabled={disabled} onChange={() => onChange?.(option.value)} />
            <span class="lg-chip__face">{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export interface FieldGroupProps {
  children?: ComponentChildren;
}

/**
 * Vertical stack that spaces form fields evenly.
 */
export function FieldGroup({ children }: FieldGroupProps) {
  return <div class="lg-fields">{children}</div>;
}
