import { connection } from "next/server";

import { AuroraHero } from "@/components/ui/aurora-hero";
import { RegisterFlow } from "@/components/register-flow";
import {
  IconCalendar,
  IconClock,
  IconDrink,
  IconGames,
  IconInstagram,
  IconMail,
  IconMusic,
  IconPeople,
  IconPin,
  IconPool,
  IconShirt,
  IconSpark,
} from "@/components/icons";
import { EVENT, INSTAGRAM_HANDLE, ORGANISER_EMAIL, prices } from "@/lib/config";
import { getAvailability } from "@/lib/registrations";

const EXPECT = [
  { Icon: IconPool, label: "Poolside", sub: "Bring a change of clothes" },
  { Icon: IconDrink, label: "Food & drinks", sub: "Sorted, all night" },
  { Icon: IconGames, label: "Games", sub: "The icebreaker kind" },
  { Icon: IconMusic, label: "Music & dancing", sub: "Till late" },
  { Icon: IconPeople, label: "A curated crowd", sub: "Strangers, on purpose" },
  { Icon: IconSpark, label: "Real conversations", sub: "The point of the night" },
];

const FACTS = [
  { Icon: IconCalendar, label: EVENT.dateLabel, sub: "2026" },
  { Icon: IconClock, label: EVENT.timeLabel, sub: "Till late" },
  { Icon: IconPin, label: EVENT.city, sub: EVENT.venueNote },
  { Icon: IconShirt, label: EVENT.dressCode, sub: "Bring a change for the pool" },
];

export default async function Page() {
  // Spots left change between one visitor and the next, and a prerendered
  // counter would be a lie about a real cap. Never serve this from the build.
  await connection();

  const availability = await getAvailability();
  const totalLeft = availability.left.male + availability.left.female;
  const showScarcity = !availability.unavailable && !availability.soldOut && totalLeft <= 25;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className="relative">
        <AuroraHero title="House party with strangers" className="h-[420px] sm:h-[520px]" />

        <span className="display pointer-events-none absolute top-5 left-1/2 z-10 -translate-x-1/2 text-[13px] tracking-[0.18em] text-white uppercase mix-blend-difference">
          {EVENT.host}
        </span>
      </header>

      <main className="mx-auto w-full max-w-[1080px] flex-1 px-5 pb-20">
        {/* The card overlaps the hero so the action is reachable without a
            scroll on a phone — the whole page exists to be acted on. */}
        <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:items-start lg:gap-14">
          <div className="order-2 flex flex-col gap-10 pt-4 lg:order-1 lg:pt-12">
            <section className="flex flex-col gap-5">
              {showScarcity && (
                <p className="tnum inline-flex w-fit items-center gap-2 rounded-full border border-warn/25 bg-warn-surface px-3 py-1.5 text-[12px] font-medium text-warn">
                  <span className="size-1.5 rounded-full bg-warn" />
                  {totalLeft} {totalLeft === 1 ? "spot" : "spots"} left
                </p>
              )}

              <p className="max-w-[54ch] text-[18px] leading-relaxed text-foreground sm:text-[20px]">
                What if one night could turn complete strangers into your next favourite
                people? A house party built around good vibes, new people and real
                connections.
              </p>
            </section>

            <section className="grid grid-cols-2 gap-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-raised)] sm:p-6">
              {FACTS.map(({ Icon, label, sub }) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="text-[15px] font-medium text-foreground">{label}</span>
                    <span className="text-[13px] leading-snug text-muted-foreground">{sub}</span>
                  </div>
                </div>
              ))}
            </section>

            <section className="flex flex-col gap-5">
              <h2 className="display text-[28px] sm:text-[32px]">What the night has</h2>
              <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {EXPECT.map(({ Icon, label, sub }) => (
                  <li key={label} className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-[18px] shrink-0 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-[15px] font-medium text-foreground">{label}</span>
                      <span className="text-[13px] text-muted-foreground">{sub}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-3 rounded-2xl bg-muted p-5 sm:p-6">
              <h2 className="text-[15px] font-semibold text-foreground">
                Why the numbers stay small
              </h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground">
                A curated crowd only works at a certain size. Past that, it&rsquo;s just a
                party. We cap entries so the room stays comfortable and you actually get to
                meet people — not shout over them.
              </p>
            </section>

            <p className="display text-[26px] leading-[1.12] text-foreground sm:text-[32px]">
              {EVENT.tagline}
            </p>
          </div>

          {/* ── The action ──────────────────────────────────────────────── */}
          <div className="relative z-10 order-1 -mt-16 lg:order-2 lg:sticky lg:top-8 lg:-mt-24">
            <RegisterFlow
              availability={availability}
              organiserEmail={ORGANISER_EMAIL}
              prices={prices()}
            />

            <p className="mt-4 px-1 text-[12px] leading-relaxed text-subtle-foreground">
              Payment is direct UPI to the organiser&rsquo;s account — no gateway, no booking
              fee. Your spot is confirmed once we match your payment by hand.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-3 px-5 py-8 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {EVENT.host} · {EVENT.city}
          </span>
          <div className="flex items-center gap-5">
            {ORGANISER_EMAIL && (
              <a
                href={`mailto:${ORGANISER_EMAIL}`}
                className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-foreground"
              >
                <IconMail className="size-4" />
                {ORGANISER_EMAIL}
              </a>
            )}
            {INSTAGRAM_HANDLE && (
              <a
                href={`https://instagram.com/${INSTAGRAM_HANDLE}`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 rounded-md transition-colors hover:text-foreground"
              >
                <IconInstagram className="size-4" />@{INSTAGRAM_HANDLE}
              </a>
            )}
          </div>
        </div>
      </footer>
    </>
  );
}
