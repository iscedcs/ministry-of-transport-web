// ==================== QUICK START: Server Actions Reference ====================
//
// This file maps all the pieces together for developers starting Week 1
// Reference all docs as specified in the header of each file
//
// If you're building: Refer to these files in this order

// ==================== STEP 1: Understand the Big Picture ====================

/**
 * START HERE:
 * - docs/IMPLEMENTATION_PLAN.md → Timeline & deliverables (16 weeks)
 * - docs/ROLES_AND_DUTIES.md → 7 user roles & permissions
 * - docs/EPICS.md → All 17 epics & 180+ stories
 * - docs/DESIGN_SYSTEM.md → UI tokens & components
 * - docs/PAYSTACK_INTEGRATION.md → Payment integration patterns
 *
 * Then: docs/ARCHITECTURE.md (this guide in more detail)
 */

// ==================== STEP 2: Schema & Types ====================

/**
 * DATABASE SCHEMA:
 * File: prisma/schema.prisma
 *
 * Core Models (11):
 *   1. User ...................... All users (Ministry staff + external applicants)
 *   2. Session ................... Auth sessions
 *   3. MotorPark ................. Motor park applications
 *   4. MassTransitCompany ........ Mass transit company registrations
 *   5. Vehicle ................... Fleet vehicles
 *   6. Inspection ................ Site inspections
 *   7. Payment ................... All payments (Paystack)
 *   8. AVIRReport ................ Accident Vehicle Inspection Reports
 *   9. Notification .............. Queued notifications (email/SMS)
 *   10. AuditLog ................. Immutable audit trail
 *   11. Application .............. Generic application tracking
 *
 * Supporting Models (15):
 *   - Document, InspectionChecklistResult, InspectionChecklistItem, InspectionChecklistTemplate
 *   - MotorParkFee, Driver, DriverProficiencyCard, VehicleQRCode, CompanyStaff
 *   - PaymentReceipt, Revenue, NotificationPreference, NotificationTemplate
 *   - FeeSchedule, SystemConfiguration
 *
 * ENUMS (9):
 *   UserRole, ApplicationStatus, PermitStatus, InspectionStatus, PaymentStatus
 *   NotificationType, NotificationChannel, VehicleType, AVIRConditionBefore, AVIRConditionAfter
 *
 * Usage:
 *   - Migrations: npx prisma migrate dev --name description
 *   - Client: npx prisma generate
 *   - Studio: npx prisma studio (visual browser)
 *   - Seed: npx prisma db seed
 */

// ==================== STEP 3: Input Validation & Types ====================

/**
 * VALIDATION & TYPES:
 * File: lib/validation-schemas.ts
 *
 * For EVERY server action input:
 *   1. Define Zod schema (e.g., motorParkApplicationSchema)
 *   2. Infer TypeScript type (e.g., type MotorParkApplicationInput)
 *   3. Validate in server action: schema.safeParse(input)
 *   4. Return ActionResult<T> with success/error
 *
 * Schemas by Feature:
 *   - Users: userCreateSchema, userLoginSchema
 *   - Motor Parks: motorParkApplicationSchema, motorParkStatusUpdateSchema
 *   - Mass Transit: massTransitApplicationSchema, vehicleQRCodeSchema
 *   - Payments: paymentInitializeSchema, paymentWebhookSchema
 *   - Inspections: inspectionScheduleSchema, inspectionChecklistResultSchema
 *   - AVIR: avIRReportSchema
 *   - Notifications: notificationPreferenceSchema, notificationTemplateSchema
 *   - Admin: feeScheduleSchema, systemConfigurationSchema
 *
 * Utility Helpers:
 *   - nairaToKobo(1500) → 150000 (multiply by 100)
 *   - koboToNaira(150000) → 1500 (divide by 100)
 *   - formatNaira(150000) → "₦1,500.00"
 *
 * Usage:
 *   const validation = motorParkApplicationSchema.safeParse(input);
 *   if (!validation.success) {
 *     return { success: false, error: validation.error.message };
 *   }
 */

// ==================== STEP 4: Server Actions Patterns ====================

