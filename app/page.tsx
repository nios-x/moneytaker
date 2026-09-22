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
import { EVENT, INSTAGRAM_HANDLE, ORGANISER_EMAIL } from "@/lib/config";
import { getAvailability } from "@/lib/supabase";

const EXPECT = [
  { Icon: IconPool, label: "Poolside" },
  { Icon: IconDrink, label: "Food & drinks" },
  { Icon: IconGames, label: "Games" },
  { Icon: IconMusic, label: "Music & dancing" },
  { Icon: IconPeople, label: "A curated crowd" },
  { Icon: IconSpark, label: "Real conversations" },
];

const FACTS = [
  { Icon: IconCalendar, label: EVENT.dateLabel, sub: "2026" },
  { Icon: IconClock, label: EVENT.timeLabel, sub: "Till late" },
  { Icon: IconPin, label: EVENT.city, sub: EVENT.venueNote },
  { Icon: IconShirt, label: EVENT.dressCode, sub: "Bring a change for the pool" },
];

export default async function Page() {
  const availability = await getAvailability();
  const totalLeft = availability.left.male + availability.left.female;
  const showScarcity = !availability.unavailable && !availability.soldOut && totalLeft <= 25;

  return (
    <>
      <header className="border-b border-line/60">
        <div className="mx-auto flex max-w-[1080px] items-center justify-between px-5 py-4">
          <span className="display text-[15px] tracking-[-0.02em]">{EVENT.host}</span>
          {INSTAGRAM_HANDLE && (
            <a
              href={`https://instagram.com/${INSTAGRAM_HANDLE}`}
              target="_blank"
              rel="noreferrer noopener"
              className="text-content-3 hover:text-content inline-flex items-center gap-1.5 rounded-md text-[13px] transition-colors"
            >
              <IconInstagram className="size-4" />
              <span className="hidden sm:inline">@{INSTAGRAM_HANDLE}</span>
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1080px] flex-1 px-5 pb-20 pt-10 sm:pt-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:items-start lg:gap-14">
          {/* ── The offer ───────────────────────────────────────────────── */}
          <div className="flex flex-col gap-10">
            <section className="flex flex-col gap-5">
              {showScarcity && (
                <p className="tnum text-warn inline-flex w-fit items-center gap-2 rounded-full border border-warn/25 bg-warn/[0.07] px-3 py-1.5 text-[12px] font-medium">
                  <span className="bg-warn size-1.5 rounded-full" />
                  {totalLeft} {totalLeft === 1 ? "spot" : "spots"} left
                </p>
              )}

              <h1 className="display text-[clamp(2.75rem,9vw,4.5rem)]">
                House party
                <br />
                with strangers
              </h1>

              <p className="text-content-2 max-w-[54ch] text-[17px] leading-relaxed sm:text-[19px]">
                What if one night could turn complete strangers into your next favourite
                people? A house party built around good vibes, new people and real
                connections.
              </p>
            </section>

            <section className="grid grid-cols-2 gap-x-5 gap-y-4 border-y border-line py-6">
              {FACTS.map(({ Icon, label, sub }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="text-accent-bright mt-0.5 size-[18px] shrink-0" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-content text-[15px] font-medium">{label}</span>
                    <span className="text-content-3 text-[13px] leading-snug">{sub}</span>
                  </div>
                </div>
              ))}
            </section>

            <section className="flex flex-col gap-4">
              <h2 className="text-content text-[15px] font-semibold">What the night has</h2>
              <ul className="grid grid-cols-2 gap-x-5 gap-y-3.5">
                {EXPECT.map(({ Icon, label }) => (
                  <li key={label} className="text-content-2 flex items-center gap-2.5 text-[15px]">
                    <Icon className="text-content-3 size-[18px] shrink-0" />
                    {label}
                  </li>
                ))}
              </ul>
            </section>

            <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/60 p-5">
              <h2 className="text-content text-[15px] font-semibold">
                Why the numbers stay small
              </h2>
              <p className="text-content-2 text-[15px] leading-relaxed">
                A curated crowd only works at a certain size. Past that, it&rsquo;s just a
                party. We cap entries so the room stays comfortable and you actually get to
                meet people — not shout over them.
              </p>
            </section>

            <p className="display text-content text-[22px] sm:text-[26px]">{EVENT.tagline}</p>
          </div>

          {/* ── The action ──────────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-8">
            <RegisterFlow availability={availability} organiserEmail={ORGANISER_EMAIL} />

            <p className="text-content-3 mt-4 px-1 text-[12px] leading-relaxed">
              Payment is direct UPI to the organiser&rsquo;s account — no gateway, no booking
              fee. Your spot is confirmed once we match your payment by hand.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-line/60">
        <div className="text-content-3 mx-auto flex max-w-[1080px] flex-col gap-3 px-5 py-8 text-[13px] sm:flex-row sm:items-center sm:justify-between">
          <span>
            {EVENT.host} · {EVENT.city}
          </span>
          <div className="flex items-center gap-5">
            {ORGANISER_EMAIL && (
              <a
                href={`mailto:${ORGANISER_EMAIL}`}
                className="hover:text-content inline-flex items-center gap-1.5 rounded-md transition-colors"
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
                className="hover:text-content inline-flex items-center gap-1.5 rounded-md transition-colors"
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
