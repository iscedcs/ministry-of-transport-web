import { redirect } from "next/navigation";
import { extractStickerCode } from "@/lib/tracas-sticker";

/**
 * Single-segment sticker fallback — e.g. /v/status1772625096308
 *
 * Physical TRACAS stickers encode transpaytms URLs whose path is a single
 * segment (/v/status<id>). When transpaytms began redirecting here those
 * requests hit /v/<code>, for which there was no route, producing a 404
 * before any lookup ran. This normalises them onto the real verification
 * route rather than reprinting stickers already in circulation.
 *
 * Two-segment paths like /v/tracas/<id> match the more specific route and
 * never reach this one.
 */
export default async function StickerShortLinkPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalised = extractStickerCode(decodeURIComponent(code));
  redirect(`/v/tracas/${encodeURIComponent(normalised)}`);
}