/**
 * SERVER ACTIONS ARCHITECTURE:
 * File: lib/server-actions-pattern.ts
 *
 * Pattern 1: Fetch with RLS
 *   fetchMotorParkWithRLS(userContext, parkId)
 *   → RLS check → Fetch → Audit log → Return
 *
 * Pattern 2: Create with Validation & Transaction
 *   createMotorParkApplication(userContext, input)
 *   → Role check → Validate → Uniqueness → Tx → Audit → Notify → Return
 *
 * Pattern 3: Update with State Machine
 *   updateMotorParkStatus(userContext, parkId, input)
 *   → RLS check → State validation → Tx → Audit → Notify → Return
 *
 * Pattern 4: List with Pagination & Filtering
 *   listMotorParks(userContext, options)
 *   → Build RLS filter → Apply filters → Paginate → Return
 *
 * File Structure (create these files):
 *   app/actions/
 *   ├── motor-park.ts .......... Motor Park CRUD + workflows
 *   ├── mass-transit.ts ........ Mass Transit CRUD + workflows
 *   ├── payments.ts ............ Payment initialization + webhooks
 *   ├── inspections.ts ......... Inspection scheduling + updates
 *   ├── notifications.ts ....... Notification queuing + templates
 *   ├── avir.ts ................ AVIR creation + routing
 *   ├── admin.ts ............... System configuration
 *   ├── auth.ts ................ Login + registration
 *   └── files.ts ............... Document upload
 *
 * Each file starts with "use server" directive:
 *   "use server"; // Enable server-only code
 *   import { motorParkApplicationSchema } from "@/lib/validation-schemas";
 *   export async function createMotorParkApplication(...) { ... }
 */

// ==================== STEP 5: Row-Level Security (RLS) ====================

/**
 * RLS CHECKS:
 * File: lib/server-actions-pattern.ts
 *
 * MANDATORY before every read/write operation:
 *
 *   checkMotorParkReadAccess(userContext, motorParkId)
 *     → Commissioner/PS: Can read all ✓
 *     → HOD Parks/VIS/T.Ops: Can read assigned parks ✓
 *     → External Applicant: Can read only their own ✓
 *     → Field Inspector: Can read if assigned inspection ✓
 *     → Finance: Can read all ✓
 *     → Others: Denied ✗
 *
 *   checkMotorParkWriteAccess(userContext, motorParkId, operation)
 *     → "UPDATE_APPLICANT": Applicant only, status=SUBMITTED
 *     → "UPDATE_INSPECTION": Field Inspector only
 *     → "APPROVE": Commissioner/PS only
 *
 * Pattern:
 *   const rls = await checkMotorParkReadAccess(userContext, parkId);
 *   if (!rls.allowed) {
 *     return { success: false, error: `Access denied: ${rls.reason}` };
 *   }
 *   // Now safe to query
 *
 * REFERENCE: docs/ROLES_AND_DUTIES.md for all role permissions
 */

// ==================== STEP 6: Transactions ====================

/**
 * DATABASE TRANSACTIONS:
 * File: lib/server-actions-pattern.ts
 *
 * REQUIRED for multi-step operations:
 *   - Creating park + application + notification
 *   - Updating payment + triggering workflow
 *   - Approving permit + creating fee + notifying
 *
 * Pattern:
 *   const result = await db.$transaction(async (tx) => {
 *     const motorPark = await tx.motorPark.create({ ... });
 *     const application = await tx.application.create({ ... });
 *     const notification = await tx.notification.create({ ... });
 *     return { motorPark, application, notification };
 *   });
 *
 * If ANY step fails: ENTIRE transaction rolls back automatically
 * Guarantees: ACID (Atomicity, Consistency, Isolation, Durability)
 */

// ==================== STEP 7: Audit Logging ====================

/**
 * AUDIT TRAIL:
 * File: lib/server-actions-pattern.ts
 *
 * MANDATORY for every CREATE/UPDATE/DELETE:
 *
 *   await logAuditEvent(
 *     userId: "user_123",
 *     action: "UPDATE",                    // CREATE|UPDATE|DELETE|APPROVE|REJECT
 *     entityType: "MOTOR_PARK",
 *     entityId: "park_456",
 *     oldValues: { status: "SUBMITTED" },  // Before
 *     newValues: { status: "APPROVED" }    // After
 *   );
 *
 * Audit Log Used For:
 *   - "Who approved this park?" → Search by action=APPROVE, entityType=MOTOR_PARK
 *   - "What changed?" → Compare oldValues vs newValues
 *   - "When did this happen?" → Check createdAt timestamp
 *   - "Compliance: Show all approvals by Commissioner" → Filter by performedByUserId + action
 *
 * NEVER LOG:
 *   - Passwords, API keys, sensitive data
 *   - Full serialized objects (log only changed fields)
 */

// ==================== STEP 8: Notifications (Async) ====================

