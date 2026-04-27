/**
 * Database Seed
 * Reference: docs/ROLES_AND_DUTIES.md | docs/DESIGN_SYSTEM.md
 *
 * Seeds:
 * 1. Inspection Checklist Templates (Motor Park standards — FR-012)
 * 2. Default Notification Templates (EPIC-007)
 * 3. Fee Schedules (FR-040 to FR-044)
 * 4. System Configuration defaults
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding Ministry of Transport database...");

  // ==================== INSPECTION CHECKLIST ====================
  // Based on FR-012: Physical standards for motor park approval
  // Source: Park Standards AN/MOT/40/29

  const motorParkTemplate = await db.inspectionChecklistTemplate.upsert({
    where: { id: "template-motor-park-initial" },
    update: {},
    create: {
      id: "template-motor-park-initial",
      name: "Motor Park Initial Inspection",
      linkedEntityType: "MOTOR_PARK",
      description:
        "Inspection checklist for new motor park applications per AN/MOT/40/29",
      isActive: true,
      items: {
        create: [
          {
            itemName: "Parking Arrangement",
            itemCategory: "parking",
            description: "Adequate parking spaces clearly marked and organized",
            isRequired: true,
            sortOrder: 1,
          },
          {
            itemName: "Entrance and Exit with Gatehouse",
            itemCategory: "access",
            description:
              "Dedicated entrance and exit with gatehouse for security",
            isRequired: true,
            sortOrder: 2,
          },
          {
            itemName: "Paved and Fenced Land",
            itemCategory: "infrastructure",
            description: "Park land is paved and surrounded by perimeter fence",
            isRequired: true,
            sortOrder: 3,
          },
          {
            itemName: "Separate Male Conveniences",
            itemCategory: "conveniences",
            description: "Separate toilet/restroom facilities for males",
            isRequired: true,
            sortOrder: 4,
          },
          {
            itemName: "Separate Female Conveniences",
            itemCategory: "conveniences",
            description: "Separate toilet/restroom facilities for females",
            isRequired: true,
            sortOrder: 5,
          },
          {
            itemName: "Water Supply",
            itemCategory: "utilities",
            description: "Reliable water supply available at the park",
            isRequired: true,
            sortOrder: 6,
          },
          {
            itemName: "Refreshment (Non-Alcoholic)",
            itemCategory: "amenities",
            description: "Non-alcoholic refreshment available for passengers",
            isRequired: true,
            sortOrder: 7,
          },
          {
            itemName: "Ticketing Office",
            itemCategory: "operations",
            description: "Dedicated ticketing office for passenger management",
            isRequired: true,
            sortOrder: 8,
          },
          {
            itemName: "Waiting Lounge",
            itemCategory: "amenities",
            description: "Covered waiting lounge for passengers",
            isRequired: true,
            sortOrder: 9,
          },
          {
            itemName: "Manager's Office",
            itemCategory: "operations",
            description: "Dedicated office space for park management",
            isRequired: true,
            sortOrder: 10,
          },
          {
            itemName: "Fire Extinguisher 1 (min. 9kg DCP)",
            itemCategory: "fire_safety",
            description:
              "First 9kg Dry Chemical Powder fire extinguisher present and certified",
            isRequired: true,
            sortOrder: 11,
          },
          {
            itemName: "Fire Extinguisher 2 (min. 9kg DCP)",
            itemCategory: "fire_safety",
            description:
              "Second 9kg DCP fire extinguisher present (minimum 2 required)",
            isRequired: true,
            sortOrder: 12,
          },
          {
            itemName: "Road Safety Signage",
            itemCategory: "safety",
            description:
              "Appropriate road safety signage visible at entrance/exit",
            isRequired: false,
            sortOrder: 13,
          },
        ],
      },
    },
  });

  console.log(
    "✅ Motor Park inspection template seeded:",
    motorParkTemplate.id,
  );

  // Re-inspection checklist (proximity evaluation — FR-015)
  const reinspectionTemplate = await db.inspectionChecklistTemplate.upsert({
    where: { id: "template-motor-park-reinspection" },
    update: {},
    create: {
      id: "template-motor-park-reinspection",
      name: "Motor Park Re-Inspection (Proximity Evaluation)",
      linkedEntityType: "MOTOR_PARK",
      description:
        "Re-inspection checklist after construction completion, evaluating proximity factors per FR-015",
      isActive: true,
      items: {
        create: [
          {
            itemName: "Proximity to Public Park",
            itemCategory: "proximity",
            description: "Acceptable distance from nearest public park",
            isRequired: true,
            sortOrder: 1,
          },
          {
            itemName: "Proximity to Major Transport Route",
            itemCategory: "proximity",
            description:
              "Acceptable proximity to major transport route or public road",
            isRequired: true,
            sortOrder: 2,
          },
          {
            itemName: "Proximity to Major Road Intersections",
            itemCategory: "proximity",
            description:
              "Not obstructing or too close to major road intersections",
            isRequired: true,
            sortOrder: 3,
          },
          {
            itemName: "Construction Complete as Specified",
            itemCategory: "construction",
            description: "All facilities built as per approved plan",
            isRequired: true,
            sortOrder: 4,
          },
          {
            itemName: "Parking Capacity Matches Application",
            itemCategory: "capacity",
            description: "Actual parking capacity matches declared capacity",
            isRequired: true,
            sortOrder: 5,
          },
        ],
      },
    },
  });

  console.log(
    "✅ Motor Park re-inspection template seeded:",
    reinspectionTemplate.id,
  );

  // Mass Transit template
  const massTransitTemplate = await db.inspectionChecklistTemplate.upsert({
    where: { id: "template-mass-transit-terminal" },
    update: {},
    create: {
      id: "template-mass-transit-terminal",
      name: "Mass Transit Terminal/Depot Inspection",
      linkedEntityType: "MASS_TRANSIT",
      description:
        "Inspection checklist for mass transit company terminal/depot sites per FR-023",
      isActive: true,
      items: {
        create: [
          {
            itemName: "Terminal Location Address Matches Application",
            itemCategory: "verification",
            description: "Physical terminal matches the declared address",
            isRequired: true,
            sortOrder: 1,
          },
          {
            itemName: "Fleet Vehicles Present and Branded",
            itemCategory: "vehicles",
            description:
              "At least 5 vehicles present with uniform Ministry-approved branding",
            isRequired: true,
            sortOrder: 2,
          },
          {
            itemName: "Vehicle Roadworthiness Certificates",
            itemCategory: "compliance",
            description: "Current roadworthiness certificates for all vehicles",
            isRequired: true,
            sortOrder: 3,
          },
          {
            itemName: "Driver Records Available",
            itemCategory: "records",
            description:
              "Driver records, licenses, and proficiency cards verified",
            isRequired: true,
            sortOrder: 4,
          },
          {
            itemName: "Depot Facilities Adequate",
            itemCategory: "facilities",
            description: "Office, maintenance area, and parking adequate",
            isRequired: true,
            sortOrder: 5,
          },
        ],
      },
    },
  });

  console.log(
    "✅ Mass Transit inspection template seeded:",
    massTransitTemplate.id,
  );

  // ==================== FEE SCHEDULES ====================
  // Note: Actual fee amounts TBD from Ministry (currently seeding placeholders)

  const feeSchedules = [
    {
      id: "fee-motor-park-application",
      feeType: "MOTOR_PARK_APPLICATION",
      description: "One-off motor park application fee",
      amount: 5000000, // ₦50,000 in kobo (placeholder — confirm with Ministry Finance)
      currency: "NGN",
      effectiveFrom: new Date("2026-04-01"),
      revenueCode: "MOT-PARK-001",
      isActive: true,
    },
    {
      id: "fee-motor-park-renewal",
      feeType: "MOTOR_PARK_RENEWAL",
      description: "Annual motor park revalidation fee",
      amount: 2500000, // ₦25,000 in kobo (placeholder)
      currency: "NGN",
      effectiveFrom: new Date("2026-04-01"),
      revenueCode: "MOT-PARK-002",
      isActive: true,
    },
    {
      id: "fee-transit-registration",
      feeType: "TRANSIT_REGISTRATION",
      description: "One-off mass transit company registration fee",
      amount: 10000000, // ₦100,000 in kobo (placeholder)
      currency: "NGN",
      effectiveFrom: new Date("2026-04-01"),
      revenueCode: "MOT-TRANSIT-001",
      isActive: true,
    },
    {
      id: "fee-transit-renewal",
      feeType: "TRANSIT_RENEWAL",
      description: "Annual mass transit permit renewal fee",
      amount: 5000000, // ₦50,000 in kobo (placeholder)
      currency: "NGN",
      effectiveFrom: new Date("2026-04-01"),
      revenueCode: "MOT-TRANSIT-002",
      isActive: true,
    },
    {
      id: "fee-avir-assessment",
      feeType: "AVIR_ASSESSMENT",
      description: "Accident vehicle inspection report assessment fee",
      amount: 1000000, // ₦10,000 in kobo (placeholder)
      currency: "NGN",
      effectiveFrom: new Date("2026-04-01"),
      revenueCode: "MOT-AVIR-001",
      isActive: true,
    },
  ];

  for (const fee of feeSchedules) {
    await db.feeSchedule.upsert({
      where: { id: fee.id },
      update: {},
      create: fee,
    });
    console.log(`✅ Fee schedule seeded: ${fee.feeType}`);
  }

  // ==================== NOTIFICATION TEMPLATES ====================

  const notificationTemplates = [
    {
      notificationType: "APPLICATION_SUBMITTED",
      emailSubject:
        "Application Received — {{applicationNumber}} | Ministry of Transport",
      emailBodyHtml: `
        <h2>Application Received</h2>
        <p>Dear {{applicantName}},</p>
        <p>Your application for <strong>{{entityName}}</strong> has been received.</p>
        <p><strong>Application Number:</strong> {{applicationNumber}}</p>
        <p><strong>Status:</strong> Under Review</p>
        <p>You will be notified when an inspection is scheduled.</p>
        <p>Regards,<br>Ministry of Transport, Anambra State</p>
      `,
      smsBody:
        "MOT: Your application {{applicationNumber}} has been received. You will be notified when an inspection is scheduled.",
    },
    {
      notificationType: "INSPECTION_SCHEDULED",
      emailSubject:
        "Inspection Scheduled — {{applicationNumber}} | Ministry of Transport",
      emailBodyHtml: `
        <h2>Inspection Scheduled</h2>
        <p>Dear {{applicantName}},</p>
        <p>An inspection for your application <strong>{{applicationNumber}}</strong> has been scheduled.</p>
        <p><strong>Inspection Date:</strong> {{inspectionDate}}</p>
        <p><strong>Inspector:</strong> {{inspectorName}}</p>
        <p>Please ensure the site is accessible on the scheduled date.</p>
        <p>Regards,<br>Ministry of Transport, Anambra State</p>
      `,
      smsBody:
        "MOT: Inspection for {{applicationNumber}} scheduled for {{inspectionDate}}. Ensure site is accessible. Call {{inspectorPhone}} for enquiries.",
    },
    {
      notificationType: "PERMIT_ISSUED",
      emailSubject: "Permit Issued — {{permitNumber}} | Ministry of Transport",
      emailBodyHtml: `
        <h2>Permit Successfully Issued</h2>
        <p>Dear {{applicantName}},</p>
        <p>Congratulations! Your permit has been issued by the Ministry of Transport.</p>
        <p><strong>Permit Number:</strong> {{permitNumber}}</p>
        <p><strong>Valid Until:</strong> {{permitExpiry}}</p>
        <p>Please log in to download your digital permit document.</p>
        <p>Regards,<br>Ministry of Transport, Anambra State</p>
      `,
      smsBody:
        "MOT: Your permit {{permitNumber}} has been issued, valid until {{permitExpiry}}. Log in to download your permit.",
    },
    {
      notificationType: "PERMIT_REJECTED",
      emailSubject:
        "Application Update — {{applicationNumber}} | Ministry of Transport",
      emailBodyHtml: `
        <h2>Application Not Approved</h2>
        <p>Dear {{applicantName}},</p>
        <p>After reviewing your application <strong>{{applicationNumber}}</strong>, the Ministry of Transport is unable to approve it at this time.</p>
        <p><strong>Reason:</strong> {{rejectionReason}}</p>
        <p>You may reapply once the issues are resolved. Please contact our office for further guidance.</p>
        <p>Regards,<br>Ministry of Transport, Anambra State</p>
      `,
      smsBody:
        "MOT: Your application {{applicationNumber}} was not approved. Reason: {{rejectionReason}}. Contact the Ministry for more details.",
    },
    {
      notificationType: "RENEWAL_REMINDER_60DAYS",
      emailSubject:
        "Renewal Reminder — {{permitNumber}} expires in 60 days | Ministry of Transport",
      emailBodyHtml: `
        <h2>Permit Renewal Reminder</h2>
        <p>Dear {{applicantName}},</p>
        <p>Your permit <strong>{{permitNumber}}</strong> is due for renewal in <strong>60 days</strong>.</p>
        <p><strong>Expiry Date:</strong> {{permitExpiry}}</p>
        <p>Please log in to initiate the renewal process to avoid service disruption.</p>
        <p>Regards,<br>Ministry of Transport, Anambra State</p>
      `,
      smsBody:
        "MOT: Your permit {{permitNumber}} expires in 60 days on {{permitExpiry}}. Log in to renew now to avoid disruption.",
    },
    {
      notificationType: "PAYMENT_RECEIVED",
      emailSubject:
        "Payment Received — {{receiptNumber}} | Ministry of Transport",
      emailBodyHtml: `
        <h2>Payment Confirmation</h2>
        <p>Dear {{payerName}},</p>
        <p>Payment received for <strong>{{paymentType}}</strong>.</p>
        <p><strong>Amount:</strong> {{amount}}</p>
        <p><strong>Receipt Number:</strong> {{receiptNumber}}</p>
        <p><strong>Transaction Date:</strong> {{paymentDate}}</p>
        <p>A copy of your receipt is attached to this email.</p>
        <p>Regards,<br>Ministry of Transport, Anambra State</p>
      `,
      smsBody:
        "MOT: Payment of {{amount}} received for {{paymentType}}. Receipt No: {{receiptNumber}}. Ref: {{transactionId}}",
    },
    {
      notificationType: "SLA_BREACH",
      emailSubject:
        "URGENT: Inspection SLA Breach — {{applicationNumber}} | Ministry of Transport",
      emailBodyHtml: `
        <h2>Inspection SLA Breach Alert</h2>
        <p>Dear {{hodName}},</p>
        <p>The 5-day inspection deadline for application <strong>{{applicationNumber}}</strong> has been breached.</p>
        <p><strong>Application:</strong> {{entityName}}</p>
        <p><strong>Scheduled Date:</strong> {{scheduledDate}}</p>
        <p><strong>Assigned Inspector:</strong> {{inspectorName}}</p>
        <p>Immediate action is required. Please contact the inspector or reassign the inspection.</p>
        <p>Regards,<br>Ministry of Transport Platform</p>
      `,
      smsBody:
        "MOT ALERT: Inspection SLA breach for {{applicationNumber}}. Inspector: {{inspectorName}}. Immediate action required.",
    },
  ];

  for (const template of notificationTemplates) {
    await db.notificationTemplate.upsert({
      where: { notificationType: template.notificationType as any },
      update: {},
      create: template as any,
    });
    console.log(
      `✅ Notification template seeded: ${template.notificationType}`,
    );
  }

  // ==================== SYSTEM CONFIGURATION ====================

  const systemConfigs = [
    {
      configKey: "RENEWAL_REMINDER_DAYS",
      configValue: "60",
      description: "Days before permit expiry to send renewal reminder",
    },
    {
      configKey: "INSPECTION_SLA_DAYS",
      configValue: "5",
      description:
        "Working days SLA for terminal/depot inspections (mass transit — FR-023)",
    },
    {
      configKey: "MAX_NOTIFICATION_RETRIES",
      configValue: "3",
      description: "Maximum retries for failed notification deliveries",
    },
    {
      configKey: "NOTIFICATION_QUEUE_INTERVAL_MINUTES",
      configValue: "5",
      description: "Interval in minutes for processing notification queue",
    },
    {
      configKey: "PAYSTACK_LIVE_MODE",
      configValue: "false",
      description:
        "Toggle between Paystack test mode (false) and live mode (true)",
    },
    {
      configKey: "PLATFORM_NAME",
      configValue: "Ministry of Transport — Anambra State",
      description: "Platform display name",
    },
    {
      configKey: "SUPPORT_EMAIL",
      configValue: "support@mot.anambra.gov.ng",
      description: "Platform support email",
    },
    {
      configKey: "SUPPORT_PHONE",
      configValue: "+2348000000000",
      description: "Platform support phone",
    },
  ];

  for (const config of systemConfigs) {
    await db.systemConfiguration.upsert({
      where: { configKey: config.configKey },
      update: {},
      create: config,
    });
    console.log(`✅ System config seeded: ${config.configKey}`);
  }

  console.log("\n🎉 Database seeded successfully!");
  console.log("\n⚠️  NOTE: Fee amounts are PLACEHOLDERS (in kobo)");
  console.log(
    "   Confirm actual fee amounts with Ministry Finance before go-live",
  );
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
