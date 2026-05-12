import type { LucideIcon } from "lucide-react";
import { Building2, Bus } from "lucide-react";

export type ServiceKey = "MOTOR_PARK" | "MASS_TRANSIT";

export interface ServiceCardConfig {
  id: ServiceKey;
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
}

export const APPLICANT_SERVICE_CARDS: ServiceCardConfig[] = [
  {
    id: "MOTOR_PARK",
    title: "Motor Park Management",
    description:
      "Digital application, inspection scheduling, permit-to-build, revalidation, and compliance enforcement.",
    icon: Building2,
    route: "/dashboard/services/motor-park",
  },
  {
    id: "MASS_TRANSIT",
    title: "Mass Transit Registration",
    description:
      "Company onboarding, fleet declarations, branding approval, and annual permit renewal workflows.",
    icon: Bus,
    route: "/dashboard/services/mass-transit",
  },
];

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  MOTOR_PARK: "Motor Park",
  MASS_TRANSIT: "Mass Transit",
};

export const SERVICE_ROOT_ROUTES: Record<ServiceKey, string> = {
  MOTOR_PARK: "/motor-parks",
  MASS_TRANSIT: "/fleet-operators",
};
