/**
 * Paystack Webhook Handler — Ministry of Transport Platform
 * STORY-063 | EPIC-004 | FR-040
 *
 * Receives and validates Paystack webhook events.
 * Validates HMAC-SHA512 signature, then processes the event.
 *
 * Security:
 *  - HMAC-SHA512 signature validated against x-paystack-signature header
 *  - Returns 200 immediately (before processing) to avoid Paystack retry storms
 *  - Idempotent — safe to receive the same event multiple times
 *
 * Paystack IPs (additional layer, optional): 52.31.139.75, 52.49.173.169, 52.214.14.220
 *
 * Reference: docs/PAYSTACK_INTEGRATION.md
 */

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAndCompletePayment } from "@/app/actions/payments";
import type { PaystackWebhookEvent } from "@/lib/paystack";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  // ── 1. Validate HMAC-SHA512 signature ──────────────────────────────────────
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("[webhook/paystack] PAYSTACK_SECRET_KEY not set");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const expectedHash = crypto
    .createHmac("sha512", secret)
    .update(body)
    .digest("hex");

  if (expectedHash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── 2. Return 200 immediately — process event after response ───────────────
  // Paystack expects a fast 200; long-running work should be async.
  // In a serverless environment this is fire-and-forget.

  let event: PaystackWebhookEvent;
  try {
    event = JSON.parse(body) as PaystackWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── 3. Handle events ───────────────────────────────────────────────────────
  // Run async — don't await so Paystack gets 200 quickly
  handleWebhookEvent(event).catch((err) => {
    console.error("[webhook/paystack] Handler error:", err);
  });

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleWebhookEvent(event: PaystackWebhookEvent): Promise<void> {
  switch (event.event) {
    case "charge.success": {
      const { reference } = event.data;
      if (!reference) {
        console.warn("[webhook/paystack] charge.success missing reference");
        return;
      }
      const result = await verifyAndCompletePayment(reference);
      if (!result.success) {
        console.error(
          `[webhook/paystack] verifyAndCompletePayment failed for ${reference}:`,
          result.error,
        );
      } else {
        console.log(
          `[webhook/paystack] Payment completed: ${reference} → receipt ${result.data?.receiptNumber ?? "(existing)"}`,
        );
      }
      break;
    }

    case "charge.failed":
    case "charge.abandoned": {
      // verifyAndCompletePayment handles failed status via Paystack verify API
      const { reference } = event.data;
      if (reference) {
        await verifyAndCompletePayment(reference).catch(console.error);
      }
      break;
    }

    default:
      // Unhandled event — log for auditing but don't error
      console.log(`[webhook/paystack] Unhandled event type: ${event.event}`);
  }
}
