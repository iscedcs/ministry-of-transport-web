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
import { revalidatePath } from "next/cache";
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

const loginApplicantSchema = z.object({
  email: z.string().email("Enter a valid email address").trim().toLowerCase(),
  asinNumber: z
    .string()
    .regex(/^\d{6,16}$/, "ASIN must be 6–16 digits (numbers only)"),
});

/**
 * External Applicant registration schema.
 * Ministry staff are provisioned via admin panel — they cannot self-register.
 * Reference: docs/ROLES_AND_DUTIES.md — External Applicant type
 * PRD: ASIN number required for all external users (Anambra State ID)
 */
const externalRegisterSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .trim(),
  lastName: z.string().min(2, "Last name must be at least 2 characters").trim(),
  email: z.string().email("Enter a valid email address").trim().toLowerCase(),
  phone: z
    .string()
    .regex(
      /^(\+234|0)[0-9]{10}$/,
      "Enter a valid Nigerian phone number (e.g. 08012345678)",
    ),
  residentialAddress: z
    .string()
    .min(5, "Residential address is required")
    .trim(),
  asinNumber: z
    .string()
    .regex(/^\d{6,16}$/, "ASIN must be 6–16 digits (numbers only)"),
  service: z.enum(["MOTOR_PARK", "MASS_TRANSIT"], {
    error: "Please select a service to register for",
  }),
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

type RegisterFields = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  residentialAddress?: string;
  asinNumber?: string;
};

export type AuthFormState =
  | {
      errors?: Record<string, string[]>;
      message?: string;
      fields?: RegisterFields;
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

  // 2a. Guard: applicants must use the applicant sign-in page
  if (user?.role === "EXTERNAL_APPLICANT") {
    return {
      message: "Applicants must sign in using the applicant login page.",
    };
  }

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
  const fields = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    residentialAddress: formData.get("residentialAddress") as string,
    asinNumber: formData.get("asinNumber") as string,
  };

  // 1. Validate
  const validated = externalRegisterSchema.safeParse({
    ...fields,
    service: formData.get("service"),
  });

  if (!validated.success) {
    return {
      errors: validated.error.flatten().fieldErrors,
      fields,
    };
  }

  const { firstName, lastName, email, phone, residentialAddress, asinNumber, service } =
    validated.data;

  // 2. Check for duplicate email, ASIN, or phone
  const existing = await db.user.findFirst({
    where: { OR: [{ email }, { asinNumber }, { phone }] },
    select: { email: true, asinNumber: true, phone: true },
  });

  if (existing) {
    if (existing.email === email) {
      return {
        errors: { email: ["An account with this email already exists"] },
        fields,
      };
    }

    if (existing.asinNumber === asinNumber) {
      return {
        errors: { asinNumber: ["This ASIN number is already registered"] },
        fields,
      };
    }

    if (existing.phone === phone) {
      return {
        errors: { phone: ["A phone number with this number already exists"] },
        fields,
      };
    }
  }

  // 3. Create user (passwordless — applicants authenticate via email + ASIN)
  await db.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      residentialAddress,
      asinNumber,
      passwordHash: null,
      role: "EXTERNAL_APPLICANT",
      registeredService: service,
      isActive: true,
    },
  });

  // 4. Redirect to applicant login with success message
  redirect("/login?registered=1");
}

const addServiceSchema = z.object({
  service: z.enum(["MOTOR_PARK", "MASS_TRANSIT"]),
});

export async function addApplicantService(
  prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole(["EXTERNAL_APPLICANT"]);

  const validated = addServiceSchema.safeParse({
    service: formData.get("service"),
  });

  if (!validated.success) {
    return { success: false, error: "Please select a valid service." };
  }

  const service = validated.data.service;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { registeredService: true },
  });

  if (!user) {
    return { success: false, error: "User account not found." };
  }

  const existingServices = user.registeredService
    ? user.registeredService.split(",").map((value) => value.trim())
    : [];

  if (existingServices.includes(service)) {
    return { success: true };
  }

  const updatedValue = [...existingServices, service].join(",");

  await db.user.update({
    where: { id: session.userId },
    data: { registeredService: updatedValue },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// ==================== LOGIN (EXTERNAL APPLICANTS — passwordless) ====================

/**
 * Passwordless login for External Applicants.
 * Authentication is via email + ASIN number (no password).
 * Ministry staff must use /staff/login.
 */
export async function loginApplicant(
  state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const validated = loginApplicantSchema.safeParse({
    email: formData.get("email"),
    asinNumber: formData.get("asinNumber"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, asinNumber } = validated.data;

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      asinNumber: true,
      role: true,
      departmentId: true,
      isActive: true,
    },
  });

  // Use constant-time string comparison stub — ASIN is not secret enough for
  // full timing-safe compare, but we avoid early-return user enumeration
  const asinMatch = user?.asinNumber === asinNumber;

  if (!user || user.role !== "EXTERNAL_APPLICANT" || !asinMatch) {
    return { message: "Invalid email or ASIN number" };
  }

  if (!user.isActive) {
    return {
      message: "Your account has been deactivated. Contact the Ministry.",
    };
  }

  await createSession({
    userId: user.id,
    role: user.role,
    departmentId: undefined,
  });

  db.user
    .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    .catch(() => {});

  redirect("/dashboard");
}

// ==================== GET MY PROFILE ====================

export type UserProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  asinNumber: string | null;
  residentialAddress: string | null;
};

/**
 * Fetch profile details for the currently logged in user.
 */
export async function getMyProfile(): Promise<ActionResult<UserProfile>> {
  const session = await requireAuth();

  try {
    // Primary query — includes residentialAddress (requires schema migration)
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        asinNumber: true,
        residentialAddress: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return { success: true, data: user };
  } catch {
    // Fallback: residentialAddress column may not yet exist in DB
    // (run `npx prisma db push` with a direct Neon connection URL to fix this)
    try {
      const user = await db.user.findUnique({
        where: { id: session.userId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          asinNumber: true,
        },
      });

      if (!user) {
        return { success: false, error: "User not found" };
      }

      return { success: true, data: { ...user, residentialAddress: null } };
    } catch {
      return { success: false, error: "Failed to load profile" };
    }
  }
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
  if (!user.passwordHash)
    return {
      success: false,
      error: "This account does not use password authentication",
    };

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
