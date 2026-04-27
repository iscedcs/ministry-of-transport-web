"use server";

/**
 * Auth Server Actions — Ministry of Transport Platform
 * Reference: docs/ROLES_AND_DUTIES.md | docs/EPICS.md (STORY-006, STORY-007)
 *            node_modules/next/dist/docs/01-app/02-guides/authentication.md
 *
 * Two user paths:
 *  1. External Applicants — self-register with ASIN number (public)
 *  2. Ministry Staff — accounts provisioned by Permanent Secretary only (no self-signup)
 *
 * Session: 7-day sliding JWT in HttpOnly cookie (lib/session.ts)
 * Passwords: bcryptjs with cost factor 12
 *
 * STORY-006: Auth framework
 * STORY-007: User registration & login flows
 * STORY-008 (stub): Password reset via email OTP — implementation deferred
 */

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/session";
import { requireAuth, requireRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/server-actions-pattern";

// ==================== VALIDATION SCHEMAS ====================

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

/**
 * External Applicant registration schema.
 * Ministry staff are provisioned via admin panel — they cannot self-register.
 * Reference: docs/ROLES_AND_DUTIES.md — External Applicant type
 * PRD: ASIN number required for all external users (Anambra State ID)
 */
const externalRegisterSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name must be at least 2 characters")
      .trim(),
    lastName: z
      .string()
      .min(2, "Last name must be at least 2 characters")
      .trim(),
    email: z.string().email("Enter a valid email address").trim().toLowerCase(),
    phone: z
      .string()
      .regex(
        /^(\+234|0)[0-9]{10}$/,
        "Enter a valid Nigerian phone number (e.g. 08012345678)",
      )
      .optional()
      .or(z.literal("")),
    asinNumber: z
      .string()
      .regex(
        /^\d{16}$/,
        "ASIN must be exactly 16 digits (your Anambra State ID Number)",
      ),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Ministry staff provisioning schema.
 * Only PERMANENT_SECRETARY and SYSTEM_ADMIN may call provisionStaffAccount.
 * Reference: docs/ROLES_AND_DUTIES.md — PS manages all staff accounts
 */
const provisionStaffSchema = z.object({
  firstName: z.string().min(2).trim(),
  lastName: z.string().min(2).trim(),
  email: z.string().email().trim().toLowerCase(),
  phone: z
    .string()
    .regex(/^(\+234|0)[0-9]{10}$/)
    .optional()
    .or(z.literal("")),
  role: z.enum([
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "HOD_PARKS",
    "HOD_VIS",
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS_REVALIDATION",
    "FIELD_INSPECTOR",
    "FINANCE_OFFICER",
    "VEHICLE_INSPECTION_OFFICER",
    "SYSTEM_ADMIN",
  ]),
  departmentId: z.string().optional(),
  designation: z.string().optional(),
  stationLocation: z.string().optional(),
  temporaryPassword: z.string().min(8),
});

// ==================== FORM STATE TYPE ====================

export type AuthFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
    }
  | undefined;

// ==================== LOGIN ====================

/**
 * Login action — works for both Ministry staff and External Applicants.
 * Called via: useActionState(login, undefined) on the login form.
 *
 * On success: creates session cookie → redirects to /dashboard
 * On failure: returns validation errors or auth error message
 */
export async function login(
  state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // 1. Validate fields
  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;

  // 2. Look up user
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      role: true,
      departmentId: true,
      isActive: true,
      firstName: true,
    },
  });

  // 3. Constant-time comparison (prevent timing attacks on user enumeration)
  const dummyHash =
    "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uO6u";
  const passwordMatch = await bcrypt.compare(
    password,
    user?.passwordHash ?? dummyHash,
  );

  if (!user || !passwordMatch) {
    return { message: "Invalid email or password" };
  }

  if (!user.isActive) {
    return {
      message:
        "Your account has been deactivated. Contact the Ministry administrator.",
    };
  }

  // 4. Create session
  await createSession({
    userId: user.id,
    role: user.role,
    departmentId: user.departmentId ?? undefined,
  });

  // 5. Update last login timestamp (fire-and-forget — don't await)
  db.user
    .update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })
    .catch(() => {});

  // 6. Redirect to role-appropriate dashboard
  redirect("/dashboard");
}

// ==================== REGISTER (EXTERNAL APPLICANTS ONLY) ====================

/**
 * Register action — for External Applicants only (park owners, transit companies, public users).
 * Ministry staff CANNOT self-register; they must be provisioned by the PS.
 * Reference: docs/ROLES_AND_DUTIES.md — External Applicant, PRD Section 4 (ASIN requirement)
 *
 * Called via: useActionState(registerApplicant, undefined) on the registration form.
 */
