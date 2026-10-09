import { getSession } from "@/lib/auth";
import { getIctPrintingQueues } from "@/app/actions/ict-printing";
import { IctPrintingClient } from "./ict-printing-client";

export default async function IctPrintingPage() {
  const session = await getSession();
  const data = await getIctPrintingQueues();

  return <IctPrintingClient initialData={data} role={session?.role ?? null} />;
}
