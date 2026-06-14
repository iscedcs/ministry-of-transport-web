import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getMotorPark } from "@/app/actions/motor-park";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "./print-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

function numberToWords(amount: number): string {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  
  if (amount === 0) return "Zero";
  
  const formatThousands = (num: number): string => {
    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      const remainder = num % 1000;
      return `${formatHundreds(thousands)} Thousand${remainder > 0 ? " " + formatHundreds(remainder) : ""}`;
    }
    return formatHundreds(num);
  };
  
  const formatHundreds = (num: number): string => {
    if (num >= 100) {
      const hundreds = Math.floor(num / 100);
      const remainder = num % 100;
      return `${units[hundreds]} Hundred${remainder > 0 ? " and " + formatTens(remainder) : ""}`;
    }
    return formatTens(num);
  };
  
  const formatTens = (num: number): string => {
    if (num < 10) return units[num];
    if (num >= 10 && num < 20) return teens[num - 10];
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    return `${tens[ten]}${unit > 0 ? "-" + units[unit] : ""}`;
  };
  
  return formatThousands(amount);
}

function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
}

function formatLetterDate(date: Date): string {
  const day = date.getDate();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day}${getOrdinalSuffix(day)} ${month}, ${year}`;
}

export default async function TemporalCertificatePage({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const result = await getMotorPark(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const park = result.data;

  // Retrieve current commissioner name from database
  const commissionerUser = await db.user.findFirst({
    where: { role: "COMMISSIONER" },
  });
  const commissionerName = commissionerUser
    ? `${commissionerUser.firstName} ${commissionerUser.lastName}`
    : "Mrs. Patricia Igwebuike";

  // Fetch applicant's application payment reference (Paystack txn ID)
  const applicationPayment = await db.payment.findFirst({
    where: {
      motorParkId: id,
      paymentType: "PARK_APPLICATION",
      status: "COMPLETED",
    },
    select: { paystackTransactionId: true },
    orderBy: { completedAt: "desc" },
  });
  // Fall back to the applicant's ASIN number if no completed payment found
  const yourRef = applicationPayment?.paystackTransactionId ?? park.anssidNumber ?? "—";

  // Format approval date (default to today if not present)
  const approvalDateRaw = park.approvedAt || new Date();
  const approvalDateFormatted = formatLetterDate(approvalDateRaw);
  
  // Calculate reference number
  const refCode = park.id.substring(0, 6).toUpperCase();
  const ourRef = `AN/MOT/530/${refCode}`;

  // Monthly levy
  const levyNaira = park.monthlyLevyAmount ? Math.floor(park.monthlyLevyAmount / 100) : 100000;
  const levyWords = `${numberToWords(levyNaira)} Naira`;

  // Standard applicant/business details
  const businessName = park.businessName || "Private Motor Park Operator";
  const streetAddress = park.streetAddress || "Plot 12, Awka Road";
  const townCity = park.townCity || "Awka";
  const lga = park.lga || "Awka South";

  return (
    <div className="min-h-screen  p-4 sm:p-8 flex flex-col items-center gap-6">
      {/* Action Bar (hidden when printing) */}
      <div className="w-full max-w-4xl flex items-center justify-between gap-4 p-4  border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm no-print">
        <Button asChild variant="outline" size="sm">
          <Link href={`/motor-parks/${park.id}`}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Application
          </Link>
        </Button>
        <div className="flex gap-2">
          <PrintButton />
        </div>
      </div>

      {/* Printable Certificate Page */}
      <div 
        id="printable-certificate"
        className="w-full max-w-[800px] aspect-[1/1.414] bg-white text-black border-[3px] border-black rounded-t-[20px] p-10 sm:p-14 relative flex flex-col justify-between shadow-lg print:shadow-none print:border-black print:rounded-none print:p-8 print:m-0"
        style={{
          fontFamily: "var(--font-sans), Arial, sans-serif",
          boxSizing: "border-box",
        }}
      >
        {/* Print media styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            /* Hide the sidebar, topbar and other non-print elements */
            aside,
            header,
            .no-print {
              display: none !important;
            }

            /* Reset the height and scroll styles of Next.js layout containers */
            html,
            body,
            body > div,
            main,
            div.flex,
            div.flex-col {
              height: auto !important;
              min-height: auto !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: white !important;
            }

            /* Ensure only the certificate prints cleanly */
            #printable-certificate {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 2.5rem !important;
              border: 3px solid black !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              box-sizing: border-box !important;
            }
          }
        `}} />

        <div>
          {/* Header Block */}
          <div className="text-center flex flex-col items-center gap-1.5 border-b border-black/10 pb-4">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-wider text-slate-900">
              GOVERNMENT OF ANAMBRA STATE OF NIGERIA
            </h1>
            <h2 className="text-lg sm:text-xl font-bold tracking-wide text-slate-800">
              MINISTRY OF TRANSPORT
            </h2>
            
            {/* Logo */}
            <div className="my-2 h-20 w-auto flex items-center justify-center">
              <img 
                src="/anambra_mot_logo.png" 
                alt="Ministry of Transport Logo" 
                className="max-h-full object-contain"
              />
            </div>
          </div>

          {/* Letter Metadata Fields (Left and Right Columns) */}
          <div className="flex justify-between text-[11px] sm:text-xs text-slate-700 mt-4 leading-relaxed font-sans">
            <div className="flex flex-col gap-1">
              <div><span className="font-semibold text-black">E-mail:</span> mot@anambrastate.gov.ng</div>
              <div><span className="font-semibold text-black">Tel:</span> +234 (0) 803 000 0000</div>
              <div className="mt-1">
                Your Ref: <span className="font-bold text-black">{yourRef}</span>
              </div>
              <div className="mt-1">
                Our Ref: <span className="font-bold text-black">{ourRef}</span>
              </div>
            </div>
            <div className="flex flex-col text-right gap-0.5">
              <div>Chief Jerome Udoji Secretariat</div>
              <div>Complex</div>
              <div>Awka</div>
              <div className="mt-3 font-semibold text-black">
                Date: {approvalDateFormatted}
              </div>
            </div>
          </div>

          {/* Recipient Block */}
          <div className="mt-6 text-xs sm:text-sm text-black leading-relaxed flex flex-col gap-0.5">
            <div className="font-semibold">The Chairman,</div>
            <div className="font-bold">{businessName}</div>
            <div>{streetAddress}</div>
            <div>{townCity}</div>
            <div>{lga} Local Government Area.</div>
          </div>

          {/* Subject Block */}
          <div className="mt-6">
            <h3 className="text-xs sm:text-sm font-bold text-black text-left uppercase underline tracking-wide leading-snug">
              TEMPORARY APPROVAL OF YOUR LOADING BAY AT {streetAddress.toUpperCase()}, {townCity.toUpperCase()}, {lga.toUpperCase()} LOCAL GOVERNMENT AREA
            </h3>
          </div>

          {/* Body Block */}
          <div className="mt-5 text-xs sm:text-sm text-black space-y-4 leading-relaxed text-justify">
            <p>
              Your application for a Private Motor Park Permit refers please.
            </p>
            <p>
              2. Further to the recommendations of the Ministry's Parks Inspection and Revalidation Team, you are hereby granted temporary approval to operate your private loading bay at the above named location with effect from {approvalDateFormatted}.
            </p>
            <p>
              3. Kindly note that you are to improve on the facilities seen by the Team during the inspection within the next three (3) months in line with the attached Ministry's standards/guidelines on motor parks.
            </p>
            <p>
              4. You are to ensure that all loading/offloading activities of the vehicles in your fleet are done within the approved private loading bay and not on adjoining roads or any other place. In addition, ONLY vehicles branded in your approved mass transit colour are to use the loading bay.
            </p>
            <p>
              5. You are to pay a monthly motor park fee of <strong>₦ {levyNaira.toLocaleString()} ({levyWords})</strong> to State Government's IGR paydirect platform using your private park's ASIN.
            </p>
            <p>
              6. Kindly note that the violation of any of the above terms will lead to revocation of this temporary approval without notice.
            </p>
            <p className="pt-2">
              Please accept my warm regards.
            </p>
          </div>
        </div>

        {/* Signature & Footer Section */}
        <div className="mt-8 flex flex-col gap-6">
          {/* Signature Block */}
          <div className="flex flex-col items-start pr-6">
            <div className="flex flex-col items-center">
              {/* Handwritten signature visual placeholder */}
              <div className="h-10 flex items-center justify-center italic text-blue-600 font-serif text-lg font-semibold relative mb-1">
                <span className="opacity-90 select-none transform -rotate-6">Patricia</span>
                <div className="absolute w-24 h-[1px] bg-blue-400 bottom-1 transform rotate-3"></div>
              </div>
              <div className="font-bold text-xs sm:text-sm text-black">{commissionerName}</div>
              <div className="text-[11px] sm:text-xs text-slate-700 font-medium">Commissioner for Transport</div>
            </div>
          </div>

          {/* Bottom Solid Footer Strip */}
          <div className="w-full bg-black text-white text-center py-2.5 px-4 rounded-b-none text-[10px] sm:text-[11px] font-medium tracking-wide uppercase mt-4 select-none">
            All replies to be addressed to the Hon. Commissioner
          </div>
        </div>
      </div>
    </div>
  );
}
