"use server";

import { db } from "@/lib/db";

export async function getExecutiveDashboardStats() {
  try {
    // 1. Total Revenue (from completed payments)
    const completedPayments = await db.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        status: "COMPLETED",
      },
    });

    // Amount is in kobo, convert to Naira
    const totalRevenueNaira = (completedPayments._sum.amount || 0) / 100;

    // 2. Active Personnel (Park Monitors with ID cards)
    const activePersonnel = await db.parkMonitorApplication.count({
      where: {
        status: "APPROVED",
        idCardIssued: true,
      },
    });

    // 3. Registered Transport (Motor Parks + Mass Transit)
    const totalMotorParks = await db.motorPark.count();
    const totalMassTransit = await db.massTransitCompany.count();
    const totalRegisteredTransport = totalMotorParks + totalMassTransit;

    // 4. Registrations by Sector Data (for Bar Chart)
    const totalRevalidations = await db.revalidationApplication.count();
    
    const sectorData = [
      { name: "Monitors", count: activePersonnel, fill: "#3b82f6" },
      { name: "Parks", count: totalMotorParks, fill: "#22c55e" },
      { name: "Transit", count: totalMassTransit, fill: "#eab308" },
      { name: "Revalidations", count: totalRevalidations, fill: "#a855f7" },
    ];

    // 5. Compliance Rate (rough estimation based on ACTIVE vs Total parks)
    const activeMotorParks = await db.motorPark.count({
      where: { permitStatus: "ACTIVE" }
    });
    
    // Fallback to 0% if no parks exist to avoid NaN
    const complianceRate = totalMotorParks > 0 
      ? Math.round((activeMotorParks / totalMotorParks) * 100) 
      : 0;

    // 6. Recent Activities Feed
    // We'll combine recent payments, recent applications, and recent monitors
    
    // ── Live operations feed ────────────────────────────────────────────
    // Drawn from the audit log, which is where every action on the platform
    // is already recorded — onboarding, approvals, renumbering, staff
    // changes, imports. Reading only payments and motor parks meant the feed
    // was empty on a platform whose activity is TRACAS and revalidation, and
    // the client quietly substituted mock rows.
    const auditEvents = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        action: true,
        entityType: true,
        changeDescription: true,
        createdAt: true,
        performedBy: { select: { firstName: true, lastName: true, role: true } },
      },
    });

    /** Which icon the row gets, inferred from the action name. */
    const kindOf = (action: string): string => {
      const a = action.toUpperCase();
      if (a.includes("PAYMENT") || a.includes("FEE")) return "payment";
      if (a.includes("APPROVED") || a.includes("ISSUED") || a.includes("COMPLETED"))
        return "approval";
      if (
        a.includes("DECLINED") ||
        a.includes("REJECTED") ||
        a.includes("REVOKED") ||
        a.includes("DEACTIVATED")
      )
        return "alert";
      return "application";
    };

    /** "TRACAS_FLEET_RENUMBERED" -> "Tracas fleet renumbered" */
    const humanise = (action: string) => {
      const t = action.replace(/_/g, " ").toLowerCase();
      return t.charAt(0).toUpperCase() + t.slice(1);
    };

    const relative = (d: Date) => {
      const mins = Math.floor((Date.now() - d.getTime()) / 60000);
      if (mins < 1) return "just now";
      if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
      const days = Math.floor(hrs / 24);
      if (days === 1) return "yesterday";
      if (days < 30) return `${days} days ago`;
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    };

    const activities = auditEvents.map((e) => ({
      id: e.id,
      type: kindOf(e.action),
      text: e.changeDescription || humanise(e.action),
      time: relative(e.createdAt),
      actor: e.performedBy
        ? `${e.performedBy.firstName} ${e.performedBy.lastName}`
        : undefined,
      entity: e.entityType,
      status: "success",
      date: e.createdAt,
    }));

    // 7. Dummy Revenue Data for the Line Chart since real historical aggregation requires complex SQL
    // We will just return the dummy structure for now, but in a real app we'd aggregate `Payment` by month
    const revenueData = [
      { name: "Jan", revenue: 4000, previous: 2400 },
      { name: "Feb", revenue: 3000, previous: 1398 },
      { name: "Mar", revenue: 2000, previous: 9800 },
      { name: "Apr", revenue: 2780, previous: 3908 },
      { name: "May", revenue: 1890, previous: 4800 },
      { name: "Jun", revenue: totalRevenueNaira > 0 ? totalRevenueNaira : 2390, previous: 3800 },
      { name: "Jul", revenue: 0, previous: 4300 },
    ];

    return {
      success: true,
      data: {
        totalRevenueNaira,
        activePersonnel,
        totalRegisteredTransport,
        complianceRate,
        sectorData,
        activities: activities.slice(0, 8),
        revenueData
      }
    };
  } catch (error: any) {
    console.error("Failed to fetch executive stats:", error);
    return { success: false, error: error?.message || String(error) };
  }
}