export async function registerApplicant(
  state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // 1. Validate
  const validated = externalRegisterSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    asinNumber: formData.get("asinNumber"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { firstName, lastName, email, phone, asinNumber, password } =
    validated.data;

  // 2. Check for duplicate email or ASIN
  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { asinNumber }] },
    select: { email: true, asinNumber: true },
  });

  if (existing) {
    if (existing.email === email) {
      return {
        errors: { email: ["An account with this email already exists"] },
      };
    }
    if (existing.asinNumber === asinNumber) {
      return {
        errors: { asinNumber: ["This ASIN number is already registered"] },
      };
    }
  }

  // 3. Hash password (cost factor 12 — OWASP recommended minimum)
  const passwordHash = await bcrypt.hash(password, 12);

  // 4. Create user
  const user = await db.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone: phone || null,
      asinNumber,
      passwordHash,
      role: "EXTERNAL_APPLICANT",
      isActive: true,
    },
    select: { id: true, role: true, departmentId: true },
  });

  // 5. Create session
  await createSession({
    userId: user.id,
    role: user.role,
    departmentId: undefined,
  });

  // 6. Redirect to applicant dashboard
  redirect("/dashboard");
}

// ==================== LOGOUT ====================

/**
 * Logout action — deletes session cookie and redirects to /login.
 * Can be invoked from a form action or directly in a Server Action.
 */
export async function logout(): Promise<never> {
  await deleteSession();
  redirect("/login");
}

// ==================== STAFF PROVISIONING ====================

/**
 * Provision a new Ministry staff account.
 * Only PERMANENT_SECRETARY and SYSTEM_ADMIN may call this action.
 * Reference: docs/ROLES_AND_DUTIES.md — PS manages all Ministry staff accounts
 * Reference: docs/EPICS.md — STORY-080 (Admin: Staff provisioning)
 *
 * Staff receive a temporary password and must change it on first login.
 * (First-login password change enforced via `mustChangePassword` flag — STORY-008 scope)
 */
export async function provisionStaffAccount(
  data: z.infer<typeof provisionStaffSchema>,
): Promise<ActionResult<{ userId: string; email: string }>> {
  // 1. Verify caller is PS or SYSTEM_ADMIN
  const session = await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);

  // 2. Validate input
  const validated = provisionStaffSchema.safeParse(data);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    role,
    departmentId,
    designation,
    stationLocation,
    temporaryPassword,
  } = validated.data;

  // 3. Check duplicate email
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return { success: false, error: "A user with this email already exists" };
  }

  // 4. Hash the temporary password
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  // 5. Create staff user
  const user = await db.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone: phone || null,
      passwordHash,
      role,
      departmentId: departmentId || null,
      designation: designation || null,
      stationLocation: stationLocation || null,
      isActive: true,
    },
    select: { id: true, email: true },
  });

  // 6. Audit log
  await db.auditLog.create({
    data: {
      performedByUserId: session.userId,
      action: "STAFF_ACCOUNT_PROVISIONED",
      entityType: "User",
      entityId: user.id,
      newValues: JSON.stringify({ role, email, provisionedBy: session.userId }),
    },
  });

  return { success: true, data: { userId: user.id, email: user.email } };
}

// ==================== CHANGE PASSWORD ====================

/**
 * Change own password (authenticated user).
 * Validates current password before allowing the change.
 * Reference: docs/EPICS.md — STORY-007, STORY-008
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult> {
  const session = await requireAuth();

  // Validate new password strength
  const passwordSchema = z
    .string()
    .min(8, "New password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number");

  const validated = passwordSchema.safeParse(newPassword);
  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message };
  }

  // Verify current password
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });

  if (!user) return { success: false, error: "User not found" };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Current password is incorrect" };
  }

  // Update hash
  const newHash = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: session.userId },
    data: { passwordHash: newHash, updatedAt: new Date() },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      performedByUserId: session.userId,
      action: "PASSWORD_CHANGED",
      entityType: "User",
      entityId: session.userId,
      changeDescription: "Password changed by user",
    },
  });

  return { success: true };
}

// ==================== DEACTIVATE STAFF ACCOUNT ====================

/**
 * Deactivate a Ministry staff account (soft delete — sets isActive = false).
 * Only PERMANENT_SECRETARY and SYSTEM_ADMIN may deactivate accounts.
 * Reference: docs/ROLES_AND_DUTIES.md — PS manages staff accounts
 */
export async function deactivateStaffAccount(
  targetUserId: string,
): Promise<ActionResult> {
  const session = await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN"]);

  // Prevent self-deactivation
  if (targetUserId === session.userId) {
    return { success: false, error: "You cannot deactivate your own account" };
  }

  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { role: true, isActive: true },
  });

  if (!target) return { success: false, error: "User not found" };
  if (!target.isActive)
    return { success: false, error: "Account is already deactivated" };

  // Prevent deactivating COMMISSIONER (requires special override)
  if (target.role === "COMMISSIONER") {
    return {
      success: false,
      error: "Commissioner account cannot be deactivated through this action",
    };
  }

  await db.user.update({
    where: { id: targetUserId },
    data: { isActive: false },
  });

  await db.auditLog.create({
    data: {
      performedByUserId: session.userId,
      action: "STAFF_ACCOUNT_DEACTIVATED",
      entityType: "User",
      entityId: targetUserId,
      newValues: JSON.stringify({ deactivatedBy: session.userId }),
    },
  });

  return { success: true };
}
