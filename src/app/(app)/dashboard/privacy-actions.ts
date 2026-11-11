"use server";

import {
  deleteUserAccount,
  exportUserData,
  type UserDataExport,
} from "@/modules/privacy/account-data";
import {
  getOrganizationContext,
  recordAuditEvent,
  requireOrganizationContext,
} from "@/lib/organization-context";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function requireSessionUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user.id;
}

export async function exportAccountData(): Promise<UserDataExport> {
  const userId = await requireSessionUserId();
  const context = await getOrganizationContext();
  const exportBundle = await exportUserData(userId);

  if (context) {
    await recordAuditEvent(context, {
      action: "privacy.export_requested",
      entityType: "user",
      entityId: userId,
    });
  }

  return exportBundle;
}

export async function deleteAccount(): Promise<void> {
  const userId = await requireSessionUserId();
  const context = await requireOrganizationContext("domain:write");

  await recordAuditEvent(context, {
    action: "privacy.account_deleted",
    entityType: "user",
    entityId: userId,
  });

  await deleteUserAccount(userId);
}
