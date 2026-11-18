"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  ENFORCEMENT_GROUP_MIN_MEMBERS as MIN,
  isEnforcementType,
} from "@/lib/enforcement-type";
import { isEnforcementGrouper } from "@/lib/enforcement-roles";

/**
 * Unit groups for the Special Enforcement Unit / Recovery Unit / Park Monitors.
 *
 * Rules (enforced here, not just in the UI):
 *  - a group has a name, a unit, an area and a team leader who is a member
 *  - at least 5 members, always: creation needs 5+, and removing a member that
 *    would leave fewer than 5 is refused (disband the group instead)
 *  - only APPROVED applicants can be grouped, and each is in one group at a time
 *  - joining a group puts the person in that group's unit
 */

type Result<T = object> = ({ success: true } & T) | { success: false; error: string };

async function requireGrouper() {
  const session = await getSession();
  if (!session || !isEnforcementGrouper(session.role)) return null;
  return session;
}

const DENIED = {
  success: false as const,
  error: "Unauthorized. Only an HOD or the System Admin can manage groups.",
};

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Take a row lock on the group for the rest of the transaction. Anything that
 * checks the group's membership and then changes it takes this first, so those
 * check-then-write steps run one at a time per group.
 */
async function lockGroup(tx: Tx, groupId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "EnforcementGroup" WHERE "id" = ${groupId} FOR UPDATE`;
  return rows.length > 0;
}

function refresh(groupId?: string) {
  revalidatePath("/admin/park-monitors");
  revalidatePath("/admin/park-monitors/groups");
  if (groupId) revalidatePath(`/admin/park-monitors/groups/${groupId}`);
}

export interface CreateGroupInput {
  name: string;
  unit: string;
  area: string;
  leaderApplicationId: string;
  memberIds: string[];
}

export async function createEnforcementGroup(
  input: CreateGroupInput,
): Promise<Result<{ groupId: string }>> {
  try {
    const session = await requireGrouper();
    if (!session) return DENIED;

    const name = input.name?.trim();
    const area = input.area?.trim();
    if (!name) return { success: false, error: "Enter a group name." };
    if (!area) return { success: false, error: "Enter the area this group covers." };
    if (!isEnforcementType(input.unit)) {
      return { success: false, error: "Choose a unit." };
    }

    const memberIds = Array.from(new Set(input.memberIds ?? []));
    if (memberIds.length < MIN) {
      return {
        success: false,
        error: `A group needs at least ${MIN} members. You selected ${memberIds.length}.`,
      };
    }
    if (!memberIds.includes(input.leaderApplicationId)) {
      return { success: false, error: "The team leader must be one of the members." };
    }

    const groupId = await db.$transaction(async (tx) => {
      const group = await tx.enforcementGroup.create({
        data: {
          name,
          area,
          unit: input.unit,
          leaderApplicationId: input.leaderApplicationId,
          createdByUserId: session.userId,
        },
      });

      // Conditional update: only approved, not-yet-grouped people are taken.
      // If anyone was grouped meanwhile the counts differ and we roll back.
      const claimed = await tx.parkMonitorApplication.updateMany({
        where: { id: { in: memberIds }, status: "APPROVED", groupId: null },
        data: { groupId: group.id, enforcementType: input.unit },
      });
      if (claimed.count !== memberIds.length) {
        throw new Error(
          "Some selected people are no longer available (not approved, or already in a group). Refresh and try again.",
        );
      }
      return group.id;
    });

    refresh(groupId);
    return { success: true, groupId };
  } catch (error) {
    console.error("[CreateEnforcementGroup Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create group.",
    };
  }
}

export async function addGroupMembers(
  groupId: string,
  memberIds: string[],
): Promise<Result> {
  try {
    const session = await requireGrouper();
    if (!session) return DENIED;

    const ids = Array.from(new Set(memberIds ?? []));
    if (ids.length === 0) return { success: false, error: "Select at least one person." };

    const group = await db.enforcementGroup.findUnique({ where: { id: groupId } });
    if (!group) return { success: false, error: "Group not found." };

    await db.$transaction(async (tx) => {
      const claimed = await tx.parkMonitorApplication.updateMany({
        where: { id: { in: ids }, status: "APPROVED", groupId: null },
        data: { groupId, enforcementType: group.unit },
      });
      if (claimed.count !== ids.length) {
        throw new Error(
          "Some selected people are no longer available (not approved, or already in a group). Refresh and try again.",
        );
      }
    });

    refresh(groupId);
    return { success: true };
  } catch (error) {
    console.error("[AddGroupMembers Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to add members.",
    };
  }
}

export async function removeGroupMember(
  groupId: string,
  applicationId: string,
): Promise<Result> {
  try {
    const session = await requireGrouper();
    if (!session) return DENIED;

    // The size check and the removal must be one atomic step. Two HODs removing
    // different people from a six-person group would otherwise both read "6",
    // both pass, and leave four. Locking the group row makes the second request
    // wait and then see the true count.
    const outcome = await db.$transaction(async (tx): Promise<Result> => {
      const locked = await lockGroup(tx, groupId);
      if (!locked) return { success: false, error: "Group not found." };

      const group = await tx.enforcementGroup.findUnique({
        where: { id: groupId },
        include: { _count: { select: { members: true } } },
      });
      if (!group) return { success: false, error: "Group not found." };

      if (group.leaderApplicationId === applicationId) {
        return {
          success: false,
          error: "This person is the team leader. Choose another leader first.",
        };
      }
      if (group._count.members - 1 < MIN) {
        return {
          success: false,
          error: `A group needs at least ${MIN} members. Add someone else first, or disband the group.`,
        };
      }

      const removed = await tx.parkMonitorApplication.updateMany({
        where: { id: applicationId, groupId },
        data: { groupId: null },
      });
      if (removed.count === 0) {
        return { success: false, error: "That person is not in this group." };
      }
      return { success: true };
    });

    if (outcome.success) refresh(groupId);
    return outcome;
  } catch (error) {
    console.error("[RemoveGroupMember Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to remove member.",
    };
  }
}

export async function setGroupLeader(
  groupId: string,
  applicationId: string,
): Promise<Result> {
  try {
    const session = await requireGrouper();
    if (!session) return DENIED;

    // Same lock as removeGroupMember, so a member cannot be made leader while
    // they are being removed.
    const outcome = await db.$transaction(async (tx): Promise<Result> => {
      if (!(await lockGroup(tx, groupId))) {
        return { success: false, error: "Group not found." };
      }
      const member = await tx.parkMonitorApplication.findFirst({
        where: { id: applicationId, groupId },
        select: { id: true },
      });
      if (!member) {
        return { success: false, error: "The team leader must be a member of the group." };
      }
      await tx.enforcementGroup.update({
        where: { id: groupId },
        data: { leaderApplicationId: applicationId },
      });
      return { success: true };
    });

    if (outcome.success) refresh(groupId);
    return outcome;
  } catch (error) {
    console.error("[SetGroupLeader Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to set leader.",
    };
  }
}

export async function updateEnforcementGroup(
  groupId: string,
  input: { name: string; area: string; unit: string },
): Promise<Result> {
  try {
    const session = await requireGrouper();
    if (!session) return DENIED;

    const name = input.name?.trim();
    const area = input.area?.trim();
    if (!name) return { success: false, error: "Enter a group name." };
    if (!area) return { success: false, error: "Enter the area this group covers." };
    if (!isEnforcementType(input.unit)) {
      return { success: false, error: "Choose a unit." };
    }

    await db.$transaction(async (tx) => {
      await tx.enforcementGroup.update({
        where: { id: groupId },
        data: { name, area, unit: input.unit },
      });
      // Members always carry their group's unit.
      await tx.parkMonitorApplication.updateMany({
        where: { groupId },
        data: { enforcementType: input.unit },
      });
    });

    refresh(groupId);
    return { success: true };
  } catch (error) {
    console.error("[UpdateEnforcementGroup Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update group.",
    };
  }
}

/** Dissolve a group; its members go back to the ungrouped pool (still approved). */
export async function disbandEnforcementGroup(groupId: string): Promise<Result> {
  try {
    const session = await requireGrouper();
    if (!session) return DENIED;

    await db.$transaction(async (tx) => {
      await tx.parkMonitorApplication.updateMany({
        where: { groupId },
        data: { groupId: null },
      });
      await tx.enforcementGroup.delete({ where: { id: groupId } });
    });

    refresh();
    return { success: true };
  } catch (error) {
    console.error("[DisbandEnforcementGroup Error]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to disband group.",
    };
  }
}
