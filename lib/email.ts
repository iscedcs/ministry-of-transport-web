import { db } from "@/lib/db";

export interface InspectionEmailParams {
  entityName: string;
  entityType: string;
  scheduledDate: Date;
  inspectorName: string;
  scheduledByName: string;
  entityUrl: string;
}

export async function sendInspectionApprovalNotification(params: InspectionEmailParams) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL_ADDRESS || "notifications@mot.anambra.gov.ng";

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY is missing. Skipping email dispatch.");
      return { success: false, error: "RESEND_API_KEY not configured" };
    }

    // 1. Fetch Permanent Secretary (PS) users
    const psUsers = await db.user.findMany({
      where: {
        role: "PERMANENT_SECRETARY",
        isActive: true,
      },
      select: { email: true, firstName: true, lastName: true },
    });

    if (psUsers.length === 0) {
      console.warn("No active Permanent Secretary user found for email notification.");
      return { success: false, error: "No Permanent Secretary email found" };
    }

    const formattedDate = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(params.scheduledDate));

    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #0f172a; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #15803d, #166534); padding: 28px; text-align: center; color: #ffffff; }
            .badge { display: inline-block; background: rgba(255,255,255,0.2); color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
            .content { padding: 32px; }
            .field-group { background: #f1f5f9; border-radius: 12px; padding: 16px; margin: 20px 0; border: 1px solid #cbd5e1; }
            .field { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
            .field:last-child { border-bottom: none; }
            .field-label { color: #64748b; font-weight: 500; }
            .field-value { color: #0f172a; font-weight: 600; }
            .btn { display: inline-block; background: #166534; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 10px; text-align: center; margin-top: 16px; box-shadow: 0 4px 6px -1px rgba(22, 101, 52, 0.3); }
            .footer { padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="badge">Action Required • Permanent Secretary</div>
              <h1 style="margin: 0; font-size: 22px;">Inspection Schedule Approval Required</h1>
              <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Ministry of Transport, Anambra State</p>
            </div>
            <div class="content">
              <p>Dear Permanent Secretary,</p>
              <p>An inspection schedule has been submitted by <strong>${params.scheduledByName}</strong> and is currently awaiting your review and approval before financial/logistical confirmation and execution.</p>
              
              <div class="field-group">
                <div class="field">
                  <span class="field-label">Target Facility</span>
                  <span class="field-value">${params.entityName}</span>
                </div>
                <div class="field">
                  <span class="field-label">Module Type</span>
                  <span class="field-value">${params.entityType}</span>
                </div>
                <div class="field">
                  <span class="field-label">Scheduled Date & Time</span>
                  <span class="field-value">${formattedDate}</span>
                </div>
                <div class="field">
                  <span class="field-label">Assigned Inspector</span>
                  <span class="field-value">${params.inspectorName}</span>
                </div>
                <div class="field">
                  <span class="field-label">Scheduled By</span>
                  <span class="field-value">${params.scheduledByName}</span>
                </div>
              </div>

              <div style="text-align: center;">
                <a href="${params.entityUrl}" class="btn">Review & Approve Inspection</a>
              </div>
            </div>
            <div class="footer">
              Anambra State Ministry of Transport Platform • Automated Executive Notification
            </div>
          </div>
        </body>
      </html>
    `;

    const recipients = psUsers.map((u) => u.email);

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Anambra MOT Platform <${fromEmail}>`,
        to: recipients,
        subject: `[MOT Action Required] Pending Inspection Schedule Approval — ${params.entityName}`,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Resend Email Error:", errorText);
      return { success: false, error: errorText };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to send inspection approval email:", error);
    return { success: false, error: error?.message || "Email dispatch failed" };
  }
}
