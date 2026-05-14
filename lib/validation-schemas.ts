/**
 * Validation Schemas & Type Definitions
 * Reference: docs/DESIGN_SYSTEM.md | docs/ROLES_AND_DUTIES.md | docs/EPICS.md
 *
 * Uses Zod for runtime validation (TypeScript at compile time + validation at runtime)
 * All server actions validate input with these schemas before processing
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";

// ==================== SHARED SCHEMAS ====================

/**
 * Common validation rules
 */
const GPS_REGEX = /^(-?\d+\.\d+),(-?\d+\.\d+)$/; // lat,lon format
const PHONE_REGEX = /^(\+234|0)[0-9]{10}$/; // Nigerian phone format
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CAC_REGEX = /^[A-Z]{2}:?\d{6,10}$/; // CAC format: e.g. RC:9428574 or RC9428574 (2 letters, optional colon, 6–10 digits)
const ASIN_REGEX = /^\d{6,16}$/; // ASIN format: 6-16 digits

// ==================== USER & AUTH ====================

export const userCreateSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .regex(PHONE_REGEX, "Invalid Nigerian phone number")
    .optional(),
  firstName: z.string().min(2, "First name required"),
  lastName: z.string().min(2, "Last name required"),
  role: z.enum([
    "COMMISSIONER",
    "PERMANENT_SECRETARY",
    "HOD_PARKS",
    "HOD_VIS",
    "HOD_TRANSPORT_OPS",
    "HOD_PARKS_REVALIDATION",
    "FIELD_INSPECTOR",
    "FINANCE_OFFICER",
    "VEHICLE_INSPECTION_OFFICER",
    "EXTERNAL_APPLICANT",
  ]),
  asinNumber: z.string().regex(ASIN_REGEX, "Invalid ASIN format").optional(),
  departmentId: z.string().optional(),
  designation: z.string().optional(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserCreateOutput = { id: string; email: string };

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type UserLoginInput = z.infer<typeof userLoginSchema>;

// ==================== MOTOR PARK SCHEMAS ====================

export const motorParkApplicationSchema = z.object({
  businessName: z
    .string()
    .min(3, "Business name required")
    .max(100, "Business name too long"),
  transportCompanyName: z.string().max(100).optional(),
  locationAddress: z.string().min(10, "Detailed address required").max(500),
  gpsCoordinates: z
    .string()
    .regex(GPS_REGEX, "GPS coordinates must be in lat,lon format")
    .optional(),
  cacRegistrationNumber: z.string().max(50).optional(),
  anssidNumber: z.string().regex(ASIN_REGEX, "Invalid ANSSID number format"),
  contactPerson: z.string().min(3).max(100),
  contactPhone: z.string().regex(PHONE_REGEX),
  contactEmail: z.string().email(),
  landOwnershipDocId: z.string().optional(),
  cacDocumentId: z.string().optional(),
});

export type MotorParkApplicationInput = z.infer<
  typeof motorParkApplicationSchema
>;

export const motorParkStatusUpdateSchema = z.object({
  newStatus: z.enum([
    "SUBMITTED",
    "UNDER_REVIEW",
    "INSPECTION_SCHEDULED",
    "INSPECTION_IN_PROGRESS",
    "INSPECTION_COMPLETED",
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "REVOKED",
  ]),
  approvalNotes: z.string().optional(),
  revocationReason: z
    .string()
    .min(10, "Revocation reason must be detailed")
    .optional(),
});

export type MotorParkStatusUpdateInput = z.infer<
  typeof motorParkStatusUpdateSchema
>;

export const motorParkFeeRecordSchema = z.object({
  feeType: z.enum(["APPLICATION", "MONTHLY_LEVY", "ANNUAL", "REVALIDATION"]),
  amount: z.number().int().positive("Amount must be positive (in kobo)"),
  dueDate: z.coerce.date(),
  paidAmount: z.number().int().positive().optional(),
});

export type MotorParkFeeRecordInput = z.infer<typeof motorParkFeeRecordSchema>;

// ==================== INSPECTION SCHEMAS ====================

export const inspectionScheduleSchema = z.object({
  linkedEntityType: z.enum(["MOTOR_PARK", "MASS_TRANSIT", "DRIVING_SCHOOL"]),
  linkedEntityId: z.string().min(1),
  inspectionType: z.enum(["INITIAL", "RE_INSPECTION"]),
  scheduledDate: z.coerce
    .date()
    .refine(
      (date) => date > new Date(),
      "Inspection date must be in the future",
    ),
  assignedToUserId: z.string().min(1),
  inspectorStationLocation: z.string().optional(),
});

export type InspectionScheduleInput = z.infer<typeof inspectionScheduleSchema>;

export const inspectionChecklistResultSchema = z.object({
  inspectionId: z.string(),
  checklistItems: z.array(
    z.object({
      checklistItemId: z.string(),
      isCompliant: z.boolean(),
      notes: z.string().optional(),
      photoUrls: z.array(z.string().url()).optional(),
    }),
  ),
  overallAssessment: z.string().optional(),
  recommendedAction: z.enum(["APPROVE", "REJECT", "CONDITIONAL"]).optional(),
});

export type InspectionChecklistResultInput = z.infer<
  typeof inspectionChecklistResultSchema
>;

// ==================== MASS TRANSIT SCHEMAS ====================

export const massTransitApplicationSchema = z.object({
  companyName: z.string().min(3).max(100),
  contactPerson: z.string().min(3).max(100),
  contactEmail: z.string().email(),
  contactPhone: z.string().regex(PHONE_REGEX),
  cacNumber: z.string().regex(CAC_REGEX),
  asinNumber: z.string().regex(ASIN_REGEX),
  businessPremisesCert: z.string().optional(),
  ansaaRegistration: z.string().optional(),
  terminalLocationAddress: z.string().min(10).max(500),
  gpsCoordinates: z.string().regex(GPS_REGEX).optional(),
  vehicles: z
    .array(
      z.object({
        registrationNumber: z.string(),
        vehicleType: z.enum([
          "BUS",
          "MINIBUS",
          "TRUCK",
          "LIGHT_COMMERCIAL",
          "TANKER",
        ]),
        make: z.string(),
        model: z.string(),
        engineNumber: z.string(),
        chassisNumber: z.string(),
        roadworthinessExpiry: z.coerce.date().optional(),
        assignedDriverName: z.string().optional(),
        assignedDriverPhone: z.string().regex(PHONE_REGEX).optional(),
        routesServed: z.array(z.string()).optional(),
      }),
    )
    .min(5, "Minimum 5 vehicles required"),
  drivers: z
    .array(
      z.object({
        fullName: z.string(),
        licenseNumber: z.string(),
        licenseExpiry: z.coerce.date().optional(),
        phoneNumber: z.string().regex(PHONE_REGEX),
      }),
    )
    .optional(),
  approvedColour: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
});

export type MassTransitApplicationInput = z.infer<
  typeof massTransitApplicationSchema
>;

export const vehicleQRCodeSchema = z.object({
  vehicleId: z.string(),
  qrCodeData: z.string(),
  qrCodeImageUrl: z.string().url(),
});

export type VehicleQRCodeInput = z.infer<typeof vehicleQRCodeSchema>;

// ==================== PAYMENT SCHEMAS ====================

export const paymentInitializeSchema = z.object({
  amount: z.number().int().positive("Amount must be > 0 (in kobo)"),
  paymentType: z.enum([
    "PARK_APPLICATION",
    "PARK_RENEWAL",
    "TRANSIT_REGISTRATION",
    "AVIR_ASSESSMENT",
  ]),
  linkedEntityType: z.enum(["MOTOR_PARK", "MASS_TRANSIT", "AVIR_REPORT"]),
  linkedEntityId: z.string(),
  payerEmail: z.string().email(),
  payerPhone: z.string().regex(PHONE_REGEX),
  asinNumber: z.string().regex(ASIN_REGEX).optional(),
});

export type PaymentInitializeInput = z.infer<typeof paymentInitializeSchema>;

export const paymentWebhookSchema = z.object({
  event: z.literal("charge.success"),
  data: z.object({
    id: z.number(), // Paystack transaction ID
    reference: z.string(),
    amount: z.number().int(),
    paid_at: z.string().datetime(),
    customer: z.object({
      email: z.string().email(),
      customer_code: z.string(),
    }),
    authorization: z.object({
      authorization_code: z.string(),
      bin: z.string().optional(),
      last4: z.string(),
      exp_month: z.string(),
      exp_year: z.string(),
    }),
  }),
});

export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;

export const receiptGenerateSchema = z.object({
  paymentId: z.string(),
  recipientEmail: z.string().email(),
});

export type ReceiptGenerateInput = z.infer<typeof receiptGenerateSchema>;

// ==================== AVIR SCHEMAS ====================

export const avIRReportSchema = z.object({
  accidentDateTime: z.coerce.date(),
  accidentLocation: z.string().min(10).max(500),
  gpsCoordinates: z.string().regex(GPS_REGEX).optional(),
  reportingParty: z.enum(["DRIVER", "POLICE", "PUBLIC"]),

  // Police details
  investigatingOfficer: z.string(),
  policeOfficeLocation: z.string().optional(),
  policeReferenceNumber: z.string().optional(),

  // Vehicle particulars
  vehicleId: z.string().optional(), // If in system
  vehicleMake: z.string(),
  vehicleModel: z.string().optional(),
  vehicleType: z.enum([
    "BUS",
    "MINIBUS",
    "TRUCK",
    "LIGHT_COMMERCIAL",
    "TANKER",
    "PRIVATE_CAR",
    "TAXI",
    "RIDE_HAILING",
  ]),
  registrationNumber: z.string(),
  engineNumber: z.string(),
  chassisNumber: z.string(),
  identificationMark: z.string().optional(),
  speedometerReading: z.string().optional(),
  vehicleClassification: z.enum(["COMMERCIAL", "PRIVATE"]),

  // Insurance
  insuranceCompany: z.string().optional(),
  insuranceCertNumber: z.string().optional(),
  insuranceCoverDate: z.coerce.date().optional(),

  // Roadworthiness
  roadworthinessCertNumber: z.string().optional(),
  roadworthinessIssuePlace: z.string().optional(),
  roadworthinessIssueDate: z.coerce.date().optional(),

  // Mechanical assessment BEFORE
  conditionBeforeEngine: z
    .enum(["GOOD", "FAIR", "POOR", "DEFECTIVE"])
    .optional(),
  conditionBeforeClutch: z
    .enum(["GOOD", "FAIR", "POOR", "DEFECTIVE"])
    .optional(),
  // ... (continue for all before fields)

  // Mechanical assessment AFTER
  damagesDescription: z.string().optional(),
  conditionAfterEngine: z
    .enum(["INTACT", "DAMAGED", "DESTROYED", "PARTIALLY_DAMAGED"])
    .optional(),
  // ... (continue for all after fields)

  // Assessment
  recommendedCauseOfAccident: z.string().optional(),
  generalRemarks: z.string().optional(),

  // VIO sign-off
  vioStation: z.string().optional(),
});

export type AVIRReportInput = z.infer<typeof avIRReportSchema>;

// ==================== NOTIFICATION SCHEMAS ====================

export const notificationPreferenceSchema = z.object({
  preferredChannel: z.enum(["EMAIL", "SMS", "BOTH"]),
  enableEmailNotifications: z.boolean().default(true),
  enableSmsNotifications: z.boolean().default(true),
  enableApplicationAlerts: z.boolean().default(true),
  enableRenewalReminders: z.boolean().default(true),
  enablePaymentNotifications: z.boolean().default(true),
});

export type NotificationPreferenceInput = z.infer<
  typeof notificationPreferenceSchema
>;

export const notificationTemplateSchema = z.object({
  notificationType: z.string(),
  emailSubject: z.string().max(200),
  emailBodyHtml: z.string(),
  emailBodyText: z.string().optional(),
  smsBody: z.string().max(500),
});

export type NotificationTemplateInput = z.infer<
  typeof notificationTemplateSchema
>;

// ==================== ADMIN SCHEMAS ====================

export const feeScheduleSchema = z.object({
  feeType: z.string(),
  description: z.string().optional(),
  amount: z.number().int().positive(),
  currency: z.string().default("NGN"),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
  revenueCode: z.string().optional(),
});

export type FeeScheduleInput = z.infer<typeof feeScheduleSchema>;

export const systemConfigurationSchema = z.object({
  configKey: z.string().min(1),
  configValue: z.string(),
  description: z.string().optional(),
});

export type SystemConfigurationInput = z.infer<
  typeof systemConfigurationSchema
>;

export const inspectionChecklistTemplateSchema = z.object({
  name: z.string(),
  linkedEntityType: z.enum(["MOTOR_PARK", "MASS_TRANSIT"]),
  description: z.string().optional(),
  items: z.array(
    z.object({
      itemName: z.string(),
      itemCategory: z.string(),
      description: z.string().optional(),
      isRequired: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }),
  ),
});

export type InspectionChecklistTemplateInput = z.infer<
  typeof inspectionChecklistTemplateSchema
>;

// ==================== UTILITY TYPES ====================

/**
 * Generic pagination parameters
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Generic list response wrapper
 */
export type ListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

/**
 * Search/filter parameters
 */
export const searchFilterSchema = z.object({
  query: z.string().optional(),
  status: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.string().optional(),
});

export type SearchFilterInput = z.infer<typeof searchFilterSchema>;

// ==================== AMOUNT CONVERSION HELPERS ====================

/**
 * Convert Naira to Kobo (multiply by 100)
 * Usage: amountInKobo = nairaToKobo(1500) // → 150000
 */
export function nairaToKobo(amountInNaira: number): number {
  return Math.round(amountInNaira * 100);
}

/**
 * Convert Kobo to Naira (divide by 100)
 * Usage: amountInNaira = koboToNaira(150000) // → 1500
 */
export function koboToNaira(amountInKobo: number): number {
  return Math.round(amountInKobo / 100);
}

/**
 * Format amount for display: "₦1,500.00"
 */
export function formatNaira(amountInKobo: number): string {
  const amountInNaira = koboToNaira(amountInKobo);
  return `₦${amountInNaira.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ==================== EXPORT ALL SCHEMAS ====================

export const schemas = {
  user: { create: userCreateSchema, login: userLoginSchema },
  motorPark: {
    application: motorParkApplicationSchema,
    statusUpdate: motorParkStatusUpdateSchema,
    feeRecord: motorParkFeeRecordSchema,
  },
  inspection: {
    schedule: inspectionScheduleSchema,
    checklist: inspectionChecklistResultSchema,
  },
  massTransit: {
    application: massTransitApplicationSchema,
    vehicleQRCode: vehicleQRCodeSchema,
  },
  payment: {
    initialize: paymentInitializeSchema,
    webhook: paymentWebhookSchema,
    receipt: receiptGenerateSchema,
  },
  avir: { report: avIRReportSchema },
  notification: {
    preference: notificationPreferenceSchema,
    template: notificationTemplateSchema,
  },
  admin: {
    feeSchedule: feeScheduleSchema,
    systemConfig: systemConfigurationSchema,
    checklistTemplate: inspectionChecklistTemplateSchema,
  },
  common: { pagination: paginationSchema, searchFilter: searchFilterSchema },
};
