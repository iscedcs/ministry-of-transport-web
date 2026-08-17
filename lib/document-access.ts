import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Who may open an issued letter or certificate.
 *
 * These pages were gated on Ministry roles alone, which locked out the one
 * person the document is actually FOR. An applicant clicking their own
 * approval letter was sent to /unauthorized and bounced to the dashboard.
 *
 * The rule is: Ministry staff may view any document; an applicant may view
 * their own and nobody else's. That second half matters — the motor park
 * letter previously checked only that you were signed in, so any account
 * could read any park's letter by changing the id in the URL.
 */
export const DOCUMENT_STAFF_ROLES: UserRole[] = [
  "COMMISSIONER",
  "PERMANENT_SECRETARY",
  "HOD_PARKS",
  "HOD_PARKS_REVALIDATION",
  "HOD_TRANSPORT_OPS",
  "SYSTEM_ADMIN",
  "ADMIN",
  "ICT_OFFICER",
];

type DocumentSubject =
  | { kind: "motorPark"; id: string }
  | { kind: "massTransit"; id: string }
  | { kind: "revalidation"; id: string };

async function ownerOf(subject: DocumentSubject): Promise<string | null> {
  switch (subject.kind) {
    case "motorPark": {
      const r = await db.motorPark.findUnique({
        where: { id: subject.id },
        select: { contactUserId: true },
      });
      return r?.contactUserId ?? null;
    }
    case "massTransit": {
      const r = await db.massTransitCompany.findUnique({
        where: { id: subject.id },
        select: { contactUserId: true },
      });
      return r?.contactUserId ?? null;
    }
    case "revalidation": {
      const r = await db.revalidationApplication.findUnique({
        where: { id: subject.id },
        select: { applicantUserId: true },
      });
      return r?.applicantUserId ?? null;
    }
  }
}

/**
 * Redirects rather than returning a flag: every caller is a page whose only
 * sensible response to "not yours" is to send the reader away.
 */
export async function authorizeDocument(subject: DocumentSubject) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (DOCUMENT_STAFF_ROLES.includes(session.role)) return session;

  const owner = await ownerOf(subject);
  if (owner && owner === session.userId) return session;

  redirect("/unauthorized");
}
