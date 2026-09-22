import type { Metadata } from "next";
import { connection } from "next/server";

import { Callout } from "@/components/ui";
import { IconAlert, IconCheck, IconClock } from "@/components/icons";
import { isAdmin, isAdminConfigured } from "@/lib/admin-auth";
import { caps, prices } from "@/lib/config";
import { isDbConfigured, listAll, type Registration } from "@/lib/registrations";
import { logoutAction } from "./actions";
import { LoginForm } from "./login-form";
import { StatusButton } from "./status-button";

export const metadata: Metadata = {
  title: "Guest list — Social by Chance",
  robots: { index: false, follow: false },
};

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  // The guest list is never prerendered, in any configuration state.
  await connection();

  if (!isAdminConfigured()) {
    return (
      <Shell>
        <Callout tone="danger">
          <strong className="font-semibold">/admin is switched off.</strong> Set{" "}
          <code>ADMIN_PASSWORD</code> in .env.local to turn it on.
        </Callout>
      </Shell>
    );
  }

  if (!(await isAdmin())) {
    return (
      <Shell>
        <LoginForm />
      </Shell>
    );
  }

  if (!isDbConfigured()) {
    return (
      <Shell>
        <Callout tone="danger">
          <strong className="font-semibold">No database.</strong> Run{" "}
          <code>docker compose up -d</code> and set <code>DATABASE_URL</code> in .env.local.
        </Callout>
      </Shell>
    );
  }

  const q = String((await searchParams).q ?? "").trim();

  let all: Registration[];
  try {
    all = await listAll();
  } catch (error) {
    return (
      <Shell>
        <Callout tone="danger">
          Couldn&rsquo;t reach the database: {(error as Error).message}
        </Callout>
      </Shell>
    );
  }

  const CAP = caps();
  const PRICE = prices();
  const live = all.filter((r) => r.status !== "cancelled");

  const collected = live
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.amount, 0);
  const expected = live.reduce((sum, r) => sum + r.amount, 0);

  const counts = {
    paid: live.filter((r) => r.status === "paid").length,
    submitted: live.filter((r) => r.status === "submitted").length,
    pending: live.filter((r) => r.status === "pending").length,
    male: live.filter((r) => r.gender === "male").length,
    female: live.filter((r) => r.gender === "female").length,
  };

  const needle = q.toLowerCase();
  const rows = needle
    ? all.filter((r) =>
        [r.name, r.phone, r.email, r.ref, r.utr ?? ""].some((v) =>
          v.toLowerCase().includes(needle),
        ),
      )
    : all;

  return (
    <Shell wide>
      <div className="flex flex-col gap-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-[28px]">Guest list</h1>
            <p className="text-subtle-foreground text-[13px]">
              {live.length} registered · {counts.male}M / {counts.female}F · caps {CAP.male}M /{" "}
              {CAP.female}F
            </p>
          </div>
          <form action={logoutAction}>
            <button className="text-subtle-foreground hover:text-foreground rounded-md text-[13px] transition-colors">
              Sign out
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Collected" value={inr(collected)} tone="ok" sub={`${counts.paid} verified`} />
          <Stat
            label="Awaiting check"
            value={String(counts.submitted)}
            tone="warn"
            sub="UTR submitted"
          />
          <Stat label="Not paid" value={String(counts.pending)} sub="no UTR yet" />
          <Stat label="If all pay" value={inr(expected)} sub={`${live.length} spots`} />
        </div>

        {counts.submitted > 0 && (
          <Callout tone="warn" icon={<IconClock className="mt-px size-4 shrink-0" />}>
            <strong className="font-semibold">{counts.submitted}</strong> {counts.submitted === 1 ? "person has" : "people have"}{" "}
            sent a UTR you haven&rsquo;t matched yet. Check each against your bank statement
            before marking it paid — a UTR is typed in by the guest and proves nothing on its
            own.
          </Callout>
        )}

        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, phone, email, reference or UTR"
            aria-label="Search registrations"
            className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-subtle-foreground focus:border-ring"
          />
          <button className="rounded-xl border border-border bg-muted px-4 text-[14px] font-medium transition-colors hover:border-border-strong">
            Search
          </button>
        </form>

        {rows.length === 0 ? (
          <p className="text-subtle-foreground rounded-xl border border-dashed border-border px-5 py-10 text-center text-[14px]">
            {q ? `Nothing matches "${q}".` : "No registrations yet."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="text-subtle-foreground bg-muted text-[12px]">
                  <Th>Guest</Th>
                  <Th>Contact</Th>
                  <Th>Ref</Th>
                  <Th>UTR</Th>
                  <Th>₹</Th>
                  <Th>Status</Th>
                  <Th>Move to</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t border-border align-top text-[14px] ${
                      r.status === "cancelled" ? "opacity-45" : ""
                    }`}
                  >
                    <Td>
                      <div className="text-foreground font-medium">{r.name}</div>
                      <div className="text-subtle-foreground text-[12px] capitalize">
                        {r.gender} · {when(r.created_at)}
                      </div>
                    </Td>
                    <Td>
                      <a
                        href={`tel:+91${r.phone}`}
                        className="tnum text-muted-foreground hover:text-foreground block transition-colors"
                      >
                        +91 {r.phone}
                      </a>
                      <a
                        href={`mailto:${r.email}`}
                        className="text-subtle-foreground hover:text-foreground block max-w-[190px] truncate text-[12px] transition-colors"
                      >
                        {r.email}
                      </a>
                    </Td>
                    <Td className="tnum text-muted-foreground">{r.ref}</Td>
                    <Td className="tnum text-muted-foreground">{r.utr ?? "—"}</Td>
                    <Td className="tnum text-muted-foreground">{r.amount.toLocaleString("en-IN")}</Td>
                    <Td>
                      <StatusPill status={r.status} />
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        {(["paid", "pending", "cancelled"] as const)
                          .filter((s) => s !== r.status)
                          .map((s) => (
                            <StatusButton
                              key={s}
                              id={r.id}
                              next={s}
                              label={s === "paid" ? "Paid" : s === "pending" ? "Unpaid" : "Cancel"}
                              confirm={confirmFor(r.status, s)}
                            />
                          ))}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-subtle-foreground text-[12px]">
          Entry is {inr(PRICE.male)} male / {inr(PRICE.female)} female. Cancelled rows free
          their spot again.
        </p>
      </div>
    </Shell>
  );
}

/* ── Bits ────────────────────────────────────────────────────────────────── */

function Shell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <main
      className={`mx-auto w-full flex-1 px-5 py-10 ${wide ? "max-w-[1180px]" : "grid max-w-[1180px] place-items-center"}`}
    >
      {children}
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ok" | "warn";
}) {
  const color = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-subtle-foreground text-[12px]">{label}</div>
      <div className={`tnum display mt-1 text-[24px] ${color}`}>{value}</div>
      {sub && <div className="text-subtle-foreground mt-0.5 text-[11px]">{sub}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: Registration["status"] }) {
  const map = {
    paid: { label: "Paid", cls: "border-ok/30 bg-ok/10 text-ok", Icon: IconCheck },
    submitted: { label: "Check UTR", cls: "border-warn/30 bg-warn/10 text-warn", Icon: IconClock },
    pending: { label: "Unpaid", cls: "border-border bg-muted text-subtle-foreground", Icon: IconAlert },
    cancelled: { label: "Cancelled", cls: "border-border bg-muted text-subtle-foreground", Icon: IconAlert },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium whitespace-nowrap ${map.cls}`}
    >
      <map.Icon className="size-3.5" />
      {map.label}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-medium whitespace-nowrap">{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

/**
 * Which moves are worth a second look. Undoing a verified payment and
 * cancelling both change what the guest sees on their own screen, so neither
 * should be one stray tap away. Everything else — including restoring a
 * cancelled row — is either routine or already an undo.
 */
function confirmFor(
  from: Registration["status"],
  to: Registration["status"],
): string | undefined {
  if (to === "cancelled") return "Free the spot?";
  if (to === "pending" && from === "paid") return "Undo paid?";
  if (to === "pending" && from === "submitted") return "Mark unpaid?";
  return undefined;
}

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}