/**
 * NOTIFICATION QUEUE:
 * File: lib/server-actions-pattern.ts
 *
 * NEVER send email/SMS synchronously (too slow)
 *
 * Pattern:
 *   await queueNotification({
 *     notificationType: "APPLICATION_SUBMITTED",
 *     recipientRole: "HOD_PARKS",
 *     linkedEntityType: "MOTOR_PARK",
 *     linkedEntityId: motorParkId
 *   });
 *   // Returns immediately ← User sees success
 *   // Background job sends email later (within 5 minutes)
 *
 * Flow:
 *   1. Server action queues notification to DB
 *   2. Cron job (every 5 min) fetches pending notifications
 *   3. Sends via SendGrid (email) + Termii/Twilio (SMS)
 *   4. Updates status (SENT, FAILED, BOUNCED)
 *   5. Retries if failed (max 3 retries)
 *
 * Notification Types (from schema):
 *   - APPLICATION_SUBMITTED
 *   - INSPECTION_SCHEDULED
 *   - INSPECTION_COMPLETED
 *   - PERMIT_ISSUED
 *   - PERMIT_REJECTED
 *   - PAYMENT_RECEIVED
 *   - SLA_BREACH
 *   - RENEWAL_REMINDER_60DAYS
 *
 * REFERENCE: EPIC-007 (Notifications & Alerts System)
 */

// ==================== STEP 9: Payments (Paystack) ====================

/**
 * PAYMENT WORKFLOW:
 * File: app/actions/payments.ts
 * Reference: docs/PAYSTACK_INTEGRATION.md
 *
 * Step 1: Initialize Payment
 *   const result = await initializePayment(userContext, {
 *     amount: nairaToKobo(1500),           // Convert to kobo!
 *     paymentType: "PARK_APPLICATION",
 *     linkedEntityType: "MOTOR_PARK",
 *     linkedEntityId: parkId,
 *     payerEmail: "user@example.com",
 *     payerPhone: "+2348012345678",
 *     asinNumber: "1234567890123456"
 *   });
 *   // Returns: { checkoutUrl: "https://checkout.paystack.com/..." }
 *   // Client redirects user to checkout
 *
 * Step 2: User Completes Payment
 *   - On Paystack checkout page
 *   - Enters card details
 *   - Paystack processes charge
 *   - User redirected back to app
 *
 * Step 3: Webhook Verification
 *   POST /api/webhooks/paystack with webhook payload
 *   - Verify HMAC signature
 *   - Call verifyPaymentWebhook()
 *   - Update Payment status to COMPLETED
 *   - Trigger next workflow (inspection scheduled, permit issued, etc.)
 *
 * Step 4: Generate Receipt
 *   const receipt = await generateReceipt(userContext, paymentId);
 *   - Create PDF receipt
 *   - Queue email with receipt to payer
 *   - Store receipt in S3/local storage
 *
 * CRITICAL SECURITY:
 *   ✓ Secret key in .env.local (never client-side)
 *   ✓ Always verify webhook signature
 *   ✓ Store transaction ID to prevent duplicate processing
 *   ✓ Check payment status before releasing service
 *   ✓ Amounts always in KOBO (multiply naira by 100)
 *
 * Test Cards (test mode only):
 *   - 4111 1111 1111 1111 (Visa, success)
 *   - CVV: any 3 digits
 *   - Expiry: any future date
 *
 * REFERENCE: docs/PAYSTACK_INTEGRATION.md for complete setup
 */

// ==================== STEP 10: Environment Variables ====================

/**
 * CREATE .env.local (never commit):
 *
 * DATABASE CONNECTION:
 *   DATABASE_URL="postgresql://user:password@ec2-...compute.amazonaws.com:5432/dbname"
 *
 * NEXT.JS / AUTH:
 *   NEXTAUTH_SECRET="$(openssl rand -base64 32)"
 *   NEXTAUTH_URL="http://localhost:3000"
 *
 * PAYSTACK:
 *   PAYSTACK_SECRET_KEY="sk_test_..."         ← Never expose
 *   NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test_..."
 *
 * EMAIL (SendGrid):
 *   SENDGRID_API_KEY="SG..."
 *   SENDGRID_FROM_EMAIL="noreply@mot.anambra.gov.ng"
 *   SENDGRID_FROM_NAME="Ministry of Transport"
 *
 * SMS (Termii):
 *   SMS_PROVIDER="termii"
 *   TERMII_API_KEY="..."
 *   TERMII_SENDER_ID="MOT"
 *
 * OAUTH (Google):
 *   GOOGLE_OAUTH_CLIENT_ID="..."
 *   GOOGLE_OAUTH_CLIENT_SECRET="..."
 *
 * Verification:
 *   npm run env:validate  ← Checks all required vars are set
 */

// ==================== STEP 11: First Server Action Template ====================

/**
 * COPY-PASTE TEMPLATE for your first server action:
 *
 * File: app/actions/motor-park.ts
 */

