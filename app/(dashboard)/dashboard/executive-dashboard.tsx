"use client";

import React, { useState } from "react";
import { 
  Bar, 
  BarChart, 
  Line, 
  LineChart, 
  ResponsiveContainer, 
  Tooltip, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  CarFront, 
  Activity, 
  MapPin, 
  AlertCircle, 
  CheckCircle2,
  BellRing,
  Wallet,
  Calendar as CalendarIcon
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { StatusPill } from "@/components/ui/badge";
import { BroadcastDialog } from "./broadcast-dialog";

// Mock Data
const revenueData = [
  { name: "Jan", revenue: 4000, previous: 2400 },
  { name: "Feb", revenue: 3000, previous: 1398 },
  { name: "Mar", revenue: 2000, previous: 9800 },
  { name: "Apr", revenue: 2780, previous: 3908 },
  { name: "May", revenue: 1890, previous: 4800 },
  { name: "Jun", revenue: 2390, previous: 3800 },
  { name: "Jul", revenue: 3490, previous: 4300 },
];

const sectorData = [
  { name: "Monitors", count: 400, fill: "#3b82f6" },
  { name: "Parks", count: 300, fill: "#22c55e" },
  { name: "Transit", count: 300, fill: "#eab308" },
  { name: "Ticketing", count: 200, fill: "#a855f7" },
];



export function ExecutiveDashboard({ initialStats, error }: { initialStats?: any, error?: string | null }) {
  const [dateRange, setDateRange] = useState("This Month");

  // Use real data if available, fallback to mock data
  const rev = initialStats?.totalRevenueNaira ?? 24500000;
  const personnel = initialStats?.activePersonnel ?? 1240;
  const transport = initialStats?.totalRegisteredTransport ?? 8302;
  const compliance = initialStats?.complianceRate ?? 78;
  const sectors = initialStats?.sectorData?.length > 0 ? initialStats.sectorData : sectorData;
  // No fallback: an empty feed means nothing has happened, and saying so is
  // more useful than inventing five events that never occurred.
  const activities = initialStats?.activities ?? [];
  const chartsData = initialStats?.revenueData ?? revenueData;

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
          <span className="font-medium">Data Fetch Error: {error}</span>
        </div>
      )}
      {/* Quick Controls Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-muted-foreground" />
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-transparent text-sm font-medium border-none focus:ring-0 cursor-pointer"
          >
            <option>Today</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>Year to Date</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <BroadcastDialog />
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Revenue ({dateRange})</CardTitle>
            <Wallet className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₦{rev.toLocaleString()}</div>
            <p className="text-xs flex items-center gap-1 mt-1 text-green-600 dark:text-green-400">
              <TrendingUp className="w-3 h-3" />
              +12.5% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Personnel</CardTitle>
            <Users className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personnel.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              85% currently deployed
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Registered Transport</CardTitle>
            <CarFront className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transport.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Parks, Mass Transit & Keke
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-purple-500 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <Activity className="w-4 h-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compliance}%</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Needs attention in Zone C
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle>Revenue & Collection Trends</CardTitle>
            <CardDescription>Comparing current period with previous period</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartsData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: "8px", backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))" }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="revenue" name="Current" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="previous" name="Previous" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Registrations by Sector</CardTitle>
            <CardDescription>Distribution of active entities</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectors} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={70} />
                <Tooltip 
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ borderRadius: "8px", backgroundColor: "hsl(var(--background))", borderColor: "hsl(var(--border))" }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {sectors.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Activity Feed */}
        <Card className="shadow-sm border-border">
          <CardHeader className="pb-3 border-b bg-muted/10">
            <CardTitle className="text-base flex items-center justify-between">
              Live Operations Feed
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {activities.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No recorded activity yet. Onboarding, approvals and staff
                  changes appear here as they happen.
                </p>
              )}
              {activities.map((act: any) => (
                <div key={act.id} className="p-4 hover:bg-muted/30 transition-colors flex items-start gap-4">
                  <div className="mt-0.5">
                    {act.type === "payment" && <Wallet className="w-5 h-5 text-blue-500" />}
                    {act.type === "application" && <Activity className="w-5 h-5 text-purple-500" />}
                    {act.type === "alert" && <AlertCircle className="w-5 h-5 text-amber-500" />}
                    {act.type === "approval" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{act.text}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{act.time}</span>
                      {act.amount && <><span className="text-border">•</span><span className="font-medium text-foreground">{act.amount}</span></>}
                      {act.location && <><span className="text-border">•</span><span className="flex items-center gap-1"><MapPin className="w-3 h-3"/>{act.location}</span></>}
                      {act.actor && <><span className="text-border">•</span><span>{act.actor}</span></>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t text-center bg-muted/10">
              <Button asChild variant="ghost" size="sm" className="w-full text-xs text-primary">
                <Link href="/admin/audit">View Full Activity Log</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Action Center */}
        <Card className="shadow-sm border-border bg-gradient-to-br from-background to-secondary/30">
          <CardHeader>
            <CardTitle className="text-base">Command & Action Center</CardTitle>
            <CardDescription>Quick links for administrative operations</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:text-blue-600 transition-all">
              <Users className="w-6 h-6 mb-1 text-blue-500" />
              <span className="text-sm font-medium">Manage Staff</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 hover:border-emerald-500 hover:text-emerald-600 transition-all">
              <CheckCircle2 className="w-6 h-6 mb-1 text-emerald-500" />
              <span className="text-sm font-medium">Bulk Approvals</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 hover:border-amber-500 hover:text-amber-600 transition-all">
              <AlertCircle className="w-6 h-6 mb-1 text-amber-500" />
              <span className="text-sm font-medium">Incident Reports</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-center justify-center gap-2 hover:border-purple-500 hover:text-purple-600 transition-all">
              <MapPin className="w-6 h-6 mb-1 text-purple-500" />
              <span className="text-sm font-medium">Zone Deployments</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
