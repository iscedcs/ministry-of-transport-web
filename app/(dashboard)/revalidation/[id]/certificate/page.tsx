/**
 * The applicant's copy of their own approval letter.
 *
 * Same page as the Ministry's, at a path the applicant can reach: middleware
 * blocks /admin/* for external accounts outright, so linking them there sent
 * them straight back to the dashboard. Ownership is enforced inside the page
 * by authorizeDocument.
 */
export { default } from "@/app/(dashboard)/admin/revalidation-queue/[id]/certificate/page";
