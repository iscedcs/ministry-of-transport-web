import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APPLICANT_SERVICE_CARDS } from "@/lib/service-config";

export default async function ApplicantServicesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "EXTERNAL_APPLICANT") redirect("/dashboard");

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { registeredService: true },
  });

  const existingServices = user?.registeredService
    ? user.registeredService.split(",").map((value) => value.trim())
    : [];

  const availableServices = APPLICANT_SERVICE_CARDS.filter(
    (service) => !existingServices.includes(service.id),
  );

  if (availableServices.length === 0) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-display)" }}>
              Add Another Service
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose a new service to add to your account and review its
              requirements before registration.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {availableServices.map((service) => {
          const Icon = service.icon;
          return (
            <Link key={service.id} href={service.route} className="block">
              <Card className="h-full border-border/70 bg-card/60 transition hover:bg-card hover:border-primary/40 hover:shadow-sm">
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="grid h-9 w-9 place-content-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <CardTitle className="text-base leading-snug">
                    {service.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
