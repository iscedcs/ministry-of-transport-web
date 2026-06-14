"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <Button
      onClick={handlePrint}
      size="sm"
      className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold"
    >
      <Printer className="w-4 h-4 mr-2" /> Print / Save as PDF
    </Button>
  );
}
