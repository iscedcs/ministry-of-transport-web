/**
 * Server Actions Architecture — Ministry of Transport Platform
 * Reference: docs/IMPLEMENTATION_PLAN.md | docs/ROLES_AND_DUTIES.md
 * Pattern: Next.js Server Actions with Row-Level Security (RLS)
 *
 * NO external backend — all business logic runs in Next.js server actions
 * RLS enforced at application layer (not database constraints)
 * Row ownership validated before CRUD operations
 */

import {
  ApplicationStatus,
  NotificationType,
  Prisma,
  UserRole,
} from "@prisma/client";
import { db } from "./db";
import { motorParkApplicationSchema, type MotorParkApplicationInput } from "./validation-schemas";

// ==================== TYPE DEFINITIONS ====================

/**
 * Result type for all server action responses
 * Follows standard pattern: { success: boolean; data?: T; error?: string }
 */
export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

/**
 * User context extracted from session (stored in server action headers/cookies)
 */
export interface UserContext {
  userId: string;
  role: UserRole;
  departmentId?: string;
  email: string;
  asinNumber?: string;
}

/**
 * RLS check result
 */
export interface RLSCheck {
  allowed: boolean;
  reason?: string;
}

// ==================== RLS (Row-Level Security) PATTERNS ====================

/**
 * Check if user can read a Motor Park application
 * Rules:
 *  - Commissioner/PS: can read all
 *  - HOD Parks/VIS/T.Ops/PRS: can read parks assigned to their team
 *  - Field Inspector: can read only if assigned inspection
 *  - External Applicant: can read only their own park
 *  - Finance Officer: can read all for reconciliation
 */
export async function checkMotorParkReadAccess(
  userContext: UserContext,
  motorParkId: string,
): Promise<RLSCheck> {
  if (
    userContext.role === "COMMISSIONER" ||
    userContext.role === "PERMANENT_SECRETARY"
  ) {
    return { allowed: true }; // Executive read-all
  }

  const motorPark = await db.motorPark.findUnique({
    where: { id: motorParkId },
    select: { contactUserId: true },
  });

  if (!motorPark) {
    return { allowed: false, reason: "Motor park not found" };
  }

  if (userContext.role === "EXTERNAL_APPLICANT") {
    return {
      allowed: motorPark.contactUserId === userContext.userId,
      reason:
        userContext.role === "EXTERNAL_APPLICANT"
          ? "Can only read own application"
          : undefined,
    };
  }

  if (userContext.role === "FINANCE_OFFICER") {
    return { allowed: true }; // Finance reads all for reconciliation
  }

  // HOD roles: can read parks in their workflow
  if (userContext.role.startsWith("HOD_")) {
    return { allowed: true }; // Simplified for now; add inspection assignment check later
  }

  return { allowed: false, reason: "Insufficient permissions" };
}

/**
 * Check if user can write (create/update/delete) a Motor Park application
 * Rules:
 *  - Commissioner/PS: can modify (update status, approve, revoke)
 *  - External Applicant: can modify only their own park (before approval)
 *  - Field Inspectors: can update inspection findings (once inspection assigned)
 *  - Others: cannot write
 */
export async function checkMotorParkWriteAccess(
  userContext: UserContext,
  motorParkId: string,
  operation: "UPDATE_APPLICANT" | "APPROVE" | "UPDATE_INSPECTION",
): Promise<RLSCheck> {
  if (
    userContext.role === "COMMISSIONER" ||
    userContext.role === "PERMANENT_SECRETARY"
  ) {
    return { allowed: true }; // Executive can do anything
  }

  const motorPark = await db.motorPark.findUnique({
    where: { id: motorParkId },
    select: { contactUserId: true, applicationStatus: true },
  });

  if (!motorPark) {
    return { allowed: false, reason: "Motor park not found" };
  }

  switch (operation) {
    case "UPDATE_APPLICANT":
      // Applicants can only modify their own application before inspection
      return {
        allowed:
          motorPark.contactUserId === userContext.userId &&
          motorPark.applicationStatus === "SUBMITTED",
        reason:
          "Applicants can only modify own application before inspection starts",
      };

    case "UPDATE_INSPECTION":
      // Field Inspectors can update inspection results
      // (check performed separately via inspection assignment table)
      return {
        allowed: userContext.role === "FIELD_INSPECTOR",
        reason: "Only field inspectors can update inspection findings",
      };

    case "APPROVE":
      // Commissioner / PS already returned `allowed: true` at the top of this function.
      // Any other role reaching here cannot approve.
      return {
        allowed: false,
        reason: "Only Commissioner or PS can approve applications",
      };

    default:
      return { allowed: false, reason: "Unknown operation" };
  }
}

