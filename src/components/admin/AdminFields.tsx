import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * The design system's field surface (FieldShell's controlSurfaceClasses),
 * repeated here because FieldShell is a client module and these controls
 * also render in server components, such as the users filter form.
 */
function controlSurfaceClasses(state: { error?: boolean; disabled?: boolean }): string {
  return cn(
    'w-full rounded-md bg-surface text-text-primary',
    'border-[length:var(--bds-border-width-functional)] border-stroke',
    'placeholder:text-text-placeholder',
    'transition-colors duration-fast ease-standard',
    'focus:border-2 focus:border-stroke-focus focus:outline-none',
    'focus-visible:outline-3 focus-visible:outline-stroke-focus focus-visible:outline-offset-2',
    state.error && 'border-stroke-error',
    state.disabled && 'bg-surface-disabled text-text-disabled border-stroke-disabled cursor-not-allowed',
  );
}

/**
 * Plain labelled controls for admin forms: native elements styled like the
 * design-system fields. Native because the filter forms submit with GET and
 * work without JavaScript, and because dense admin forms need compact fields.
 */

function Label({ htmlFor, label, hint, error }: { htmlFor: string; label: string; hint?: ReactNode; error?: string }) {
  return (
    <>
      <label htmlFor={htmlFor} className="type-label-md text-text-primary">
        {label}
      </label>
      {hint ? <span className="type-caption text-text-secondary">{hint}</span> : null}
      {error ? (
        <span className="type-caption font-semibold text-text-error" role="alert">
          {error}
        </span>
      ) : null}
    </>
  );
}

export function NativeSelect({
  id,
  label,
  hint,
  error,
  options,
  className,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  readonly id: string;
  readonly label: string;
  readonly hint?: ReactNode;
  readonly error?: string;
  readonly options: readonly { value: string; label: string }[];
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <Label htmlFor={id} label={label} hint={hint} error={error} />
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(controlSurfaceClasses({ error: Boolean(error), disabled: rest.disabled }), 'type-body-md min-h-12 px-3')}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PlainInput({
  id,
  label,
  hint,
  error,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { readonly id: string; readonly label: string; readonly hint?: ReactNode; readonly error?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <Label htmlFor={id} label={label} hint={hint} error={error} />
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(controlSurfaceClasses({ error: Boolean(error), disabled: rest.disabled }), 'type-body-md min-h-12 px-3')}
        {...rest}
      />
    </div>
  );
}

export function PlainTextarea({
  id,
  label,
  hint,
  error,
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { readonly id: string; readonly label: string; readonly hint?: ReactNode; readonly error?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <Label htmlFor={id} label={label} hint={hint} error={error} />
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(controlSurfaceClasses({ error: Boolean(error), disabled: rest.disabled }), 'type-body-md min-h-24 px-3 py-2')}
        {...rest}
      />
    </div>
  );
}
