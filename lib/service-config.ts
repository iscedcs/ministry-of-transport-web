import type { LucideIcon } from "lucide-react";
import { Building2, Bus, FileBadge } from "lucide-react";

export type ServiceKey = "MOTOR_PARK" | "MASS_TRANSIT" | "REVALIDATION";

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
  {
    id: "REVALIDATION",
    title: "Revalidation Services",
    description: "Revalidation for public & private motor parks, terminals, loading bays, and transport facilities.",
    icon: FileBadge,
    route: "/dashboard/services/revalidation",
  },
];

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  MOTOR_PARK: "Motor Park",
  MASS_TRANSIT: "Mass Transit",
  REVALIDATION: "Revalidation",
};

export const SERVICE_ROOT_ROUTES: Record<ServiceKey, string> = {
  MOTOR_PARK: "/motor-parks",
  MASS_TRANSIT: "/fleet-operators",
  REVALIDATION: "/revalidation",
};
