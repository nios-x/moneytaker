import "server-only";

import QRCode from "qrcode";

/**
 * Build a UPI intent URL following NPCI's URL specification — the same spec
 * every UPI app implements and the one upi.pe documents. No gateway, no
 * aggregator, no MDR: the money moves directly to the payee's bank account.
 *
 * `pn` (payee name) is deliberately omitted when the organiser has not set it.
 * A name that does not match the bank's verified name makes UPI apps raise a
 * "payee name doesn't match" warning at the exact moment someone is deciding
 * whether to trust you; with no `pn`, the app shows the real verified bank name
 * instead.
 */
export function buildUpiUrl(opts: {
  vpa: string;
  amount: number;
  ref: string;
  payeeName?: string;
}): string {
  const params = new URLSearchParams();
  params.set("pa", opts.vpa);
  if (opts.payeeName) params.set("pn", opts.payeeName);
  params.set("am", opts.amount.toFixed(2));
  params.set("cu", "INR");
  // The note is what lands in the payee's bank statement next to the money.
  params.set("tn", `${opts.ref} Social by Chance`);
  // Alphanumeric only — some apps reject a tr containing punctuation.
  params.set("tr", opts.ref.replace(/[^A-Za-z0-9]/g, ""));

  return `upi://pay?${params.toString()}`;
}

/**
 * QR as an inline SVG string. Rendered dark-on-light regardless of the page
 * theme: a QR inverted to match a dark UI is materially harder for phone
 * cameras to lock onto, and this one has to scan first time, outdoors, at night.
 */
export async function buildQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#0A0711", light: "#FFFFFF" },
  });
}

export function formatInr(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}
