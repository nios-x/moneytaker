"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  getTicketAction,
  registerAction,
  submitUtrAction,
  type RegisterState,
  type Ticket,
  type UtrState,
} from "@/app/actions";
import type { Availability } from "@/lib/registrations";
import {
  IconAlert,
  IconArrow,
  IconBack,
  IconCheck,
  IconClock,
  IconCopy,
  IconMail,
} from "./icons";
import { Button, Callout, Field, Row } from "./ui";

type Step = "details" | "pay" | "utr" | "done";

const STORAGE_KEY = "sbc.registration.v1";

const PRICE_LABEL: Record<"male" | "female", string> = {
  male: "₹1,700",
  female: "₹1,200",
};

export function RegisterFlow({
  availability: initialAvailability,
  organiserEmail,
}: {
  availability: Availability;
  organiserEmail: string;
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
    <div className="rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]">
      <Stepper step={step} />

      <div className="p-5 sm:p-6">
        {step === "details" && (
          <DetailsStep availability={availability} onIssued={onIssued} />
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
  onIssued,
}: {
  availability: Availability;
  onIssued: (t: Ticket, a?: Availability) => void;
}) {
  const [state, formAction, pending] = useActionState(registerAction, REGISTER_INITIAL);
  const [gender, setGender] = useState<"male" | "female" | "">("");

  useEffect(() => {
    if (state.ok && state.ticket) onIssued(state.ticket, state.availability);
  }, [state, onIssued]);

  const live = state.availability ?? availability;
  const showCounts = !live.unavailable;
  const soldOut = showCounts && live.soldOut;

  if (soldOut) {
    return (
      <div className="step-in flex flex-col gap-4">
        <h2 className="display text-[26px]">That&rsquo;s a full house.</h2>
        <p className="text-content-2 text-[15px] leading-relaxed">
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
        <p className="text-content-2 text-[14px]">
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

      <fieldset className="flex flex-col gap-2">
        <legend className="text-content-2 mb-1.5 text-[13px] font-medium">Entry</legend>

        <div className="grid grid-cols-2 gap-2.5">
          {(["female", "male"] as const).map((g) => {
            const left = live.left[g];
            const out = showCounts && left <= 0;

            return (
              <label
                key={g}
                className={`relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-colors duration-150 ${
                  out
                    ? "cursor-not-allowed border-line bg-surface-2/40 opacity-50"
                    : gender === g
                      ? "border-accent bg-accent/[0.09]"
                      : "border-line bg-surface-2 hover:border-line-strong"
                } has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent-bright`}
              >
                <input
                  type="radio"
                  name="gender"
                  value={g}
                  disabled={out}
                  required
                  checked={gender === g}
                  onChange={() => setGender(g)}
                  className="sr-only"
                />
                <span className="text-content-2 text-[12px] capitalize">{g}</span>
                <span className="tnum display text-[22px] tracking-tight">{PRICE_LABEL[g]}</span>
                {showCounts && (
                  <span
                    className={`tnum text-[11px] ${
                      out ? "text-content-3" : left <= 5 ? "text-warn" : "text-content-3"
                    }`}
                  >
                    {out ? "Full" : `${left} left`}
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {state.errors?.gender && (
          <p className="text-danger text-[13px]">{state.errors.gender}</p>
        )}
      </fieldset>

      {state.formError && <Callout tone="danger">{state.formError}</Callout>}

      <Button type="submit" pending={pending} className="w-full">
        {pending
          ? "Holding your spot…"
          : gender
            ? `Continue to pay ${PRICE_LABEL[gender]}`
            : "Continue to pay"}
        {!pending && <IconArrow className="size-[18px]" />}
      </Button>

      <p className="text-content-3 text-center text-[12px] leading-relaxed">
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
  const amount = `₹${ticket.amount.toLocaleString("en-IN")}`;
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
   * nothing. So: attempt the launch, then check whether we are still here. If
   * a UPI app opened, the tab is hidden by the time the timer fires.
   */
  function launch() {
    setLaunchFailed(false);
    if (launchTimer.current) clearTimeout(launchTimer.current);

    // Any sign that something took over — the app opening, or the browser's
    // "Open with?" dialog stealing focus — means the launch was not a dead end.
    // Cancelling on these keeps us from accusing a working device of having no
    // UPI app.
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
        <h2 className="display text-[26px]">
          Spot held for {ticket.name.split(" ")[0]}.
        </h2>
        <p className="text-content-2 text-[14px] leading-relaxed">
          Pay {amount} by UPI to confirm it. We hold it for 20 minutes.
        </p>
      </div>

      {ticket.unconfigured ? (
        <Callout tone="danger">
          <strong className="font-semibold">Payments aren&rsquo;t switched on.</strong> Set{" "}
          <code className="rounded bg-surface-3 px-1 py-0.5 text-[12px]">UPI_VPA</code> in
          .env.local, then reload. Your registration is saved either way.
        </Callout>
      ) : (
        <>
          <div className="settle flex flex-col items-center gap-4 rounded-xl border border-line bg-surface-2 p-5">
            {/* Dark-on-light regardless of theme: this has to scan first time,
                outdoors, at night. An inverted QR does not. */}
            <div
              className="[&>svg]:size-[188px] rounded-lg bg-white p-3.5 shadow-[var(--shadow-raised)]"
              dangerouslySetInnerHTML={{ __html: ticket.qrSvg }}
            />
            <p className="text-content-3 text-center text-[12px]">
              Scan with GPay, PhonePe, Paytm or any UPI app
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <Button onClick={launch} className="w-full">
              Open my UPI app · {amount}
            </Button>

            {launchFailed ? (
              <Callout tone="warn">
                <strong className="font-semibold">No UPI app on this device.</strong> Scan the
                code above with your phone instead, or pay{" "}
                <span className="tnum text-content font-medium">{amount}</span> to{" "}
                <span className="tnum text-content font-medium">{ticket.vpa}</span> from any
                UPI app and put <span className="tnum text-content font-medium">{ticket.ref}</span>{" "}
                in the note.
              </Callout>
            ) : (
              // Desktops have no upi:// handler. Say so up front rather than
              // letting the button look broken when it is tapped.
              <p className="text-content-3 hidden text-center text-[12px] pointer-fine:block">
                On a computer? The button needs a UPI app — scan the code above with your
                phone.
              </p>
            )}
          </div>
        </>
      )}

      <div className="rounded-xl border border-line bg-surface-2 px-4 py-1">
        <Row label="Reference" value={<CopyValue value={ticket.ref} />} />
        <Row label="Amount" value={amount} />
        {!ticket.unconfigured && <Row label="Paying to" value={<CopyValue value={ticket.vpa} />} />}
      </div>

      <Callout tone="neutral" icon={<IconClock className="mt-px size-4 shrink-0" />}>
        Keep <span className="tnum text-content font-medium">{ticket.ref}</span> in the payment
        note if your app lets you edit it — it&rsquo;s how we find your money in the statement.
      </Callout>

      <Button variant="secondary" onClick={onProceed} className="w-full">
        I&rsquo;ve paid — enter my reference
        <IconArrow className="size-[18px]" />
      </Button>

      <button
        type="button"
        onClick={onRestart}
        className="text-content-3 hover:text-content-2 mx-auto inline-flex items-center gap-1.5 rounded-md text-[13px] transition-colors"
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
  const [state, formAction, pending] = useActionState(submitUtrAction, UTR_INITIAL);

  useEffect(() => {
    if (state.ok) onConfirmed(state.ticket);
  }, [state.ok, state.ticket, onConfirmed]);

  return (
    <form action={formAction} noValidate className="step-in flex flex-col gap-5">
      <input type="hidden" name="id" value={ticket.id} />

      <div className="flex flex-col gap-1">
        <h2 className="display text-[26px]">Last thing.</h2>
        <p className="text-content-2 text-[14px] leading-relaxed">
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
        maxLength={14}
        required
        autoFocus
        className="tnum tracking-[0.12em]"
        error={state.errors?.utr}
        hint="12 digits. Find it under the payment in your UPI app's history."
      />

      {state.formError && <Callout tone="danger">{state.formError}</Callout>}

      <Button type="submit" pending={pending} className="w-full">
        {pending ? "Recording…" : "Submit reference"}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="text-content-3 hover:text-content-2 mx-auto inline-flex items-center gap-1.5 rounded-md text-[13px] transition-colors"
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
    Icon: IconAlert,
    badge: "No payment recorded",
    heading: (first: string) => `Almost there, ${first}.`,
    body: "We don't have a payment reference against your name yet. If you've already paid, send us the 12-digit reference and we'll match it.",
    statusLabel: "Not paid",
    statusTone: "text-content-3",
    notes: ["Your spot isn't held until we can match a payment."],
  },
  cancelled: {
    tone: "text-content-3",
    Icon: IconAlert,
    badge: "Cancelled",
    heading: (first: string) => `This one's cancelled, ${first}.`,
    body: "Your registration was cancelled and the spot released. If that looks wrong, email us with your reference and we'll sort it out.",
    statusLabel: "Cancelled",
    statusTone: "text-content-3",
    notes: [],
  },
} as const;

function DoneStep({ ticket, organiserEmail }: { ticket: Ticket; organiserEmail: string }) {
  const outcome = OUTCOME[ticket.status];
  const first = ticket.name.split(" ")[0];

  return (
    <div className="step-in flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className={`${outcome.tone} flex items-center gap-2 text-[13px] font-medium`}>
          <outcome.Icon className="size-4" />
          {outcome.badge}
        </div>
        <h2 className="display text-[26px]">{outcome.heading(first)}</h2>
        <p className="text-content-2 text-[15px] leading-relaxed">{outcome.body}</p>
      </div>

      <div className="rounded-xl border border-line bg-surface-2 px-4 py-1">
        <Row label="Reference" value={ticket.ref} />
        <Row label="Amount" value={`₹${ticket.amount.toLocaleString("en-IN")}`} />
        {ticket.utr && <Row label="Your UPI reference" value={ticket.utr} />}
        <Row
          label="Status"
          value={<span className={outcome.statusTone}>{outcome.statusLabel}</span>}
        />
      </div>

      {outcome.notes.length > 0 && (
        <ul className="flex flex-col gap-3">
          {outcome.notes.map((line) => (
            <li key={line} className="text-content-2 flex items-start gap-2.5 text-[14px]">
              <IconCheck className="text-accent-bright mt-0.5 size-4 shrink-0" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {organiserEmail && (
        <p className="text-content-3 text-[13px] leading-relaxed">
          Paid but something looks wrong? Email{" "}
          <a
            href={`mailto:${organiserEmail}?subject=${encodeURIComponent(`Payment ${ticket.ref}`)}`}
            className="text-accent-bright underline decoration-accent/40 underline-offset-[3px] hover:decoration-accent-bright"
          >
            {organiserEmail}
          </a>{" "}
          with your reference <span className="tnum text-content-2">{ticket.ref}</span>.
        </p>
      )}
    </div>
  );
}

/* ── Bits ────────────────────────────────────────────────────────────────── */

function Stepper({ step }: { step: Step }) {
  const index = { details: 0, pay: 1, utr: 2, done: 2 }[step];
  const labels = ["Details", "Pay", "Confirm"];

  return (
    <div className="flex items-center gap-2 border-b border-line px-5 py-3.5 sm:px-6">
      {labels.map((label, i) => (
        <div key={label} className="flex flex-1 items-center gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`tnum grid size-[22px] shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors duration-300 ${
                i < index || step === "done"
                  ? "bg-accent/20 text-accent-bright"
                  : i === index
                    ? "bg-accent text-accent-ink"
                    : "bg-surface-2 text-content-3"
              }`}
            >
              {i < index || step === "done" ? <IconCheck className="size-3.5" /> : i + 1}
            </span>
            <span
              className={`truncate text-[12px] transition-colors duration-300 ${
                i === index ? "text-content font-medium" : "text-content-3"
              }`}
            >
              {label}
            </span>
          </div>
          {i < labels.length - 1 && <div className="h-px flex-1 bg-line" />}
        </div>
      ))}
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
      className="text-content hover:text-accent-bright inline-flex items-center gap-1.5 rounded-md transition-colors"
      aria-label={`Copy ${value}`}
    >
      <span className="tnum">{value}</span>
      {copied ? (
        <IconCheck className="text-ok size-3.5" />
      ) : (
        <IconCopy className="text-content-3 size-3.5" />
      )}
    </button>
  );
}

function FlowSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="skeleton h-7 w-40 rounded-lg" />
        <div className="skeleton h-[52px] rounded-xl" />
        <div className="skeleton h-[52px] rounded-xl" />
        <div className="skeleton h-[52px] rounded-xl" />
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
