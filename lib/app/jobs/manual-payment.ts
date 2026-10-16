import type { PaymentKind, PaymentType } from "@/lib/app/repo/types";

/**
 * Methods a rep may record by hand. CARD is deliberately EXCLUDED: card money
 * arrives through the QuickBooks webhook (which records it via confirmPayment
 * keyed on the QuickBooks payment id), so a hand-keyed card row here would
 * double-count the same money against that webhook.
 */
export const MANUAL_PAYMENT_METHODS: readonly PaymentType[] = ["CHECK", "ZELLE", "CASH", "FINANCING", "OTHER"];

export const PAYMENT_KINDS: readonly PaymentKind[] = ["DEPOSIT", "BALANCE"];

/** What the Record Payment modal submits. Untrusted — the server re-validates everything. */
export interface MarkPaidInput {
  kind: string;
  method: string;
  /** Dollars received. */
  amount: number;
  reference?: string | null;
  /** YYYY-MM-DD the money arrived; blank/absent means now. */
  paidAt?: string | null;
  /** Per-dialog key so a double-submit or retry records once. Optional; the server mints one if absent. */
  idempotencyKey?: string | null;
}

export type ValidatedMarkPaid =
  | {
      ok: true;
      kind: PaymentKind;
      method: PaymentType;
      amount: number;
      reference: string | null;
      paidAt: Date;
      idempotencyKey: string | null;
    }
  | { ok: false; error: string };

export function validateMarkPaid(input: MarkPaidInput, now: Date = new Date()): ValidatedMarkPaid {
  if (!PAYMENT_KINDS.includes(input.kind as PaymentKind)) return { ok: false, error: "Choose deposit or balance." };
  if (!MANUAL_PAYMENT_METHODS.includes(input.method as PaymentType)) {
    return {
      ok: false,
      error: input.method === "CARD" ? "Card payments are collected online, not recorded by hand." : "Choose a payment method.",
    };
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Enter an amount greater than zero." };
  }

  let paidAt = now;
  const rawDate = input.paidAt?.trim();
  if (rawDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || Number.isNaN(new Date(rawDate).getTime())) {
      return { ok: false, error: "Enter a valid date." };
    }
    // Midday UTC keeps the calendar date stable in any timezone.
    paidAt = new Date(`${rawDate}T12:00:00Z`);
    if (paidAt.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
      return { ok: false, error: "The date received can't be in the future." };
    }
  }

  const key = input.idempotencyKey?.trim() || null;
  if (key !== null && !/^[A-Za-z0-9-]{8,64}$/.test(key)) return { ok: false, error: "Invalid request key." };

  return {
    ok: true,
    kind: input.kind as PaymentKind,
    method: input.method as PaymentType,
    amount: Math.round(input.amount * 100) / 100,
    reference: input.reference?.trim() || null,
    paidAt,
    idempotencyKey: key,
  };
}
