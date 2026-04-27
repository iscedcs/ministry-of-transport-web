# Paystack Integration Guide — Ministry of Transport Platform

**Payment Processing for Motor Park Approval, Mass Transit Registration, and Other Ministry Fees**

---

## Overview

The Ministry of Transport platform uses **Paystack** as the primary payment processor for all regulatory fees:

- Motor park application fees
- Mass transit registration fees
- Annual renewal fees
- Driving school registration fees
- Vehicle inspection fees
- AVIR report fees

All payments are linked to the applicant's **ASIN (Anambra State Identification Number)** for tracking and reconciliation.

---

## Environment Setup

### 1. Get Paystack Credentials

1. Sign up at [paystack.com](https://paystack.com) (or log in if existing)
2. Go to **Settings → API Keys & Webhooks**
3. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)
4. Copy your **Public Key** (starts with `pk_test_` or `pk_live_`)

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Paystack Keys (NEVER commit these to git)
PAYSTACK_SECRET_KEY=sk_test_1234567890abcdef  # Server-side only
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_1234567890abcdef  # Safe for frontend

# Test Mode (set to 'true' during development/staging)
PAYSTACK_TEST_MODE=true

# Webhook Secret (from Paystack dashboard)
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here

# PayDirect Account (provided by Ministry Finance)
MINISTRY_PAYDIRECT_ACCOUNT=0123456789  # TBD by Ministry Finance
MINISTRY_BANK_CODE=051  # Anambra State Government Bank Code (TBD)
```

**Security Notes:**

- ✅ Add `.env.local` to `.gitignore`
- ❌ **NEVER** commit secret keys
- ❌ **NEVER** use `PAYSTACK_SECRET_KEY` in client-side code
- ✅ Use `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` only in frontend components

### 3. Validate Environment Variables

In `lib/paystack.ts`, validate that required keys exist:

```typescript
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;

if (!PAYSTACK_SECRET_KEY) {
  throw new Error(
    "PAYSTACK_SECRET_KEY is not configured. " +
      "Add it to .env.local (never commit to git)",
  );
}

if (!PAYSTACK_PUBLIC_KEY) {
  throw new Error(
    "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is not configured. " +
      "Add it to .env.local",
  );
}
```

---

## Core Payment Flow

### High-Level Sequence

```
1. Applicant fills form & submits application
2. System generates payment request (e.g., ₦5,000 application fee)
3. System calls Paystack Initialize endpoint → returns authorization_url
4. Applicant redirected to Paystack Popup/checkout
5. Applicant enters card details (or uses saved authorization)
6. Paystack processes payment
7. Paystack calls platform webhook to confirm payment
8. Platform verifies webhook signature
9. Platform marks payment as CONFIRMED in database
10. Applicant receives receipt & email confirmation
11. Application moves to next workflow stage
```

### Amounts in Kobo (Not Naira!)

**Critical:** Paystack requires amounts in **kobo** (1/100th of a Naira), not Naira.

```typescript
// ❌ WRONG: Will charge ₦5 instead of ₦5,000
const amount = 5000;

// ✅ CORRECT: Amount in kobo
const amountInKobo = 5000 * 100; // 500,000 kobo = ₦5,000
```

Always use this helper:

```typescript
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function koboToNaira(kobo: number): number {
  return kobo / 100;
}
```

---

## Paystack API Setup (lib/paystack.ts)

### 1. Define Paystack Response Types

```typescript
export interface PaystackResponse<T = unknown> {
  status: boolean;
  message: string;
  data: T;
}

export interface PaystackListResponse<T = unknown> {
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

export class PaystackError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown,
  ) {
    super(message);
    this.name = "PaystackError";
  }
}
```

### 2. Create Reusable API Client

```typescript
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;