// ==================== SERVER ACTION PATTERNS ====================

/**
 * Pattern 1: Fetch with RLS Check
 *
 * Usage:
 *   const result = await fetchMotorParkWithRLS(userContext, parkId);
 *   if (!result.success) {
 *     throw new Error(result.error);
 *   }
 *   return result.data; // type-safe MotorPark
 */
export async function fetchMotorParkWithRLS(
  userContext: UserContext,
  motorParkId: string,
): Promise<ActionResult<any>> {
  try {
    // Step 1: RLS Check
    const rls = await checkMotorParkReadAccess(userContext, motorParkId);
    if (!rls.allowed) {
      return { success: false, error: `Access denied: ${rls.reason}` };
    }

    // Step 2: Fetch (already authorized)
    const motorPark = await db.motorPark.findUnique({
      where: { id: motorParkId },
      include: {
        applicant: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        inspections: {
          select: { id: true, status: true, inspectionType: true },
        },
        payments: { select: { id: true, status: true, amount: true } },
      },
    });

    if (!motorPark) {
      return { success: false, error: "Motor park not found" };
    }

    // Step 3: Audit log (optional but recommended)
    await logAuditEvent(userContext.userId, "READ", "MOTOR_PARK", motorParkId);

    return { success: true, data: motorPark };
  } catch (error) {
    console.error("[fetchMotorParkWithRLS]", error);
    return { success: false, error: "Failed to fetch motor park" };
  }
}

/**
 * Pattern 2: Create with RLS Check & Validation
 *
 * Usage:
 *   const result = await createMotorParkApplication(userContext, {
 *     businessName: "...",
 *     locationAddress: "...",
 *     ...
 *   });
 */
export async function createMotorParkApplication(
  userContext: UserContext,
  input: MotorParkApplicationInput,
): Promise<ActionResult<{ parkId: string; applicationNumber: string }>> {
  try {
    // Step 1: Role check (only external applicants can create)
    if (userContext.role !== "EXTERNAL_APPLICANT") {
      return {
        success: false,
        error: "Only external applicants can submit applications",
      };
    }

    // Step 2: Input validation (use Zod)
    const validation = motorParkApplicationSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: `Validation failed: ${validation.error.message}`,
      };
    }

    // Step 3: Check uniqueness constraints
    const existing = await db.motorPark.findFirst({
      where: {
        OR: [
          { cacRegistrationNumber: input.cacRegistrationNumber },
          { anssidNumber: input.anssidNumber },
        ],
      },
    });

    if (existing) {
      return {
        success: false,
        error: "CAC or ANSSID number already registered in the system",
      };
    }

    // Step 4: Create within transaction
    const { motorPark, application } = await db.$transaction(async (tx) => {
      // Create MotorPark
      const newPark = await tx.motorPark.create({
        data: {
          businessName: input.businessName,
          transportCompanyName: input.transportCompanyName,
          streetAddress: input.streetAddress,
          lga: input.lga,
          townCity: input.townCity,
          gpsCoordinates: input.gpsCoordinates,
          cacRegistrationNumber: input.cacRegistrationNumber,
          anssidNumber: input.anssidNumber,
          contactPerson: input.contactPerson,
          contactPhone: input.contactPhone,
          contactEmail: input.contactEmail,
          contactUserId: userContext.userId,
          applicationStatus: "SUBMITTED",
        },
      });

      // Create Application record for tracking
      const newApp = await tx.application.create({
        data: {
          applicationNumber: `APP-${Date.now()}`,
          applicationType: "MOTOR_PARK",
          linkedEntityId: newPark.id,
          status: "SUBMITTED",
          createdByUserId: userContext.userId,
          submittedByName: `${userContext.email}`,
          submittedByEmail: input.contactEmail,
        },
      });

      return { motorPark: newPark, application: newApp };
    });

    // Step 5: Audit log
    await logAuditEvent(
      userContext.userId,
      "CREATE",
      "MOTOR_PARK",
      motorPark.id,
    );

    // Step 6: Send notification to HOD Parks
    await queueNotification({
      notificationType: "APPLICATION_SUBMITTED",
      recipientRole: "HOD_PARKS",
      linkedEntityType: "MOTOR_PARK",
      linkedEntityId: motorPark.id,
    });

    return {
      success: true,
      data: {
        parkId: motorPark.id,
        applicationNumber: application.applicationNumber,
      },
    };
  } catch (error) {
    console.error("[createMotorParkApplication]", error);
    return { success: false, error: "Failed to create application" };
  }
}

