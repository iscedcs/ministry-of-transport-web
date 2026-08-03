import { getIctPrintingQueues } from "@/app/actions/ict-printing";
import { IctPrintingClient } from "./ict-printing-client";

export default async function IctPrintingPage() {
  const data = await getIctPrintingQueues();

  return <IctPrintingClient initialData={data} />;
}