`"use server";

import { db } from "@/lib/db";
import { motorParkApplicationSchema } from "@/lib/validation-schemas";
import type { UserContext, ActionResult } from "@/lib/server-actions-pattern";
import { checkMotorParkReadAccess, logAuditEvent, queueNotification } from "@/lib/server-actions-pattern";

// Export async function that accepts userContext + validated input
export async function createMotorParkApplication(
  userContext: UserContext,
  input: any  // Type: z.infer<typeof motorParkApplicationSchema>
): Promise<ActionResult<{ parkId: string; applicationNumber: string }>> {
  try {
    // 1. Role check
    if (userContext.role !== "EXTERNAL_APPLICANT") {
      return { success: false, error: "Only external applicants can submit applications" };
    }

    // 2. Input validation
    const validation = motorParkApplicationSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.message };
    }

    // 3. Uniqueness check
    const existing = await db.motorPark.findFirst({
      where: {
        OR: [
          { cacRegistrationNumber: input.cacRegistrationNumber },
          { anssidNumber: input.anssidNumber }
        ]
      }
    });

    if (existing) {
      return { success: false, error: "CAC or ASIN already registered" };
    }

    // 4. Create within transaction
    const { motorPark, application } = await db.$transaction(async (tx) => {
      const newPark = await tx.motorPark.create({
        data: {
          businessName: input.businessName,
          locationAddress: input.locationAddress,
          cacRegistrationNumber: input.cacRegistrationNumber,
          anssidNumber: input.anssidNumber,
          contactPerson: input.contactPerson,
          contactPhone: input.contactPhone,
          contactEmail: input.contactEmail,
          contactUserId: userContext.userId,
          applicationStatus: "SUBMITTED"
        }
      });

      const newApp = await tx.application.create({
        data: {
          applicationNumber: \`APP-\${Date.now()}\`,
          applicationType: "MOTOR_PARK",
          linkedEntityId: newPark.id,
          status: "SUBMITTED",
          createdByUserId: userContext.userId,
          submittedByEmail: input.contactEmail
        }
      });

      return { motorPark: newPark, application: newApp };
    });

    // 5. Audit log
    await logAuditEvent(userContext.userId, "CREATE", "MOTOR_PARK", motorPark.id);

    // 6. Queue notification to HOD Parks
    await queueNotification({
      notificationType: "APPLICATION_SUBMITTED",
      recipientRole: "HOD_PARKS",
      linkedEntityType: "MOTOR_PARK",
      linkedEntityId: motorPark.id
    });

    return {
      success: true,
      data: {
        parkId: motorPark.id,
        applicationNumber: application.applicationNumber
      }
    };
  } catch (error) {
    console.error("[createMotorParkApplication]", error);
    return { success: false, error: "Failed to create application" };
  }
}
`;

// ==================== STEP 12: Call from Client Component ====================

/**
 * CLIENT COMPONENT EXAMPLE:
 * File: app/(applicant)/applications/new/page.tsx
 */

`"use client";

import { createMotorParkApplication } from "@/app/actions/motor-park";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewMotorParkPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const userContext = useUserContext(); // Your custom hook

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createMotorParkApplication(userContext, {
      businessName: formData.get("businessName"),
      locationAddress: formData.get("locationAddress"),
      cacRegistrationNumber: formData.get("cacNumber"),
      anssidNumber: formData.get("asinNumber"),
      contactPerson: formData.get("contactPerson"),
      contactPhone: formData.get("contactPhone"),
      contactEmail: formData.get("contactEmail")
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    // Success!
    router.push(\`/applications/\${result.data.parkId}\`);
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields here */}
      <button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Submit Application"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}
`;

// ==================== REFERENCE ALL DOCUMENTATION ====================

/**
 * DOCUMENTATION MAP (READ IN THIS ORDER):
 *
 * Foundation:
 *   1. docs/IMPLEMENTATION_PLAN.md ← Timeline & milestones
 *   2. docs/DESIGN_SYSTEM.md ← UI tokens & components
 *   3. docs/ROLES_AND_DUTIES.md ← User roles & permissions
 *
 * Features:
 *   4. docs/EPICS.md ← All 17 epics & 180+ stories
 *   5. docs/PAYSTACK_INTEGRATION.md ← Payment setup
 *
 * Development:
 *   6. docs/ARCHITECTURE.md ← System architecture (detailed version of this file)
 *   7. prisma/schema.prisma ← Database schema (with comments)
 *   8. lib/server-actions-pattern.ts ← RLS & patterns
 *   9. lib/validation-schemas.ts ← Zod schemas & types
 *
 * Operations:
 *   10. docs/PROGRESS.md ← Sprint tracking & blockers
 *   11. .copilot-instructions.md ← AI agent guidelines
 *
 * Tracking:
 *   12. docs/INDEX.md ← Quick reference
 */

export {};