/**
 * Pattern 3: Update with Optimistic Locking & Audit Trail
 *
 * Usage:
 *   const result = await updateMotorParkStatus(userContext, parkId, {
 *     status: "APPROVED",
 *     approvalNotes: "..."
 *   });
 */
export async function updateMotorParkStatus(
  userContext: UserContext,
  motorParkId: string,
  input: {
    newStatus: ApplicationStatus;
    approvalNotes?: string;
  },
): Promise<ActionResult<{ updatedAt: string }>> {
  try {
    // Step 1: RLS Check
    const rls = await checkMotorParkWriteAccess(
      userContext,
      motorParkId,
      "APPROVE",
    );
    if (!rls.allowed) {
      return { success: false, error: `Access denied: ${rls.reason}` };
    }

    // Step 2: Validate state transition
    const motorPark = await db.motorPark.findUnique({
      where: { id: motorParkId },
      select: { applicationStatus: true },
    });

    if (!motorPark) {
      return { success: false, error: "Motor park not found" };
    }

    // Only allow valid transitions
    const validTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
      // A field capture is not in the review chain: it only ever becomes a
      // submission, and only once the full application schema passes.
      DRAFT: ["SUBMITTED"],
      SUBMITTED: [
        "UNDER_REVIEW",
        "INSPECTION_SCHEDULED",
        "PENDING_PS_INSPECTION_APPROVAL",
      ],
      UNDER_REVIEW: ["INSPECTION_SCHEDULED", "REJECTED"],
      // Revalidation routes the inspection SCHEDULE past the PS before the
      // inspector attends; it can also bounce back to the HOD to reschedule.
      PENDING_PS_INSPECTION_APPROVAL: [
        "INSPECTION_SCHEDULED",
        "SUBMITTED",
        "REJECTED",
      ],
      INSPECTION_SCHEDULED: ["INSPECTION_IN_PROGRESS", "PENDING_HOD_APPROVAL"],
      INSPECTION_IN_PROGRESS: ["INSPECTION_COMPLETED", "INSPECTION_SCHEDULED"],
      INSPECTION_COMPLETED: ["PENDING_HOD_APPROVAL", "PENDING_PS_APPROVAL", "PENDING_APPROVAL"],
      PENDING_APPROVAL: ["APPROVED", "REJECTED"],
      PENDING_HOD_APPROVAL: ["PENDING_PS_APPROVAL", "REJECTED"],
      PENDING_PS_APPROVAL: ["PENDING_COMMISSIONER_APPROVAL", "REJECTED"],
      PENDING_COMMISSIONER_APPROVAL: ["APPROVED", "REJECTED"],
      TEMPORAL_APPROVAL: ["APPROVED"],
      APPROVED: ["REVOKED"],
      REJECTED: [],
      REVOKED: [],
      WAITLISTED: ["SUBMITTED", "APPROVED"],
    };

    if (
      !validTransitions[motorPark.applicationStatus]?.includes(input.newStatus)
    ) {
      return {
        success: false,
        error: `Invalid state transition: ${motorPark.applicationStatus} → ${input.newStatus}`,
      };
    }

    // Step 3: Update within transaction
    const updated = await db.$transaction(async (tx) => {
      const oldData = motorPark;

      // Update MotorPark
      const updatedPark = await tx.motorPark.update({
        where: { id: motorParkId },
        data: {
          applicationStatus: input.newStatus,
          approvedAt: input.newStatus === "APPROVED" ? new Date() : undefined,
          approvedByUserId:
            input.newStatus === "APPROVED" ? userContext.userId : undefined,
        },
      });

      // Update Application status
      await tx.application.updateMany({
        where: {
          linkedEntityId: motorParkId,
          applicationType: "MOTOR_PARK",
        },
        data: { status: input.newStatus },
      });

      return updatedPark;
    });

    // Step 4: Audit log with change tracking
    await logAuditEvent(
      userContext.userId,
      "UPDATE",
      "MOTOR_PARK",
      motorParkId,
      {
        applicationStatus: motorPark.applicationStatus,
      },
      {
        applicationStatus: updated.applicationStatus,
      },
    );

    // Step 5: Send notification to applicant
    // No applicant account (a government-owned park) means nobody to notify.
    if (
      updated.contactUserId &&
      (input.newStatus === "APPROVED" || input.newStatus === "REJECTED")
    ) {
      await queueNotification({
        notificationType:
          input.newStatus === "APPROVED" ? "PERMIT_ISSUED" : "PERMIT_REJECTED",
        recipientUserId: updated.contactUserId,
        linkedEntityType: "MOTOR_PARK",
        linkedEntityId: motorParkId,
      });
    }

    return {
      success: true,
      data: { updatedAt: updated.updatedAt.toISOString() },
    };
  } catch (error) {
    console.error("[updateMotorParkStatus]", error);
    return { success: false, error: "Failed to update motor park status" };
  }
}

