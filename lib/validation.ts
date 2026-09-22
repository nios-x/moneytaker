import { z } from "zod";

/** Indian mobile numbers are 10 digits starting 6–9. Tolerate +91, spaces, dashes. */
const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s\-()]/g, "").replace(/^(\+?91)/, ""))
  .pipe(
    z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number"),
  );

export const registrationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tell us your name")
    .max(80, "That name is too long")
    // Don't let a name break the layout or arrive as a single shouted word.
    .regex(/^[\p{L}\p{M}][\p{L}\p{M}'.\- ]*$/u, "Letters, spaces, hyphens and apostrophes only"),
  phone,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(160, "That email is too long")
    .pipe(z.email("Check this email — we send your confirmation here")),
  gender: z.enum(["male", "female"], { message: "Pick one to see your entry price" }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

/**
 * A UPI reference (UTR / RRN) is 12 digits. It is self-reported and proves
 * nothing on its own — it only gives the organiser something to match against
 * the bank statement.
 */
/**
 * Pull a 12-digit UPI reference out of whatever the guest actually has to hand.
 *
 * The underlying RRN is 12 digits, but almost nobody types it cleanly:
 *   - banks prefix it in SMS ("UPI/DR/D130082028421/…" — the D means debit)
 *   - apps group it ("1300 8202 8421")
 *   - people paste the whole SMS rather than hunt for the number
 *
 * Being strict here means rejecting a guest who has genuinely paid, at the
 * moment they are trying to tell you so. Accept generously; the number is
 * self-reported and gets checked against the bank statement either way.
 */
export function normaliseUtr(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // "130082028421", "1300 8202 8421", "D130082028421", "UPI-130082028421"
  const compact = trimmed.replace(/[\s\-/_.]/g, "").replace(/^[A-Za-z]+/, "");
  if (/^\d{12}$/.test(compact)) return compact;

  // Pasted the whole message? Take it when exactly one 12-digit run stands out.
  const twelves = [...new Set((trimmed.match(/\d+/g) ?? []).filter((d) => d.length === 12))];
  return twelves.length === 1 ? twelves[0] : null;
}

export const utrSchema = z.object({
  id: z.uuid("Something went wrong — refresh and try again"),
  utr: z.string().transform((value, ctx) => {
    const found = normaliseUtr(value);
    if (!found) {
      ctx.addIssue({
        code: "custom",
        message:
          "We couldn't find a 12-digit reference in that. Paste the whole line from your bank SMS if it's easier.",
      });
      return z.NEVER;
    }
    return found;
  }),
});

/** Zod's flattened field errors, narrowed to the shape the forms render. */
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

export function firstErrors<T extends Record<string, unknown>>(
  issues: z.core.$ZodIssue[],
): FieldErrors<T> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out as FieldErrors<T>;
}
