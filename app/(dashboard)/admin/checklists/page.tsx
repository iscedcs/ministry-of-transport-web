/**
 * Checklist Templates — Ministry of Transport Platform
 * STORY-082 | EPIC-005
 *
 * Read-only view of all InspectionChecklistTemplate configurations.
 * Editing (adding/removing items) is a future sprint feature.
 * Access: PERMANENT_SECRETARY, SYSTEM_ADMIN
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listChecklistTemplates } from "@/app/actions/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CHECKLIST_ENTITY_LABELS as ENTITY_LABELS } from "@/lib/utils/labels";

export default async function ChecklistsPage() {
  try {
    await requireRole(["PERMANENT_SECRETARY", "SYSTEM_ADMIN", "ADMIN"]);
  } catch {
    redirect("/dashboard");
  }

  const result = await listChecklistTemplates();
  const templates = result.success ? result.data! : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Link
            href="/admin"
            className="hover:text-foreground transition-colors">
            Admin
          </Link>
          <span>/</span>
          <span className="text-foreground">Checklists</span>
        </nav>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}>
          Inspection Checklists
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </p>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <p className="text-sm text-muted-foreground">
              No checklist templates found.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} className={!tpl.isActive ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{tpl.name}</CardTitle>
                    <CardDescription>
                      {ENTITY_LABELS[tpl.linkedEntityType] ??
                        tpl.linkedEntityType}
                      {tpl.description ? ` — ${tpl.description}` : ""}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        tpl.isActive
                          ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                          : "bg-secondary text-muted-foreground"
                      }`}>
                      {tpl.isActive ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {tpl.items.length} item{tpl.items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </CardHeader>
              {tpl.items.length > 0 && (
                <CardContent className="pt-0">
                  <details className="group">
                    <summary className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                      View checklist items
                    </summary>
                    <div className="mt-3 flex flex-col gap-1.5">
                      {tpl.items.map((item, idx) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-md bg-secondary/50 px-3 py-2 text-sm">
                          <span className="w-5 text-center text-xs text-muted-foreground">
                            {idx + 1}
                          </span>
                          <span className="flex-1">{item.itemName}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.itemCategory}
                          </span>
                          {item.isRequired && (
                            <span className="text-xs text-destructive font-medium">
                              Required
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Checklist template editing (add/remove items) will be available in a
        future release.
      </p>
    </div>
  );
}
