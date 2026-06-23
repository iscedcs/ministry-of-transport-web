/\*\*

- ARCHITECTURE GUIDE — Server Actions & Database Schema
- Ministry of Transport Platform
-
- Reference: docs/IMPLEMENTATION_PLAN.md (STORY-001 through STORY-010)
-           docs/ROLES_AND_DUTIES.md (FR-001 through FR-004)
-           docs/EPICS.md (EPIC-001: Foundation & Authentication)
-           lib/server-actions-pattern.ts
-           lib/validation-schemas.ts
-           prisma/schema.prisma
-
- Last Updated: April 23, 2026
  \*/

// ==================== SYSTEM ARCHITECTURE ====================

/\*

- NO EXTERNAL BACKEND — All business logic runs in Next.js Server Actions
-
- Traditional Multi-Tier:
- Client → API Server → Database
-
- Our Architecture (Server Actions):
- Client Component → Next.js Server → Database (Neon PostgreSQL)
- (All in same codebase, zero latency, automatic error handling)
  \*/

// ==================== FILE STRUCTURE ====================

/\*

- ministry-of-transport/
- ├── prisma/
- │ ├── schema.prisma ← Database schema (11 core models + 15 supporting models)
- │ ├── migrations/ ← Auto-generated migration files
- │ └── seed.ts ← Seed data (roles, templates, fee schedules)
- │
- ├── lib/
- │ ├── server-actions-pattern.ts ← RLS patterns & server action templates
- │ ├── validation-schemas.ts ← Zod schemas for all inputs
- │ ├── auth.ts ← JWT/session handling
- │ ├── email.ts ← SendGrid integration
- │ ├── sms.ts ← SMS provider integration (Termii/Twilio)
- │ ├── paystack-client.ts ← Paystack API wrapper
- │ ├── notifications-queue.ts ← Notification processing
- │ ├── audit-logger.ts ← Audit trail helpers
- │ └── db.ts ← Prisma client singleton
- │
- ├── app/
- │ ├── actions/ ← Server action modules (per feature)
- │ │ ├── motor-park.ts ← Motor Park CRUD + workflows
- │ │ ├── mass-transit.ts ← Mass Transit CRUD + workflows
- │ │ ├── payments.ts ← Payment initialization + webhooks
- │ │ ├── inspections.ts ← Inspection scheduling + updates
- │ │ ├── notifications.ts ← Notification queuing + sending
- │ │ ├── avir.ts ← AVIR report creation + routing
- │ │ ├── admin.ts ← System admin functions
- │ │ ├── auth.ts ← Login + registration
- │ │ └── files.ts ← Document upload handling
- │ │
- │ ├── api/ ← API routes (webhooks, auth)
- │ │ ├── webhooks/
- │ │ │ └── paystack/ ← Paystack webhook endpoint (POST)
- │ │ ├── auth/
- │ │ │ ├── [...nextauth]/ ← NextAuth routes
- │ │ │ └── login/ ← Custom login
- │ │ └── health/ ← Health check endpoint
- │ │
- │ ├── (dashboard)/ ← Dashboard layout & pages
- │ │ ├── (commissioner)/ ← Commissioner dashboard
- │ │ ├── (permanent-secretary)/ ← PS dashboard
- │ │ ├── (hod)/ ← HOD dashboards
- │ │ ├── (field-inspector)/ ← Inspector dashboard
- │ │ ├── (finance)/ ← Finance dashboard
- │ │ └── (applicant)/ ← External applicant portal
- │ │
- │ ├── components/ ← Reusable UI components
- │ │ ├── forms/ ← Form components
- │ │ │ ├── motor-park-form.tsx
- │ │ │ ├── inspection-form.tsx
- │ │ │ └── payment-form.tsx
- │ │ ├── modals/ ← Modal dialogs
- │ │ ├── dashboards/ ← Role-specific dashboards
- │ │ ├── tables/ ← Data tables
- │ │ └── ui/ ← Base components (Button, Input, etc.)
- │ │
- │ ├── hooks/ ← Custom React hooks
- │ │ ├── use-motor-park.ts ← Motor Park data fetching
- │ │ ├── use-payments.ts ← Payment flow
- │ │ └── use-user-context.ts ← Auth context
- │ │
- │ └── layout.tsx ← Root layout (auth guard)
- │
- ├── public/
- │ ├── assets/ ← Logo, brand images
- │ └── uploads/ ← User-uploaded documents (temporary)
- │
- ├── .env.local ← Local secrets (not committed)
- ├── .env.example ← Template for env variables
- ├── next.config.ts
- ├── tsconfig.json
- ├── tailwind.config.ts
- ├── prisma.schema
- └── package.json
  \*/

// ==================== SERVER ACTIONS FLOW ====================

/\*

