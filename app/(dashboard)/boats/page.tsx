import { getBoatsList, getBoatRidersList, getAvailableStickers, getStickersList } from "@/app/actions/boats";
import { getSession } from "@/lib/auth";
import BoatsClient from "./boats-client";

export const metadata = {
  title: "Boats & Maritime Fleet Management — Ministry of Transport",
};

export default async function BoatsPage() {
  const [boatsRes, ridersRes, availStickersRes, allStickersRes, session] =
    await Promise.all([
      getBoatsList(),
      getBoatRidersList(),
      getAvailableStickers(),
      getStickersList(),
      getSession(),
    ]);

  const boats = boatsRes.success && boatsRes.data ? boatsRes.data : [];
  const riders = ridersRes.success && ridersRes.data ? ridersRes.data : [];
  const availableStickers = availStickersRes.success && availStickersRes.data ? availStickersRes.data : [];
  const allStickers = allStickersRes.success && allStickersRes.data ? allStickersRes.data : [];

  return (
    <BoatsClient
      initialBoats={boats}
      initialRiders={riders}
      initialAvailableStickers={availableStickers}
      initialAllStickers={allStickers}
      currentUserRole={session?.role ?? null}
    />
  );
}
