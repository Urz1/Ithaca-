import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationAdminPanel } from "@/components/admin/organization-admin-panel";
import { AuditExportButton } from "@/components/admin/audit-export-button";
import { getOrganizationContext } from "@/lib/organization-context";
import { hasOrganizationPermission } from "@/lib/tenancy-policy";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrganizationAdminPage() {
  const context = await getOrganizationContext();
  if (!context) {
    redirect("/signin?callbackUrl=%2Fadmin");
  }

  if (!hasOrganizationPermission(context.role, "audit:read")) {
    redirect("/dashboard");
  }
  const canManageMembers = hasOrganizationPermission(
    context.role,
    "members:manage",
  );
  const [members, auditEvents, counts] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: context.organizationId },
      include: {
        user: { select: { name: true, email: true, emailVerified: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditEvent.findMany({
      where: { organizationId: context.organizationId },
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    Promise.all([
      prisma.project.count({
        where: { organizationId: context.organizationId },
      }),
      prisma.collection.count({
        where: { organizationId: context.organizationId },
      }),
      prisma.savedGraph.count({
        where: { organizationId: context.organizationId },
      }),
    ]),
  ]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 p-6">
      <div>
        <p className="text-muted-foreground text-sm">
          Organization administration
        </p>
        <h1 className="text-2xl font-semibold">{context.organization.name}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Members" value={members.length} />
        <Metric label="Projects" value={counts[0]} />
        <Metric label="Collections" value={counts[1]} />
        <Metric label="Saved graphs" value={counts[2]} />
      </div>

      {canManageMembers ? (
        <OrganizationAdminPanel />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {members.map((membership) => (
              <div
                key={membership.id}
                className="flex items-center justify-between gap-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    {membership.user.name ?? "Researcher"}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {membership.user.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!membership.user.emailVerified && (
                    <Badge variant="outline">Unverified</Badge>
                  )}
                  <Badge>{membership.role}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent audit activity</CardTitle>
          <AuditExportButton />
        </CardHeader>
        <CardContent className="divide-y">
          {auditEvents.map((event) => (
            <div key={event.id} className="grid gap-1 py-3 md:grid-cols-4">
              <p className="font-medium">{event.action}</p>
              <p className="text-muted-foreground text-sm">
                {event.actor?.name ?? event.actor?.email ?? "System"}
              </p>
              <p className="text-muted-foreground text-sm">
                {[event.entityType, event.entityId].filter(Boolean).join(" · ")}
              </p>
              <time className="text-muted-foreground text-sm md:text-right">
                {event.createdAt.toLocaleString()}
              </time>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-muted-foreground text-sm">{label}</p>
      </CardContent>
    </Card>
  );
}
