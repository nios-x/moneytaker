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
export const utrSchema = z.object({
  id: z.uuid("Something went wrong — refresh and try again"),
  utr: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(
      z
        .string()
        .regex(/^\d{12}$/, "A UPI reference is exactly 12 digits — check your payment receipt"),
    ),
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
