"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { IconSpinner, IconX } from "@/components/icons";
import type { RegistrationStatus } from "@/lib/registrations";
import { setStatusAction } from "./actions";

const TONE: Record<RegistrationStatus, string> = {
  paid: "border-ok/30 text-ok hover:bg-ok-surface",
  pending: "border-border text-subtle-foreground hover:text-foreground",
  submitted: "border-warn/30 text-warn hover:bg-warn-surface",
  cancelled: "border-border text-subtle-foreground hover:border-danger/40 hover:text-danger",
};

const BASE =
  "rounded-lg border px-2.5 py-1.5 text-[12px] font-medium whitespace-nowrap transition-colors disabled:opacity-50";

/**
 * A status change that is awkward to undo asks once, inline.
 *
 * Deliberately not a modal — this is one cell in a table the organiser is
 * scanning at a door, and interrupting the whole page to confirm a single row
 * is heavier than the action deserves. Deliberately not window.confirm either,
 * which ignores the design system and reads as a browser error on a phone.
 *
 * The armed state disarms itself after a few seconds, so a mis-tap that gets
 * abandoned never leaves a primed destructive button sitting in the table.
 */
export function StatusButton({
  id,
  next,
  label,
  confirm,
}: {
  id: string;
  next: RegistrationStatus;
  label: string;
  /** When set, the first click arms and this becomes the confirming label. */
  confirm?: string;
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function arm() {
    setArmed(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setArmed(false), 5000);
  }

  function disarm() {
    if (timer.current) clearTimeout(timer.current);
    setArmed(false);
  }

  if (confirm && !armed) {
    return (
      <button type="button" onClick={arm} className={`${BASE} ${TONE[next]}`}>
        {label}
      </button>
    );
  }

  return (
    <form action={setStatusAction} className="inline-flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={next} />

      <Submit
        label={confirm ?? label}
        className={
          confirm
            ? // /70 is the floor that clears 3:1 against the card, so the armed
              // state is identifiable by its outline alone.
              `${BASE} border-danger/70 bg-danger-surface text-danger`
            : `${BASE} ${TONE[next]}`
        }
      />

      {confirm && (
        <button
          type="button"
          onClick={disarm}
          aria-label={`Leave it as it is`}
          className="text-subtle-foreground hover:text-foreground rounded-md p-1 transition-colors"
        >
          <IconX className="size-3.5" />
        </button>
      )}
    </form>
  );
}

function Submit({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className} autoFocus>
      {pending ? (
        <span className="inline-flex items-center gap-1.5">
          <IconSpinner className="size-3.5 animate-spin" />
          Saving
        </span>
      ) : (
        label
      )}
    </button>
  );
}
