"use server";

/**
 * TRACAS staff provisioning — the Ag. MD/CEO's own staff.
 *
 * Ministry staff are provisioned by the Permanent Secretary via /admin/users.
 * The MD runs the transport company and needs to stand up her own TRACAS
 * printing officers without Ministry admin access, so this is a deliberately
 * narrow path: it can only ever create ICT_OFFICER_TRACAS accounts.
 *
 * The role is hard-coded rather than taken from input — accepting a role
 * parameter here would turn it into a privilege-escalation route.
 */

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

/** The only role this path may create. */
const TRACAS_STAFF_ROLE = "ICT_OFFICER_TRACAS" as const;

/** Who may provision TRACAS staff. */
const PROVISIONER_ROLES = ["TRACAS_MD", "SYSTEM_ADMIN"] as const;

const PHONE_REGEX = /^(\+234|0)[0-9]{10}$/;

const createSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Enter a valid email address"),
  phone: z
    .string()
    .regex(PHONE_REGEX, "Enter a valid Nigerian phone number")
    .optional()
    .or(z.literal("")),
  designation: z.string().optional(),
  temporaryPassword: z
    .string()
    .min(8, "Temporary password must be at least 8 characters"),
});

export type CreateTracasStaffInput = z.infer<typeof createSchema>;

export interface TracasStaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  designation: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/** Create a TRACAS printing officer account. */
export async function createTracasIctAccount(
  input: CreateTracasStaffInput,
): Promise<{ success: boolean; error?: string; email?: string }> {
  const authz = await authorize([...PROVISIONER_ROLES]);
  if (!authz.ok) {
    return {
      success: false,
      error: "Only the TRACAS MD can provision TRACAS staff.",
    };
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const {
    firstName,
    lastName,
    email,
    phone,
    designation,
    temporaryPassword,
  } = parsed.data;

  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone && phone.trim() !== "" ? phone.trim() : null;

  try {
    const existingEmail = await db.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true },
    });
    if (existingEmail) {
      return { success: false, error: "A user with this email already exists." };
    }

    if (cleanPhone) {
      const existingPhone = await db.user.findUnique({
        where: { phone: cleanPhone },
        select: { id: true },
      });
      if (existingPhone) {
        return {
          success: false,
          error: "A user with this phone number already exists.",
        };
      }
    }

    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const user = await db.user.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash,
        role: TRACAS_STAFF_ROLE,
        designation: designation?.trim() || "TRACAS Printing Officer",
        isActive: true,
      },
      select: { id: true, email: true },
    });

    await recordAudit({
      action: "TRACAS_STAFF_PROVISIONED",
      entityType: "User",
      entityId: user.id,
      changeDescription: `Provisioned TRACAS printing officer ${firstName} ${lastName} (${cleanEmail})`,
      newValues: { role: TRACAS_STAFF_ROLE, email: cleanEmail },
    });

    revalidatePath("/tracas-staff");
    return { success: true, email: user.email };
  } catch (error: unknown) {
    console.error("createTracasIctAccount failed:", error);
    return { success: false, error: "Failed to create the account." };
  }
}

/** List the TRACAS staff accounts. */
export async function listTracasStaff(): Promise<
  { success: true; data: TracasStaffMember[] } | { success: false; error: string }
> {
  const authz = await authorize([...PROVISIONER_ROLES, "COMMISSIONER"]);
  if (!authz.ok) return { success: false, error: authz.error };

  try {
    const staff = await db.user.findMany({
      where: { role: TRACAS_STAFF_ROLE },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        designation: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return { success: true, data: staff };
  } catch (error: unknown) {
    console.error("listTracasStaff failed:", error);
    return { success: false, error: "Failed to load TRACAS staff." };
  }
}

/**
 * Enable or disable a TRACAS staff account.
 * Scoped to TRACAS_STAFF_ROLE so this cannot be used to disable Ministry staff.
 */
export async function toggleTracasStaffActive(
  userId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  const authz = await authorize([...PROVISIONER_ROLES]);
  if (!authz.ok) {
    return {
      success: false,
      error: "Only the TRACAS MD can manage TRACAS staff.",
    };
  }

  try {
    const target = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, firstName: true, lastName: true },
    });
    if (!target) return { success: false, error: "Account not found." };

    if (target.role !== TRACAS_STAFF_ROLE) {
      return {
        success: false,
        error: "That account is not a TRACAS staff account.",
      };
    }

    await db.user.update({ where: { id: userId }, data: { isActive } });

    await recordAudit({
      action: isActive
        ? "TRACAS_STAFF_REACTIVATED"
        : "TRACAS_STAFF_DEACTIVATED",
      entityType: "User",
      entityId: userId,
      changeDescription: `${isActive ? "Reactivated" : "Deactivated"} TRACAS staff ${target.firstName} ${target.lastName}`,
      newValues: { isActive },
    });

    revalidatePath("/tracas-staff");
    return { success: true };
  } catch (error: unknown) {
    console.error("toggleTracasStaffActive failed:", error);
    return { success: false, error: "Failed to update the account." };
  }
}
