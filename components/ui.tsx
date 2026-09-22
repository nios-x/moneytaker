import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { IconAlert } from "./icons";

/* ── Field ───────────────────────────────────────────────────────────────── */

type FieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: string;
  prefix?: string;
};

export function Field({ label, error, hint, prefix, id, className, ...rest }: FieldProps) {
  const inputId = id ?? rest.name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[13px] font-medium text-foreground">
        {label}
      </label>

      <div
        className={cn(
          "flex items-center rounded-xl border bg-card transition-[border-color,box-shadow] duration-150",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/25",
          error ? "border-danger/60" : "border-input hover:border-border-strong",
        )}
      >
        {prefix && (
          <span className="tnum shrink-0 border-r border-input py-3 pr-3 pl-3.5 text-[15px] text-subtle-foreground">
            {prefix}
          </span>
        )}
        <input
          {...rest}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          // 16px keeps iOS from zooming the whole page on focus.
          className={cn(
            "w-full rounded-xl bg-transparent px-3.5 py-3 text-[16px] outline-none placeholder:text-subtle-foreground",
            className,
          )}
        />
      </div>

      {error ? (
        <p id={`${inputId}-error`} className="flex items-start gap-1.5 text-[13px] text-danger">
          <IconAlert className="mt-px size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-[13px] text-subtle-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ── Callout ─────────────────────────────────────────────────────────────── */

const CALLOUT_TONE = {
  warn: "border-warn/25 bg-warn-surface text-warn",
  danger: "border-danger/25 bg-danger-surface text-danger",
  ok: "border-ok/25 bg-ok-surface text-ok",
  neutral: "border-border bg-muted text-muted-foreground",
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
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed",
        CALLOUT_TONE[tone],
      )}
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
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="tnum text-right text-[14px] font-medium text-foreground">{value}</span>
    </div>
  );
}