export async function paystackRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<PaystackResponse<T>> {
  const url = `https://api.paystack.co${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new PaystackError(
      data.message || `Paystack API error: ${response.status}`,
      response.status,
      data,
    );
  }

  return data as PaystackResponse<T>;
}
```

---

## Payment Workflow Implementations

### Phase 1: Motor Park & Mass Transit Application Fees

#### 1. Generate Payment Request

When applicant submits Motor Park or Mass Transit application, system creates a payment record:

```typescript
// lib/payments.ts
import { prisma } from "@/lib/db";
import { nairaToKobo } from "@/lib/paystack";

export interface CreatePaymentParams {
  applicantASIN: string;
  applicationId: string;
  feeType: "PARK_APPLICATION" | "TRANSIT_REGISTRATION" | "RENEWAL";
  amountInNaira: number;
  applicantEmail: string;
  applicantPhone: string;
}

export async function createPaymentRequest({
  applicantASIN,
  applicationId,
  feeType,
  amountInNaira,
  applicantEmail,
  applicantPhone,
}: CreatePaymentParams) {
  // Store payment record in database
  const payment = await prisma.payment.create({
    data: {
      asin: applicantASIN,
      applicationId,
      feeType,
      amountInNaira,
      amountInKobo: nairaToKobo(amountInNaira),
      email: applicantEmail,
      phone: applicantPhone,
      status: "PENDING",
      createdAt: new Date(),
    },
  });

  return payment;
}
```

#### 2. Initialize Paystack Transaction

API route to start payment process:

```typescript
// app/api/payments/initialize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { paystackRequest } from "@/lib/paystack";
import { createPaymentRequest } from "@/lib/payments";

export async function POST(req: NextRequest) {
  try {
    const { applicationId, amountInNaira, applicantASIN, email, phone } =
      await req.json();

    // Validate request
    if (!applicationId || !amountInNaira || !applicantASIN || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Create payment record in database
    const payment = await createPaymentRequest({
      applicationId,
      amountInNaira,
      applicantASIN,
      applicantEmail: email,
      applicantPhone: phone,
      feeType: "PARK_APPLICATION", // or from request
    });

    // Initialize Paystack transaction
    const paymentInit = await paystackRequest<{
      authorization_url: string;
      access_code: string;
      reference: string;
    }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        amount: payment.amountInKobo, // MUST be in kobo!
        email,
        reference: `MOT_${payment.id}_${Date.now()}`, // Unique reference
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payments/verify?ref=${payment.id}`,
        metadata: {
          paymentId: payment.id,
          applicationId,
          asin: applicantASIN,
          feeType: payment.feeType,
        },
      }),
    });

    // Save Paystack reference to database
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paystackReference: paymentInit.data.reference,
        accessCode: paymentInit.data.access_code,
      },
    });

    return NextResponse.json({
      success: true,
      authorizationUrl: paymentInit.data.authorization_url,
      reference: paymentInit.data.reference,
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 },
    );
  }
}
```

#### 3. Frontend Checkout Redirect

Component to redirect user to Paystack:

```typescript
// components/PaymentCheckout.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PaymentCheckout({
  applicationId,
  amountInNaira,
  applicantASIN,
  email,
}: {
  applicationId: string;
  amountInNaira: number;
  applicantASIN: string;
  email: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          amountInNaira,
          applicantASIN,
          email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to Paystack checkout
        window.location.href = data.authorizationUrl;
      } else {
        alert("Failed to initialize payment: " + data.error);
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Payment initialization failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-body">
        <h3>Payment Required</h3>
        <p>Application Fee: ₦{amountInNaira.toLocaleString("en-NG")}</p>
        <button
          className="btn btn-primary"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? "Processing..." : "Pay Now"}
        </button>
      </div>
    </div>
  );
}
```

#### 4. Verify Payment (Webhook)

Paystack sends a webhook to confirm payment:

```typescript
// app/api/webhooks/paystack/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

