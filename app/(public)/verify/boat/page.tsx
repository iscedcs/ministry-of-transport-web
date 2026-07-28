import { getBoatPublicVerification } from "@/app/actions/boats";
import { redirect, notFound } from "next/navigation";

export default async function BoatStickerLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ sticker?: string; code?: string; url?: string }>;
}) {
  const { sticker, code, url } = await searchParams;

  const target = sticker || code || url;
  if (!target) {
    notFound();
  }

  const res = await getBoatPublicVerification(target);

  if (res.success && res.data) {
    redirect(`/verify/boat/${res.data.id}`);
  }

  notFound();
}
