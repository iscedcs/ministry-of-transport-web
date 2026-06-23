import { ApplyForm } from "@/components/park-monitor/apply-form";
import { db } from "@/lib/db";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = {
  title: "Apply for Park Monitor | Ministry of Transport",
};

export default function ParkMonitorPublicApplyPage() {
  return (
    <div className="w-full min-h-scree">
      <div className="bg-primary text-primary-foreground py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="inline-flex items-center text-sm mb-6 text-primary-foreground/80 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Park Monitor Application</h1>
          <p className="mt-2 text-primary-foreground/80 max-w-2xl">
            Complete the form below to apply for the position of Park Monitor under the Special Enforcement Unit.
          </p>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-4 py-8 -mt-8 relative z-10">
        <ApplyForm />
      </div>
    </div>
  );
}
