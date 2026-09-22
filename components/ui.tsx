import type { ComponentProps, ReactNode } from "react";

import { IconAlert, IconSpinner } from "./icons";

/* ── Button ──────────────────────────────────────────────────────────────── */

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost";
  pending?: boolean;
  size?: "md" | "lg";
};

const BUTTON_BASE =
  "relative inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold " +
  "transition-[transform,background-color,border-color,box-shadow,opacity] duration-150 " +
  "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45";

const BUTTON_VARIANT: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-accent text-accent-ink shadow-[var(--shadow-accent)] hover:bg-accent-bright hover:text-ink",
  secondary:
    "bg-surface-2 text-content border border-line hover:border-line-strong hover:bg-surface-3",
  ghost: "text-content-2 hover:text-content hover:bg-surface-2",
};

export function Button({
  variant = "primary",
  size = "lg",
  pending = false,
  className = "",
  children,
  disabled,
  ...rest
}: ButtonProps) {
  // 52px tall — comfortably past the 44px touch minimum, one-handed, outdoors.
  const sizing = size === "lg" ? "h-[52px] px-6 text-[15px]" : "h-11 px-4 text-sm";

  return (
    <button
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`${BUTTON_BASE} ${BUTTON_VARIANT[variant]} ${sizing} ${className}`}
    >
      {pending && <IconSpinner className="size-[18px] animate-spin" />}
      {children}
    </button>
  );
}

/* ── Field ───────────────────────────────────────────────────────────────── */

type FieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: string;
  prefix?: string;
};

export function Field({ label, error, hint, prefix, id, className = "", ...rest }: FieldProps) {
  const inputId = id ?? rest.name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-content-2 text-[13px] font-medium">
        {label}
      </label>

      <div
        className={`group flex items-center rounded-xl border bg-surface-2 transition-colors duration-150 focus-within:border-accent ${
          error ? "border-danger/60" : "border-line hover:border-line-strong"
        }`}
      >
        {prefix && (
          <span className="tnum text-content-3 shrink-0 border-r border-line py-3.5 pr-3 pl-3.5 text-[15px]">
            {prefix}
          </span>
        )}
        <input
          {...rest}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full bg-transparent px-3.5 py-3.5 text-[16px] outline-none placeholder:text-content-3 ${className}`}
        />
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="text-danger flex items-start gap-1.5 text-[13px]">
          <IconAlert className="mt-px size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-content-3 text-[13px]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ── Callout ─────────────────────────────────────────────────────────────── */

const CALLOUT_TONE = {
  warn: "border-warn/30 bg-warn/[0.07] text-warn",
  danger: "border-danger/30 bg-danger/[0.07] text-danger",
  neutral: "border-line bg-surface-2 text-content-2",
} as const;

export function Callout({
  tone = "neutral",
  icon,
  children,
}: {
  tone?: keyof typeof CALLOUT_TONE;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed ${CALLOUT_TONE[tone]}`}
    >
      {icon ?? <IconAlert className="mt-px size-4 shrink-0" />}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ── Ruled row ───────────────────────────────────────────────────────────── */

/** A label/value pair on a hairline. Values are tabular so they never jitter. */
export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-b-0">
      <span className="text-content-3 text-[13px]">{label}</span>
      <span className="tnum text-content text-right text-[14px] font-medium">{value}</span>
    </div>
  );
}
