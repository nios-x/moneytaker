"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useFormStatus } from "react-dom";

import {
  getTicketAction,
  registerAction,
  submitUtrAction,
  type RegisterState,
  type Ticket,
  type UtrState,
} from "@/app/actions";
import { cn } from "@/lib/utils";
import type { Availability } from "@/lib/registrations";
import {
  IconAlert,
  IconArrow,
  IconBack,
  IconCheck,
  IconClock,
  IconCopy,
  IconMail,
  IconSpinner,
} from "./icons";
import { Button } from "./ui/button";
import { Callout, Field, Row } from "./ui";

type Step = "details" | "pay" | "utr" | "done";

const STORAGE_KEY = "sbc.registration.v1";

export type Prices = Record<"male" | "female", number>;

export const inr = (rupees: number) => `₹${rupees.toLocaleString("en-IN")}`;

/** 48px tall: past the 44px touch floor, for a thumb, outdoors, one-handed. */
const CTA = "h-12 w-full text-[15px] font-semibold";

export function RegisterFlow({
  availability: initialAvailability,
  organiserEmail,
  // Passed from the server rather than duplicated here. The price the button
  // promises and the price the QR charges must come from one place.
  prices,
}: {
  availability: Availability;
  organiserEmail: string;
  prices: Prices;
}) {
  const [step, setStep] = useState<Step>("details");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [availability, setAvailability] = useState(initialAvailability);
  const [resumeSettled, setResumeSettled] = useState(false);

  // Reads localStorage without breaking hydration: the server snapshot is
  // always null, so the form itself is server-rendered and a first-time
  // visitor from Instagram sees the real thing instead of a skeleton. Only
  // someone who already has a registration stored pays the loading cost.
  const storedRaw = useSyncExternalStore(subscribeNever, readStored, readStoredOnServer);

  // The guest leaves for GPay and comes back — often to a cold page. Put them
  // back exactly where they were.
  useEffect(() => {
    const stored = parseStored(storedRaw);
    if (!stored) return;

    let cancelled = false;

    void getTicketAction(stored.id)
      .then((found) => {
        if (cancelled) return;
        if (found) {
          setTicket(found);
          // The database decides, not localStorage. Trusting the stored step
          // would show the QR again to someone whose payment is already
          // recorded — inviting them to pay a second time.
          setStep(stepForStatus(found.status));
        } else {
          safeClear();
        }
      })
      .catch(() => {
        // Offline or the action failed. Fall through to the form rather than
        // stranding them on a skeleton.
      })
      .finally(() => {
        if (!cancelled) setResumeSettled(true);
      });

    return () => {
      cancelled = true;
    };
  }, [storedRaw]);

  const restoring = Boolean(storedRaw) && !resumeSettled && !ticket;

  function onIssued(next: Ticket, nextAvailability?: Availability) {
    setTicket(next);
    if (nextAvailability) setAvailability(nextAvailability);
    safeWrite({ id: next.id, step: "pay" });
    setStep("pay");
  }

  function onConfirmed(updated?: Ticket) {
    if (updated) setTicket(updated);
    const id = updated?.id ?? ticket?.id;
    if (id) safeWrite({ id, step: "done" });
    setStep("done");
  }

  if (restoring) return <FlowSkeleton />;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <Stepper step={step} />

      <div className="p-5 sm:p-6">
        {step === "details" && (
          <DetailsStep availability={availability} prices={prices} onIssued={onIssued} />
        )}

        {step === "pay" && ticket && (
          <PayStep
            ticket={ticket}
            onProceed={() => setStep("utr")}
            onRestart={() => {
              safeClear();
              setTicket(null);
              setStep("details");
            }}
          />
        )}

        {step === "utr" && ticket && (
          <UtrStep ticket={ticket} onBack={() => setStep("pay")} onConfirmed={onConfirmed} />
        )}

        {step === "done" && ticket && (
          <DoneStep ticket={ticket} organiserEmail={organiserEmail} />
        )}
      </div>
    </div>
  );
}

/* ── Step 1 · details ────────────────────────────────────────────────────── */

const REGISTER_INITIAL: RegisterState = { ok: false };

