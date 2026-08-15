"use server";

/**
 * Payment Server Actions — Ministry of Transport Platform
 * STORY-061 (initialization), STORY-064 (receipts), STORY-066 (arrears),
 * STORY-067 (revenue stats), STORY-069 (refunds), STORY-070 (audit trail)
 * EPIC-004 | FR-040 through FR-044
 *
 * Flow:
 *  1. Finance Officer assesses fee → MotorParkFee or MassTransitCompany record
 *  2. Applicant visits /motor-parks/{id}/pay?feeId=xxx  (or /fleet-operators/{id}/pay)
 *  3. Page calls initiateMotorParkFeePayment / initiateTransitPayment → Paystack URL
 *  4. Browser redirected to Paystack checkout
 *  5. Paystack redirects back to /api/payment/callback?reference=xxx
 *  6. Callback page calls verifyAndCompletePayment
 *  7. Webhook (charge.success) also calls verifyAndCompletePayment (idempotent)
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { MAX_LIST_ROWS } from "@/lib/query-limits";
import { requireAuth, requireRole } from "@/lib/auth";
import {
  initializeTransaction,
  verifyTransaction,
  generateReference,
  formatNaira,
  PaystackError,
} from "@/lib/paystack";
import type { ActionResult } from "@/lib/server-actions-pattern";
import type { PaymentStatus } from "@prisma/client";
import { TRANSIT_REGISTRATION_FEE_KOBO } from "@/lib/consts";

/** Base URL for Paystack callback — uses NEXT_PUBLIC_APP_URL (same host) */
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8150";
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PaymentListItem {
  id: string;
  paystackTransactionId: string | null;
  payerEmail: string;
  payerAsinNumber: string;
  amount: number; // kobo
  paymentType: string;
  linkedEntityType: string;
  status: string;
  initiatedAt: Date;
  completedAt: Date | null;
  receiptNumber: string | null;
}

export interface PaymentDetail extends PaymentListItem {
  payerUserId: string;
  linkedEntityId: string;
  motorParkId: string | null;
  massTransitCompanyId: string | null;
  currency: string;
  failureReason: string | null;
  reconciliationNotes: string | null;
  webhookReceivedAt: Date | null;
  processedAt: Date | null;
  receipt: {
    receiptNumber: string;
    receiptHtml: string;
    generatedAt: Date;
    sentToEmail: string | null;
  } | null;
}

export interface ArrearsItem {
  feeId: string;
  entityId: string;
  entityName: string;
  entityType: "MOTOR_PARK" | "MASS_TRANSIT";
  feeType: string;
  amountKobo: number;
  dueDate: Date;
  daysOverdue: number;
}

export interface RevenueStats {
  totalCollectedKobo: number;
  totalPendingKobo: number;
  totalRefundedKobo: number;
  transactionCount: number;
  byType: { paymentType: string; totalKobo: number; count: number }[];
  byMonth: { month: string; totalKobo: number; count: number }[];
}

// ── Receipt generation ─────────────────────────────────────────────────────────

async function generateReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.paymentReceipt.count({
    where: {
      generatedAt: {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      },
    },
  });
  return `MOT/RCT/${year}/${String(count + 1).padStart(5, "0")}`;
}

