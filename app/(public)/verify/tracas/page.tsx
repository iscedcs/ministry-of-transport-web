import { redirect } from "next/navigation";

export default async function VerifyTracasRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; id?: string; ref?: string }>;
}) {
  const { code, id, ref } = await searchParams;
  const target = code || id || ref;

  if (target) {
    redirect(`/v/tracas/${encodeURIComponent(target)}`);
  }

  redirect("/tracas");
}
