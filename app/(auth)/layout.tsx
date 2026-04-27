/**
 * Auth Layout — centered card layout for login and registration pages.
 */

import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background p-6">
      {/* Brand header */}
      <div className="flex flex-col items-center mb-8 gap-3">
        <Image width={100} height={100} src="/anambra_mot_logo.png" alt="" />
        <div className="text-center">
          <p
            className="font-bold text-lg text-foreground"
            style={{ fontFamily: "var(--font-display)" }}>
            Ministry of Transport
          </p>
          <p className="text-sm text-muted-foreground">
            Anambra State — Transport Services Platform
          </p>
        </div>
      </div>

      {/* Page content */}
      <div className="w-full max-w-[440px]">{children}</div>
    </div>
  );
}