function buildReceiptHtml(params: {
  receiptNumber: string;
  payerEmail: string;
  payerAsinNumber: string;
  amount: number; // kobo
  currency: string;
  paymentType: string;
  reference: string;
  paidAt: string;
  channel: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Payment Receipt — ${params.receiptNumber}</title>
<style>
  body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;padding:20px;color:#1a1a1a}
  .header{background:#006400;color:#fff;padding:20px;border-radius:8px 8px 0 0;text-align:center}
  .body{border:1px solid #ddd;border-top:none;padding:24px;border-radius:0 0 8px 8px}
  .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0f0f0}
  .row:last-child{border-bottom:none}
  .label{color:#666;font-size:0.875rem}
  .value{font-weight:600;font-size:0.875rem;text-align:right}
  .amount{font-size:1.5rem;font-weight:700;color:#006400;text-align:center;padding:16px 0}
  .footer{text-align:center;font-size:0.75rem;color:#999;margin-top:16px}
</style>
</head>
<body>
  <div class="header">
    <h2 style="margin:0">Anambra State Ministry of Transport</h2>
    <p style="margin:4px 0 0;opacity:0.85">Official Payment Receipt</p>
  </div>
  <div class="body">
    <div class="amount">${formatNaira(params.amount)}</div>
    <div class="row"><span class="label">Receipt Number</span><span class="value">${params.receiptNumber}</span></div>
    <div class="row"><span class="label">Reference</span><span class="value">${params.reference}</span></div>
    <div class="row"><span class="label">Payer (Email)</span><span class="value">${params.payerEmail}</span></div>
    <div class="row"><span class="label">ASIN Number</span><span class="value">${params.payerAsinNumber}</span></div>
    <div class="row"><span class="label">Payment Type</span><span class="value">${params.paymentType.replace(/_/g, " ")}</span></div>
    <div class="row"><span class="label">Channel</span><span class="value">${params.channel.toUpperCase()}</span></div>
    <div class="row"><span class="label">Date Paid</span><span class="value">${new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeStyle: "short" }).format(new Date(params.paidAt))}</span></div>
  </div>
  <div class="footer">
    This is an official computer-generated receipt. No signature required.<br>
    Anambra State Ministry of Transport — Integrated Transport Services Platform
  </div>
</body>
</html>
  `.trim();
}

// ── Initiate payment: Motor Park Fee ──────────────────────────────────────────

/**
 * STORY-061 | FR-040
 * Called from /motor-parks/[id]/pay?feeId=xxx
 * Creates a Payment record and redirects the browser to Paystack checkout.
 */
export async function initiateMotorParkFeePayment(
  feeId: string,
): Promise<never> {
  const session = await requireAuth();

  // Fetch the fee and its associated park
  const fee = await db.motorParkFee.findUnique({
    where: { id: feeId },
    include: {
      motorPark: {
        select: {
          id: true,
          businessName: true,
          anssidNumber: true,
          contactUserId: true,
          applicant: { select: { email: true } },
        },
      },
    },
  });

  if (!fee) redirect("/dashboard");
  if (fee.status !== "PENDING") redirect(`/motor-parks/${fee.motorParkId}`);

  // Access check: only the park's applicant or Ministry staff
  const isOwner = fee.motorPark.contactUserId === session.userId;
  const isStaff = session.role !== "EXTERNAL_APPLICANT";
  if (!isOwner && !isStaff) redirect("/motor-parks");

  // Always generate a fresh Paystack transaction so the authorization_url is never stale.
  // If a PENDING record already exists (abandoned checkout), update it in place to avoid
  // accumulating orphaned payment rows.
  const existing = await db.payment.findFirst({
    where: {
      linkedEntityType: "MOTOR_PARK",
      linkedEntityId: fee.motorParkId,
      status: "PENDING",
      paymentType: fee.feeType,
    },
    orderBy: { createdAt: "desc" },
  });

  const reference = generateReference("MPFEE");
  const callbackUrl = `${getAppUrl()}/api/payment/callback?reference=${reference}&returnTo=/motor-parks/${fee.motorParkId}`;

  const txn = await initializeTransaction({
    email: fee.motorPark.applicant.email ?? "",
    amountKobo: fee.amount,
    reference,
    callbackUrl,
    metadata: {
      entityType: "MOTOR_PARK",
      entityId: fee.motorParkId,
      feeId: fee.id,
      feeType: fee.feeType,
      businessName: fee.motorPark.businessName,
    },
  });

  if (existing) {
    await db.payment.update({
      where: { id: existing.id },
      data: {
        paystackTransactionId: reference,
        paystackAccessCode: txn.access_code,
        paystackAuthorizationUrl: txn.authorization_url,
      },
    });
  } else {
    await db.payment.create({
      data: {
        paystackTransactionId: reference,
        paystackAccessCode: txn.access_code,
        paystackAuthorizationUrl: txn.authorization_url,
        payerUserId: fee.motorPark.contactUserId,
        payerAsinNumber: fee.motorPark.anssidNumber,
        payerEmail: fee.motorPark.applicant.email ?? "",
        amount: fee.amount,
        currency: "NGN",
        paymentType: fee.feeType,
        linkedEntityType: "MOTOR_PARK",
        linkedEntityId: fee.motorParkId,
        motorParkId: fee.motorParkId,
        status: "PENDING",
      },
    });
  }

  redirect(txn.authorization_url);
}

// ── Initiate payment: Park Monitor ID Card ──────────────────────────────────────

/**
 * Initiates the payment for the Park Monitor ID card.
 * Fee is 20,000 NGN = 2,000,000 kobo.
 */
export async function initiateParkMonitorIdPayment(): Promise<never> {
  const session = await requireAuth();

  const app = await db.parkMonitorApplication.findUnique({
    where: { userId: session.userId },
    select: {
      id: true,
      status: true,
      emailAddress: true,
      nin: true,
      idCardIssued: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        }
      }
    },
  });

  if (!app || app.status !== "APPROVED" || app.idCardIssued) {
    redirect("/dashboard");
  }

  const existing = await db.payment.findFirst({
    where: {
      linkedEntityType: "PARK_MONITOR_APP",
      linkedEntityId: app.id,
      status: "PENDING",
      paymentType: "PARK_MONITOR_ID",
    },
    orderBy: { createdAt: "desc" },
  });

  const reference = generateReference("PMID");
  const callbackUrl = `${getAppUrl()}/api/payment/callback?reference=${reference}&returnTo=/dashboard`;

  const amountKobo = 20000 * 100; // 20,000 NGN

  const txn = await initializeTransaction({
    email: app.emailAddress,
    amountKobo,
    reference,
    callbackUrl,
    metadata: {
      entityType: "PARK_MONITOR_APP",
      entityId: app.id,
      applicantName: app.user ? `${app.user.firstName} ${app.user.lastName}` : "Applicant",
    },
  });

  if (existing) {
    await db.payment.update({
      where: { id: existing.id },
      data: {
        paystackTransactionId: reference,
        paystackAccessCode: txn.access_code,
        paystackAuthorizationUrl: txn.authorization_url,
      },
    });
  } else {
    await db.payment.create({
      data: {
        paystackTransactionId: reference,
        paystackAccessCode: txn.access_code,
        paystackAuthorizationUrl: txn.authorization_url,
        payerUserId: session.userId,
        payerAsinNumber: app.nin, // using NIN as ASIN fallback since they don't have ASIN yet
        payerEmail: app.emailAddress,
        amount: amountKobo,
        currency: "NGN",
        paymentType: "PARK_MONITOR_ID",
        linkedEntityType: "PARK_MONITOR_APP",
        linkedEntityId: app.id,
        status: "PENDING",
      },
    });
  }

  redirect(txn.authorization_url);
}

// ── Initiate payment: Mass Transit Registration ────────────────────────────────


/**
 * STORY-061 | FR-040
 * Called from /fleet-operators/[id]/pay
 * Initiates a registration/application fee for a mass transit company.
 */
export async function initiateTransitPayment(
  companyId: string,
): Promise<never> {
  const session = await requireAuth();

  const company = await db.massTransitCompany.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      companyName: true,
      asinNumber: true,
      contactUserId: true,
      contactEmail: true,
    },
  });

  if (!company) redirect("/fleet-operators");

  const isOwner = company.contactUserId === session.userId;
  const isStaff = session.role !== "EXTERNAL_APPLICANT";
  if (!isOwner && !isStaff) redirect("/fleet-operators");

  // Always generate a fresh Paystack transaction so the authorization_url is never stale.
  // If a PENDING record already exists (abandoned checkout), update it in place to avoid
  // accumulating orphaned payment rows.
  const existing = await db.payment.findFirst({
    where: {
      linkedEntityType: "MASS_TRANSIT",
      linkedEntityId: companyId,
      status: "PENDING",
      paymentType: "TRANSIT_REGISTRATION",
    },
    orderBy: { createdAt: "desc" },
  });

  const reference = generateReference("TRANSIT");
  const callbackUrl = `${getAppUrl()}/api/payment/callback?reference=${reference}&returnTo=/fleet-operators/${companyId}`;

  const txn = await initializeTransaction({
    email: company.contactEmail,
    amountKobo: TRANSIT_REGISTRATION_FEE_KOBO,
    reference,
    callbackUrl,
    metadata: {
      entityType: "MASS_TRANSIT",
      entityId: companyId,
      companyName: company.companyName,
    },
  });

  if (existing) {
    await db.payment.update({
      where: { id: existing.id },
      data: {
        paystackTransactionId: reference,
        paystackAccessCode: txn.access_code,
        paystackAuthorizationUrl: txn.authorization_url,
      },
    });
  } else {
    await db.payment.create({
      data: {
        paystackTransactionId: reference,
        paystackAccessCode: txn.access_code,
        paystackAuthorizationUrl: txn.authorization_url,
        payerUserId: company.contactUserId,
        payerAsinNumber: company.asinNumber,
        payerEmail: company.contactEmail,
        amount: TRANSIT_REGISTRATION_FEE_KOBO,
        currency: "NGN",
        paymentType: "TRANSIT_REGISTRATION",
        linkedEntityType: "MASS_TRANSIT",
        linkedEntityId: companyId,
        massTransitCompanyId: companyId,
        status: "PENDING",
      },
    });
  }

  redirect(txn.authorization_url);
}

// ── Verify and complete payment ────────────────────────────────────────────────

/**
 * STORY-062 + STORY-064 | FR-040, FR-041
 * Called from the /payment/callback page after Paystack redirects back.
 * Also called idempotently from the webhook handler.
 *
 * 1. Verifies the transaction with Paystack
 * 2. Updates Payment record status
 * 3. Marks linked entity (MotorParkFee, etc.) as paid
 * 4. Generates and stores receipt
 */
export async function verifyAndCompletePayment(reference: string): Promise<
  ActionResult<{
    status: string;
    paymentId: string;
    receiptNumber?: string;
    returnTo?: string;
  }>
> {
  if (!reference) return { success: false, error: "No reference provided" };

  try {
    // Find the Payment record by reference
    const payment = await db.payment.findFirst({
      where: { paystackTransactionId: reference },
      include: { receipt: true },
    });

    if (!payment) {
      return { success: false, error: "Payment record not found" };
    }

    // Already completed — idempotent, just return the receipt
    if (payment.status === "COMPLETED" && payment.receipt) {
      return {
        success: true,
        data: {
          status: "success",
          paymentId: payment.id,
          receiptNumber: payment.receipt.receiptNumber,
        },
      };
    }

    if (payment.status === "REFUNDED") {
      return {
        success: true,
        data: { status: "refunded", paymentId: payment.id },
      };
    }

    // Verify with Paystack
    const txnData = await verifyTransaction(reference);

    if (txnData.status !== "success") {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: txnData.status === "abandoned" ? "CANCELLED" : "FAILED",
          failureReason: `Paystack status: ${txnData.status}`,
        },
      });
      return {
        success: false,
        error: `Payment ${txnData.status}. Please try again.`,
      };
    }

    // Verify amount integrity
    if (txnData.amount !== payment.amount) {
      await db.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason: `Amount mismatch: expected ${payment.amount} kobo, got ${txnData.amount} kobo`,
        },
      });
      return {
        success: false,
        error: "Payment amount mismatch. Contact support.",
      };
    }

    // Generate receipt
    const receiptNumber = await generateReceiptNumber();
    const receiptHtml = buildReceiptHtml({
      receiptNumber,
      payerEmail: payment.payerEmail,
      payerAsinNumber: payment.payerAsinNumber,
      amount: payment.amount,
      currency: payment.currency,
      paymentType: payment.paymentType,
      reference,
      paidAt: txnData.paid_at ?? new Date().toISOString(),
      channel: txnData.channel,
    });

    // Update payment + create receipt atomically
    await db.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          completedAt: txnData.paid_at ? new Date(txnData.paid_at) : new Date(),
          webhookReceivedAt: new Date(),
          webhookTimestamp: Math.floor(Date.now() / 1000),
        },
      });

      await tx.paymentReceipt.create({
        data: {
          paymentId: payment.id,
          receiptNumber,
          receiptHtml,
          sentToEmail: payment.payerEmail,
        },
      });

      // Mark linked MotorParkFee as paid
      if (payment.linkedEntityType === "MOTOR_PARK" && payment.motorParkId) {
        await tx.motorParkFee.updateMany({
          where: {
            motorParkId: payment.motorParkId,
            status: "PENDING",
            feeType: payment.paymentType,
          },
          data: {
            status: "COMPLETED",
            paidAt: new Date(),
            paidAmount: payment.amount,
          },
        });
      }

      // Mark ParkMonitorApplication ID card payment
      if (payment.linkedEntityType === "PARK_MONITOR_APP") {
        await tx.parkMonitorApplication.update({
          where: { id: payment.linkedEntityId },
          data: {
            idCardPaymentId: payment.id,
          },
        });
      }

      // Record in Revenue table
      await tx.revenue.create({
        data: {
          paymentId: payment.id,
          linkedEntityType: payment.linkedEntityType,
          linkedEntityId: payment.linkedEntityId,
          amount: payment.amount,
          currency: payment.currency,
          revenueCode: `MOT/${payment.paymentType}/${new Date().getFullYear()}`,
          recordedAt: new Date(),
        },
      });
    });

    revalidatePath("/payments");
    revalidatePath(`/motor-parks/${payment.motorParkId ?? ""}`);
    revalidatePath(`/fleet-operators/${payment.massTransitCompanyId ?? ""}`);

    return {
      success: true,
      data: { status: "success", paymentId: payment.id, receiptNumber },
    };
  } catch (err) {
    const message =
      err instanceof PaystackError
        ? `Paystack error: ${err.message}`
        : err instanceof Error
          ? err.message
          : "Verification failed";
    return { success: false, error: message };
  }
}

// ── List payments ──────────────────────────────────────────────────────────────

/**
 * STORY-065 | FR-042
 * List payments for the Finance Officer / admin dashboard.
 */
export async function listPayments(
  page: number = 1,
  status?: string,
  entityType?: string,
): Promise<ActionResult<{ payments: PaymentListItem[]; total: number }>> {
  await requireRole([
    "FINANCE_OFFICER",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "SYSTEM_ADMIN",
    "ADMIN",
  ]);

  const where = {
    ...(status ? { status: status as PaymentStatus } : {}),
    ...(entityType ? { linkedEntityType: entityType } : {}),
  };

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * 20,
      take: 20,
      select: {
        id: true,
        paystackTransactionId: true,
        payerEmail: true,
        payerAsinNumber: true,
        amount: true,
        paymentType: true,
        linkedEntityType: true,
        status: true,
        initiatedAt: true,
        completedAt: true,
        receipt: { select: { receiptNumber: true } },
      },
    }),
    db.payment.count({ where }),
  ]);

  return {
    success: true,
    data: {
      payments: payments.map((p) => ({
        ...p,
        receiptNumber: p.receipt?.receiptNumber ?? null,
      })),
      total,
    },
  };
}

// ── Get payment detail ─────────────────────────────────────────────────────────

export async function getPaymentDetail(
  paymentId: string,
): Promise<ActionResult<PaymentDetail>> {
  const session = await requireAuth();

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { receipt: true },
  });

  if (!payment) return { success: false, error: "Payment not found" };

  // External applicants can only view their own payments
  if (
    session.role === "EXTERNAL_APPLICANT" &&
    payment.payerUserId !== session.userId
  ) {
    return { success: false, error: "Access denied" };
  }

  return {
    success: true,
    data: {
      id: payment.id,
      paystackTransactionId: payment.paystackTransactionId,
      payerUserId: payment.payerUserId,
      payerEmail: payment.payerEmail,
      payerAsinNumber: payment.payerAsinNumber,
      amount: payment.amount,
      currency: payment.currency,
      paymentType: payment.paymentType,
      linkedEntityType: payment.linkedEntityType,
      linkedEntityId: payment.linkedEntityId,
      motorParkId: payment.motorParkId,
      massTransitCompanyId: payment.massTransitCompanyId,
      status: payment.status,
      initiatedAt: payment.initiatedAt,
      completedAt: payment.completedAt,
      failureReason: payment.failureReason,
      reconciliationNotes: payment.reconciliationNotes,
      webhookReceivedAt: payment.webhookReceivedAt,
      processedAt: payment.processedAt,
      receiptNumber: payment.receipt?.receiptNumber ?? null,
      receipt: payment.receipt
        ? {
            receiptNumber: payment.receipt.receiptNumber,
            receiptHtml: payment.receipt.receiptHtml,
            generatedAt: payment.receipt.generatedAt,
            sentToEmail: payment.receipt.sentToEmail,
          }
        : null,
    },
  };
}

// ── Initiate refund ────────────────────────────────────────────────────────────

/**
 * STORY-069 | FR-044
 * Finance Officer initiates a refund.
 * Calls Paystack /refund endpoint and updates Payment status.
 */
export async function initiateRefund(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole(["FINANCE_OFFICER", "COMMISSIONER", "PERMANENT_SECRETARY"]);

  const paymentId = formData.get("paymentId") as string;
  const reason = (formData.get("reason") as string)?.trim();

  if (!paymentId) return { success: false, error: "Payment ID required" };
  if (!reason) return { success: false, error: "Refund reason is required" };

  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { success: false, error: "Payment not found" };

  if (payment.status !== "COMPLETED") {
    return {
      success: false,
      error: "Only completed payments can be refunded",
    };
  }

  try {
    // Call Paystack refund API
    await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: payment.paystackTransactionId,
      }),
    });

    // Update payment status
    await db.payment.update({
      where: { id: paymentId },
      data: {
        status: "REFUNDED",
        reconciliationNotes: reason,
        processedAt: new Date(),
      },
    });

    // Reverse the MotorParkFee if applicable
    if (payment.linkedEntityType === "MOTOR_PARK" && payment.motorParkId) {
      await db.motorParkFee.updateMany({
        where: {
          motorParkId: payment.motorParkId,
          feeType: payment.paymentType,
          status: "COMPLETED",
        },
        data: { status: "PENDING", paidAt: null, paidAmount: null },
      });
    }

    revalidatePath(`/payments/${paymentId}`);
    revalidatePath("/payments");

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Refund failed",
    };
  }
}

// ── Get arrears items ──────────────────────────────────────────────────────────

/**
 * STORY-066 | FR-043
 * Returns overdue MotorParkFee records with entity details.
 */
export async function getArrearsItems(): Promise<ActionResult<ArrearsItem[]>> {
  await requireRole([
    "FINANCE_OFFICER",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "SYSTEM_ADMIN",
  ]);

  const now = new Date();

  const overdueFees = await db.motorParkFee.findMany({
    where: {
      status: "PENDING",
      dueDate: { lt: now },
    },
    include: {
      motorPark: { select: { id: true, businessName: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  const items: ArrearsItem[] = overdueFees.map((fee) => {
    const daysOverdue = Math.floor(
      (now.getTime() - fee.dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return {
      feeId: fee.id,
      entityId: fee.motorParkId,
      entityName: fee.motorPark.businessName,
      entityType: "MOTOR_PARK",
      feeType: fee.feeType,
      amountKobo: fee.amount,
      dueDate: fee.dueDate,
      daysOverdue,
    };
  });

  return { success: true, data: items };
}

// ── Revenue stats ──────────────────────────────────────────────────────────────

/**
 * STORY-067 | FR-043
 * Aggregate revenue statistics for the Finance dashboard.
 */
export async function getRevenueStats(): Promise<ActionResult<RevenueStats>> {
  await requireRole([
    "FINANCE_OFFICER",
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "SYSTEM_ADMIN",
  ]);

  const [totals, byType, allCompleted] = await Promise.all([
    db.payment.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    }),
    db.payment.groupBy({
      by: ["paymentType"],
      where: { status: "COMPLETED" },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { paymentType: "asc" },
    }),
    // Feeds a chart. Every completed payment ever would be read otherwise —
    // the totals beside it already come from aggregates, not this list.
    db.payment.findMany({
      where: { status: "COMPLETED" },
      select: { amount: true, completedAt: true },
      orderBy: { completedAt: "desc" },
      take: MAX_LIST_ROWS,
    }),
  ]);

  const [pendingTotal, refundedTotal, txCount] = await Promise.all([
    db.payment.aggregate({
      _sum: { amount: true },
      where: { status: "PENDING" },
    }),
    db.payment.aggregate({
      _sum: { amount: true },
      where: { status: "REFUNDED" },
    }),
    db.payment.count({ where: { status: "COMPLETED" } }),
  ]);

  // Group by month
  const monthMap = new Map<string, { totalKobo: number; count: number }>();
  for (const p of allCompleted) {
    if (!p.completedAt) continue;
    const key = `${p.completedAt.getFullYear()}-${String(p.completedAt.getMonth() + 1).padStart(2, "0")}`;
    const current = monthMap.get(key) ?? { totalKobo: 0, count: 0 };
    monthMap.set(key, {
      totalKobo: current.totalKobo + p.amount,
      count: current.count + 1,
    });
  }

  const byMonth = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, stats]) => ({ month, ...stats }));

  return {
    success: true,
    data: {
      totalCollectedKobo: totals._sum.amount ?? 0,
      totalPendingKobo: pendingTotal._sum.amount ?? 0,
      totalRefundedKobo: refundedTotal._sum.amount ?? 0,
      transactionCount: txCount,
      byType: byType.map((t) => ({
        paymentType: t.paymentType,
        totalKobo: t._sum?.amount ?? 0,
        count: (t._count as { _all: number })._all,
      })),
      byMonth,
    },
  };
}