- Step 1: Client Component (TSX)
- ──────────────────────────────
-
- "use client"; // Directive for Client Component
- import { createMotorParkApplication } from "@/app/actions/motor-park";
-
- export default function MotorParkForm() {
- async function handleSubmit(formData: FormData) {
-     const result = await createMotorParkApplication(userContext, {
-       businessName: formData.get("businessName"),
-       locationAddress: formData.get("locationAddress"),
-       // ...
-     });
-
-     if (!result.success) {
-       setError(result.error);
-       return;
-     }
-     router.push(`/applications/${result.data.parkId}`);
- }
- }
-
- ↓↓↓
-
- Step 2: Server Action (lib/validation-schemas.ts + app/actions/motor-park.ts)
- ────────────────────────────────────────────────────────────────────────────
-
- "use server"; // Directive for Server Action
-
- export async function createMotorParkApplication(
- userContext: UserContext,
- input: MotorParkApplicationInput
- ): Promise<ActionResult<{ parkId: string; applicationNumber: string }>> {
-
- // 1. Role check
- if (userContext.role !== "EXTERNAL_APPLICANT") {
-     return { success: false, error: "Access denied" };
- }
-
- // 2. Input validation (Zod schema)
- const validation = motorParkApplicationSchema.safeParse(input);
- if (!validation.success) {
-     return { success: false, error: validation.error.message };
- }
-
- // 3. Uniqueness check
- const existing = await db.motorPark.findFirst({
-     where: {
-       OR: [
-         { cacRegistrationNumber: input.cacRegistrationNumber },
-         { anssidNumber: input.anssidNumber }
-       ]
-     }
- });
- if (existing) {
-     return { success: false, error: "Already registered" };
- }
-
- // 4. Create within transaction
- const result = await db.$transaction(async (tx) => {
-     const motorPark = await tx.motorPark.create({
-       data: {
-         businessName: input.businessName,
-         locationAddress: input.locationAddress,
-         cacRegistrationNumber: input.cacRegistrationNumber,
-         contactUserId: userContext.userId,
-         // ...
-       }
-     });
-
-     const application = await tx.application.create({
-       data: {
-         applicationNumber: `APP-${Date.now()}`,
-         applicationType: "MOTOR_PARK",
-         linkedEntityId: motorPark.id,
-         createdByUserId: userContext.userId
-       }
-     });
-
-     return { motorPark, application };
- });
-
- // 5. Audit log
- await logAuditEvent(userContext.userId, "CREATE", "MOTOR_PARK", motorPark.id);
-
- // 6. Queue notification
- await queueNotification({
-     notificationType: "APPLICATION_SUBMITTED",
-     recipientRole: "HOD_PARKS",
-     linkedEntityType: "MOTOR_PARK",
-     linkedEntityId: motorPark.id
- });
-
- return {
-     success: true,
-     data: {
-       parkId: motorPark.id,
-       applicationNumber: application.applicationNumber
-     }
- };
- }
-
- ↓↓↓
-
- Step 3: Database (PostgreSQL via Neon)
- ─────────────────────────────────────
-
- INSERT INTO "MotorPark" (...) VALUES (...);
- INSERT INTO "Application" (...) VALUES (...);
- INSERT INTO "AuditLog" (...) VALUES (...);
- INSERT INTO "Notification" (...) VALUES (...);
-
- ↓↓↓
-
- Step 4: Return to Client (Automatic)
- ──────────────────────────────────────
-
- result.success === true
- result.data.parkId === "clm1z..." (new motor park ID)
- result.data.applicationNumber === "APP-1713920000"
-
- Client UI updates, router navigates, user sees success message.
  \*/

// ==================== ROW-LEVEL SECURITY (RLS) ====================

/\*

- RLS Pattern: Enforce at application layer (not database constraints)
-
- Why? Flexible business logic, easier debugging, role-dependent queries
-
- Example: Commissioner sees ALL motor parks
-          External Applicant sees ONLY their own park
-          Finance Officer sees ALL for reconciliation
-
- Implementation:
- 1.  Always call RLS check BEFORE querying
- 2.  Build WHERE clause based on user role
- 3.  Log denied attempts in audit trail
- 4.  Return ActionResult with error on denial
-
- Pattern:
- async function checkMotorParkReadAccess(userContext, motorParkId) {
-     if (userContext.role === "COMMISSIONER") return { allowed: true };
-     if (userContext.role === "EXTERNAL_APPLICANT") {
-       const motorPark = await db.motorPark.findUnique({
-         where: { id: motorParkId },
-         select: { contactUserId: true }
-       });
-       return { allowed: motorPark?.contactUserId === userContext.userId };
-     }
-     return { allowed: false };
- }
-
- CRITICAL: Never expose data you haven't checked RLS for!
  \*/

// ==================== TRANSACTION PATTERNS ====================