/**
 * Pattern 4: List with Pagination & RLS Filtering
 *
 * Usage:
 *   const result = await listMotorParks(userContext, { page: 1, limit: 20 });
 */
export async function listMotorParks(
  userContext: UserContext,
  options: {
    page?: number;
    limit?: number;
    status?: ApplicationStatus;
    searchQuery?: string;
  } = {},
): Promise<
  ActionResult<{
    parks: Prisma.MotorParkGetPayload<{
      select: {
        id: true;
        businessName: true;
        applicationStatus: true;
        permitStatus: true;
        applicant: {
          select: {
            firstName: true;
            lastName: true;
            email: true;
          };
        };
        appliedAt: true;
        approvedAt: true;
      };
    }>[];
    total: number;
    page: number;
    limit: number;
  }>
> {
  try {
    const page = options.page ?? 1;
    const limit = Math.min(options.limit ?? 20, 100); // cap at 100
    const skip = (page - 1) * limit;

    // Step 1: Build RLS filter based on user role
    let where: Prisma.MotorParkWhereInput = {};

    if (userContext.role === "EXTERNAL_APPLICANT") {
      // Applicants see only their own parks
      where.contactUserId = userContext.userId;
    } else if (userContext.role === "FINANCE_OFFICER") {
      // Finance sees all for reconciliation
      where = {};
    } else if (userContext.role.startsWith("HOD_")) {
      // HODs see all (simplified; could add department filtering)
      where = {};
    } else if (
      userContext.role === "COMMISSIONER" ||
      userContext.role === "PERMANENT_SECRETARY"
    ) {
      // Executive sees all
      where = {};
    } else {
      return { success: false, error: "Insufficient permissions" };
    }

    // Step 2: Apply filters
    if (options.status) {
      where.applicationStatus = options.status;
    }

    if (options.searchQuery) {
      where.OR = [
        {
          businessName: { contains: options.searchQuery, mode: "insensitive" },
        },
        {
          cacRegistrationNumber: {
            contains: options.searchQuery,
            mode: "insensitive",
          },
        },
        { anssidNumber: { contains: options.searchQuery } },
      ];
    }

    // Step 3: Fetch with pagination
    const [parks, total] = await Promise.all([
      db.motorPark.findMany({
        where,
        select: {
          id: true,
          businessName: true,
          applicationStatus: true,
          permitStatus: true,
          applicant: {
            select: { firstName: true, lastName: true, email: true },
          },
          appliedAt: true,
          approvedAt: true,
        },
        orderBy: { appliedAt: "desc" },
        skip,
        take: limit,
      }),
      db.motorPark.count({ where }),
    ]);

    return {
      success: true,
      data: {
        parks,
        total,
        page,
        limit,
      },
    };
  } catch (error) {
    console.error("[listMotorParks]", error);
    return { success: false, error: "Failed to list motor parks" };
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Log audit trail for compliance
 * Called after every CREATE/UPDATE/DELETE operation
 */
async function logAuditEvent(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  oldValues?: unknown,
  newValues?: unknown,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        performedByUserId: userId,
        action,
        entityType,
        entityId,
        oldValues: oldValues ? JSON.stringify(oldValues) : null,
        newValues: newValues ? JSON.stringify(newValues) : null,
      },
    });
  } catch (error) {
    console.error("[logAuditEvent] Failed to log:", error);
    // Don't throw — audit logging should not block operations
  }
}

