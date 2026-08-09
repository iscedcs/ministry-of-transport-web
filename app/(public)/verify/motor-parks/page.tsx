import { redirect } from "next/navigation";

/**
 * Superseded by the unified verification portal at /verify, which resolves
 * plates, fleet numbers, authority references and park names in one search.
 *
 * Kept as a redirect rather than deleted: the path may be linked externally
 * or bookmarked. Any existing ?q= is carried through so a shared search URL
 * still lands on its results.
 */
export default async function VerifyMotorParksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  redirect(q ? `/verify?q=${encodeURIComponent(q)}` : "/verify");
}