/\*

- Use db.$transaction() for multi-step operations
-
- Ensures ACID guarantees: All steps succeed or all rollback
-
- Example: Creating a motor park + application + notification must all succeed
-
- Pattern:
- const result = await db.$transaction(async (tx) => {
-     const motorPark = await tx.motorPark.create({ ... });
-     const application = await tx.application.create({ ... });
-     const notification = await tx.notification.create({ ... });
-
-     return { motorPark, application, notification };
- });
-
- If ANY step throws, entire transaction rolls back automatically.
  \*/

// ==================== AUDIT LOGGING ====================

/\*

- MANDATORY for all CREATE/UPDATE/DELETE operations
-
- What to log:
- - WHO performed the action (userId)
- - WHAT action (CREATE, UPDATE, DELETE, APPROVE, REJECT)
- - WHICH entity (entityType, entityId)
- - WHEN (timestamp automatic)
- - OLD vs NEW values (for updates)
- - WHY (optional: change description)
-
- Example:
- await logAuditEvent(
-     userId: "user_123",
-     action: "UPDATE",
-     entityType: "MOTOR_PARK",
-     entityId: "park_456",
-     oldValues: { applicationStatus: "SUBMITTED" },
-     newValues: { applicationStatus: "APPROVED" }
- );
-
- Queries:
- - Commissioner: "Show me all changes to Park XYZ"
- - Finance: "Show me all approvals by PS in the last 30 days"
- - Compliance: "Who approved this expired park?"
-
- Reference: FR-004 (Audit Trail)
  \*/

// ==================== NOTIFICATIONS (ASYNC) ====================

/\*

- Notifications are QUEUED (not sent synchronously)
-
- Why? Email/SMS can be slow; don't block user interactions
-
- Architecture:
- 1.  Server action queues notification to DB (Notification table)
- 2.  Background job (cron, worker, etc.) processes queue
- 3.  Notifications sent via SendGrid (email) + Termii/Twilio (SMS)
- 4.  Status updated (SENT, FAILED, BOUNCED)
- 5.  Retries if failed (configurable)
-
- Server Action:
- await queueNotification({
-     notificationType: "APPLICATION_SUBMITTED",
-     recipientRole: "HOD_PARKS",
-     linkedEntityType: "MOTOR_PARK",
-     linkedEntityId: motorParkId
- });
- // Returns immediately; doesn't wait for email
-
- Background Job (not shown here, separate):
- every 5 minutes:
-     SELECT * FROM Notification WHERE status = 'PENDING' AND retryCount < 3;
-     for each notification:
-       send via email/SMS provider
-       update status
-
- Reference: EPIC-007 (Notifications & Alerts)
  \*/

// ==================== PAYMENT FLOW ====================

/\*

- Integration: Paystack (docs/PAYSTACK_INTEGRATION.md)
-
- Step 1: Client initiates payment
- → Server action: initializePayment()
- → Creates Payment record (status: PENDING)
- → Calls Paystack /transaction/initialize endpoint
- → Returns Paystack checkout URL
-
- Step 2: Client redirects to Paystack checkout
- → User enters card details
- → Paystack processes charge
- → User redirected back to app (success or failure)
-
- Step 3: Paystack sends webhook
- → POST /api/webhooks/paystack with charge.success event
- → Signature verified (HMAC-SHA512)
- → Server action: verifyPaymentWebhook()
- → Updates Payment record (status: COMPLETED)
- → Triggers next workflow (e.g., "Inspection Scheduled")
-
- Step 4: Generate receipt
- → Server action: generateReceipt()
- → Creates PDF receipt
- → Queues email to payer
-
- CRITICAL SECURITY:
- - Secret key NEVER exposed to client (server action only)
- - Webhook signature ALWAYS verified
- - Amount validated (prevent client-side manipulation)
- - Transaction ID stored to prevent duplicate processing
-
- Reference: EPIC-004, docs/PAYSTACK_INTEGRATION.md
  \*/

// ==================== ERROR HANDLING ====================

/\*

