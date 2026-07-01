import {
  Building2,
  Bus,
  Car,
  ClipboardList,
  FileCheck2,
  Landmark,
  School,
  Wallet,
  FileBadge,
  ShieldCheck,
} from "lucide-react";

export const coreServices = [
  {
    title: "Motor Park Management",
    description:
      "Digital application, inspection scheduling, permit-to-build, revalidation, and compliance enforcement.",
    icon: Building2,
    href: "/register/motor-park",
  },
  {
    title: "Mass Transit Registration",
    description:
      "Company onboarding, fleet declarations, branding approval, and annual permit renewal workflows.",
    icon: Bus,
    href: "/register/mass-transit",
  },
  {
    title: "Revalidation Services",
    description:
    "Revalidation for public & private motor parks, terminals, loading bays, and transport facilities.",
    icon: FileBadge,
    href: "/register/revalidation",
  },
  {
    title: "Park Monitoring",
    description:
      "Apply to become a verified park monitor and help enforce compliance across Anambra state.",
    icon: ShieldCheck,
    href: "/apply-park-monitor",
  },
  {
    title: "Ministry Administration",
    description:
    "Role-based operations for Commissioner, Permanent Secretary, HODs, field teams, and finance staff.",
    icon: Landmark,
    href: "/staff/login",
  },
  {
    title: "VIS Inspection",
    description:
    "Private and commercial vehicle inspection intake with insurance and roadworthiness checkpoints.",
    icon: Car,
    href: null,
  },
  {
    title: "Revenue and Payments",
    description:
    "ASIN-linked fee tracking, digital receipts, arrears visibility, and disaggregated revenue reporting.",
    icon: Wallet,
    href: null,
  },
  {
    title: "Accident Reporting (AVIR)",
    description:
      "End-to-end digital AVIR workflow with MOT and Police routing, sign-off, and archive copies.",
    icon: ClipboardList,
    href: null,
  },
  {
    title: "Driving School Registration",
    description:
      "Application, VIO test submission, certificate decisioning, and rejection reason transparency.",
    icon: School,
    href: null,
  },
  {
    title: "Certificate Workflow Engine",
    description:
      "Reusable application-to-certificate flow with temporary/permanent issuance and policy controls.",
    icon: FileCheck2,
    href: null,
  },
];