function DetailsStep({
  availability,
  prices,
  onIssued,
}: {
  availability: Availability;
  prices: Prices;
  onIssued: (t: Ticket, a?: Availability) => void;
}) {
  const [state, formAction] = useActionState(registerAction, REGISTER_INITIAL);
  const [gender, setGender] = useState<"male" | "female" | "">("");

  useEffect(() => {
    if (state.ok && state.ticket) onIssued(state.ticket, state.availability);
  }, [state, onIssued]);

  const live = state.availability ?? availability;
  const shown = state.prices ?? prices;
  const showCounts = !live.unavailable;
  const soldOut = showCounts && live.soldOut;

  if (soldOut) {
    return (
      <div className="step-in flex flex-col gap-4">
        <h2 className="display text-[26px]">That&rsquo;s a full house.</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Every spot is taken. We keep the numbers small on purpose — it&rsquo;s the whole
          reason the night works.
        </p>
        <Callout tone="neutral" icon={<IconMail className="mt-px size-4 shrink-0" />}>
          Email us to go on the waitlist. People drop out, and we fill those spots first.
        </Callout>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate className="step-in flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="display text-[26px]">Get your spot</h2>
        <p className="text-[14px] text-muted-foreground">
          Takes about a minute. You pay by UPI on the next screen.
        </p>
      </div>

      <Field
        label="Your name"
        name="name"
        autoComplete="name"
        enterKeyHint="next"
        placeholder="The name you'll use at the door"
        maxLength={80}
        required
        error={state.errors?.name}
      />

      <Field
        label="Phone"
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        enterKeyHint="next"
        prefix="+91"
        placeholder="98765 43210"
        maxLength={14}
        required
        className="tnum"
        error={state.errors?.phone}
      />

      <Field
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        enterKeyHint="next"
        placeholder="you@example.com"
        maxLength={160}
        required
        error={state.errors?.email}
        hint="Your confirmation and the venue both arrive here."
      />

      {/* What the button promises. The server compares and refuses a mismatch. */}
      <input type="hidden" name="shownPrice" value={gender ? shown[gender] : ""} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-medium text-foreground">Entry</legend>

        <div className="grid grid-cols-2 gap-2.5">
          {(["female", "male"] as const).map((g) => {
            const left = live.left[g];
            const out = showCounts && left <= 0;
            const selected = gender === g;

            return (
              <label
                key={g}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-all duration-150",
                  "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/30",
                  out
                    ? "cursor-not-allowed border-border bg-muted/50 opacity-60"
                    : selected
                      ? "border-primary bg-accent shadow-[var(--shadow-raised)]"
                      : "border-border bg-card hover:border-border-strong hover:bg-muted/40",
                )}
              >
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  disabled={out}
                  required
                  checked={selected}
                  onChange={() => setGender(g)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "text-[12px] capitalize",
                    selected ? "text-accent-foreground" : "text-muted-foreground",
                  )}
                >
                  {g}
                </span>
                <span
                  className={cn(
                    "tnum display text-[22px]",
                    selected ? "text-accent-foreground" : "text-foreground",
                  )}
                >
                  {inr(shown[g])}
                </span>
                {showCounts && (
                  <span
                    className={cn(
                      "tnum text-[11px]",
                      out
                        ? "text-subtle-foreground"
                        : left <= 5
                          ? "text-warn"
                          : "text-subtle-foreground",
                    )}
                  >
                    {out ? "Full" : `${left} left`}
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {state.errors?.gender && (
          <p className="text-[13px] text-danger">{state.errors.gender}</p>
        )}
      </fieldset>

      {state.formError && <Callout tone="danger">{state.formError}</Callout>}

      <SubmitButton
        idle={
          <>
            {gender ? `Continue to pay ${inr(shown[gender])}` : "Continue to pay"}
            <IconArrow className="size-[18px]" />
          </>
        }
        busy="Holding your spot…"
      />

      <p className="text-center text-[12px] leading-relaxed text-subtle-foreground">
        We use your number only to reach you about this night. Nothing else, no lists.
      </p>
    </form>
  );
}

/* ── Step 2 · pay ────────────────────────────────────────────────────────── */

function PayStep({
  ticket,
  onProceed,
  onRestart,
}: {
  ticket: Ticket;
  onProceed: () => void;
  onRestart: () => void;
}) {
  const amount = inr(ticket.amount);
  const [launchFailed, setLaunchFailed] = useState(false);
  const launchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (launchTimer.current) clearTimeout(launchTimer.current);
    },
    [],
  );

  /**
   * Browsers give no event when a custom scheme has no handler — Chrome just
   * logs "the scheme does not have a registered handler" and the click does
   * nothing. So: attempt the launch, then check whether we are still here.
   */
  function launch() {
    setLaunchFailed(false);
    if (launchTimer.current) clearTimeout(launchTimer.current);

    // Any sign that something took over — the app opening, or the browser's
    // "Open with?" dialog stealing focus — means this was not a dead end.
    const onHide = () => {
      if (launchTimer.current) clearTimeout(launchTimer.current);
      launchTimer.current = null;
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("blur", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };

    window.addEventListener("pagehide", onHide);
    window.addEventListener("blur", onHide);
    document.addEventListener("visibilitychange", onHide);

    launchTimer.current = setTimeout(() => {
      cleanup();
      if (document.visibilityState === "visible" && document.hasFocus()) {
        setLaunchFailed(true);
      }
    }, 1500);

    window.location.href = ticket.upiUrl;
  }

  return (
    <div className="step-in flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="display text-[26px]">Spot held for {ticket.name.split(" ")[0]}.</h2>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          Pay {amount} by UPI to confirm it. We hold it for 20 minutes.
        </p>
      </div>

      {ticket.unconfigured ? (
        <Callout tone="danger">
          <strong className="font-semibold">Payments aren&rsquo;t switched on.</strong> Set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[12px]">UPI_VPA</code> in
          .env.local, then reload. Your registration is saved either way.
        </Callout>
      ) : (
        <>
          <div className="settle flex flex-col items-center gap-4 rounded-xl border border-border bg-muted/50 p-5">
            <div
              className="rounded-lg border border-border bg-white p-3.5 shadow-[var(--shadow-raised)] [&>svg]:size-[188px]"
              dangerouslySetInnerHTML={{ __html: ticket.qrSvg }}
            />
            <p className="text-center text-[12px] text-muted-foreground">
              Scan with GPay, PhonePe, Paytm or any UPI app
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <Button onClick={launch} className={CTA}>
              Open my UPI app · {amount}
            </Button>

            {launchFailed ? (
              <Callout tone="warn">
                <strong className="font-semibold">No UPI app on this device.</strong> Scan the
                code above with your phone instead, or pay{" "}
                <span className="tnum font-medium">{amount}</span> to{" "}
                <span className="tnum font-medium">{ticket.vpa}</span> from any UPI app with{" "}
                <span className="tnum font-medium">{ticket.ref}</span> in the note.
              </Callout>
            ) : (
              // Desktops have no upi:// handler. Say so up front rather than
              // letting the button look broken when it is tapped.
              <p className="hidden text-center text-[12px] text-subtle-foreground pointer-fine:block">
                On a computer? The button needs a UPI app — scan the code above with your
                phone.
              </p>
            )}
          </div>
        </>
      )}

      <div className="rounded-xl border border-border px-4 py-1">
        <Row label="Reference" value={<CopyValue value={ticket.ref} />} />
        <Row label="Amount" value={amount} />
        {!ticket.unconfigured && <Row label="Paying to" value={<CopyValue value={ticket.vpa} />} />}
        {ticket.payeeDisplay && <Row label="Account name" value={ticket.payeeDisplay} />}
      </div>

      {ticket.payeeDisplay && (
        // A stranger about to send money is asking "is this real?". An
        // unfamiliar personal name in their UPI app is exactly when that doubt
        // lands, so say it before they see it rather than after.
        <p className="text-[12px] leading-relaxed text-subtle-foreground">
          Your UPI app will show{" "}
          <span className="font-medium text-foreground">{ticket.payeeDisplay}</span> —
          that&rsquo;s the account Social by Chance collects into. It&rsquo;s us.
        </p>
      )}

      <Callout tone="neutral" icon={<IconClock className="mt-px size-4 shrink-0" />}>
        Keep <span className="tnum font-medium text-foreground">{ticket.ref}</span> in the
        payment note if your app lets you edit it — it&rsquo;s how we find your money in the
        statement.
      </Callout>

      <Button variant="outline" onClick={onProceed} className={CTA}>
        I&rsquo;ve paid — enter my reference
        <IconArrow className="size-[18px]" />
      </Button>

      <button
        type="button"
        onClick={onRestart}
        className="mx-auto inline-flex items-center gap-1.5 rounded-md text-[13px] text-subtle-foreground transition-colors hover:text-foreground"
      >
        <IconBack className="size-4" />
        Start over with different details
      </button>
    </div>
  );
}

/* ── Step 3 · UTR ────────────────────────────────────────────────────────── */

const UTR_INITIAL: UtrState = { ok: false };

function UtrStep({
  ticket,
  onBack,
  onConfirmed,
}: {
  ticket: Ticket;
  onBack: () => void;
  onConfirmed: (updated?: Ticket) => void;
}) {
  const [state, formAction] = useActionState(submitUtrAction, UTR_INITIAL);

  useEffect(() => {
    if (state.ok) onConfirmed(state.ticket);
  }, [state.ok, state.ticket, onConfirmed]);

  return (
    <form action={formAction} noValidate className="step-in flex flex-col gap-5">
      <input type="hidden" name="id" value={ticket.id} />

      <div className="flex flex-col gap-1">
        <h2 className="display text-[26px]">Last thing.</h2>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          Your UPI app showed a 12-digit reference on the receipt — UTR, RRN or
          &ldquo;transaction ID&rdquo;. Drop it in so we can match your payment.
        </p>
      </div>

      <Field
        label="UPI reference number"
        name="utr"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="done"
        placeholder="123456789012"
        maxLength={160}
        required
        autoFocus
        className="tnum tracking-[0.08em]"
        error={state.errors?.utr}
        hint="12 digits. Paste the whole line from your bank SMS if that's easier — we'll find it."
      />

      {state.formError && <Callout tone="danger">{state.formError}</Callout>}

      <SubmitButton idle="Submit reference" busy="Recording…" />

      <button
        type="button"
        onClick={onBack}
        className="mx-auto inline-flex items-center gap-1.5 rounded-md text-[13px] text-subtle-foreground transition-colors hover:text-foreground"
      >
        <IconBack className="size-4" />
        Back to payment
      </button>
    </form>
  );
}

/* ── Step 4 · done ───────────────────────────────────────────────────────── */

/**
 * Four outcomes, and only one of them is success. A self-reported UTR is never
 * styled as confirmed — green appears solely when a human matched the money
 * against the bank statement.
 */
const OUTCOME = {
  paid: {
    tone: "text-ok",
    surface: "border-ok/25 bg-ok-surface",
    Icon: IconCheck,
    badge: "Confirmed",
    heading: (first: string) => `You're in, ${first}.`,
    body: "We matched your payment. Your spot is confirmed — the exact address goes out by email 24 hours before.",
    statusLabel: "Confirmed",
    statusTone: "text-ok",
    notes: [
      "The exact address goes out 24 hours before, by email.",
      "Bring a change of clothes if you're getting in the pool.",
      "Casual and comfy. That's the whole dress code.",
    ],
  },
  submitted: {
    tone: "text-warn",
    surface: "border-warn/25 bg-warn-surface",
    Icon: IconClock,
    badge: "Awaiting verification",
    heading: (first: string) => `Got it, ${first}.`,
    body: "We check payments against the bank twice a day. Once yours matches, your spot is confirmed and you'll get an email.",
    statusLabel: "Submitted, not yet verified",
    statusTone: "text-warn",
    notes: [
      "Confirmation email once we've matched your payment.",
      "The exact address goes out 24 hours before, by email.",
      "Bring a change of clothes if you're getting in the pool.",
    ],
  },
  pending: {
    tone: "text-warn",
    surface: "border-warn/25 bg-warn-surface",
    Icon: IconAlert,
    badge: "No payment recorded",
    heading: (first: string) => `Almost there, ${first}.`,
    body: "We don't have a payment reference against your name yet. If you've already paid, send us the 12-digit reference and we'll match it.",
    statusLabel: "Not paid",
    statusTone: "text-subtle-foreground",
    notes: ["Your spot isn't held until we can match a payment."],
  },
  cancelled: {
    tone: "text-subtle-foreground",
    surface: "border-border bg-muted",
    Icon: IconAlert,
    badge: "Cancelled",
    heading: (first: string) => `This one's cancelled, ${first}.`,
    body: "Your registration was cancelled and the spot released. If that looks wrong, email us with your reference and we'll sort it out.",
    statusLabel: "Cancelled",
    statusTone: "text-subtle-foreground",
    notes: [],
  },
} as const;

function DoneStep({ ticket, organiserEmail }: { ticket: Ticket; organiserEmail: string }) {
  const outcome = OUTCOME[ticket.status];
  const first = ticket.name.split(" ")[0];

  return (
    <div className="step-in flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium",
            outcome.surface,
            outcome.tone,
          )}
        >
          <outcome.Icon className="size-4" />
          {outcome.badge}
        </div>
        <h2 className="display text-[26px]">{outcome.heading(first)}</h2>
        <p className="text-[15px] leading-relaxed text-muted-foreground">{outcome.body}</p>
      </div>

      <div className="rounded-xl border border-border px-4 py-1">
        <Row label="Reference" value={ticket.ref} />
        <Row label="Amount" value={inr(ticket.amount)} />
        {ticket.utr && <Row label="Your UPI reference" value={ticket.utr} />}
        <Row
          label="Status"
          value={<span className={outcome.statusTone}>{outcome.statusLabel}</span>}
        />
      </div>

      {outcome.notes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {outcome.notes.map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-[14px] text-muted-foreground">
              <IconCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {organiserEmail && (
        <p className="text-[13px] leading-relaxed text-subtle-foreground">
          Paid but something looks wrong? Email{" "}
          <a
            href={`mailto:${organiserEmail}?subject=${encodeURIComponent(`Payment ${ticket.ref}`)}`}
            className="font-medium text-primary underline decoration-primary/30 underline-offset-[3px] hover:decoration-primary"
          >
            {organiserEmail}
          </a>{" "}
          with your reference <span className="tnum text-foreground">{ticket.ref}</span>.
        </p>
      )}
    </div>
  );
}

/* ── Bits ────────────────────────────────────────────────────────────────── */

/** Lives inside the form so useFormStatus can see the submission. */
function SubmitButton({ idle, busy }: { idle: React.ReactNode; busy: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} aria-busy={pending || undefined} className={CTA}>
      {pending ? (
        <>
          <IconSpinner className="size-[18px] animate-spin" />
          {busy}
        </>
      ) : (
        idle
      )}
    </Button>
  );
}

function Stepper({ step }: { step: Step }) {
  const index = { details: 0, pay: 1, utr: 2, done: 2 }[step];
  const labels = ["Details", "Pay", "Confirm"];

  return (
    <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-5 py-3.5 sm:px-6">
      {labels.map((label, i) => {
        const done = i < index || step === "done";
        const current = i === index;

        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "tnum grid size-[22px] shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors duration-300",
                  done
                    ? "bg-accent text-accent-foreground"
                    : current
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-subtle-foreground",
                )}
              >
                {done ? <IconCheck className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "truncate text-[12px] transition-colors duration-300",
                  current ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (insecure origin, or the user said no). The value is
      // right there on screen — nothing to recover from.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-primary"
      aria-label={`Copy ${value}`}
    >
      <span className="tnum">{value}</span>
      {copied ? (
        <IconCheck className="size-3.5 text-ok" />
      ) : (
        <IconCopy className="size-3.5 text-subtle-foreground" />
      )}
    </button>
  );
}

function FlowSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="skeleton h-7 w-40 rounded-lg" />
        <div className="skeleton h-12 rounded-xl" />
        <div className="skeleton h-12 rounded-xl" />
        <div className="skeleton h-12 rounded-xl" />
      </div>
      <span className="sr-only">Loading your registration</span>
    </div>
  );
}

/* localStorage is best-effort: private windows and blocked site data both throw. */

type Stored = { id: string; step: Step };

/** The stored value never changes underneath us, so there is nothing to subscribe to. */
function subscribeNever() {
  return () => {};
}

/** Raw string, so useSyncExternalStore can compare snapshots by value. */
function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readStoredOnServer(): string | null {
  return null;
}

/** Where a returning guest belongs, decided by what the database says. */
function stepForStatus(status: Ticket["status"]): Step {
  switch (status) {
    case "paid":
    case "submitted":
    case "cancelled":
      return "done";
    default:
      return "pay";
  }
}

function parseStored(raw: string | null): Stored | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Stored;
    return typeof parsed?.id === "string" ? parsed : null;
  } catch {
    return null;
  }
}

function safeWrite(value: Stored) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Nothing to do — the flow still works, it just won't survive a reload.
  }
}

function safeClear() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // As above.
  }
}