- All errors return ActionResult { success: false; error: string }
-
- Error Categories:
-
- 1.  Validation Error (client-side data validation failed)
- → Return immediately with specific field error
- Example: { success: false, error: "Email is invalid" }
-
- 2.  Authorization Error (user lacks permission)
- → Log attempt in audit trail
- → Return with generic message (don't leak reason)
- Example: { success: false, error: "Access denied" }
-
- 3.  Business Logic Error (constraint violation, invalid state transition)
- → Return with specific error
- Example: { success: false, error: "Park already registered with this ASIN" }
-
- 4.  System Error (unexpected DB error, network failure)
- → Log full error server-side
- → Return generic message to client (don't expose stack trace)
- Example: { success: false, error: "An unexpected error occurred. Please try again." }
-
- Pattern:
- try {
-     // business logic
-     return { success: true, data };
- } catch (error) {
-     console.error("[actionName]", error); // Log full error
-     return { success: false, error: "An unexpected error occurred" }; // Generic to client
- }
  \*/

// ==================== PRISMA BEST PRACTICES ====================

/\*

- 1.  Always select only needed fields
- ✓ Good:
-      db.motorPark.findMany({
-        select: { id: true, businessName: true, status: true }
-      });
- ✗ Bad:
-      db.motorPark.findMany({}); // loads full record
-
- 2.  Use include for relationships only when needed
- ✓ Good:
-      db.motorPark.findUnique({
-        where: { id },
-        include: { inspections: true }
-      });
- ✗ Bad:
-      db.motorPark.findMany({
-        include: { inspections: true, payments: true, notifications: true }
-      }); // N+1 problem
-
- 3.  Use transactions for multi-step operations
- ✓ Good:
-      await db.$transaction(async (tx) => {
-        await tx.motorPark.update(...);
-        await tx.payment.create(...);
-      });
- ✗ Bad:
-      await db.motorPark.update(...);
-      await db.payment.create(...); // If second fails, first committed
-
- 4.  Use indexes for filtering columns
- ✓ Indexed columns: id, email, role, status, createdAt
- → Query will be fast
- ✗ Non-indexed columns: departmentId in some tables
- → Query will scan all rows (slow on large tables)
-
- 5.  Paginate large result sets
- ✓ Good:
-      db.motorPark.findMany({ skip: 0, take: 20 });
- ✗ Bad:
-      db.motorPark.findMany({}); // If 10k records, returns all
  \*/

// ==================== ENVIRONMENT VARIABLES ====================

/\*

- .env.local (never committed):
-
- DATABASE_URL="postgresql://user:password@host:port/dbname"
-
- NEXTAUTH_SECRET="random_secret_key"
- NEXT_PUBLIC_APP_URL="http://localhost:3000"
-
- PAYSTACK*SECRET_KEY="sk_test*..."
- NEXT*PUBLIC_PAYSTACK_PUBLIC_KEY="pk_test*..."
-
- SENDGRID_API_KEY="SG..."
- SENDGRID_FROM_EMAIL="noreply@mot.anambra.gov.ng"
-
- SMS_PROVIDER="termii" // or "twilio"
- TERMII_API_KEY="..."
- TERMII_SENDER_ID="MOT"
-
- GOOGLE_OAUTH_CLIENT_ID="..."
- GOOGLE_OAUTH_CLIENT_SECRET="..."
-
- .env.example (committed, no secrets):
-
- DATABASE_URL=postgresql://user:password@host:port/dbname
- NEXTAUTH_SECRET=your_secret_key
- PAYSTACK*SECRET_KEY=sk_test*...
- NEXT*PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test*...
- ...
  \*/

// ==================== TESTING SERVER ACTIONS ====================

/\*

- Test file: app/actions/**tests**/motor-park.test.ts
-
- Test Pattern:
- 1.  Mock Prisma client
- 2.  Call server action with test userContext
- 3.  Assert result.success and result.data/error
- 4.  Verify audit log was created
- 5.  Verify notification was queued
-
- Example:
- import { createMotorParkApplication } from "@/app/actions/motor-park";
-
- test("EXTERNAL_APPLICANT can create motor park", async () => {
-     const result = await createMotorParkApplication(
-       { userId: "user_123", role: "EXTERNAL_APPLICANT", email: "test@test.com" },
-       { businessName: "Park A", cacRegistrationNumber: "BN1234567890", ... }
-     );
-
-     expect(result.success).toBe(true);
-     expect(result.data?.parkId).toBeDefined();
-
-     // Verify audit log created
-     const auditLog = await db.auditLog.findFirst({
-       where: { entityId: result.data?.parkId, action: "CREATE" }
-     });
-     expect(auditLog).toBeDefined();
- });
  \*/

// ==================== DEPLOYMENT CHECKLIST ====================

/\*

- Before Week 1 Kickoff (STORY-001):
-
- □ PostgreSQL database created on Neon (staging + production)
- □ All Prisma migrations applied successfully
- □ Seed data loaded (roles, templates, fee schedules)
- □ Environment variables configured (.env.local)
- □ Paystack account created, test keys obtained
- □ SendGrid account created, API key configured
- □ SMS provider (Termii/Twilio) account created
- □ NextAuth configured and tested
- □ GitHub Actions CI/CD pipeline working
- □ Sentry/error monitoring configured
- □ All server action files created and tested
- □ Zod schemas validated for all inputs
- □ RLS checks implemented for all endpoints
- □ Audit logging functional
- □ Notification queue working
-
- Reference: STORY-001 through STORY-010 (Foundation Epic)
  \*/

export {};