/**
 * Queue notification for async delivery
 * Notifications processed by background job (e.g., cron)
 */
async function queueNotification(input: {
  notificationType: NotificationType;
  recipientUserId?: string;
  recipientRole?: UserRole;
  linkedEntityType?: string;
  linkedEntityId?: string;
}): Promise<void> {
  try {
    // If recipientRole provided, find all users with that role
    let recipientIds: string[] = [];

    if (input.recipientUserId) {
      recipientIds = [input.recipientUserId];
    } else if (input.recipientRole) {
      const recipients = await db.user.findMany({
        where: { role: input.recipientRole },
        select: { id: true },
      });
      recipientIds = recipients.map((r) => r.id);
    }

    // Get notification template
    const template = await db.notificationTemplate.findUnique({
      where: { notificationType: input.notificationType },
    });

    if (!template) {
      console.warn(
        `[queueNotification] No template for ${input.notificationType}`,
      );
      return;
    }

    // Create notification records for all recipients
    await db.notification.createMany({
      data: recipientIds.map((recipientId) => ({
        notificationType: input.notificationType,
        recipientUserId: recipientId,
        channel: "BOTH",
        subject: template.emailSubject,
        messageBody: template.emailBodyHtml,
        linkedEntityType: input.linkedEntityType,
        linkedEntityId: input.linkedEntityId,
        status: "PENDING",
      })),
    });
  } catch (error) {
    console.error("[queueNotification] Failed:", error);
  }
}

// ==================== SERVER ACTION EXPORTS ====================
// These are the functions you call from Client Components via Next.js Server Actions
// Each function is marked with "use server" at the top of its file

/**
 * Motor Park Actions
 */
export const motorParkActions = {
  create: createMotorParkApplication,
  fetch: fetchMotorParkWithRLS,
  updateStatus: updateMotorParkStatus,
  list: listMotorParks,
};

/**
 * File structure example (use "use server" directive):
 * app/actions/motor-park.ts
 * app/actions/mass-transit.ts
 * app/actions/payments.ts
 * app/actions/notifications.ts
 * app/actions/audit.ts
 * app/actions/inspections.ts
 * app/actions/avir.ts
 */