// Verify Paystack webhook signature
function verifyPaystackSignature(body: string, signature: string): boolean {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET!)
    .update(body)
    .digest("hex");

  return hash === signature;
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-paystack-signature") || "";
    const body = await req.text();

    // Verify signature
    if (!verifyPaystackSignature(body, signature)) {
      console.error("Invalid Paystack webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Handle only successful charge events
    if (event.event !== "charge.success") {
      return NextResponse.json({ success: true });
    }

    const { reference, metadata, amount, customer } = event.data;

    // Update payment record
    const payment = await prisma.payment.findUnique({
      where: { id: metadata.paymentId },
    });

    if (!payment) {
      console.error(`Payment not found: ${metadata.paymentId}`);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "CONFIRMED",
        paystackReference: reference,
        confirmedAt: new Date(),
      },
    });

    // Update application status (move to next workflow stage)
    await prisma.application.update({
      where: { id: metadata.applicationId },
      data: {
        status: "PAYMENT_CONFIRMED",
        // Route to inspection team, etc.
      },
    });

    // Send confirmation email
    await sendPaymentConfirmationEmail({
      email: customer.email,
      applicationId: metadata.applicationId,
      amount: amount / 100, // Convert from kobo to naira
      reference,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
```

#### 5. Generate Digital Receipt

Create receipt after payment confirmed:

```typescript
// lib/receipts.ts
import { prisma } from "@/lib/db";

export async function generateReceipt(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { application: true },
  });

  if (!payment || payment.status !== "CONFIRMED") {
    throw new Error("Payment not confirmed");
  }

  const receipt = {
    receiptNumber: `MOT/RCP/${new Date().getFullYear()}/${payment.id.slice(0, 8)}`,
    date: new Date().toLocaleDateString("en-NG"),
    applicant: payment.email,
    asin: payment.asin,
    serviceType: payment.feeType,
    amount: `₦${payment.amountInNaira.toLocaleString("en-NG")}`,
    reference: payment.paystackReference,
    status: "PAID",
    ministry: "Anambra State Ministry of Transport",
  };

  return receipt;
}

