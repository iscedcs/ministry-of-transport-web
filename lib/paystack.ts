/**
 * Paystack API Client — Ministry of Transport Platform
 * STORY-060 | EPIC-004 | FR-040
 *
 * Server-only module. Never import in client components.
 * Reference: https://paystack.com/docs/api/
 */

import "server-only";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PaystackResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

export interface PaystackListResponse<T> {
  status: boolean;
  message: string;
  data: T[];
  meta: {
    total: number;
    skipped: number;
    perPage: number;
    page: number;
    pageCount: number;
  };
}

/** Shape returned by POST /transaction/initialize */
export interface PaystackInitData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

/** Shape returned by GET /transaction/verify/:reference */
export interface PaystackVerifyData {
  id: number;
  status: "success" | "failed" | "abandoned";
  reference: string;
  amount: number; // kobo
  currency: string;
  channel: string;
  paid_at: string | null;
  fees: number | null; // kobo
  authorization: {
    authorization_code: string;
    reusable: boolean;
    card_type: string;
    last4: string;
    bank: string;
  } | null;
  customer: {
    id: number;
    email: string;
    customer_code: string;
  };
  metadata: Record<string, unknown>;
}

/** Paystack webhook event payload */
export interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number; // kobo
    currency: string;
    channel: string;
    paid_at: string;
    fees: number;
    customer: {
      id: number;
      email: string;
      customer_code: string;
    };
    authorization?: {
      authorization_code: string;
      reusable: boolean;
      card_type: string;
      last4: string;
      bank: string;
    };
    metadata: Record<string, unknown>;
  };
}

// ── Error ──────────────────────────────────────────────────────────────────────

export class PaystackError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response?: unknown,
  ) {
    super(message);
    this.name = "PaystackError";
  }
}

// ── Client ─────────────────────────────────────────────────────────────────────

function getSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error("PAYSTACK_SECRET_KEY environment variable is not set");
  }
  return key;
}

/**
 * Generic fetch wrapper for the Paystack REST API.
 * Automatically attaches Authorization header and Content-Type.
 * Throws PaystackError on non-2xx responses.
 */
export async function paystackRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<PaystackResponse<T>> {
  const url = `https://api.paystack.co${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new PaystackError(
      (data as { message?: string }).message ||
        `Paystack API error: ${response.status}`,
      response.status,
      data,
    );
  }

  return data as PaystackResponse<T>;
}

// ── Convenience helpers ────────────────────────────────────────────────────────

export interface InitializePaymentOptions {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
  currency?: string;
}

/** Initialize a Paystack transaction and return the authorization URL. */
export async function initializeTransaction(
  opts: InitializePaymentOptions,
): Promise<PaystackInitData> {
  const result = await paystackRequest<PaystackInitData>(
    "/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: opts.email,
        amount: opts.amountKobo.toString(),
        reference: opts.reference,
        callback_url: opts.callbackUrl,
        currency: opts.currency ?? "NGN",
        metadata: opts.metadata ?? {},
      }),
    },
  );
  return result.data;
}

/** Verify a Paystack transaction by reference. */
export async function verifyTransaction(
  reference: string,
): Promise<PaystackVerifyData> {
  const result = await paystackRequest<PaystackVerifyData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  return result.data;
}

/** Convert naira to kobo (multiply by 100, round to avoid floating point). */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/** Format kobo as a Naira currency string. */
export function formatNaira(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(kobo / 100);
}

/** Generate a unique Paystack transaction reference. */
export function generateReference(prefix: string = "MOT"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}
