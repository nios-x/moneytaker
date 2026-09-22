"use server";

import { isPaymentConfigured, PRICES, type Gender } from "@/lib/config";
import { buildQrSvg, buildUpiUrl } from "@/lib/upi";
import {
  createRegistration,
  findById,
  getAvailability,
  isDbConfigured,
  setUtr,
  type Availability,
  type Registration,
  type RegistrationStatus,
} from "@/lib/registrations";
import {
  firstErrors,
  registrationSchema,
  utrSchema,
  type FieldErrors,
  type RegistrationInput,
} from "@/lib/validation";

/** Everything the payment step needs. Built on the server; the client never computes a price. */
export type Ticket = {
  id: string;
  ref: string;
  name: string;
  gender: Gender;
  amount: number;
  upiUrl: string;
  qrSvg: string;
  vpa: string;
  /**
   * The server is the authority on where a guest is in the flow. Without this,
   * an organiser marking someone paid changes nothing on the guest's screen,
   * and a returning guest can be shown the QR for a payment already made.
   */
  status: RegistrationStatus;
  utr: string | null;
  /** True when UPI_VPA has not been set yet — the UI says so instead of showing a dead QR. */
  unconfigured: boolean;
};

export type RegisterState = {
  ok: boolean;
  ticket?: Ticket;
  availability?: Availability;
  errors?: FieldErrors<RegistrationInput>;
  formError?: string;
};

export type UtrState = {
  ok: boolean;
  /** The refreshed ticket, so the confirmation screen shows the real new status. */
  ticket?: Ticket;
  errors?: { utr?: string };
  formError?: string;
};

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registrationSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    gender: formData.get("gender"),
  });

  if (!parsed.success) {
    return { ok: false, errors: firstErrors<RegistrationInput>(parsed.error.issues) };
  }

  const { name, phone, email, gender } = parsed.data;

  if (!isDbConfigured()) {
    return {
      ok: false,
      formError:
        "Registrations aren't switched on yet. Start Postgres with `docker compose up -d` and set DATABASE_URL in .env.local.",
    };
  }

  const availability = await getAvailability();
  if (!availability.unavailable && availability.left[gender] <= 0) {
    return {
      ok: false,
      availability,
      formError:
        gender === "male"
          ? "Male entries just filled up. Email us and we'll add you to the waitlist."
          : "Female entries just filled up. Email us and we'll add you to the waitlist.",
    };
  }

  // Price is derived here, never accepted from the client.
  const result = await createRegistration({
    name,
    phone,
    email,
    gender,
    amount: PRICES[gender],
  });

  switch (result.kind) {
    case "created":
    case "resumed":
      return {
        ok: true,
        ticket: await toTicket(result.registration),
        availability: await getAvailability(),
      };

    case "phone-taken":
      return {
        ok: false,
        availability,
        errors: {
          phone:
            "This number is already registered. Enter the same name you used, or email us.",
        },
      };

    default:
      return {
        ok: false,
        availability,
        formError: "We couldn't save that. Check your connection and try once more.",
      };
  }
}

export async function submitUtrAction(
  _prev: UtrState,
  formData: FormData,
): Promise<UtrState> {
  const parsed = utrSchema.safeParse({
    id: formData.get("id"),
    utr: formData.get("utr"),
  });

  if (!parsed.success) {
    const errors = firstErrors<{ id: string; utr: string }>(parsed.error.issues);
    return { ok: false, errors: { utr: errors.utr ?? errors.id } };
  }

  if (!isDbConfigured()) {
    return { ok: false, formError: "Not connected to the database." };
  }

  const { id, utr } = parsed.data;
  if (!(await setUtr(id, utr))) {
    // setUtr refuses on 'paid' and 'cancelled'. If the row is in one of those,
    // the guest is not in error — show them where they actually stand.
    const current = await findById(id);
    if (current && current.status !== "pending") {
      return { ok: true, ticket: await toTicket(current) };
    }
    return { ok: false, formError: "We couldn't record that. Try once more." };
  }

  const updated = await findById(id);
  return { ok: true, ticket: updated ? await toTicket(updated) : undefined };
}

/**
 * Rebuild a ticket from a stored id. The guest left for a UPI app and came
 * back, or reopened the link hours later; either way they land where they were.
 */
export async function getTicketAction(id: string): Promise<Ticket | null> {
  const row = await findById(id);
  return row ? toTicket(row) : null;
}

async function toTicket(row: Registration): Promise<Ticket> {
  const vpa = process.env.UPI_VPA?.trim() ?? "";
  const configured = isPaymentConfigured();

  const upiUrl = configured
    ? buildUpiUrl({
        vpa,
        amount: row.amount,
        ref: row.ref,
        payeeName: process.env.UPI_PAYEE_NAME?.trim() || undefined,
      })
    : "";

  return {
    id: row.id,
    ref: row.ref,
    name: row.name,
    gender: row.gender,
    amount: row.amount,
    upiUrl,
    qrSvg: configured ? await buildQrSvg(upiUrl) : "",
    vpa,
    status: row.status,
    utr: row.utr,
    unconfigured: !configured,
  };
}
