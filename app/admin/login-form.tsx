"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Callout, Field } from "@/components/ui";
import { loginAction, type LoginState } from "./actions";

const INITIAL: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);

  return (
    <form
      action={formAction}
      className="mx-auto flex w-full max-w-[340px] flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-col gap-1">
        <h1 className="display text-[22px]">Guest list</h1>
        <p className="text-[13px] text-muted-foreground">Organisers only.</p>
      </div>

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        enterKeyHint="go"
        autoFocus
        required
        error={state.error}
      />

      {!state.error && <Callout tone="neutral">Set in <code>ADMIN_PASSWORD</code>.</Callout>}

      <Button type="submit" disabled={pending} className="h-12 w-full text-[15px] font-semibold">
        {pending ? "Checking…" : "Open the list"}
      </Button>
    </form>
  );
}
