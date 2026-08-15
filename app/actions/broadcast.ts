"use server";

/**
 * Broadcast alerts from the executive dashboard.
 *
 * A broadcast writes one Notification row per recipient — the same table every
 * other notice on the platform uses — so an alert is auditable and appears in
 * a recipient's history rather than vanishing into an email log.
 *
 * Email delivery goes out through Resend when RESEND_API_KEY is configured.
 * If it is not, the notices are still recorded and the caller is told plainly
 * that nothing was emailed, rather than the send silently failing.
 */

import { db } from "@/lib/db";
import { authorize } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@prisma/client";

/** Only these can address the whole Ministry. */
const BROADCAST_ROLES: UserRole[] = [
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
  "SYSTEM_ADMIN",
];

export type BroadcastAudience =
  | "ALL_STAFF"
  | "ALL_APPLICANTS"
  | "EVERYONE"
  | "ROLE";

export interface BroadcastResult {
  success: boolean;
  error?: string;
  data?: {
    recipients: number;
    emailed: number;
    emailSkipped: number;
    emailFailed: number;
  };
}

/** How many recipients an audience resolves to, for the confirm dialog. */
export async function getBroadcastAudienceCount(
  audience: BroadcastAudience,
  role?: string,
): Promise<{ success: boolean; count: number; withEmail: number }> {
  const authz = await authorize([...BROADCAST_ROLES]);
  if (!authz.ok) return { success: false, count: 0, withEmail: 0 };

  const where = audienceWhere(audience, role);
  const [count, withEmail] = await Promise.all([
    db.user.count({ where }),
    db.user.count({ where: { ...where, email: { not: null } } }),
  ]);
  return { success: true, count, withEmail };
}

function audienceWhere(audience: BroadcastAudience, role?: string) {
  const active = { isActive: true };
  switch (audience) {
    case "ALL_STAFF":
      return { ...active, role: { not: "EXTERNAL_APPLICANT" as UserRole } };
    case "ALL_APPLICANTS":
      return { ...active, role: "EXTERNAL_APPLICANT" as UserRole };
    case "ROLE":
      return { ...active, role: (role ?? "SYSTEM_ADMIN") as UserRole };
    case "EVERYONE":
    default:
      return active;
  }
}

export async function broadcastAlert(input: {
  audience: BroadcastAudience;
  role?: string;
  subject: string;
  message: string;
  sendEmail: boolean;
}): Promise<BroadcastResult> {
  const authz = await authorize([...BROADCAST_ROLES]);
  if (!authz.ok) {
    return {
      success: false,
      error: "Only the Commissioner, Permanent Secretary or System Administrator can broadcast an alert.",
    };
  }

  const subject = input.subject?.trim();
  const message = input.message?.trim();

  if (!subject) return { success: false, error: "A subject is required." };
  if (!message) return { success: false, error: "A message is required." };
  if (subject.length > 150) {
    return { success: false, error: "Keep the subject under 150 characters." };
  }

  const recipients = await db.user.findMany({
    where: audienceWhere(input.audience, input.role),
    select: { id: true, email: true, firstName: true },
  });

  if (recipients.length === 0) {
    return { success: false, error: "That audience has no active members." };
  }

  // One row per recipient, written in one statement.
  await db.notification.createMany({
    data: recipients.map((r) => ({
      notificationType: "SYSTEM_ALERT" as const,
      recipientUserId: r.id,
      channel: input.sendEmail ? ("EMAIL" as const) : ("EMAIL" as const),
      subject,
      messageBody: message,
      status: "PENDING",
    })),
  });

  let emailed = 0;
  let emailFailed = 0;
  const withEmail = recipients.filter((r) => r.email);
  const emailSkipped = recipients.length - withEmail.length;

  if (input.sendEmail) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.FROM_EMAIL_ADDRESS;

    if (!apiKey || !from) {
      await recordAudit({
        action: "SYSTEM_ALERT_BROADCAST",
        entityType: "Notification",
        entityId: "broadcast",
        changeDescription: `Broadcast "${subject}" recorded for ${recipients.length} recipient(s); email not configured so nothing was sent`,
      });
      return {
        success: false,
        error: `Recorded for ${recipients.length} recipient(s), but no email was sent — RESEND_API_KEY or FROM_EMAIL_ADDRESS is not configured.`,
      };
    }

    // Sent in small batches so one bad address cannot stall the rest.
    for (const r of withEmail) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: r.email,
            subject,
            text: `${message}\n\n— Ministry of Transport, Anambra State`,
          }),
        });
        if (res.ok) emailed++;
        else emailFailed++;
      } catch {
        emailFailed++;
      }
    }

    await db.notification.updateMany({
      where: { subject, notificationType: "SYSTEM_ALERT", status: "PENDING" },
      data: { status: "SENT", sentAt: new Date(), sentViaEmail: true, emailSentAt: new Date() },
    });
  }

  await recordAudit({
    action: "SYSTEM_ALERT_BROADCAST",
    entityType: "Notification",
    entityId: "broadcast",
    changeDescription: `Broadcast "${subject}" to ${recipients.length} recipient(s) [${input.audience}${input.role ? `: ${input.role}` : ""}] — ${emailed} emailed, ${emailFailed} failed, ${emailSkipped} without an address`,
    newValues: { audience: input.audience, recipients: recipients.length },
  });

  revalidatePath("/dashboard");

  return {
    success: true,
    data: {
      recipients: recipients.length,
      emailed,
      emailSkipped,
      emailFailed,
    },
  };
}