// Example: Send receipt via email
export async function sendPaymentConfirmationEmail({
  email,
  applicationId,
  amount,
  reference,
}: {
  email: string;
  applicationId: string;
  amount: number;
  reference: string;
}) {
  const receipt = await generateReceipt(applicationId);

  // Send HTML email (use SendGrid or local email service)
  await sendEmail({
    to: email,
    subject: `Payment Confirmation - Ministry of Transport Application`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Payment Confirmation</h2>
        <p>Your payment has been successfully processed.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td>Receipt Number:</td>
            <td>${receipt.receiptNumber}</td>
          </tr>
          <tr>
            <td>Amount Paid:</td>
            <td>${receipt.amount}</td>
          </tr>
          <tr>
            <td>Reference:</td>
            <td>${reference}</td>
          </tr>
          <tr>
            <td>Date:</td>
            <td>${receipt.date}</td>
          </tr>
        </table>
        <p>Your application will now proceed to the next stage of review.</p>
      </div>
    `,
  });
}
```

---

## Advanced Features

### Recurring Payments (Subscriptions)

For annual renewal fees, use Paystack Subscription API:

```typescript
// Create subscription for annual renewal
export async function createSubscriptionPlan() {
  return await paystackRequest("/plan", {
    method: "POST",
    body: JSON.stringify({
      name: "MOT Annual Park Revalidation",
      description: "Annual park permit renewal fee",
      amount: 500000, // ₦5,000 in kobo
      interval: "annually", // 'daily', 'weekly', 'monthly', 'quarterly', 'biannually', 'annually'
      invoice_limit: 12, // Will stop after 12 charges
    }),
  });
}
```

See `paystack-subscriptions` skill for detailed implementation.

### Partial Refunds

If an applicant requests a partial refund:

```typescript
// Initiate refund via Paystack
export async function initiateRefund(
  transactionId: string,
  amountInKobo: number,
) {
  return await paystackRequest("/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction: transactionId,
      amount: amountInKobo,
      reason: "Partial refund - application rejected",
    }),
  });
}
```

See `paystack-refunds` skill for detailed implementation.

---

## Testing Paystack Integration

### Test Mode vs. Live Mode

- **Test Mode:** Use `sk_test_*` and `pk_test_*` keys
- **Live Mode:** Use `sk_live_*` and `pk_live_*` keys (production only)

### Test Card Numbers

| Card Number         | Expected Result            |
| ------------------- | -------------------------- |
| 4111 1111 1111 1111 | Success (Visa)             |
| 5555 5555 5555 4444 | Success (Mastercard)       |
| 3782 822463 10005   | Success (American Express) |
| 6011 1111 1111 1117 | Success (Discover)         |
| 2223 0031 0010 005  | Declined (Mastercard)      |

**Test Flow:**

1. Use test card above
2. Enter any future expiry date (e.g., 12/31)
3. Enter any 3-digit CVC
4. Paystack will ask for OTP in test environment (any 4 digits)

### Load Testing

Before going live, test payment processing at scale:

```bash
# Simulate 100 concurrent payment requests
ab -n 100 -c 100 https://localhost:3000/api/payments/initialize
```

Target: <200ms response time at p95

---

## Troubleshooting

### Common Errors

| Error                            | Cause                         | Solution                                           |
| -------------------------------- | ----------------------------- | -------------------------------------------------- |
| `PAYSTACK_SECRET_KEY is not set` | Missing environment variable  | Add to `.env.local`                                |
| `Invalid amount`                 | Amount not in kobo            | Multiply by 100                                    |
| `Invalid webhook signature`      | Signature verification failed | Verify webhook secret matches                      |
| `Transaction already verified`   | Webhook called twice          | Implement idempotency (check payment status first) |
| `Insufficient authorization`     | Wrong API key                 | Use SECRET key (not public)                        |

### Debugging Webhooks

To test webhooks locally, use ngrok:

```bash
# Expose local server to internet
ngrok http 3000

# Use ngrok URL in Paystack dashboard:
# https://xxxx-xx-xxx-xxx-xx.ngrok.io/api/webhooks/paystack
```

Then trigger webhook manually from Paystack Dashboard → Webhooks → Send Test Event

---

## Security Checklist

- [ ] Secret key in `.env.local` (not committed to git)
- [ ] Public key used only on frontend
- [ ] Webhook signature verified with `x-paystack-signature`
- [ ] Payment amounts validated on server before sending to Paystack
- [ ] Idempotent webhook processing (check if payment already confirmed)
- [ ] HTTPS enforced (Paystack requires it for webhooks)
- [ ] Secrets rotated regularly
- [ ] Rate limiting on `/api/payments/*` endpoints

---

## Integration Checklist — Phase 1

- [ ] Paystack test credentials obtained
- [ ] Environment variables configured
- [ ] `paystackRequest()` helper implemented
- [ ] Payment initialize endpoint created
- [ ] Webhook endpoint implemented & signature verified
- [ ] Payment receipt generation working
- [ ] Email confirmations sending
- [ ] Test payment flow end-to-end (test card)
- [ ] Error handling & logging in place
- [ ] Documentation updated with troubleshooting
- [ ] Code review by security team passed

---

## Resources

- **Paystack Documentation:** https://paystack.com/docs/api/
- **Paystack Dashboard:** https://dashboard.paystack.com
- **Testing Guide:** See `paystack-testing` skill
- **Webhook Guide:** See `paystack-webhooks` skill
- **Transactions Guide:** See `paystack-transactions` skill

---

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Paystack API Version:** Latest (v1)  
**Next Review:** Week 3 (after initial integration)

---

## Migration to Live (Week 8)

When ready for production:

1. **Obtain live API keys** from Paystack
2. **Update `.env` (production)** with live keys
3. **Test full payment workflow** with live keys in staging
4. **Enable webhook** in Paystack dashboard for live mode
5. **Notify Ministry Finance** of PayDirect account routing
6. **Train Finance team** on payment reconciliation
7. **Go live!** Monitor first 10 transactions closely

See `IMPLEMENTATION_PLAN.md` Week 8 checklist for full go-live procedures.
